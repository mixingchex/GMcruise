// scripts/create-test-product.ts
// 테스트용 크루즈 상품 생성 스크립트

import prisma from '../lib/prisma';

async function main() {
  console.log('🚢 테스트용 크루즈 상품 생성 중...\n');

  try {
    // 테스트 상품: 상품코드 TEST-999
    const product = await prisma.cruiseProduct.upsert({
      where: { productCode: 'TEST-999' },
      update: {
        saleStatus: '판매중',
        isPopular: true,
        isRecommended: true,
        updatedAt: new Date(),
      },
      create: {
        productCode: 'TEST-999',
        cruiseLine: '테스트 크루즈라인',
        shipName: '테스트 선박',
        packageName: '테스트 크루즈 패키지',
        nights: 3,
        days: 4,
        basePrice: 500000,
        description: '테스트용 크루즈 상품입니다. 화면 테스트를 위해 생성된 데이터입니다.',
        saleStatus: '판매중',
        isPopular: true,
        isRecommended: true,
        source: 'test',
        category: '테스트',
        tags: ['테스트', '샘플'],
        itineraryPattern: [
          {
            day: 1,
            type: 'Embarkation',
            location: 'Busan',
            country: 'KR',
            currency: 'KRW',
            language: 'ko',
            time: '14:00',
          },
          {
            day: 2,
            type: 'PortVisit',
            location: 'Fukuoka',
            country: 'JP',
            currency: 'JPY',
            language: 'ja',
            arrival: '08:00',
            departure: '18:00',
          },
          {
            day: 3,
            type: 'Cruising',
          },
          {
            day: 4,
            type: 'Disembarkation',
            location: 'Busan',
            country: 'KR',
            currency: 'KRW',
            language: 'ko',
            time: '09:00',
          },
        ],
        updatedAt: new Date(),
      },
    });

    console.log('✅ 테스트 상품 생성 완료:');
    console.log(`   상품코드: ${product.productCode}`);
    console.log(`   상품명: ${product.packageName}`);
    console.log(`   크루즈라인: ${product.cruiseLine}`);
    console.log(`   선박명: ${product.shipName}`);
    console.log(`   기간: ${product.nights}박 ${product.days}일`);
    console.log(`   가격: ${product.basePrice?.toLocaleString()}원`);
    console.log(`   판매상태: ${product.saleStatus}`);
    console.log(`   인기상품: ${product.isPopular ? '예' : '아니오'}`);
    console.log(`   추천상품: ${product.isRecommended ? '예' : '아니오'}`);
    console.log('\n💡 이제 화면에서 테스트할 수 있습니다!');
  } catch (error) {
    console.error('❌ 상품 생성 실패:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    // @ts-ignore - process는 Node.js 환경에서 사용 가능
    process.exit(1);
  });

