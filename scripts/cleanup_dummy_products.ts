// scripts/cleanup_dummy_products.ts
// 더미 상품 삭제 및 1000원 테스트 상품 생성 스크립트

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== 더미 상품 정리 시작 ===\n');

  // 1. 삭제할 CruiseProduct 코드 (실제 상품과 지니 테스트 상품 제외)
  const cruiseProductCodesToDelete = [
    'TEST-999',           // 테스트 크루즈 패키지
    'REAL-CRUISE-01',     // 럭셔리 세계일주 (실제상품)
    'USER1-CUSTOMER-001', // 지중해 크루즈
    'USER1-CUSTOMER-002', // 알래스카 크루즈
    'USER1-CUSTOMER-003', // 카리브해 크루즈
    'SAMPLE-MED-001',     // 바르셀로나-마르세유 크루즈
  ];

  // 2. 삭제할 AffiliateProduct 코드 (실제 상품 연결된 것 제외)
  const affiliateProductCodesToDelete = [
    'SAMPLE-PRODUCT',
    'SAMPLE-014',
    'SAMPLE-015',
  ];

  // CruiseProduct 삭제
  console.log('--- CruiseProduct 삭제 ---');
  for (const code of cruiseProductCodesToDelete) {
    const deleted = await prisma.cruiseProduct.deleteMany({
      where: { productCode: code },
    });
    if (deleted.count > 0) {
      console.log(`✓ 삭제됨: ${code}`);
    } else {
      console.log(`- 없음: ${code}`);
    }
  }

  // AffiliateProduct 삭제
  console.log('\n--- AffiliateProduct 삭제 ---');
  for (const code of affiliateProductCodesToDelete) {
    const deleted = await prisma.affiliateProduct.deleteMany({
      where: { productCode: code },
    });
    if (deleted.count > 0) {
      console.log(`✓ 삭제됨: ${code}`);
    } else {
      console.log(`- 없음: ${code}`);
    }
  }

  // 3. 1000원 결제 테스트 상품 생성
  console.log('\n--- 1000원 결제 테스트 상품 생성 ---');

  // CruiseProduct 먼저 생성 (upsert)
  const testCruiseProduct = await prisma.cruiseProduct.upsert({
    where: { productCode: 'PAYMENT-TEST-1000' },
    update: {
      packageName: '결제 테스트 상품 (1000원)',
      basePrice: 1000,
      description: '결제 시스템 테스트용 상품입니다. 실제 크루즈 상품이 아닙니다.',
      isPopular: false,
      isRecommended: false,
      updatedAt: new Date(),
    },
    create: {
      productCode: 'PAYMENT-TEST-1000',
      packageName: '결제 테스트 상품 (1000원)',
      basePrice: 1000,
      cruiseLine: '테스트',
      shipName: '테스트선',
      nights: 0,
      days: 1,
      itineraryPattern: [],
      description: '결제 시스템 테스트용 상품입니다. 실제 크루즈 상품이 아닙니다.',
      isPopular: false,
      isRecommended: false,
      updatedAt: new Date(),
    },
  });
  console.log(`✓ CruiseProduct 생성: ${testCruiseProduct.productCode} (ID: ${testCruiseProduct.id})`);

  // AffiliateProduct 생성 (기존 상품 확인 후 생성/업데이트)
  const effectiveFromDate = new Date('2024-01-01');

  let testAffiliateProduct = await prisma.affiliateProduct.findFirst({
    where: { productCode: 'PAYMENT-TEST-1000' },
  });

  if (testAffiliateProduct) {
    // 기존 상품 업데이트
    testAffiliateProduct = await prisma.affiliateProduct.update({
      where: { id: testAffiliateProduct.id },
      data: {
        title: '결제 테스트 상품 (1000원)',
        defaultSaleAmount: 1000,
        status: 'ACTIVE',
        isPublished: true,
        cruiseProductId: testCruiseProduct.id,
      },
    });
    console.log(`✓ AffiliateProduct 업데이트: ${testAffiliateProduct.productCode} (ID: ${testAffiliateProduct.id})`);
  } else {
    // 새 상품 생성
    testAffiliateProduct = await prisma.affiliateProduct.create({
      data: {
        productCode: 'PAYMENT-TEST-1000',
        title: '결제 테스트 상품 (1000원)',
        defaultSaleAmount: 1000,
        status: 'ACTIVE',
        isPublished: true,
        cruiseProductId: testCruiseProduct.id,
        effectiveFrom: effectiveFromDate,
      },
    });
    console.log(`✓ AffiliateProduct 생성: ${testAffiliateProduct.productCode} (ID: ${testAffiliateProduct.id})`);
  }

  // 최종 상품 목록 출력
  console.log('\n=== 정리 후 상품 목록 ===\n');

  const remainingCruise = await prisma.cruiseProduct.findMany({
    select: { productCode: true, packageName: true, basePrice: true },
    orderBy: { id: 'asc' },
  });
  console.log('CruiseProduct:');
  remainingCruise.forEach(p => {
    console.log(`  - ${p.productCode}: ${p.packageName} (${p.basePrice?.toLocaleString() || 'N/A'}원)`);
  });

  const remainingAffiliate = await prisma.affiliateProduct.findMany({
    select: { productCode: true, title: true, defaultSaleAmount: true },
    orderBy: { id: 'asc' },
  });
  console.log('\nAffiliateProduct:');
  remainingAffiliate.forEach(p => {
    console.log(`  - ${p.productCode}: ${p.title} (${p.defaultSaleAmount?.toLocaleString() || 'N/A'}원)`);
  });

  console.log('\n=== 완료 ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
