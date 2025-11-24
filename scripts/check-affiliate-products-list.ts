/**
 * 어필리에이트 상품 목록 확인 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/check-affiliate-products-list.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAffiliateProducts() {
  try {
    const now = new Date();
    
    console.log('🔍 어필리에이트 상품 목록 확인 중...\n');
    
    // 유효한 AffiliateProduct 조회
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
        status: true,
        isPublished: true,
        effectiveFrom: true,
        effectiveTo: true,
        title: true,
        CruiseProduct: {
          select: {
            cruiseLine: true,
            shipName: true,
            packageName: true,
          },
        },
      },
      orderBy: {
        productCode: 'asc',
      },
    });

    console.log(`✅ 유효한 어필리에이트 상품: ${activeAffiliateProducts.length}개\n`);
    
    if (activeAffiliateProducts.length === 0) {
      console.log('⚠️  유효한 어필리에이트 상품이 없습니다.');
      console.log('   어필리에이트 수당을 설정하고 게시해야 구매몰에 표시됩니다.\n');
    } else {
      console.log('📋 어필리에이트 상품 목록:\n');
      activeAffiliateProducts.forEach((ap, index) => {
        const product = ap.CruiseProduct;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com';
        const detailUrl = `${baseUrl}/products/${ap.productCode}`;
        
        console.log(`${index + 1}. ${ap.productCode}`);
        console.log(`   상품명: ${product?.packageName || ap.title || 'N/A'}`);
        console.log(`   크루즈: ${product?.cruiseLine || 'N/A'} - ${product?.shipName || 'N/A'}`);
        console.log(`   상태: ${ap.status} | 게시: ${ap.isPublished ? '예' : '아니오'}`);
        console.log(`   적용기간: ${ap.effectiveFrom?.toISOString().split('T')[0] || 'N/A'} ~ ${ap.effectiveTo?.toISOString().split('T')[0] || '무제한'}`);
        console.log(`   상세페이지: ${detailUrl}`);
        console.log('');
      });
    }

    // 유효하지 않은 AffiliateProduct 조회 (참고용)
    const inactiveAffiliateProducts = await prisma.affiliateProduct.findMany({
      where: {
        OR: [
          { status: { not: 'active' } },
          { isPublished: false },
          { effectiveFrom: { gt: now } },
          {
            AND: [
              { effectiveTo: { not: null } },
              { effectiveTo: { lt: now } },
            ],
          },
        ],
      },
      select: {
        productCode: true,
        status: true,
        isPublished: true,
        effectiveFrom: true,
        effectiveTo: true,
      },
      orderBy: {
        productCode: 'asc',
      },
    });

    if (inactiveAffiliateProducts.length > 0) {
      console.log(`\n⚠️  유효하지 않은 어필리에이트 상품: ${inactiveAffiliateProducts.length}개\n`);
      inactiveAffiliateProducts.slice(0, 10).forEach((ap, index) => {
        const reasons = [];
        if (ap.status !== 'active') reasons.push(`status: ${ap.status}`);
        if (!ap.isPublished) reasons.push('isPublished: false');
        if (ap.effectiveFrom && ap.effectiveFrom > now) reasons.push('effectiveFrom이 미래');
        if (ap.effectiveTo && ap.effectiveTo < now) reasons.push('effectiveTo가 과거');
        
        console.log(`${index + 1}. ${ap.productCode}`);
        console.log(`   이유: ${reasons.join(', ')}`);
      });
      if (inactiveAffiliateProducts.length > 10) {
        console.log(`   ... 외 ${inactiveAffiliateProducts.length - 10}개`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAffiliateProducts();
