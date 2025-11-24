import prisma from '../lib/prisma';

async function main() {
  console.log('=== user1에게 전화상담 고객 재할당 ===\n');

  // user1의 정확한 프로필 찾기
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: { contains: 'user1' } },
        { mallUserId: 'user1' },
      ],
    },
  });

  if (!user) {
    console.log('❌ user1을 찾을 수 없습니다.');
    return;
  }

  const profile = await prisma.affiliateProfile.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
  });

  if (!profile) {
    console.log('❌ user1의 활성 프로필을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ user1 프로필: ID ${profile.id}, Type: ${profile.type}`);

  // 대리점장 찾기
  const manager = await prisma.affiliateProfile.findFirst({
    where: { type: 'BRANCH_MANAGER', status: 'ACTIVE' },
  });

  if (!manager) {
    console.log('❌ 대리점장을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ 대리점장: ID ${manager.id}`);

  // 소속 관계 확인/생성
  const relation = await prisma.affiliateRelation.findFirst({
    where: {
      managerId: manager.id,
      agentId: profile.id,
    },
  });

  if (!relation) {
    await prisma.affiliateRelation.create({
      data: {
        managerId: manager.id,
        agentId: profile.id,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });
    console.log('✅ 소속 관계 생성 완료\n');
  } else if (relation.status !== 'ACTIVE') {
    await prisma.affiliateRelation.update({
      where: { id: relation.id },
      data: { status: 'ACTIVE' },
    });
    console.log('✅ 소속 관계 활성화 완료\n');
  } else {
    console.log('✅ 소속 관계 이미 존재\n');
  }

  // 전화상담/문의 고객 찾기
  const inquiryLeads = await prisma.affiliateLead.findMany({
    where: {
      OR: [
        { source: 'phone-consultation' },
        { source: 'product-inquiry' },
        { source: { startsWith: 'mall-' } },
      ],
    },
  });

  console.log(`전화상담/문의 고객 ${inquiryLeads.length}명 재할당 중...`);

  for (const lead of inquiryLeads) {
    await prisma.affiliateLead.update({
      where: { id: lead.id },
      data: {
        agentId: profile.id, // user1의 프로필 ID
        managerId: manager.id,
      },
    });
    console.log(`  ✅ ${lead.customerName} (${lead.source})`);
  }

  // 최종 확인
  const finalCount = await prisma.affiliateLead.count({
    where: {
      agentId: profile.id,
      OR: [
        { source: { startsWith: 'mall-' } },
        { source: 'product-inquiry' },
        { source: 'phone-consultation' },
      ],
    },
  });

  console.log(`\n✅ 완료! user1의 전화상담 고객: ${finalCount}명`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
