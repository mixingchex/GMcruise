// scripts/fix_commission_tiers.ts
// CommissionTier 수당 값 수정 (대리점장 > 판매원으로)

import prisma from '../lib/prisma';

async function fixCommissionTiers() {
  try {
    console.log('🔧 CommissionTier 수당 값 수정 시작...\n');

    // 올바른 수당 구조:
    // - 대리점장 수당 > 판매원 수당이어야 오버라이드가 양수
    // 예시: 순이익 1,000,000원 기준
    //   - 본사: 500,000원 (50%)
    //   - 대리점장: 300,000원 (30%)
    //   - 판매원: 200,000원 (20%)
    //   - 오버라이드: 100,000원 (대리점장 - 판매원)

    const cabinTypes = [
      {
        cabinType: 'Interior',
        label: '내부',
        saleAmount: 5000000,  // 500만원
        costAmount: 4000000,  // 400만원
        netRevenue: 1000000,  // 100만원
        hqShareAmount: 500000,      // 본사 50%
        branchShareAmount: 300000,  // 대리점 30%
        salesShareAmount: 200000,   // 판매원 20%
      },
      {
        cabinType: 'Oceanview',
        label: '오션뷰',
        saleAmount: 6000000,
        costAmount: 4800000,
        netRevenue: 1200000,
        hqShareAmount: 600000,      // 본사 50%
        branchShareAmount: 360000,  // 대리점 30%
        salesShareAmount: 240000,   // 판매원 20%
      },
      {
        cabinType: 'Balcony',
        label: '발코니',
        saleAmount: 7000000,
        costAmount: 5600000,
        netRevenue: 1400000,
        hqShareAmount: 700000,      // 본사 50%
        branchShareAmount: 420000,  // 대리점 30%
        salesShareAmount: 280000,   // 판매원 20%
      },
      {
        cabinType: 'Suite',
        label: '스위트',
        saleAmount: 10000000,
        costAmount: 8000000,
        netRevenue: 2000000,
        hqShareAmount: 1000000,     // 본사 50%
        branchShareAmount: 600000,  // 대리점 30%
        salesShareAmount: 400000,   // 판매원 20%
      },
    ];

    const productCodes = ['SAMPLE-015', 'SAMPLE-014'];
    const fareCategory = 'PRIMARY_ADULT';

    let updateCount = 0;

    for (const productCode of productCodes) {
      // AffiliateProduct 찾기
      const affiliateProduct = await prisma.affiliateProduct.findFirst({
        where: {
          productCode,
          isPublished: true,
        },
      });

      if (!affiliateProduct) {
        console.log(`⚠️  ${productCode} 상품을 찾을 수 없습니다.`);
        continue;
      }

      console.log(`\n📦 상품: ${productCode}`);
      console.log('='.repeat(80));

      for (const cabinData of cabinTypes) {
        const overrideAmount = cabinData.branchShareAmount - cabinData.salesShareAmount;

        // 기존 Tier 찾기 (fareCategory가 null인 기본 Tier)
        const existingTier = await prisma.affiliateCommissionTier.findFirst({
          where: {
            affiliateProductId: affiliateProduct.id,
            cabinType: cabinData.cabinType,
            fareCategory: null,
          },
        });

        if (existingTier) {
          // 업데이트
          await prisma.affiliateCommissionTier.update({
            where: { id: existingTier.id },
            data: {
              saleAmount: cabinData.saleAmount,
              costAmount: cabinData.costAmount,
              hqShareAmount: cabinData.hqShareAmount,
              branchShareAmount: cabinData.branchShareAmount,
              salesShareAmount: cabinData.salesShareAmount,
              overrideAmount,
              currency: 'KRW',
              updatedAt: new Date(),
            },
          });

          console.log(`✅ ${cabinData.cabinType} 업데이트 완료`);
          console.log(`   순이익: ${cabinData.netRevenue.toLocaleString()}원`);
          console.log(`   본사: ${cabinData.hqShareAmount.toLocaleString()}원`);
          console.log(`   대리점: ${cabinData.branchShareAmount.toLocaleString()}원`);
          console.log(`   판매원: ${cabinData.salesShareAmount.toLocaleString()}원`);
          console.log(`   오버라이드: ${overrideAmount.toLocaleString()}원`);

          updateCount++;
        } else {
          console.log(`⚠️  ${cabinData.cabinType} Tier를 찾을 수 없습니다.`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ 총 ${updateCount}개 Tier 업데이트 완료!`);
    console.log('\n💡 이제 다음과 같이 작동합니다:');
    console.log('   1. 대리점장 직접 판매 → 대리점장이 branchCommission 받음');
    console.log('   2. 대리점 팀 판매 → 대리점장이 overrideCommission 받음');
    console.log('   3. 본사 판매 → 본사가 100% 보유');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCommissionTiers();
