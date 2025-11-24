import prisma from '../lib/prisma';

async function main() {
  console.log('=== 전화상담고객 API 테스트 ===\n');

  // user1 프로필 찾기
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
    console.log('❌ 활성 프로필을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ Profile ID: ${profile.id}, Type: ${profile.type}`);

  // 전화상담고객 쿼리 (source=mall)
  console.log('\n1. 전화상담고객 필터 쿼리:');
  
  const whereConditions: any[] = [];

  if (profile.type === 'SALES_AGENT') {
    whereConditions.push({
      AND: [
        { agentId: profile.id },
        {
          OR: [
            { source: { startsWith: 'mall-' } },
            { source: 'product-inquiry' },
            { source: 'phone-consultation' },
          ],
        },
      ],
    });
  }

  const inquiryLeads = await prisma.affiliateLead.findMany({
    where: {
      OR: whereConditions,
    },
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      source: true,
      status: true,
    },
  });

  console.log(`   결과: ${inquiryLeads.length}명`);
  
  if (inquiryLeads.length > 0) {
    inquiryLeads.forEach(lead => {
      console.log(`   - ${lead.customerName} (${lead.customerPhone}) [${lead.source}]`);
    });
  } else {
    console.log('   ⚠️  전화상담 고객이 없습니다!');
  }

  // 일반 고객 쿼리 (전체)
  console.log('\n2. 전체 고객 쿼리:');
  
  const allLeads = await prisma.affiliateLead.findMany({
    where: {
      agentId: profile.id,
    },
    select: {
      id: true,
      customerName: true,
      source: true,
    },
  });

  console.log(`   결과: ${allLeads.length}명`);
  allLeads.forEach(lead => {
    console.log(`   - ${lead.customerName} [${lead.source}]`);
  });

  console.log('\n✅ 테스트 완료!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
