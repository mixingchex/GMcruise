/**
 * 샘플 상품 업데이트 스크립트
 * - 롯데JTB, 크루즈닷, 더블유 각 3개씩 총 9개를 isMainProduct = true로 설정
 */

import prisma from '../lib/prisma';

async function updateSampleProducts() {
  console.log('🔧 샘플 상품 업데이트 시작...\n');

  try {
    // 롯데JTB, 크루즈닷, 더블유 상품 코드 목록
    const sampleProductCodes = [
      // 롯데JTB 3개
      'LOTTE_MEDITERRANEAN_2025',
      'LOTTE_ALASKA_2025',
      'LOTTE_CARIBBEAN_2025',
      // 크루즈닷 3개
      'CRUISEDOT_JAPAN_ONSEN_2025',
      'CRUISEDOT_SOUTHEAST_5_2025',
      'CRUISEDOT_MEDITERRANEAN_LUX_2025',
      // 더블유 3개
      'DOUBLEU_OKINAWA_2025',
      'DOUBLEU_NORTHERN_EUROPE_2025',
      'DOUBLEU_WORLD_CRUISE_2025',
    ];

    console.log('📋 업데이트할 상품 목록:');
    sampleProductCodes.forEach((code, idx) => {
      console.log(`   ${idx + 1}. ${code}`);
    });
    console.log('');

    // 1. 먼저 모든 상품의 isMainProduct를 false로 설정
    console.log('1️⃣ 모든 상품의 isMainProduct를 false로 초기화...');
    const resetResult = await prisma.cruiseProduct.updateMany({
      where: {},
      data: {
        isMainProduct: false,
      },
    });
    console.log(`   ✅ ${resetResult.count}개 상품 초기화 완료\n`);

    // 2. 9개 샘플 상품만 isMainProduct를 true로 설정
    console.log('2️⃣ 샘플 상품 9개를 isMainProduct=true로 업데이트...');
    const updateResult = await prisma.cruiseProduct.updateMany({
      where: {
        productCode: {
          in: sampleProductCodes,
        },
      },
      data: {
        isMainProduct: true,
      },
    });
    console.log(`   ✅ ${updateResult.count}개 상품 업데이트 완료\n`);

    // 3. 업데이트된 상품 확인
    console.log('3️⃣ 업데이트된 샘플 상품 확인...');
    const updatedProducts = await prisma.cruiseProduct.findMany({
      where: {
        isMainProduct: true,
      },
      orderBy: {
        source: 'asc',
      },
    });

    console.log(`\n📦 샘플 상품 (isMainProduct=true): ${updatedProducts.length}개\n`);

    // source별로 그룹화
    const grouped: { [key: string]: any[] } = {};
    updatedProducts.forEach((p) => {
      const source = p.source || 'unknown';
      if (!grouped[source]) {
        grouped[source] = [];
      }
      grouped[source].push(p);
    });

    // source별 출력
    console.log('=' .repeat(80));
    console.log('📊 여행사별 샘플 상품 분포');
    console.log('='.repeat(80));

    for (const [source, products] of Object.entries(grouped)) {
      console.log(`\n🏢 ${source}: ${products.length}개`);
      products.forEach((p, idx) => {
        console.log(`   ${idx + 1}. [${p.productCode}] ${p.packageName}`);
        console.log(`      - 크루즈라인: ${p.cruiseLine}`);
        console.log(`      - 가격: ${p.basePrice ? p.basePrice.toLocaleString() + '원' : '가격 미정'}`);
      });
    }

    // 4. 목표 확인
    console.log('\n' + '='.repeat(80));
    console.log('✅ 샘플 상품 목표 확인');
    console.log('='.repeat(80));

    const targetSources = ['롯데JTB', '크루즈닷', '더블유'];
    let allGood = true;

    targetSources.forEach((source) => {
      const count = grouped[source]?.length || 0;
      const status = count === 3 ? '✅' : '❌';
      console.log(`${status} ${source}: ${count}/3개`);

      if (count !== 3) {
        allGood = false;
      }
    });

    const totalSamples = updatedProducts.length;
    const totalStatus = totalSamples === 9 ? '✅' : '❌';
    console.log(`${totalStatus} 전체 샘플 상품: ${totalSamples}/9개\n`);

    console.log('='.repeat(80));

    if (allGood) {
      console.log('🎉 샘플 상품 설정이 완벽합니다!\n');
    } else {
      console.log('⚠️  샘플 상품 설정을 확인해주세요.\n');
    }

    return {
      success: allGood,
      updatedCount: updateResult.count,
      totalSamples,
    };
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
updateSampleProducts()
  .then((result) => {
    console.log('✅ 업데이트 완료');
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 업데이트 실패:', error);
    process.exit(1);
  });
