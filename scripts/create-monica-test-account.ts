// scripts/create-monica-test-account.ts
// 3800 로그인 테스트용 고정 계정 생성 (모니카)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 3800 테스트 계정 (모니카) 생성 시작...\n');

  const name = '모니카';
  const phone = '01024958013';
  const password = '3800';

  // 3개국 일정: 일본(후쿠오카), 대만(지룽), 베트남(다낭) - 1101과 동일
  const itineraryPattern = [
    {
      day: 1,
      type: 'departure',
      location: '부산',
      country: 'KR',
      currency: 'KRW',
      language: 'ko',
      arrival: null,
      departure: '16:00',
    },
    {
      day: 2,
      type: 'port',
      location: '후쿠오카',
      country: 'JP',
      currency: 'JPY',
      language: 'ja',
      arrival: '08:00',
      departure: '18:00',
    },
    {
      day: 3,
      type: 'sea',
      location: '해상',
      country: null,
      currency: null,
      language: null,
      arrival: null,
      departure: null,
    },
    {
      day: 4,
      type: 'port',
      location: '지룽',
      country: 'TW',
      currency: 'TWD',
      language: 'zh-TW',
      arrival: '07:00',
      departure: '17:00',
    },
    {
      day: 5,
      type: 'port',
      location: '다낭',
      country: 'VN',
      currency: 'VND',
      language: 'vi',
      arrival: '08:00',
      departure: '18:00',
    },
    {
      day: 6,
      type: 'sea',
      location: '해상',
      country: null,
      currency: null,
      language: null,
      arrival: null,
      departure: null,
    },
    {
      day: 7,
      type: 'arrival',
      location: '부산',
      country: 'KR',
      currency: 'KRW',
      language: 'ko',
      arrival: '09:00',
      departure: null,
    },
  ];

  // REAL-CRUISE-01 상품도 3개국으로 업데이트
  const product = await prisma.cruiseProduct.upsert({
    where: { productCode: 'REAL-CRUISE-01' },
    update: {
      cruiseLine: '로얄캐리비안',
      shipName: '스펙트럼 오브 더 시즈',
      packageName: '크루즈 가이드 지니 (아시아 3개국)',
      nights: 6,
      days: 7,
      description: '크루즈 가이드 지니 정식 서비스 상품입니다. 일본, 대만, 베트남 3개국을 방문합니다.',
      saleStatus: '판매중',
      itineraryPattern: itineraryPattern,
      updatedAt: new Date(),
    },
    create: {
      productCode: 'REAL-CRUISE-01',
      cruiseLine: '로얄캐리비안',
      shipName: '스펙트럼 오브 더 시즈',
      packageName: '크루즈 가이드 지니 (아시아 3개국)',
      nights: 6,
      days: 7,
      basePrice: 0,
      description: '크루즈 가이드 지니 정식 서비스 상품입니다. 일본, 대만, 베트남 3개국을 방문합니다.',
      saleStatus: '판매중',
      source: 'genie',
      category: '정식',
      itineraryPattern: itineraryPattern,
      updatedAt: new Date(),
    },
  });

  console.log('✅ REAL-CRUISE-01 상품 업데이트 완료:');
  console.log(`   크루즈사: ${product.cruiseLine}`);
  console.log(`   선박명: ${product.shipName}`);
  console.log(`   기간: ${product.nights}박 ${product.days}일`);
  console.log(`   방문국: 일본(후쿠오카), 대만(지룽), 베트남(다낭) - 3개국\n`);

  // 기존 모니카 계정 확인
  let user = await prisma.user.findFirst({
    where: { phone },
  });

  if (user) {
    // 기존 계정 업데이트
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        password,
        customerStatus: 'active',
        customerSource: 'cruise-guide',
        onboarded: true,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ 기존 계정 업데이트: ${user.name} (ID: ${user.id})`);

    // 기존 UserTrip 삭제
    const existingTrips = await prisma.userTrip.findMany({
      where: { userId: user.id },
    });

    if (existingTrips.length > 0) {
      await prisma.itinerary.deleteMany({
        where: { userTripId: { in: existingTrips.map(t => t.id) } },
      });
      await prisma.userTrip.deleteMany({
        where: { userId: user.id },
      });
      console.log('   기존 여행 삭제 완료');
    }
  } else {
    // 새 계정 생성
    user = await prisma.user.create({
      data: {
        name,
        phone,
        password,
        role: 'GUIDE_USER',
        customerStatus: 'active',
        customerSource: 'cruise-guide',
        onboarded: true,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ 새 계정 생성: ${user.name} (ID: ${user.id})`);
  }

  // 출발일: 100일 전 (D-100 → 이미 지난 여행으로 설정)
  // 실제로는 D+100 (100일 후)로 설정해야 "출발 100일 전"이 됨
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() + 100); // 100일 후 출발
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6); // 6박 7일
  endDate.setHours(23, 59, 59, 999);

  // 예약번호 생성
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const reservationCode = `CRD-${dateStr}-MONICA`;

  // UserTrip 생성
  const trip = await prisma.userTrip.create({
    data: {
      userId: user.id,
      productId: product.id,
      reservationCode,
      cruiseName: `${product.cruiseLine} ${product.shipName}`,
      companionType: '가족',
      destination: ['일본', '대만', '베트남'],
      startDate,
      endDate,
      nights: product.nights,
      days: product.days,
      visitCount: 3,
      status: 'Upcoming',
      updatedAt: new Date(),
    },
  });

  console.log(`\n✅ 여행 생성 완료:`);
  console.log(`   여행 ID: ${trip.id}`);
  console.log(`   크루즈: ${trip.cruiseName}`);
  console.log(`   출발일: ${startDate.toISOString().split('T')[0]} (D-100)`);
  console.log(`   도착일: ${endDate.toISOString().split('T')[0]}`);

  // Itinerary 생성
  const itineraries = [];
  for (const pattern of itineraryPattern) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + pattern.day - 1);

    itineraries.push({
      userTripId: trip.id,
      day: pattern.day,
      date: dayDate,
      type: pattern.type,
      location: pattern.location || null,
      country: pattern.country || null,
      currency: pattern.currency || null,
      language: pattern.language || null,
      arrival: pattern.arrival || null,
      departure: pattern.departure || null,
      updatedAt: new Date(),
    });
  }

  await prisma.itinerary.createMany({
    data: itineraries,
  });

  console.log(`   일정: ${itineraries.length}일 생성 완료`);

  console.log('\n========================================');
  console.log('🎉 모니카 테스트 계정 생성 완료!');
  console.log('========================================');
  console.log(`   이름: ${name}`);
  console.log(`   전화번호: ${phone}`);
  console.log(`   비밀번호: ${password}`);
  console.log(`   출발일: D-100 (${startDate.toISOString().split('T')[0]})`);
  console.log(`   방문국: 일본(후쿠오카), 대만(지룽), 베트남(다낭)`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
