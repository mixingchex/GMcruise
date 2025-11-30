/**
 * 샘플 상품에 테스트용 요금표 추가 스크립트
 * 모든 가격을 1000원으로 설정하여 결제 테스트 가능하도록 함
 * 
 * 실행 방법:
 * npx tsx scripts/add-sample-pricing.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 테스트용 요금표 데이터 (1000원으로 설정)
const testPricingRows = [
  {
    id: 'test-inside-1',
    roomType: '인사이드 (창문없음)',
    adult: 1000,           // 성인 1000원
    adult3rd: 1000,        // 성인3번째 1000원
    child2to11: 1000,      // 만2-11세 1000원
    infantUnder2: 0,       // 만2세미만 무료
  },
  {
    id: 'test-oceanview-1',
    roomType: '오션뷰 (창문)',
    adult: 1000,
    adult3rd: 1000,
    child2to11: 1000,
    infantUnder2: 0,
  },
  {
    id: 'test-balcony-1',
    roomType: '발코니',
    adult: 1000,
    adult3rd: 1000,
    child2to11: 1000,
    infantUnder2: 0,
  },
  {
    id: 'test-suite-1',
    roomType: '스위트',
    adult: 1000,
    adult3rd: 1000,
    child2to11: 1000,
    infantUnder2: 0,
  },
];

// 테스트용 출발일 (오늘 기준 30일 후)
const getTestDepartureDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};

async function addSamplePricing() {
  console.log('💰 샘플 상품 테스트 요금표 추가 시작...\n');

  try {
    // 1. 샘플 상품들 조회
    const sampleProducts = await prisma.cruiseProduct.findMany({
      where: {
        OR: [
          { productCode: { startsWith: 'SAMPLE-' } },
          { productCode: { startsWith: 'LOTTE_' } },
          { productCode: { startsWith: 'CRUISEDOT_' } },
          { productCode: { startsWith: 'DOUBLEU_' } },
          { isMainProduct: true },
        ],
      },
      select: {
        id: true,
        productCode: true,
        packageName: true,
      },
    });

    console.log(`📊 총 ${sampleProducts.length}개 샘플 상품 발견\n`);

    let updatedCount = 0;
    const departureDate = getTestDepartureDate();

    for (const product of sampleProducts) {
      // MallProductContent 확인
      const existingContent = await prisma.mallProductContent.findUnique({
        where: { productCode: product.productCode },
      });

      if (existingContent) {
        // 기존 레코드 업데이트
        const existingLayout = typeof existingContent.layout === 'string'
          ? JSON.parse(existingContent.layout)
          : existingContent.layout || {};

        const newLayout = {
          ...existingLayout,
          pricing: testPricingRows,
          departureDate: departureDate,  // 출발일도 설정
        };

        await prisma.mallProductContent.update({
          where: { productCode: product.productCode },
          data: {
            layout: newLayout,
            updatedAt: new Date(),
          },
        });

        console.log(`✅ ${product.productCode}: 요금표 추가 완료`);
        updatedCount++;
      } else {
        // 새 레코드 생성
        await prisma.mallProductContent.create({
          data: {
            productCode: product.productCode,
            layout: {
              pricing: testPricingRows,
              departureDate: departureDate,
              contactOptions: {
                payment: true,
                phoneCall: true,
                aiChatbot: true,
              },
            },
            isActive: true,
            updatedAt: new Date(),
          },
        });

        console.log(`🆕 ${product.productCode}: 새 요금표 생성 완료`);
        updatedCount++;
      }
    }

    console.log(`\n📊 요금표 추가 완료:`);
    console.log(`   ✅ 업데이트: ${updatedCount}개`);
    console.log(`\n💰 테스트 요금표 설정:`);
    console.log(`   📅 출발일: ${departureDate}`);
    console.log(`   🏠 인사이드: 1,000원`);
    console.log(`   🌊 오션뷰: 1,000원`);
    console.log(`   🌅 발코니: 1,000원`);
    console.log(`   👑 스위트: 1,000원`);
    console.log(`\n🎉 이제 결제 페이지에서 테스트할 수 있습니다!`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
addSamplePricing()
  .then(() => {
    console.log('\n✨ 스크립트 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 실행 실패:', error);
    process.exit(1);
  });


