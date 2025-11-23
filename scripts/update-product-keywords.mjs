// scripts/update-product-keywords.mjs
// 기존 상품에 관리자 패널에서 입력하는 것과 같은 추천키워드(마케팅태그) 추가

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 상품별 추천키워드 (관리자가 입력하는 마케팅태그 예시)
const productKeywords = {
  'TEST-2025-JP-02': ['가족여행', '첫 크루즈', '일본', '할인특가', '로열 캐리비안'],
  'TEST-2025-TW-03': ['신혼여행', '노르웨이', '프리미엄', '럭셔리', '할인특가'],
  'TEST-2025-HK-01': ['MSC 크루즈', '홍콩', '가족여행', '첫 크루즈', '특가'],
  'SAMPLE-MED-001': ['지중해', '프리미엄', '럭셔리', '할인특가', 'Celebrity'],
  'MSC-JP4N5D': ['일본', '대만', '부산 출발', '가족여행', '첫 크루즈', '4박5일', '할인특가'],
};

async function main() {
  console.log('🔑 상품에 추천키워드(마케팅태그) 업데이트 시작...\n');

  let updatedCount = 0;
  let createdCount = 0;
  let errorCount = 0;

  for (const [productCode, keywords] of Object.entries(productKeywords)) {
    try {
      // 상품 존재 확인
      const product = await prisma.cruiseProduct.findUnique({
        where: { productCode },
        select: { productCode: true },
      });

      if (!product) {
        console.log(`⚠️  ${productCode}: 상품을 찾을 수 없음, 스킵`);
        continue;
      }

      // 기존 MallProductContent 조회
      const existingContent = await prisma.mallProductContent.findUnique({
        where: { productCode },
        select: { layout: true },
      });

      let layout = {};
      if (existingContent?.layout) {
        layout = typeof existingContent.layout === 'string'
          ? JSON.parse(existingContent.layout)
          : existingContent.layout;
      }

      // 추천키워드 업데이트 (관리자가 입력하는 것과 동일한 형식)
      layout.recommendedKeywords = keywords;

      // MallProductContent 업데이트 또는 생성
      const now = new Date();
      await prisma.mallProductContent.upsert({
        where: { productCode },
        update: {
          layout: layout,
          updatedAt: now,
        },
        create: {
          productCode,
          layout: layout,
          isActive: true,
          updatedAt: now,
        },
      });

      if (existingContent) {
        console.log(`✅ ${productCode}: 추천키워드 업데이트 (${keywords.length}개)`);
        console.log(`   키워드: ${keywords.join(', ')}`);
        updatedCount++;
      } else {
        console.log(`🆕 ${productCode}: MallProductContent 생성 및 추천키워드 추가 (${keywords.length}개)`);
        console.log(`   키워드: ${keywords.join(', ')}`);
        createdCount++;
      }
    } catch (error) {
      console.error(`❌ ${productCode}: 오류 -`, error.message);
      errorCount++;
    }
  }

  console.log('\n✨ 추천키워드 업데이트 완료!');
  console.log(`   ✅ 업데이트: ${updatedCount}개`);
  console.log(`   🆕 생성: ${createdCount}개`);
  console.log(`   ❌ 실패: ${errorCount}개`);
  console.log('\n📝 이제 메인 페이지를 새로고침하면 추천키워드가 연관 검색어로 표시됩니다!');
}

main()
  .catch((e) => {
    console.error('에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


