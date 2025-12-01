// scripts/check_override_logic.ts
// 오버라이드 수당 로직 검증

import prisma from '../lib/prisma';

async function checkOverrideLogic() {
  try {
    console.log('🔍 오버라이드 수당 로직 검증 시작...\n');

    // 최근 테스트 판매 내역 조회
    const sales = await prisma.affiliateSale.findMany({
      where: {
        externalOrderCode: {
          contains: 'ORDER_TEST_',
        },
      },
      orderBy: { id: 'desc' },
      take: 10,
      select: {
        id: true,
        externalOrderCode: true,
        managerId: true,
        agentId: true,
        saleAmount: true,
        branchCommission: true,
        salesCommission: true,
        overrideCommission: true,
        AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile: {
          select: {
            displayName: true,
            type: true,
          }
        },
        AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
          select: {
            displayName: true,
            type: true,
            User: {
              select: {
                mallUserId: true
              }
            }
          }
        },
      },
    });

    console.log('='.repeat(80));
    console.log(`총 ${sales.length}개 테스트 판매 내역 발견`);
    console.log('='.repeat(80));

    sales.forEach((sale) => {
      console.log(`\nSale ID: ${sale.id}`);
      console.log(`Order: ${sale.externalOrderCode}`);

      // 판매 타입 결정
      let saleType = '';
      if (sale.managerId && !sale.agentId) {
        saleType = '대리점장 직접 판매';
      } else if (sale.agentId && sale.managerId) {
        saleType = '대리점 팀 판매 (판매원 소속 대리점장)';
      } else if (sale.agentId && !sale.managerId) {
        saleType = '본사 소속 판매원 판매';
      } else {
        saleType = '본사 직접 판매';
      }

      console.log(`판매 타입: ${saleType}`);
      console.log(`대리점장: ${sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile?.displayName || 'null'}`);
      console.log(`판매원: ${sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.User?.mallUserId || 'null'} (${sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.displayName || 'null'})`);
      console.log(`\n💰 수당 내역:`);
      console.log(`  판매액: ${(sale.saleAmount || 0).toLocaleString()}원`);
      console.log(`  대리점 수당: ${(sale.branchCommission || 0).toLocaleString()}원`);
      console.log(`  판매원 수당: ${(sale.salesCommission || 0).toLocaleString()}원`);
      console.log(`  오버라이드: ${(sale.overrideCommission || 0).toLocaleString()}원`);

      // 문제 감지
      if (sale.managerId && !sale.agentId && (sale.overrideCommission || 0) > 0) {
        console.log(`  ⚠️  문제: 대리점장 직접 판매인데 오버라이드가 ${(sale.overrideCommission || 0).toLocaleString()}원 발생!`);
      }

      if (sale.agentId && sale.managerId && (sale.overrideCommission || 0) === 0) {
        const expectedOverride = (sale.branchCommission || 0) - (sale.salesCommission || 0);
        if (expectedOverride > 0) {
          console.log(`  ⚠️  문제: 대리점 팀 판매인데 오버라이드가 0원! 예상값: ${expectedOverride.toLocaleString()}원`);
        }
      }

      console.log('-'.repeat(80));
    });

    // CommissionTier 확인
    console.log('\n\n📊 CommissionTier 설정 확인');
    console.log('='.repeat(80));

    const tiers = await prisma.affiliateCommissionTier.findMany({
      where: {
        AffiliateProduct: {
          productCode: {
            in: ['SAMPLE-015', 'SAMPLE-014'],
          },
        },
      },
      select: {
        id: true,
        cabinType: true,
        saleAmount: true,
        branchShareAmount: true,
        salesShareAmount: true,
        overrideAmount: true,
        AffiliateProduct: {
          select: {
            productCode: true,
          },
        },
      },
      orderBy: [
        { AffiliateProduct: { productCode: 'asc' } },
        { cabinType: 'asc' },
      ],
    });

    tiers.forEach((tier) => {
      console.log(`\n상품: ${tier.AffiliateProduct?.productCode}, 객실: ${tier.cabinType}`);
      console.log(`  판매가: ${(tier.saleAmount || 0).toLocaleString()}원`);
      console.log(`  대리점 수당: ${(tier.branchShareAmount || 0).toLocaleString()}원`);
      console.log(`  판매원 수당: ${(tier.salesShareAmount || 0).toLocaleString()}원`);
      console.log(`  오버라이드: ${(tier.overrideAmount || 0).toLocaleString()}원`);

      const calculatedOverride = (tier.branchShareAmount || 0) - (tier.salesShareAmount || 0);
      if (calculatedOverride !== (tier.overrideAmount || 0)) {
        console.log(`  ⚠️  오버라이드 불일치! 계산값: ${calculatedOverride.toLocaleString()}원, 저장값: ${(tier.overrideAmount || 0).toLocaleString()}원`);
      }
    });

    console.log('\n\n✅ 검증 완료!');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOverrideLogic();
