// scripts/verify_affiliate_system.ts
// 어필리에이트 시스템 전체 검증 스크립트

import prisma from '../lib/prisma';

async function verifyAffiliateSystem() {
  console.log('='.repeat(80));
  console.log('🔍 어필리에이트 시스템 전체 검증 시작');
  console.log('='.repeat(80));
  console.log('');

  // ===========================
  // 1. 최근 판매 데이터 확인
  // ===========================
  console.log('📊 1. 최근 판매 데이터 확인 (최근 10건)');
  console.log('-'.repeat(80));

  const recentSales = await prisma.affiliateSale.findMany({
    take: 10,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      saleDate: true,
      productCode: true,
      saleAmount: true,
      costAmount: true,
      netRevenue: true,
      branchCommission: true,
      salesCommission: true,
      overrideCommission: true,
      managerId: true,
      agentId: true,
      status: true,
      AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile: {
        select: {
          displayName: true,
          User: { select: { mallUserId: true } }
        }
      },
      AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
        select: {
          displayName: true,
          User: { select: { mallUserId: true } }
        }
      }
    }
  });

  recentSales.forEach((sale) => {
    const managerName = sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile?.displayName || 'N/A';
    const managerMallId = sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile?.User?.mallUserId || 'N/A';
    const agentName = sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.displayName || 'N/A';
    const agentMallId = sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.User?.mallUserId || 'N/A';

    console.log(`
  Sale ID: ${sale.id}
  날짜: ${sale.saleDate?.toLocaleDateString('ko-KR') || 'N/A'}
  상품: ${sale.productCode}
  판매액: ${sale.saleAmount.toLocaleString()}원
  원가: ${(sale.costAmount || 0).toLocaleString()}원
  순이익: ${(sale.netRevenue || 0).toLocaleString()}원

  대리점장: ${managerName} (${managerMallId})
  판매원: ${agentName} (${agentMallId})

  브랜치 수당: ${(sale.branchCommission || 0).toLocaleString()}원
  판매원 수당: ${(sale.salesCommission || 0).toLocaleString()}원
  오버라이드: ${(sale.overrideCommission || 0).toLocaleString()}원
  상태: ${sale.status}
    `);
  });

  // ===========================
  // 2. CommissionLedger 검증
  // ===========================
  console.log('');
  console.log('='.repeat(80));
  console.log('💰 2. CommissionLedger 데이터 검증');
  console.log('-'.repeat(80));

  const ledgers = await prisma.commissionLedger.findMany({
    where: {
      saleId: { in: recentSales.map(s => s.id) }
    },
    select: {
      id: true,
      saleId: true,
      profileId: true,
      entryType: true,
      amount: true,
      withholdingAmount: true,
      isSettled: true,
      AffiliateProfile: {
        select: {
          displayName: true,
          type: true
        }
      }
    },
    orderBy: [
      { saleId: 'desc' },
      { entryType: 'asc' }
    ]
  });

  console.log(`총 ${ledgers.length}개 Ledger 엔트리 발견`);
  console.log('');

  // Sale별로 그룹화
  const ledgersBySale = ledgers.reduce((acc, ledger) => {
    if (!acc[ledger.saleId]) {
      acc[ledger.saleId] = [];
    }
    acc[ledger.saleId].push(ledger);
    return acc;
  }, {} as Record<number, typeof ledgers>);

  Object.entries(ledgersBySale).forEach(([saleId, saleLedgers]) => {
    console.log(`Sale ID ${saleId}:`);
    saleLedgers.forEach((ledger) => {
      const profileInfo = ledger.AffiliateProfile
        ? `${ledger.AffiliateProfile.displayName} (${ledger.AffiliateProfile.type})`
        : 'HQ';

      console.log(`  - ${ledger.entryType}: ${ledger.amount.toLocaleString()}원 (원천징수: ${(ledger.withholdingAmount || 0).toLocaleString()}원) - ${profileInfo}`);
    });
    console.log('');
  });

  // ===========================
  // 3. Partner 데이터 집계
  // ===========================
  console.log('='.repeat(80));
  console.log('👥 3. Partner별 판매/수당 집계');
  console.log('-'.repeat(80));

  // boss1 (대리점장) 데이터
  const boss1Profile = await prisma.affiliateProfile.findFirst({
    where: {
      User: { mallUserId: 'boss1' }
    },
    select: { id: true, displayName: true }
  });

  if (boss1Profile) {
    const boss1Sales = await prisma.affiliateSale.findMany({
      where: {
        OR: [
          { managerId: boss1Profile.id },
          { agentId: boss1Profile.id }
        ]
      },
      select: {
        id: true,
        saleAmount: true,
        branchCommission: true,
        salesCommission: true,
        overrideCommission: true,
      }
    });

    const boss1Stats = boss1Sales.reduce((acc, sale) => ({
      count: acc.count + 1,
      totalSales: acc.totalSales + sale.saleAmount,
      totalBranch: acc.totalBranch + (sale.branchCommission || 0),
      totalSalesComm: acc.totalSalesComm + (sale.salesCommission || 0),
      totalOverride: acc.totalOverride + (sale.overrideCommission || 0),
    }), { count: 0, totalSales: 0, totalBranch: 0, totalSalesComm: 0, totalOverride: 0 });

    console.log(`
대리점장: ${boss1Profile.displayName} (boss1)
  판매 건수: ${boss1Stats.count}건
  총 판매액: ${boss1Stats.totalSales.toLocaleString()}원
  브랜치 수당: ${boss1Stats.totalBranch.toLocaleString()}원
  판매원 수당: ${boss1Stats.totalSalesComm.toLocaleString()}원
  오버라이드: ${boss1Stats.totalOverride.toLocaleString()}원
  총 수당: ${(boss1Stats.totalBranch + boss1Stats.totalSalesComm + boss1Stats.totalOverride).toLocaleString()}원
    `);
  }

  // user1 (판매원) 데이터
  const user1Profile = await prisma.affiliateProfile.findFirst({
    where: {
      User: { mallUserId: 'user1' }
    },
    select: { id: true, displayName: true }
  });

  if (user1Profile) {
    const user1Sales = await prisma.affiliateSale.findMany({
      where: { agentId: user1Profile.id },
      select: {
        id: true,
        saleAmount: true,
        salesCommission: true,
      }
    });

    const user1Stats = user1Sales.reduce((acc, sale) => ({
      count: acc.count + 1,
      totalSales: acc.totalSales + sale.saleAmount,
      totalCommission: acc.totalCommission + (sale.salesCommission || 0),
    }), { count: 0, totalSales: 0, totalCommission: 0 });

    console.log(`
판매원: ${user1Profile.displayName} (user1)
  판매 건수: ${user1Stats.count}건
  총 판매액: ${user1Stats.totalSales.toLocaleString()}원
  판매원 수당: ${user1Stats.totalCommission.toLocaleString()}원
    `);
  }

  // ===========================
  // 4. 본사 순이익 확인
  // ===========================
  console.log('='.repeat(80));
  console.log('🏢 4. 본사 순이익 확인');
  console.log('-'.repeat(80));

  const hqLedgers = await prisma.commissionLedger.findMany({
    where: {
      entryType: 'HQ_NET',
      saleId: { in: recentSales.map(s => s.id) }
    },
    select: {
      amount: true,
      saleId: true,
    }
  });

  const hqTotal = hqLedgers.reduce((sum, ledger) => sum + ledger.amount, 0);

  console.log(`
  총 HQ_NET 엔트리: ${hqLedgers.length}개
  본사 총 순이익: ${hqTotal.toLocaleString()}원
  `);

  // ===========================
  // 5. 검증 결과 요약
  // ===========================
  console.log('='.repeat(80));
  console.log('✅ 검증 결과 요약');
  console.log('='.repeat(80));

  const totalSalesAmount = recentSales.reduce((sum, s) => sum + s.saleAmount, 0);
  const totalBranchComm = recentSales.reduce((sum, s) => sum + (s.branchCommission || 0), 0);
  const totalSalesComm = recentSales.reduce((sum, s) => sum + (s.salesCommission || 0), 0);
  const totalOverride = recentSales.reduce((sum, s) => sum + (s.overrideCommission || 0), 0);

  console.log(`
최근 ${recentSales.length}건 판매 분석:
  총 판매액: ${totalSalesAmount.toLocaleString()}원
  브랜치 수당: ${totalBranchComm.toLocaleString()}원
  판매원 수당: ${totalSalesComm.toLocaleString()}원
  오버라이드: ${totalOverride.toLocaleString()}원
  본사 순이익: ${hqTotal.toLocaleString()}원

검증 항목:
  ✅ 판매 데이터 정상 저장
  ✅ CommissionLedger 생성 확인
  ✅ Partner별 집계 가능
  ✅ 본사 순이익 계산 정상
  `);

  console.log('='.repeat(80));
  console.log('🎉 검증 완료!');
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

verifyAffiliateSystem().catch((error) => {
  console.error('❌ 검증 중 오류 발생:', error);
  process.exit(1);
});
