// scripts/check_products.ts
// 현재 등록된 상품 확인 스크립트

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== CruiseProduct (크루즈 상품) 목록 ===\n');

  const cruiseProducts = await prisma.cruiseProduct.findMany({
    select: {
      id: true,
      productCode: true,
      packageName: true,
      basePrice: true,
      cruiseLine: true,
      isPopular: true,
      isRecommended: true,
    },
    orderBy: { id: 'asc' },
  });

  if (cruiseProducts.length === 0) {
    console.log('등록된 CruiseProduct가 없습니다.');
  } else {
    cruiseProducts.forEach(p => {
      console.log(`ID: ${p.id}, 코드: ${p.productCode}, 이름: ${p.packageName}, 가격: ${p.basePrice}, 선사: ${p.cruiseLine}, 인기: ${p.isPopular}, 추천: ${p.isRecommended}`);
    });
    console.log(`\n총 ${cruiseProducts.length}개 CruiseProduct`);
  }

  console.log('\n=== AffiliateProduct (제휴 상품) 목록 ===\n');

  const products = await prisma.affiliateProduct.findMany({
    select: {
      id: true,
      productCode: true,
      title: true,
      defaultSaleAmount: true,
      status: true,
      isPublished: true,
      CruiseProduct: {
        select: {
          packageName: true,
          cruiseLine: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  if (products.length === 0) {
    console.log('등록된 상품이 없습니다.');
  } else {
    products.forEach(p => {
      console.log(`ID: ${p.id}, 코드: ${p.productCode}, 이름: ${p.productName}, 가격: ${p.basePrice}, 선사: ${p.cruiseLine}, 활성: ${p.isActive}`);
    });
    console.log(`\n총 ${products.length}개 상품`);
  }

  // 판매원/대리점장 featuredProductCodes 확인
  console.log('\n=== featuredProductCodes 확인 ===\n');

  const profiles = await prisma.affiliateProfile.findMany({
    where: {
      featuredProductCodes: {
        not: null,
      },
    },
    select: {
      id: true,
      mallUserId: true,
      featuredProductCodes: true,
      User: {
        select: {
          name: true,
        },
      },
    },
  });

  if (profiles.length === 0) {
    console.log('featuredProductCodes가 설정된 프로필이 없습니다.');
  } else {
    profiles.forEach(p => {
      console.log(`프로필 ID: ${p.id}, mallUserId: ${p.mallUserId}, 이름: ${p.User?.name}, featuredProductCodes: ${JSON.stringify(p.featuredProductCodes)}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
