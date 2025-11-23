// scripts/add-sample-keywords.mjs
// 기존 상품에 샘플 키워드 추가

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 상품별 키워드 매핑
const productKeywords = {
  'POP-JP-001': ['일본 크루즈', '가족여행', '첫 크루즈', '로얄 캐리비안', '스펙트럼'],
  'POP-SEA-001': ['동남아 크루즈', '프린세스', '사파이어', '해외여행', '휴양'],
  'MSC-JP4N5D': ['MSC 크루즈', '벨리시마', '일본', '대만', '부산 출발', '4박5일'],
  // 추가 상품 코드와 키워드를 여기에 추가
};

// 지역별 기본 키워드
const regionKeywords = {
  'japan': ['일본', '후쿠오카', '오사카', '도쿄', '규슈'],
  'alaska': ['알래스카', '빙하', '야생동물', '북극'],
  'southeast-asia': ['동남아', '태국', '베트남', '싱가포르', '말레이시아'],
  'usa': ['미국', '시애틀', '알래스카', '하와이'],
};

async function main() {
  console.log('🔑 상품에 샘플 키워드 추가 시작...\n');

  // 모든 상품 조회
  const products = await prisma.cruiseProduct.findMany({
    select: {
      productCode: true,
      cruiseLine: true,
      shipName: true,
      itineraryPattern: true,
    },
  });

  console.log(`📦 총 ${products.length}개의 상품 발견\n`);

  let updatedCount = 0;
  let createdCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      // 키워드 생성
      let keywords = [];

      // 1. 상품 코드별 키워드
      if (productKeywords[product.productCode]) {
        keywords.push(...productKeywords[product.productCode]);
      }

      // 2. 크루즈 라인에서 키워드 추출
      if (product.cruiseLine) {
        const cruiseLineName = product.cruiseLine.split('(')[0].trim();
        if (cruiseLineName && !keywords.includes(cruiseLineName)) {
          keywords.push(cruiseLineName);
        }
      }

      // 3. 선박명에서 키워드 추출
      if (product.shipName) {
        const shipName = product.shipName.split('(')[0].trim();
        if (shipName && !keywords.includes(shipName)) {
          keywords.push(shipName);
        }
      }

      // 4. itineraryPattern에서 지역 추출
      if (product.itineraryPattern && Array.isArray(product.itineraryPattern)) {
        product.itineraryPattern.forEach((item) => {
          if (item && item.country) {
            const country = item.country.toString().toLowerCase();
            if (country.includes('jp') || country.includes('japan')) {
              keywords.push('일본', '일본 크루즈');
            } else if (country.includes('us') || country.includes('usa')) {
              keywords.push('미국', '미국 크루즈');
            } else if (country.includes('th') || country.includes('thailand')) {
              keywords.push('태국', '동남아 크루즈');
            } else if (country.includes('vn') || country.includes('vietnam')) {
              keywords.push('베트남', '동남아 크루즈');
            } else if (country.includes('sg') || country.includes('singapore')) {
              keywords.push('싱가포르', '싱가포르 크루즈');
            }
          }
        });
      }

      // 중복 제거
      keywords = [...new Set(keywords)].filter(k => k && k.trim());

      if (keywords.length === 0) {
        console.log(`⚠️  ${product.productCode}: 키워드 없음, 스킵`);
        continue;
      }

      // 기존 MallProductContent 조회
      const existingContent = await prisma.mallProductContent.findUnique({
        where: { productCode: product.productCode },
        select: { layout: true },
      });

      let layout = {};
      if (existingContent?.layout) {
        layout = typeof existingContent.layout === 'string'
          ? JSON.parse(existingContent.layout)
          : existingContent.layout;
      }

      // recommendedKeywords 추가/업데이트
      layout.recommendedKeywords = keywords;

      // MallProductContent 업데이트 또는 생성
      const now = new Date();
      await prisma.mallProductContent.upsert({
        where: { productCode: product.productCode },
        update: {
          layout: layout,
          updatedAt: now,
        },
        create: {
          productCode: product.productCode,
          layout: layout,
          isActive: true,
          updatedAt: now,
        },
      });

      if (existingContent) {
        console.log(`✅ ${product.productCode}: 키워드 업데이트 (${keywords.length}개) - ${keywords.slice(0, 3).join(', ')}...`);
        updatedCount++;
      } else {
        console.log(`🆕 ${product.productCode}: MallProductContent 생성 및 키워드 추가 (${keywords.length}개) - ${keywords.slice(0, 3).join(', ')}...`);
        createdCount++;
      }
    } catch (error) {
      console.error(`❌ ${product.productCode}: 오류 -`, error.message);
      errorCount++;
    }
  }

  console.log('\n✨ 샘플 키워드 추가 완료!');
  console.log(`   ✅ 업데이트: ${updatedCount}개`);
  console.log(`   🆕 생성: ${createdCount}개`);
  console.log(`   ❌ 실패: ${errorCount}개`);
}

main()
  .catch((e) => {
    console.error('에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

