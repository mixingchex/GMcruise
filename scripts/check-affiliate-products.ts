// scripts/check-affiliate-products.ts
// 어필리에이트 상품 확인 스크립트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 어필리에이트 상품 확인\n');
  console.log('='.repeat(60));

  // 1. AffiliateProduct 전체 조회
  const allAffiliateProducts = await prisma.affiliateProduct.findMany({
    select: {
      id: true,
      productCode: true,
      title: true,
      status: true,
      isPublished: true,
      effectiveFrom: true,
      effectiveTo: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n📦 전체 AffiliateProduct: ${allAffiliateProducts.length}개\n`);
  allAffiliateProducts.forEach((ap) => {
    console.log(`  [ID: ${ap.id}] ${ap.productCode}`);
    console.log(`    제목: ${ap.title}`);
    console.log(`    상태: ${ap.status}`);
    console.log(`    노출: ${ap.isPublished ? '✅ 노출중' : '❌ 비노출'}`);
    console.log(`    적용 시작: ${ap.effectiveFrom.toISOString()}`);
    console.log(`    적용 종료: ${ap.effectiveTo ? ap.effectiveTo.toISOString() : '없음'}`);
    console.log('');
  });

  // 2. 활성 AffiliateProduct 조회 (API와 동일한 조건)
  const now = new Date();
  const activeAffiliateProducts = await prisma.affiliateProduct.findMany({
    where: {
      AND: [
        { status: 'active' },
        { isPublished: true },
        { effectiveFrom: { lte: now } },
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: now } },
          ],
        },
      ],
    },
    select: {
      id: true,
      productCode: true,
      title: true,
      status: true,
      isPublished: true,
      effectiveFrom: true,
      effectiveTo: true,
    },
  });

  console.log(`\n✅ 활성 AffiliateProduct (API 조건): ${activeAffiliateProducts.length}개\n`);
  if (activeAffiliateProducts.length === 0) {
    console.log('  ⚠️ 활성 상품이 없습니다!');
    console.log('  확인 사항:');
    console.log('    1. status가 "active"인지 확인');
    console.log('    2. isPublished가 true인지 확인');
    console.log('    3. effectiveFrom이 현재 날짜 이전인지 확인');
    console.log('    4. effectiveTo가 null이거나 현재 날짜 이후인지 확인');
  } else {
    activeAffiliateProducts.forEach((ap) => {
      console.log(`  ✅ ${ap.productCode} - ${ap.title}`);
    });
  }

  // 3. CruiseProduct 조회 (AffiliateProduct의 productCode와 일치하는지)
  if (activeAffiliateProducts.length > 0) {
    const productCodes = activeAffiliateProducts.map((ap) => ap.productCode);
    console.log(`\n🚢 CruiseProduct 조회 (productCode: ${productCodes.join(', ')})\n`);

    const cruiseProducts = await prisma.cruiseProduct.findMany({
      where: {
        productCode: {
          in: productCodes,
        },
      },
      select: {
        id: true,
        productCode: true,
        cruiseLine: true,
        shipName: true,
        packageName: true,
        saleStatus: true,
      },
    });

    console.log(`  찾은 CruiseProduct: ${cruiseProducts.length}개\n`);
    if (cruiseProducts.length === 0) {
      console.log('  ⚠️ CruiseProduct가 없습니다!');
      console.log('  확인 사항:');
      console.log('    1. 크루즈 상품 관리 페이지에서 상품이 등록되어 있는지 확인');
      console.log('    2. productCode가 AffiliateProduct와 정확히 일치하는지 확인');
      productCodes.forEach((code) => {
        console.log(`      - AffiliateProduct.productCode: "${code}"`);
      });
    } else {
      cruiseProducts.forEach((cp) => {
        console.log(`  ✅ ${cp.productCode} - ${cp.cruiseLine} ${cp.shipName}`);
        console.log(`     판매 상태: ${cp.saleStatus || 'null'}`);
      });
    }

    // 일치하지 않는 productCode 찾기
    const cruiseProductCodes = new Set(cruiseProducts.map((cp) => cp.productCode));
    const missingCodes = productCodes.filter((code) => !cruiseProductCodes.has(code));
    if (missingCodes.length > 0) {
      console.log(`\n  ⚠️ CruiseProduct에 없는 productCode:\n`);
      missingCodes.forEach((code) => {
        console.log(`    - "${code}"`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });







