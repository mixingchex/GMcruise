// scripts/update-test-product.ts
// 1101 테스트 상품(SAMPLE-MED-001)을 3개국 로얄캐리비안 상품으로 업데이트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 SAMPLE-MED-001 테스트 상품 업데이트 시작...\n');

  // 3개국 일정: 일본(후쿠오카), 대만(지룽), 베트남(다낭)
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

  // SAMPLE-MED-001 업데이트 또는 생성
  const product = await prisma.cruiseProduct.upsert({
    where: { productCode: 'SAMPLE-MED-001' },
    update: {
      cruiseLine: '로얄캐리비안',
      shipName: '스펙트럼 오브 더 시즈',
      packageName: '지니 3일 체험 (아시아 3개국)',
      nights: 6,
      days: 7,
      description: '크루즈 가이드 지니 AI 3일 체험 상품입니다. 일본, 대만, 베트남 3개국을 방문합니다.',
      saleStatus: '판매중',
      isGeniePack: true,
      itineraryPattern: itineraryPattern,
      updatedAt: new Date(),
    },
    create: {
      productCode: 'SAMPLE-MED-001',
      cruiseLine: '로얄캐리비안',
      shipName: '스펙트럼 오브 더 시즈',
      packageName: '지니 3일 체험 (아시아 3개국)',
      nights: 6,
      days: 7,
      basePrice: 0,
      description: '크루즈 가이드 지니 AI 3일 체험 상품입니다. 일본, 대만, 베트남 3개국을 방문합니다.',
      saleStatus: '판매중',
      isGeniePack: true,
      source: 'genie-trial',
      category: '체험',
      itineraryPattern: itineraryPattern,
      updatedAt: new Date(),
    },
  });

  console.log('✅ SAMPLE-MED-001 상품 업데이트 완료:');
  console.log(`   상품코드: ${product.productCode}`);
  console.log(`   크루즈사: ${product.cruiseLine}`);
  console.log(`   선박명: ${product.shipName}`);
  console.log(`   상품명: ${product.packageName}`);
  console.log(`   기간: ${product.nights}박 ${product.days}일`);
  console.log(`   방문국: 일본(후쿠오카), 대만(지룽), 베트남(다낭) - 3개국\n`);

  // 기존 1101 테스트 사용자들의 UserTrip 삭제 (다음 로그인 시 새로 생성됨)
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { password: '1101' },
        { customerStatus: 'test' },
      ],
    },
    select: { id: true, name: true, phone: true },
  });

  console.log(`📋 테스트 사용자 수: ${testUsers.length}명`);

  if (testUsers.length > 0) {
    // 테스트 사용자들의 기존 UserTrip 삭제 (다음 로그인 시 새 상품으로 생성됨)
    for (const user of testUsers) {
      const existingTrips = await prisma.userTrip.findMany({
        where: { userId: user.id },
        select: { id: true, cruiseName: true },
      });

      if (existingTrips.length > 0) {
        // Itinerary 먼저 삭제
        await prisma.itinerary.deleteMany({
          where: { userTripId: { in: existingTrips.map(t => t.id) } },
        });

        // UserTrip 삭제
        await prisma.userTrip.deleteMany({
          where: { userId: user.id },
        });

        console.log(`   ✅ ${user.name}(${user.phone})의 기존 여행 삭제 완료`);
      }
    }
    console.log('\n💡 테스트 사용자들이 다음 로그인 시 새 3개국 상품으로 여행이 생성됩니다.');
  }

  console.log('\n🎉 업데이트 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
