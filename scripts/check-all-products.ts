/**
 * 전체 상품 확인 스크립트
 */

import prisma from '../lib/prisma';

async function checkAllProducts() {
  console.log('🔍 전체 상품 확인 시작...\n');

  try {
    const allProducts = await prisma.cruiseProduct.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    console.log(`📦 전체 상품: ${allProducts.length}개\n`);

    allProducts.forEach((product, idx) => {
      console.log(`${idx + 1}. ID: ${product.id}`);
      console.log(`   productCode: ${product.productCode}`);
      console.log(`   packageName: ${product.packageName}`);
      console.log(`   cruiseLine: ${product.cruiseLine}`);
      console.log(`   source: ${product.source}`);
      console.log(`   isMainProduct: ${product.isMainProduct}`);
      console.log(`   basePrice: ${product.basePrice?.toLocaleString() || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAllProducts()
  .then(() => {
    console.log('✅ 확인 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 확인 실패:', error);
    process.exit(1);
  });
