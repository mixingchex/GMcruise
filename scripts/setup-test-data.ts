import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('김테스트 계정 데이터 조회 시작');
  console.log('='.repeat(60));

  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: '테스트' } },
        { name: { contains: 'test' } },
        { email: { contains: 'test' } },
      ],
    },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  if (testUsers.length === 0) {
    console.log('\n테스트 계정을 찾을 수 없습니다.');
    return;
  }

  console.log(`\n테스트 계정 ${testUsers.length}개 발견:`);
  testUsers.forEach((u, idx) => {
    console.log(`  [${idx + 1}] id=${u.id}, 이름=${u.name}, 이메일=${u.email}, 역할=${u.role}`);
  });

  const targetUser = testUsers[0];
  console.log(`\n대상 계정: id=${targetUser.id}, 이름=${targetUser.name}`);

  console.log('\n' + '-'.repeat(40));
  console.log('Reservation 데이터 확인:');
  const reservations = await prisma.reservation.findMany({
    where: { mainUserId: targetUser.id },
    include: { Trip: { select: { id: true, shipName: true, departureDate: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });
  if (reservations.length === 0) {
    console.log('  Reservation 없음');
  } else {
    reservations.forEach((r) => {
      console.log(`  - id=${r.id}, 상태=${r.status}, 선박=${r.Trip.shipName}`);
    });
  }

  console.log('\n' + '-'.repeat(40));
  console.log('UserTrip 데이터 확인:');
  const userTrips = await prisma.userTrip.findMany({
    where: { userId: targetUser.id },
    include: {
      CruiseProduct: { select: { id: true, productCode: true, shipName: true, nights: true, days: true, itineraryPattern: true } },
      Itinerary: { orderBy: { day: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (userTrips.length === 0) {
    console.log('  UserTrip 없음 → 새로 생성합니다.');

    const product = await prisma.cruiseProduct.findFirst({
      orderBy: { id: 'asc' },
      select: { id: true, productCode: true, shipName: true, nights: true, days: true, itineraryPattern: true },
    });

    if (!product) {
      console.log('  CruiseProduct가 없어 UserTrip을 생성할 수 없습니다.');
      return;
    }
    console.log(`  사용할 상품: id=${product.id}, ${product.productCode} / ${product.shipName}, ${product.nights}박${product.days}일`);

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() + 30);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (product.nights ?? 7));

    const newUserTrip = await prisma.userTrip.create({
      data: {
        userId: targetUser.id,
        productId: product.id,
        cruiseName: product.shipName,
        destination: JSON.stringify([]),
        startDate,
        endDate,
        nights: product.nights ?? 0,
        days: product.days ?? 0,
        status: 'Upcoming',
        updatedAt: new Date(),
      },
    });
    console.log(`  ✅ UserTrip 생성 완료: id=${newUserTrip.id}, ${startDate.toISOString().slice(0, 10)} ~ ${endDate.toISOString().slice(0, 10)}`);

    type IItem = { day?: number; type?: string; location?: string; country?: string; arrival?: string; departure?: string; };
    const pattern = product.itineraryPattern;
    let list: IItem[] = [];
    if (Array.isArray(pattern)) list = pattern as IItem[];

    if (list.length === 0) {
      console.log(`  itineraryPattern 없음 — 기본 sea 일정으로 ${product.days}일 생성`);
      for (let d = 1; d <= (product.days ?? 7); d++) {
        list.push({ day: d, type: 'sea' });
      }
    }

    const itineraryData = list.map((item, idx) => {
      const dayNum = typeof item.day === 'number' ? item.day : idx + 1;
      const date = new Date(startDate);
      date.setDate(date.getDate() + (dayNum - 1));
      return { userTripId: newUserTrip.id, day: dayNum, date, type: item.type ?? 'sea', location: item.location ?? null, country: item.country ?? null, arrival: item.arrival ?? null, departure: item.departure ?? null, updatedAt: new Date() };
    });

    const created = await prisma.itinerary.createMany({ data: itineraryData });
    console.log(`  ✅ Itinerary ${created.count}개 생성 완료`);

    console.log('\n' + '='.repeat(60));
    console.log('최종 결과 요약');
    console.log('='.repeat(60));
    console.log(`  계정 ID   : ${targetUser.id}`);
    console.log(`  이름      : ${targetUser.name}`);
    console.log(`  이메일    : ${targetUser.email}`);
    console.log(`  UserTrip  : 신규 생성 (id=${newUserTrip.id})`);
    console.log(`  상품      : ${product.productCode} / ${product.shipName}`);
    console.log(`  여행 기간 : ${startDate.toISOString().slice(0, 10)} ~ ${endDate.toISOString().slice(0, 10)}`);
    console.log(`  Itinerary : ${created.count}개 생성`);
  } else {
    userTrips.forEach((ut) => {
      console.log(`  - id=${ut.id}, 상태=${ut.status}, ${ut.startDate?.toISOString().slice(0, 10) ?? 'N/A'} ~ ${ut.endDate?.toISOString().slice(0, 10) ?? 'N/A'}, Itinerary ${ut.Itinerary.length}개`);
      if (ut.CruiseProduct) console.log(`    연결 상품: ${ut.CruiseProduct.productCode} / ${ut.CruiseProduct.shipName}`);
    });
    console.log('\n  이미 UserTrip 있음 — 생성 스킵');
  }
  console.log('='.repeat(60));
}

main()
  .catch((e) => { console.error('오류 발생:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
