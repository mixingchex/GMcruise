// scripts/setup_agent_relation.ts
// 판매원-대리점장 관계 설정

import prisma from '../lib/prisma';

async function setupAgentRelation() {
  try {
    console.log('🔗 판매원-대리점장 관계 설정 시작...\n');

    // user1 찾기
    const user1 = await prisma.user.findFirst({
      where: { mallUserId: 'user1' },
      select: { id: true, mallUserId: true },
    });

    if (!user1) {
      console.log('❌ user1을 찾을 수 없습니다.');
      return;
    }

    const user1Profile = await prisma.affiliateProfile.findFirst({
      where: { userId: user1.id },
      select: { id: true, type: true, displayName: true },
    });

    if (!user1Profile) {
      console.log('❌ user1의 AffiliateProfile을 찾을 수 없습니다.');
      return;
    }

    console.log(`✅ 판매원 찾음: ${user1.mallUserId} (ID: ${user1Profile.id}, 타입: ${user1Profile.type})`);

    // boss1 찾기
    const boss1 = await prisma.user.findFirst({
      where: { mallUserId: 'boss1' },
      select: { id: true, mallUserId: true },
    });

    if (!boss1) {
      console.log('❌ boss1을 찾을 수 없습니다.');
      return;
    }

    const boss1Profile = await prisma.affiliateProfile.findFirst({
      where: { userId: boss1.id },
      select: { id: true, type: true, displayName: true },
    });

    if (!boss1Profile) {
      console.log('❌ boss1의 AffiliateProfile을 찾을 수 없습니다.');
      return;
    }

    console.log(`✅ 대리점장 찾음: ${boss1.mallUserId} (ID: ${boss1Profile.id}, 타입: ${boss1Profile.type})\n`);

    // 기존 관계 확인
    const existingRelation = await prisma.affiliateRelation.findFirst({
      where: {
        agentId: user1Profile.id,
        managerId: boss1Profile.id,
      },
    });

    if (existingRelation) {
      console.log('✅ 이미 관계가 설정되어 있습니다!');
      console.log(`   상태: ${existingRelation.status}`);
      console.log(`   생성일: ${existingRelation.createdAt}`);

      if (existingRelation.status !== 'ACTIVE') {
        // ACTIVE로 변경
        await prisma.affiliateRelation.update({
          where: { id: existingRelation.id },
          data: {
            status: 'ACTIVE',
            updatedAt: new Date(),
          },
        });
        console.log('✅ 상태를 ACTIVE로 변경했습니다.');
      }
    } else {
      // 새 관계 생성
      const relation = await prisma.affiliateRelation.create({
        data: {
          agentId: user1Profile.id,
          managerId: boss1Profile.id,
          status: 'ACTIVE',
          connectedAt: new Date(),
          notes: '테스트용 관계',
          updatedAt: new Date(),
        },
      });

      console.log('✅ 새 관계가 생성되었습니다!');
      console.log(`   Relation ID: ${relation.id}`);
      console.log(`   판매원: ${user1.mallUserId} (${user1Profile.displayName})`);
      console.log(`   대리점장: ${boss1.mallUserId} (${boss1Profile.displayName})`);
    }

    console.log('\n🎉 설정 완료!');
    console.log('   이제 user1이 판매하면 boss1이 오버라이드 수당을 받습니다.');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAgentRelation();
