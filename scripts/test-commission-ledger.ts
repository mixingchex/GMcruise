// 테스트: CommissionLedger 쿼리가 올바른 필드를 사용하는지 확인
// 이 테스트는 partner/dashboard/stats API의 수정 사항을 검증합니다.

import prisma from '../lib/prisma';

async function testCommissionLedgerQuery() {
  console.log('=== CommissionLedger 쿼리 테스트 시작 ===\n');

  try {
    // 1. CommissionLedger 스키마 확인 (실제 필드 조회)
    console.log('1. CommissionLedger 첫 번째 레코드 조회...');
    const sample = await prisma.commissionLedger.findFirst({
      select: {
        id: true,
        amount: true,
        profileId: true,
        createdAt: true,
      },
    });

    if (sample) {
      console.log('   ✅ 샘플 레코드:', sample);
    } else {
      console.log('   ⚠️ CommissionLedger 레코드 없음 (빈 테이블)');
    }

    // 2. aggregate 쿼리 테스트 (수정된 쿼리)
    console.log('\n2. aggregate 쿼리 테스트 (amount 필드 사용)...');
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const result = await prisma.commissionLedger.aggregate({
      where: {
        createdAt: { gte: thisMonthStart },
        // status 필드 없음 - 제거됨
      },
      _sum: { amount: true }, // saleAmount → amount로 수정됨
    });

    console.log('   ✅ 이번 달 수수료 합계:', result._sum.amount || 0);

    // 3. 전체 합계 테스트
    console.log('\n3. 전체 수수료 합계 테스트...');
    const totalResult = await prisma.commissionLedger.aggregate({
      _sum: { amount: true },
    });

    console.log('   ✅ 전체 수수료 합계:', totalResult._sum.amount || 0);

    console.log('\n=== ✅ 모든 테스트 통과 ===');
    return true;
  } catch (error: any) {
    console.error('\n=== ❌ 테스트 실패 ===');
    console.error('에러:', error.message);

    if (error.message.includes('Unknown argument')) {
      console.error('\n⚠️ 스키마에 없는 필드를 사용하고 있습니다!');
    }

    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
testCommissionLedgerQuery()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('예외 발생:', error);
    process.exit(1);
  });
