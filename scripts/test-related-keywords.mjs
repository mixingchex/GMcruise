// scripts/test-related-keywords.mjs
// 연관 검색어 생성 로직 테스트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 연관 검색어 생성 로직 테스트...\n');

  // 모든 상품 로드
  const products = await prisma.cruiseProduct.findMany({
    select: {
      productCode: true,
      cruiseLine: true,
      shipName: true,
      MallProductContent: {
        select: {
          layout: true,
        },
      },
    },
  });

  console.log(`📦 총 ${products.length}개의 상품 로드\n`);

  // 키워드 추출 (CruiseSearchBlock 로직과 동일)
  const keywordCounts = {};
  
  products.forEach(product => {
    // MallProductContent.layout.recommendedKeywords 확인
    if (product.MallProductContent?.layout) {
      try {
        const layout = typeof product.MallProductContent.layout === 'string' 
          ? JSON.parse(product.MallProductContent.layout) 
          : product.MallProductContent.layout;
        
        if (layout && typeof layout === 'object' && layout.recommendedKeywords) {
          let keywords = [];
          if (Array.isArray(layout.recommendedKeywords)) {
            keywords = layout.recommendedKeywords;
          } else if (typeof layout.recommendedKeywords === 'string') {
            try {
              keywords = JSON.parse(layout.recommendedKeywords);
            } catch (e) {
              keywords = [layout.recommendedKeywords];
            }
          }
          
          keywords.forEach(keyword => {
            if (keyword && typeof keyword === 'string' && keyword.trim()) {
              const trimmedKeyword = keyword.trim();
              keywordCounts[trimmedKeyword] = (keywordCounts[trimmedKeyword] || 0) + 1;
            }
          });
        }
      } catch (e) {
        console.warn(`⚠️  ${product.productCode}: layout 파싱 실패`);
      }
    }
  });

  // 키워드 정렬 및 표시
  const sortedKeywords = Object.entries(keywordCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log('✅ 추천키워드(마케팅태그) 연관 검색어:');
  console.log(`   총 ${sortedKeywords.length}개의 키워드 추출\n`);
  
  sortedKeywords.forEach(([keyword, count], index) => {
    console.log(`   ${index + 1}. "${keyword}" (${count}개 상품)`);
  });

  console.log('\n📝 이 키워드들이 메인 페이지의 연관 검색어로 표시됩니다!');
  console.log('   (관리자가 입력한 추천키워드가 최우선으로 표시됨)');
}

main()
  .catch((e) => {
    console.error('에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


