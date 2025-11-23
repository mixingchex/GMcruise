// scripts/restore-sample-med-001.ts
// SAMPLE-MED-001 상품 복구 스크립트 (3일 체험용 테스트 상품)

import prisma from '../lib/prisma';

async function main() {
  console.log('🔄 SAMPLE-MED-001 상품 복구 시작...\n');

  // SAMPLE-MED-001 상품 복구 (upsert 사용 - 이미 있으면 업데이트, 없으면 생성)
  const product = await prisma.cruiseProduct.upsert({
    where: { productCode: 'SAMPLE-MED-001' },
    update: {
      cruiseLine: 'Celebrity Cruises',
      shipName: 'Celebrity Edge',
      packageName: '바르셀로나-마르세유-제노바-나폴리-바르셀로나 7박 8일',
      nights: 7,
      days: 8,
      basePrice: 2500000,
      description: '바르셀로나 출발 지중해를 경유하는 7박 8일 크루즈',
      source: 'manual',
      saleStatus: '판매중',
      startDate: new Date('2025-12-20'),
      endDate: new Date('2025-12-27'),
      itineraryPattern: [
        {
          day: 1,
          type: 'Embarkation',
          location: 'Barcelona',
          country: 'ES',
          currency: 'EUR',
          language: 'es',
          time: '17:00',
        },
        {
          day: 2,
          type: 'Cruising',
        },
        {
          day: 3,
          type: 'PortVisit',
          location: 'Marseille',
          country: 'FR',
          currency: 'EUR',
          language: 'fr',
          arrival: '08:00',
          departure: '18:00',
        },
        {
          day: 4,
          type: 'PortVisit',
          location: 'Genoa',
          country: 'IT',
          currency: 'EUR',
          language: 'it',
          arrival: '09:00',
          departure: '19:00',
        },
        {
          day: 5,
          type: 'PortVisit',
          location: 'Naples',
          country: 'IT',
          currency: 'EUR',
          language: 'it',
          arrival: '08:00',
          departure: '18:00',
        },
        {
          day: 6,
          type: 'Cruising',
        },
        {
          day: 7,
          type: 'Cruising',
        },
        {
          day: 8,
          type: 'Disembarkation',
          location: 'Barcelona',
          country: 'ES',
          currency: 'EUR',
          language: 'es',
          time: '08:00',
        },
      ],
      isGeniePack: true, // 3일 체험용 테스트 상품
      updatedAt: new Date(),
    },
    create: {
      productCode: 'SAMPLE-MED-001',
      cruiseLine: 'Celebrity Cruises',
      shipName: 'Celebrity Edge',
      packageName: '바르셀로나-마르세유-제노바-나폴리-바르셀로나 7박 8일',
      nights: 7,
      days: 8,
      basePrice: 2500000,
      description: '바르셀로나 출발 지중해를 경유하는 7박 8일 크루즈',
      source: 'manual',
      saleStatus: '판매중',
      startDate: new Date('2025-12-20'),
      endDate: new Date('2025-12-27'),
      itineraryPattern: [
        {
          day: 1,
          type: 'Embarkation',
          location: 'Barcelona',
          country: 'ES',
          currency: 'EUR',
          language: 'es',
          time: '17:00',
        },
        {
          day: 2,
          type: 'Cruising',
        },
        {
          day: 3,
          type: 'PortVisit',
          location: 'Marseille',
          country: 'FR',
          currency: 'EUR',
          language: 'fr',
          arrival: '08:00',
          departure: '18:00',
        },
        {
          day: 4,
          type: 'PortVisit',
          location: 'Genoa',
          country: 'IT',
          currency: 'EUR',
          language: 'it',
          arrival: '09:00',
          departure: '19:00',
        },
        {
          day: 5,
          type: 'PortVisit',
          location: 'Naples',
          country: 'IT',
          currency: 'EUR',
          language: 'it',
          arrival: '08:00',
          departure: '18:00',
        },
        {
          day: 6,
          type: 'Cruising',
        },
        {
          day: 7,
          type: 'Cruising',
        },
        {
          day: 8,
          type: 'Disembarkation',
          location: 'Barcelona',
          country: 'ES',
          currency: 'EUR',
          language: 'es',
          time: '08:00',
        },
      ],
      isGeniePack: true, // 3일 체험용 테스트 상품
      updatedAt: new Date(),
    },
  });

  console.log('✅ SAMPLE-MED-001 상품 복구 완료!');
  console.log('\n📋 상품 정보:');
  console.log(`  - 상품코드: ${product.productCode}`);
  console.log(`  - 크루즈라인: ${product.cruiseLine}`);
  console.log(`  - 선박명: ${product.shipName}`);
  console.log(`  - 패키지명: ${product.packageName}`);
  console.log(`  - 여행기간: ${product.nights}박 ${product.days}일`);
  console.log(`  - 지니팩: ${product.isGeniePack ? '예 (3일 체험용)' : '아니오'}`);
  console.log(`  - 방문국가: 스페인, 프랑스, 이탈리아`);
  console.log(`  - 상품 ID: ${product.id}`);
}

main()
  .catch((e) => {
    console.error('❌ 오류:', e);
    // @ts-ignore - process는 Node.js 환경에서 사용 가능
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

