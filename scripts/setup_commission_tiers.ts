// scripts/setup_commission_tiers.ts
// CommissionTier 테스트 데이터 생성

import prisma from '../lib/prisma';

async function setupCommissionTiers() {
  try {
    console.log('🎯 CommissionTier 설정 시작...\n');

    // 1. 기존 상품 확인 또는 생성
    let products = await prisma.affiliateProduct.findMany({
      where: {
        isPublished: true,
        productCode: {
          in: ['SAMPLE-015', 'SAMPLE-014'],
        },
      },
      select: {
        id: true,
        productCode: true,
        title: true,
      },
    });

    // 상품이 없으면 생성
    if (products.length === 0) {
      console.log('⚠️  SAMPLE 상품이 없습니다. 생성하겠습니다...\n');

      const productsToCreate = [
        {
          productCode: 'SAMPLE-015',
          title: '샘플 크루즈 015',
          defaultSaleAmount: 7000000,
          defaultCostAmount: 5600000,
          defaultNetRevenue: 1400000,
        },
        {
          productCode: 'SAMPLE-014',
          title: '샘플 크루즈 014',
          defaultSaleAmount: 6000000,
          defaultCostAmount: 4800000,
          defaultNetRevenue: 1200000,
        },
      ];

      for (const prod of productsToCreate) {
        await prisma.affiliateProduct.create({
          data: {
            productCode: prod.productCode,
            title: prod.title,
            status: 'active',
            currency: 'KRW',
            defaultSaleAmount: prod.defaultSaleAmount,
            defaultCostAmount: prod.defaultCostAmount,
            defaultNetRevenue: prod.defaultNetRevenue,
            isPublished: true,
            effectiveFrom: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log(`   ✅ 생성: ${prod.productCode} - ${prod.title}`);
      }

      // 다시 조회
      products = await prisma.affiliateProduct.findMany({
        where: {
          productCode: {
            in: ['SAMPLE-015', 'SAMPLE-014'],
          },
        },
        select: {
          id: true,
          productCode: true,
          title: true,
        },
      });

      console.log();
    }

    console.log(`✅ 찾은 상품: ${products.length}개`);
    products.forEach(p => console.log(`   - ${p.productCode}: ${p.title}`));
    console.log();

    // 2. 각 상품에 대해 객실 타입별 수당 설정
    const cabinTypes = [
      {
        cabinType: 'Interior',
        label: '내부',
        saleAmount: 5000000,  // 500만원
        costAmount: 4000000,  // 400만원
        netRevenue: 1000000,  // 100만원
        branchShareAmount: 150000,  // 15% (대리점)
        salesShareAmount: 250000,   // 25% (판매원)
        overrideAmount: 0,          // 0%
      },
      {
        cabinType: 'Oceanview',
        label: '오션뷰',
        saleAmount: 6000000,  // 600만원
        costAmount: 4800000,  // 480만원
        netRevenue: 1200000,  // 120만원
        branchShareAmount: 180000,  // 15%
        salesShareAmount: 300000,   // 25%
        overrideAmount: 0,
      },
      {
        cabinType: 'Balcony',
        label: '발코니',
        saleAmount: 7000000,  // 700만원
        costAmount: 5600000,  // 560만원
        netRevenue: 1400000,  // 140만원
        branchShareAmount: 210000,  // 15%
        salesShareAmount: 350000,   // 25%
        overrideAmount: 0,
      },
      {
        cabinType: 'Suite',
        label: '스위트',
        saleAmount: 10000000, // 1000만원
        costAmount: 8000000,  // 800만원
        netRevenue: 2000000,  // 200만원
        branchShareAmount: 300000,  // 15%
        salesShareAmount: 500000,   // 25%
        overrideAmount: 0,
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const product of products) {
      console.log(`\n📦 ${product.productCode} 수당 설정 중...`);

      for (const cabin of cabinTypes) {
        // 기존 Tier 확인
        const existing = await prisma.affiliateCommissionTier.findFirst({
          where: {
            affiliateProductId: product.id,
            cabinType: cabin.cabinType,
          },
        });

        if (existing) {
          // 업데이트
          await prisma.affiliateCommissionTier.update({
            where: { id: existing.id },
            data: {
              saleAmount: cabin.saleAmount,
              costAmount: cabin.costAmount,
              branchShareAmount: cabin.branchShareAmount,
              salesShareAmount: cabin.salesShareAmount,
              overrideAmount: cabin.overrideAmount,
              currency: 'KRW',
              updatedAt: new Date(),
            },
          });
          console.log(`   ✏️  업데이트: ${cabin.cabinType} (${cabin.label})`);
          updatedCount++;
        } else {
          // 생성
          await prisma.affiliateCommissionTier.create({
            data: {
              affiliateProductId: product.id,
              cabinType: cabin.cabinType,
              saleAmount: cabin.saleAmount,
              costAmount: cabin.costAmount,
              hqShareAmount: cabin.netRevenue - cabin.branchShareAmount - cabin.salesShareAmount,
              branchShareAmount: cabin.branchShareAmount,
              salesShareAmount: cabin.salesShareAmount,
              overrideAmount: cabin.overrideAmount,
              currency: 'KRW',
              updatedAt: new Date(),
            },
          });
          console.log(`   ✅ 생성: ${cabin.cabinType} (${cabin.label})`);
          createdCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 CommissionTier 설정 완료!');
    console.log('='.repeat(60));
    console.log(`✅ 생성: ${createdCount}개`);
    console.log(`✏️  업데이트: ${updatedCount}개`);
    console.log(`📊 총: ${createdCount + updatedCount}개`);
    console.log();

    // 3. 설정된 수당 표 출력
    console.log('📋 설정된 수당 내역:\n');

    for (const product of products) {
      console.log(`상품: ${product.productCode}`);
      console.log('─'.repeat(60));

      const tiers = await prisma.affiliateCommissionTier.findMany({
        where: {
          affiliateProductId: product.id,
        },
        orderBy: {
          saleAmount: 'asc',
        },
      });

      console.log('객실타입      판매가         원가        대리점수당    판매원수당');
      console.log('─'.repeat(60));

      tiers.forEach(tier => {
        const cabin = cabinTypes.find(c => c.cabinType === tier.cabinType);
        console.log(
          `${(cabin?.label || tier.cabinType).padEnd(12)} ` +
          `${(tier.saleAmount?.toLocaleString() || '-').padStart(10)}원  ` +
          `${(tier.costAmount?.toLocaleString() || '-').padStart(10)}원  ` +
          `${(tier.branchShareAmount?.toLocaleString() || '-').padStart(10)}원  ` +
          `${(tier.salesShareAmount?.toLocaleString() || '-').padStart(10)}원`
        );
      });

      console.log();
    }

    console.log('✅ 이제 결제 시 자동으로 수당이 계산됩니다!');
    console.log('\n테스트 방법:');
    console.log('1. user1 개인몰 접속: http://localhost:3000/user1/shop');
    console.log('2. 상품 선택 (SAMPLE-015 또는 SAMPLE-014)');
    console.log('3. 객실 타입 선택 (Interior, Balcony, Suite 등)');
    console.log('4. 결제 진행');
    console.log('5. CommissionLedger에 수당 자동 기록!');
    console.log();

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupCommissionTiers();
