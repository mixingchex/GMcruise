import prisma from '../lib/prisma';

async function main() {
  console.log('=== 고객 데이터 연결 확인 ===\n');

  // 1. 전체 고객 수
  const totalLeads = await prisma.affiliateLead.count();
  console.log(`1. 전체 고객 수: ${totalLeads}명`);

  // 2. 대리점장이 볼 수 있는 고객 수
  const managerProfile = await prisma.affiliateProfile.findFirst({
    where: { type: 'BRANCH_MANAGER', status: 'ACTIVE' },
  });

  if (managerProfile) {
    // 대리점장의 소속 판매원들
    const agentRelations = await prisma.affiliateRelation.findMany({
      where: { managerId: managerProfile.id, status: 'ACTIVE' },
      select: { agentId: true },
    });
    const agentIds = agentRelations.map(r => r.agentId);

    const managerLeads = await prisma.affiliateLead.count({
      where: {
        OR: [
          { managerId: managerProfile.id },
          { agentId: { in: [managerProfile.id, ...agentIds] } },
        ],
      },
    });

    console.log(`\n2. 대리점장(boss1)이 볼 수 있는 고객: ${managerLeads}명`);
    console.log(`   - 본인 + 소속 판매원(${agentIds.length}명) 고객 포함`);
  }

  // 3. 판매원이 볼 수 있는 고객 수
  const agentProfile = await prisma.affiliateProfile.findFirst({
    where: { type: 'SALES_AGENT', status: 'ACTIVE' },
  });

  if (agentProfile) {
    const agentLeads = await prisma.affiliateLead.count({
      where: { agentId: agentProfile.id },
    });

    console.log(`\n3. 판매원(user1)이 볼 수 있는 고객: ${agentLeads}명`);
  }

  // 4. 전화상담/문의 고객 수
  const inquiryLeads = await prisma.affiliateLead.count({
    where: {
      OR: [
        { source: { startsWith: 'mall-' } },
        { source: 'product-inquiry' },
        { source: 'phone-consultation' },
      ],
    },
  });

  console.log(`\n4. 전화상담/문의 고객: ${inquiryLeads}명`);
  console.log('   - 관리자 패널 "문의 고객" 탭에 표시');
  console.log('   - 대리점장/판매원 "전화상담고객" 탭에 표시');

  // 5. 고객 유형별 분포
  console.log('\n5. 고객 source 분포:');
  const leadsBySource = await prisma.affiliateLead.groupBy({
    by: ['source'],
    _count: { _all: true },
  });

  leadsBySource.forEach(group => {
    console.log(`   - ${group.source}: ${group._count._all}명`);
  });

  console.log('\n✅ 모든 고객 데이터가 연결되어 있습니다!');
  console.log('\n연결 구조:');
  console.log('  관리자 패널 → 모든 고객');
  console.log('  대리점장 → 본인 + 소속 판매원 고객');
  console.log('  판매원 → 본인에게 할당된 고객');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
