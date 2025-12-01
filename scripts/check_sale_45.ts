import prisma from '../lib/prisma';

async function check() {
  const sale = await prisma.affiliateSale.findUnique({
    where: { id: 45 },
    select: {
      id: true,
      managerId: true,
      agentId: true,
      saleAmount: true,
      branchCommission: true,
      salesCommission: true,
      overrideCommission: true,
    },
  });

  console.log('='.repeat(80));
  console.log('🎯 본사 직접 판매 검증 (Sale ID: 45)');
  console.log('='.repeat(80));
  console.log('  managerId:', sale?.managerId || 'null');
  console.log('  agentId:', sale?.agentId || 'null');
  console.log('  판매액:', (sale?.saleAmount || 0).toLocaleString() + '원');
  console.log('  branchCommission:', (sale?.branchCommission || 0).toLocaleString() + '원');
  console.log('  salesCommission:', (sale?.salesCommission || 0).toLocaleString() + '원');
  console.log('  overrideCommission:', (sale?.overrideCommission || 0).toLocaleString() + '원');

  const success = sale?.managerId === null && sale?.agentId === null && sale?.branchCommission === 0 && sale?.salesCommission === 0 && sale?.overrideCommission === 0;
  console.log('\n결과:', success ? '✅ 성공! 모든 수당이 0원' : '❌ 실패');
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

check();
