// scripts/verify-sample-med-001.ts
// SAMPLE-MED-001 상품 확인 스크립트

import prisma from '../lib/prisma';

async function main() {
  console.log('🔍 SAMPLE-MED-001 상품 확인 중...\n');

  const product = await prisma.cruiseProduct.findUnique({
    where: { productCode: 'SAMPLE-MED-001' },
  });

  if (!product) {
    console.error('❌ SAMPLE-MED-001 상품을 찾을 수 없습니다!');
    // @ts-ignore - process는 Node.js 환경에서 사용 가능
    process.exit(1);
  }

  console.log('✅ SAMPLE-MED-001 상품 확인 완료!\n');
  console.log('📋 상품 정보:');
  console.log(`  - 상품코드: ${product.productCode}`);
  console.log(`  - 크루즈라인: ${product.cruiseLine}`);
  console.log(`  - 선박명: ${product.shipName}`);
  console.log(`  - 패키지명: ${product.packageName}`);
  console.log(`  - 여행기간: ${product.nights}박 ${product.days}일`);
  console.log(`  - 지니팩 (isGeniePack): ${product.isGeniePack ? '✅ 예 (3일 체험용)' : '❌ 아니오'}`);
  console.log(`  - 판매상태: ${product.saleStatus || 'N/A'}`);
  console.log(`  - 상품 ID: ${product.id}`);
  
  if (product.isGeniePack) {
    console.log('\n✅ 3일 체험용 테스트 상품으로 올바르게 설정되었습니다!');
  } else {
    console.log('\n⚠️  isGeniePack이 false로 설정되어 있습니다. 3일 체험용으로 사용하려면 true로 설정해야 합니다.');
  }
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

