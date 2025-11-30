/**
 * 샘플 상품의 source 값 수정 스크립트
 * 
 * 문제: 기존 샘플 상품들의 source가 '롯데JTB', '크루즈닷', '더블유' 등으로 저장되어 있어
 *       ProductCard.tsx에서 로고 이미지가 표시되지 않음
 * 
 * 해결: source 값을 'lottejtb', 'cruisedot', 'wcruise'로 수정하여 로고가 정상 표시되도록 함
 * 
 * 실행 방법:
 * npx tsx scripts/fix-sample-product-sources.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// source 값 매핑
const SOURCE_MAPPING: Record<string, string> = {
  '롯데JTB': 'lottejtb',
  '롯데제이티비': 'lottejtb',
  '롯데 제이티비': 'lottejtb',
  'LotteJTB': 'lottejtb',
  '크루즈닷': 'cruisedot',
  'Cruisedot': 'cruisedot',
  'CruiseDot': 'cruisedot',
  '더블유': 'wcruise',
  'Wcruise': 'wcruise',
  'W크루즈': 'wcruise',
  'manual': 'cruisedot',  // manual도 크루즈닷 로고로 표시
};

async function fixSampleProductSources() {
  console.log('🔧 샘플 상품 source 값 수정 시작...\n');

  try {
    // 1. 현재 샘플 상품들 조회
    const sampleProducts = await prisma.cruiseProduct.findMany({
      where: {
        OR: [
          { productCode: { startsWith: 'SAMPLE-' } },
          { productCode: { startsWith: 'LOTTE_' } },
          { productCode: { startsWith: 'CRUISEDOT_' } },
          { productCode: { startsWith: 'DOUBLEU_' } },
          { source: { in: Object.keys(SOURCE_MAPPING) } },
          { isMainProduct: true },  // 메인 페이지에 표시되는 상품들
        ],
      },
      select: {
        id: true,
        productCode: true,
        packageName: true,
        source: true,
      },
    });

    console.log(`📊 총 ${sampleProducts.length}개 샘플 상품 발견\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of sampleProducts) {
      const currentSource = product.source || 'manual';
      let newSource: string;

      // 1. 매핑에서 찾기
      if (SOURCE_MAPPING[currentSource]) {
        newSource = SOURCE_MAPPING[currentSource];
      }
      // 2. packageName에서 여행사 추출
      else if (product.packageName?.includes('[롯데JTB]') || product.packageName?.includes('[롯데제이티비]')) {
        newSource = 'lottejtb';
      }
      else if (product.packageName?.includes('[크루즈닷]')) {
        newSource = 'cruisedot';
      }
      else if (product.packageName?.includes('[더블유]') || product.packageName?.includes('[Wcruise]')) {
        newSource = 'wcruise';
      }
      // 3. 이미 올바른 값이면 스킵
      else if (['lottejtb', 'cruisedot', 'wcruise'].includes(currentSource)) {
        console.log(`⏭️  ${product.productCode}: 이미 올바른 source (${currentSource})`);
        skippedCount++;
        continue;
      }
      // 4. 기본값
      else {
        newSource = 'cruisedot';
      }

      // source가 동일하면 스킵
      if (currentSource === newSource) {
        console.log(`⏭️  ${product.productCode}: source 변경 없음 (${currentSource})`);
        skippedCount++;
        continue;
      }

      // 업데이트 실행
      await prisma.cruiseProduct.update({
        where: { id: product.id },
        data: { source: newSource },
      });

      console.log(`✅ ${product.productCode}: ${currentSource} → ${newSource}`);
      updatedCount++;
    }

    console.log(`\n📊 수정 완료:`);
    console.log(`   ✅ 업데이트: ${updatedCount}개`);
    console.log(`   ⏭️  스킵: ${skippedCount}개`);
    console.log(`\n🎉 source 수정 완료! 이제 크루즈몰에서 로고가 정상 표시됩니다.`);

    // 최종 상태 확인
    console.log('\n📋 최종 source 분포:');
    const sourceStats = await prisma.cruiseProduct.groupBy({
      by: ['source'],
      _count: { source: true },
      where: {
        OR: [
          { productCode: { startsWith: 'SAMPLE-' } },
          { productCode: { startsWith: 'LOTTE_' } },
          { productCode: { startsWith: 'CRUISEDOT_' } },
          { productCode: { startsWith: 'DOUBLEU_' } },
          { isMainProduct: true },
        ],
      },
    });

    for (const stat of sourceStats) {
      const logo = stat.source === 'lottejtb' ? '롯데JTB 로고' :
                   stat.source === 'cruisedot' ? '크루즈닷 로고' :
                   stat.source === 'wcruise' ? '더블유 로고' : '로고 없음';
      console.log(`   ${stat.source || 'null'}: ${stat._count.source}개 (${logo})`);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
fixSampleProductSources()
  .then(() => {
    console.log('\n✨ 스크립트 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 실행 실패:', error);
    process.exit(1);
  });


