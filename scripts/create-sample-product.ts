// scripts/create-sample-product.ts
// 샘플 크루즈 상품 생성 스크립트 (채팅봇 연결용)

import prisma from '../lib/prisma';

async function main() {
  console.log('🚢 샘플 크루즈 상품 생성 중...\n');

  try {
    // 샘플 상품: MSC 벨리시마 - 일본/대만 4박 5일
    const product = await prisma.cruiseProduct.upsert({
      where: { productCode: 'MSC-JP4N5D' },
      update: {
        saleStatus: '판매중',
        isPopular: true,
        isRecommended: true,
      },
      create: {
        productCode: 'MSC-JP4N5D',
        cruiseLine: 'MSC 크루즈',
        shipName: 'MSC 벨리시마',
        packageName: '일본/대만 4박 5일',
        nights: 4,
        days: 5,
        basePrice: 1200000,
        description: '부산 출발 후쿠오카, 타이베이를 경유하는 4박 5일 크루즈 여행. 일본과 대만의 아름다운 항구 도시를 만나보세요.',
        saleStatus: '판매중',
        isPopular: true,
        isRecommended: true,
        source: 'cruisedot',
        category: '일본/대만',
        tags: ['일본', '대만', '부산출발', '인기상품'],
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
            type: 'PortVisit',
            location: 'Taipei',
            country: 'TW',
            currency: 'TWD',
            language: 'zh-TW',
            arrival: '09:00',
            departure: '19:00',
          },
          {
            day: 5,
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

    console.log('✅ 샘플 상품 생성 완료:');
    console.log(`   상품코드: ${product.productCode}`);
    console.log(`   상품명: ${product.packageName}`);
    console.log(`   크루즈라인: ${product.cruiseLine}`);
    console.log(`   선박명: ${product.shipName}`);
    console.log(`   기간: ${product.nights}박 ${product.days}일`);
    console.log(`   가격: ${product.basePrice?.toLocaleString()}원`);
    console.log(`   판매상태: ${product.saleStatus}`);
    console.log(`   인기상품: ${product.isPopular ? '예' : '아니오'}`);
    console.log(`   추천상품: ${product.isRecommended ? '예' : '아니오'}`);
    console.log('\n💬 채팅봇에서 다음 질문으로 상품을 확인할 수 있습니다:');
    console.log('   - "크루즈 추천해줘"');
    console.log('   - "일본 크루즈 상품 알려줘"');
    console.log('   - "MSC 벨리시마 상품 정보"');
    console.log('   - "부산 출발 크루즈 추천"');
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
