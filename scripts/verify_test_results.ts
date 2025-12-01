// scripts/verify_test_results.ts
// DB에서 테스트 결과 직접 확인

import prisma from '../lib/prisma';

async function verifyTestResults() {
  try {
    console.log('\n📊 최근 생성된 판매 기록 확인...\n');

    // 최근 3개 판매 기록 조회
    const sales = await prisma.affiliateSale.findMany({
      where: {
        productCode: {
          in: ['SAMPLE-015', 'SAMPLE-014'],
        },
      },
      orderBy: { id: 'desc' },
      take: 3,
      select: {
        id: true,
        productCode: true,
        cabinType: true,
        saleAmount: true,
        costAmount: true,
        netRevenue: true,
        branchCommission: true,
        salesCommission: true,
        overrideCommission: true,
        withholdingAmount: true,
        status: true,
        saleDate: true,
      },
    });

    if (sales.length === 0) {
      console.log('❌ 판매 기록이 없습니다.');
      return;
    }

    console.log('═'.repeat(80));
    sales.forEach((sale, index) => {
      console.log(`\n${index + 1}. 판매 ID: ${sale.id}`);
      console.log('─'.repeat(80));
      console.log(`   상품: ${sale.productCode}`);
      console.log(`   객실: ${sale.cabinType}`);
      console.log(`   판매액: ${sale.saleAmount?.toLocaleString()}원`);
      console.log(`   원가: ${sale.costAmount?.toLocaleString()}원`);
      console.log(`   순이익: ${sale.netRevenue?.toLocaleString()}원`);
      console.log(`   대리점수당: ${sale.branchCommission?.toLocaleString()}원`);
      console.log(`   판매원수당: ${sale.salesCommission?.toLocaleString()}원`);
      console.log(`   오버라이드수당: ${sale.overrideCommission?.toLocaleString()}원`);
      console.log(`   원천징수: ${sale.withholdingAmount?.toLocaleString()}원`);
      console.log(`   상태: ${sale.status}`);
      console.log(`   일자: ${sale.saleDate?.toLocaleString('ko-KR')}`);
    });

    console.log('\n' + '═'.repeat(80));

    // CommissionLedger 확인
    console.log('\n📝 CommissionLedger 엔트리 확인...\n');

    for (const sale of sales) {
      const ledgerEntries = await prisma.commissionLedger.findMany({
        where: { saleId: sale.id },
        select: {
          id: true,
          entryType: true,
          amount: true,
          withholdingAmount: true,
          currency: true,
        },
      });

      console.log(`판매 ID ${sale.id}의 Ledger 엔트리: ${ledgerEntries.length}개`);
      ledgerEntries.forEach((entry) => {
        console.log(
          `  - ${entry.entryType}: ${entry.amount.toLocaleString()}${entry.currency} (원천징수: ${entry.withholdingAmount.toLocaleString()})`
        );
      });
      console.log();
    }

    console.log('✅ 검증 완료\n');
  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTestResults();
