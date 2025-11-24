import prisma from '../lib/prisma';

async function main() {
  console.log('=== 판매원-대리점장 관계 수정 ===\n');

  // 1. boss1 (대리점장) 찾기
  const managerProfile = await prisma.affiliateProfile.findFirst({
    where: { type: 'BRANCH_MANAGER', status: 'ACTIVE' },
  });

  if (!managerProfile) {
    console.log('❌ 대리점장 프로필을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ 대리점장: ID ${managerProfile.id} (${managerProfile.displayName})`);

  // 2. user1 (판매원) 찾기
  const agentProfile = await prisma.affiliateProfile.findFirst({
    where: { type: 'SALES_AGENT', status: 'ACTIVE' },
  });

  if (!agentProfile) {
    console.log('❌ 판매원 프로필을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ 판매원: ID ${agentProfile.id} (${agentProfile.displayName})`);

  // 3. 기존 관계 확인
  const existingRelation = await prisma.affiliateRelation.findFirst({
    where: {
      managerId: managerProfile.id,
      agentId: agentProfile.id,
    },
  });

  if (existingRelation) {
    if (existingRelation.status === 'ACTIVE') {
      console.log('\n✅ 이미 활성 관계가 있습니다.');
    } else {
      // 비활성 관계를 활성화
      await prisma.affiliateRelation.update({
        where: { id: existingRelation.id },
        data: { status: 'ACTIVE' },
      });
      console.log('\n✅ 기존 관계를 ACTIVE로 변경했습니다.');
    }
  } else {
    // 새 관계 생성
    await prisma.affiliateRelation.create({
      data: {
        managerId: managerProfile.id,
        agentId: agentProfile.id,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });
    console.log('\n✅ 새로운 소속 관계를 생성했습니다.');
  }

  // 4. 전화상담/문의 고객을 판매원에게 할당
  const inquiryLeads = await prisma.affiliateLead.findMany({
    where: {
      OR: [
        { source: 'phone-consultation' },
        { source: 'product-inquiry' },
        { source: { startsWith: 'mall-' } },
      ],
      agentId: null, // 아직 판매원에게 할당되지 않은 것만
    },
  });

  console.log(`\n전화상담/문의 고객 ${inquiryLeads.length}명을 판매원에게 할당 중...`);

  for (const lead of inquiryLeads) {
    await prisma.affiliateLead.update({
      where: { id: lead.id },
      data: { 
        agentId: agentProfile.id,
        managerId: managerProfile.id, // 대리점장도 설정
      },
    });
    console.log(`  ✅ ${lead.customerName} (${lead.customerPhone})`);
  }

  // 5. 최종 확인
  const agentLeadCount = await prisma.affiliateLead.count({
    where: { agentId: agentProfile.id },
  });

  const managerLeadCount = await prisma.affiliateLead.count({
    where: {
      OR: [
        { managerId: managerProfile.id },
        { agentId: agentProfile.id },
      ],
    },
  });

  console.log('\n=== 최종 결과 ===');
  console.log(`판매원(user1) 담당 고객: ${agentLeadCount}명`);
  console.log(`대리점장(boss1)이 볼 수 있는 고객: ${managerLeadCount}명`);
  console.log('\n✅ 완료!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
