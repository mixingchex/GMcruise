// scripts/check-product-in-api.ts
// API에서 SAMPLE-MED-001 상품이 반환되는지 확인

import prisma from '../lib/prisma';

async function main() {
  console.log('🔍 API 응답 형식으로 상품 확인 중...\n');

  // API와 동일한 방식으로 상품 조회
  const products = await prisma.cruiseProduct.findMany({
    select: {
      id: true,
      productCode: true,
      cruiseLine: true,
      shipName: true,
      packageName: true,
      nights: true,
      days: true,
      itineraryPattern: true,
      basePrice: true,
      description: true,
      source: true,
      category: true,
      tags: true,
      isPopular: true,
      isRecommended: true,
      isPremium: true,
      isGeniePack: true,
      isDomestic: true,
      isJapan: true,
      isBudget: true,
      isUrgent: true,
      isMainProduct: true,
      saleStatus: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      MallProductContent: {
        select: {
          layout: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`✅ 총 ${products.length}개 상품 발견\n`);

  const sampleProduct = products.find(p => p.productCode === 'SAMPLE-MED-001');
  
  if (sampleProduct) {
    console.log('✅ SAMPLE-MED-001 상품이 API 응답에 포함되어 있습니다!\n');
    console.log('📋 상품 정보:');
    console.log(`  - ID: ${sampleProduct.id}`);
    console.log(`  - 상품코드: ${sampleProduct.productCode}`);
    console.log(`  - 크루즈라인: ${sampleProduct.cruiseLine}`);
    console.log(`  - 선박명: ${sampleProduct.shipName}`);
    console.log(`  - 패키지명: ${sampleProduct.packageName}`);
    console.log(`  - 판매상태: ${sampleProduct.saleStatus || '판매중'}`);
    console.log(`  - 지니팩: ${sampleProduct.isGeniePack ? '예' : '아니오'}`);
    console.log(`  - 생성일: ${sampleProduct.createdAt}`);
    console.log(`  - 수정일: ${sampleProduct.updatedAt}`);
  } else {
    console.log('❌ SAMPLE-MED-001 상품이 API 응답에 없습니다!');
    console.log('\n📋 전체 상품 목록:');
    products.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.productCode} - ${p.packageName}`);
    });
  }

  console.log('\n💡 관리 페이지에서 상품이 보이지 않는다면:');
  console.log('  1. 페이지를 새로고침하세요 (Ctrl+F5 또는 Cmd+Shift+R)');
  console.log('  2. 필터를 모두 "전체"로 설정하세요');
  console.log('  3. 검색어를 비우세요');
  console.log('  4. 브라우저 콘솔(F12)에서 오류를 확인하세요');
}

main()
  .catch((e) => {
    console.error('❌ 오류:', e);
    // @ts-ignore - process는 Node.js 환경에서 사용 가능
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

