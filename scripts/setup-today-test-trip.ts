/**
 * scripts/setup-today-test-trip.ts
 *
 * 오늘의 브리핑 즉시 테스트용 스크립트.
 * 지정 사용자의 여행 날짜를 오늘 기준으로 재설정한다.
 *
 * 사용법:
 *   npx tsx scripts/setup-today-test-trip.ts <전화번호> <productCode> <오늘이_몇번째_날>
 * 예시:
 *   npx tsx scripts/setup-today-test-trip.ts 01012345678 REAL-CRUISE-01 3
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizePattern(raw: any): any[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed;
    if (parsed.days && Array.isArray(parsed.days)) return parsed.days;
  } catch {}
  return [];
}

async function main() {
  const [, , phone, productCode, todayDayStr] = process.argv;

  if (!phone || !productCode || !todayDayStr) {
    console.error('사용법: npx tsx scripts/setup-today-test-trip.ts <전화번호> <productCode> <오늘이_몇번째_날>');
    process.exit(1);
  }

  const todayDay = parseInt(todayDayStr, 10);
  if (isNaN(todayDay) || todayDay < 1) {
    console.error('오늘이_몇번째_날은 1 이상의 정수여야 합니다.');
    process.exit(1);
  }

  const normalizedPhone = phone.replace(/\D/g, '');
  const user = await prisma.user.findFirst({
    where: { phone: normalizedPhone },
    select: { id: true, name: true, phone: true },
  });

  if (!user) {
    console.error(`사용자를 찾을 수 없습니다: ${normalizedPhone}`);
    process.exit(1);
  }
  console.log(`사용자: ${user.name} (${user.phone}), ID: ${user.id}`);

  const product = await prisma.cruiseProduct.findUnique({
    where: { productCode },
    select: {
      id: true, productCode: true, cruiseLine: true, shipName: true,
      nights: true, days: true, itineraryPattern: true,
    },
  });

  if (!product) {
    console.error(`상품을 찾을 수 없습니다: ${productCode}`);
    process.exit(1);
  }
  console.log(`상품: ${product.cruiseLine} ${product.shipName} (${product.nights}박 ${product.days}일)`);

  // 오늘이 todayDay가 되도록 startDate 역산
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (todayDay - 1));

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + product.days - 1);
  endDate.setHours(23, 59, 59, 999);

  console.log(`startDate: ${startDate.toISOString().split('T')[0]} (오늘이 day ${todayDay})`);
  console.log(`endDate: ${endDate.toISOString().split('T')[0]}`);

  // 기존 UserTrip + Itinerary 삭제
  const existingTrips = await prisma.userTrip.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  for (const trip of existingTrips) {
    await prisma.itinerary.deleteMany({ where: { userTripId: trip.id } });
  }
  await prisma.userTrip.deleteMany({ where: { userId: user.id } });
  console.log(`기존 UserTrip ${existingTrips.length}개 삭제 완료`);

  // itineraryPattern 파싱
  const pattern = normalizePattern(product.itineraryPattern);
  if (pattern.length === 0) {
    console.warn('경고: itineraryPattern이 비어 있습니다. 어드민에서 일정을 먼저 등록해주세요.');
  }

  // UserTrip 생성
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const userTrip = await prisma.userTrip.create({
    data: {
      userId: user.id,
      productId: product.id,
      reservationCode: `CRD-${dateStr}-TEST`,
      cruiseName: `${product.cruiseLine} ${product.shipName}`,
      startDate,
      endDate,
      nights: product.nights,
      days: product.days,
      status: 'Active',
      updatedAt: new Date(),
    },
  });
  console.log(`UserTrip 생성: ID=${userTrip.id}`);

  // Itinerary 생성
  if (pattern.length > 0) {
    const itineraries = pattern.map((p: any) => {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + p.day - 1);
      return {
        userTripId: userTrip.id,
        day: p.day,
        date: dayDate,
        type: p.type || 'sea',
        location: p.location || null,
        country: p.country || null,
        arrival: p.arrival || null,
        departure: p.departure || null,
        updatedAt: new Date(),
      };
    });

    await prisma.itinerary.createMany({ data: itineraries });
    console.log(`Itinerary 생성: ${itineraries.length}개`);

    // 오늘 날짜 Itinerary 확인
    const todayItinerary = itineraries.find(
      (it) => it.date.toDateString() === today.toDateString()
    );
    if (todayItinerary) {
      const isSea = !todayItinerary.type ||
        ['sea', 'cruising'].includes(todayItinerary.type.toLowerCase());
      console.log(`\n오늘(day ${todayDay}): type=${todayItinerary.type}, location=${todayItinerary.location || '(없음)'}, country=${todayItinerary.country || '(없음)'}`);
      console.log(`브리핑: ${isSea ? '항해 중 (isCruising: true)' : `기항지 "${todayItinerary.location}" 브리핑 예정`}`);
    } else {
      console.warn('경고: 오늘 날짜에 해당하는 Itinerary가 없습니다.');
    }
  }

  // 온보딩 완료 표시
  await prisma.user.update({
    where: { id: user.id },
    data: { onboarded: true },
  });

  console.log(`\n완료! ${user.name}(${user.phone})으로 로그인 후 오늘의 브리핑 확인 가능.`);
  console.log('비밀번호: 3800');
}

main().catch(console.error).finally(() => prisma.$disconnect());
