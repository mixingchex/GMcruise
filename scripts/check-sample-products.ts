/**
 * 샘플 상품 확인 스크립트
 * - 7일 무료체험용 샘플 상품 9개 확인
 * - 롯데제이티비, 더블유, 크루즈닷 각 3개씩
 */

import prisma from '../lib/prisma';

async function checkSampleProducts() {
  console.log('🔍 샘플 상품 확인 시작...\n');

  try {
    // 1. 전체 상품 수 확인
    const totalProducts = await prisma.cruiseProduct.count();
    console.log(`📦 전체 상품 수: ${totalProducts}개\n`);

    // 2. 샘플 상품 확인 (isMainProduct = true)
    const sampleProducts = await prisma.cruiseProduct.findMany({
      where: {
        isMainProduct: true,
      },
      orderBy: {
        cruiseLine: 'asc',
      },
    });

    console.log(`🎯 샘플 상품 (isMainProduct=true): ${sampleProducts.length}개\n`);

    // 3. 크루즈 라인별 분류
    const groupedByCruiseLine: { [key: string]: any[] } = {};

    sampleProducts.forEach((product) => {
      if (!groupedByCruiseLine[product.cruiseLine]) {
        groupedByCruiseLine[product.cruiseLine] = [];
      }
      groupedByCruiseLine[product.cruiseLine].push(product);
    });

    // 4. 크루즈 라인별 출력
    console.log('=' .repeat(80));
    console.log('📊 크루즈 라인별 샘플 상품 분포');
    console.log('='.repeat(80));

    for (const [cruiseLine, products] of Object.entries(groupedByCruiseLine)) {
      console.log(`\n🚢 ${cruiseLine}: ${products.length}개`);
      products.forEach((p, idx) => {
        console.log(`   ${idx + 1}. [${p.productCode}] ${p.packageName}`);
        console.log(`      - 선박: ${p.shipName}`);
        console.log(`      - 기간: ${p.nights}박 ${p.days}일`);
        console.log(`      - 가격: ${p.basePrice ? p.basePrice.toLocaleString() + '원' : '가격 미정'}`);
        console.log(`      - 판매상태: ${p.saleStatus}`);
      });
    }

    // 5. 목표 확인
    console.log('\n' + '='.repeat(80));
    console.log('✅ 샘플 상품 목표 확인');
    console.log('='.repeat(80));

    const targetCruiseLines = ['롯데제이티비', '더블유', '크루즈닷'];
    let allGood = true;

    targetCruiseLines.forEach((cruiseLine) => {
      const count = groupedByCruiseLine[cruiseLine]?.length || 0;
      const status = count === 3 ? '✅' : '❌';
      console.log(`${status} ${cruiseLine}: ${count}/3개`);

      if (count !== 3) {
        allGood = false;
      }
    });

    const totalSamples = sampleProducts.length;
    const totalStatus = totalSamples === 9 ? '✅' : '❌';
    console.log(`${totalStatus} 전체 샘플 상품: ${totalSamples}/9개\n`);

    // 6. AffiliateProduct 연결 확인
    console.log('='.repeat(80));
    console.log('🔗 어필리에이트 상품 연결 확인');
    console.log('='.repeat(80));

    const affiliateProducts = await prisma.affiliateProduct.findMany({
      include: {
        CruiseProduct: true,
      },
    });

    console.log(`\n📌 어필리에이트 등록 상품: ${affiliateProducts.length}개`);

    if (affiliateProducts.length > 0) {
      console.log('\n어필리에이트 상품 목록:');
      affiliateProducts.forEach((ap, idx) => {
        console.log(`\n${idx + 1}. 어필리에이트 ID: ${ap.id}`);
        console.log(`   - 상품코드: ${ap.productCode}`);
        console.log(`   - 상품명: ${ap.CruiseProduct?.packageName || 'N/A'}`);
        console.log(`   - 크루즈라인: ${ap.CruiseProduct?.cruiseLine || 'N/A'}`);
        console.log(`   - 커미션: ${ap.commissionRate}%`);
        console.log(`   - 상태: ${ap.isActive ? '활성' : '비활성'}`);
      });
    } else {
      console.log('\n⚠️  어필리에이트 등록 상품이 없습니다.');
    }

    console.log('\n' + '='.repeat(80));

    if (allGood) {
      console.log('🎉 샘플 상품 설정이 완벽합니다!\n');
    } else {
      console.log('⚠️  샘플 상품 설정을 확인해주세요.\n');
    }

    return {
      success: allGood,
      totalProducts,
      sampleProducts: totalSamples,
      groupedByCruiseLine,
      affiliateProducts: affiliateProducts.length,
    };
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
checkSampleProducts()
  .then((result) => {
    console.log('✅ 확인 완료');
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 확인 실패:', error);
    process.exit(1);
  });
