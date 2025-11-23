import prisma from '@/lib/prisma';

/**
 * boss1과 user1의 AffiliateRelation 복구 스크립트
 * 대리점장 대시보드에서 판매원이 보이지 않는 문제 해결
 */
async function main() {
  console.log('🔍 boss1과 user1 관계 복구 시작...\n');

  // 1. boss1 사용자 찾기
  const boss1User = await prisma.user.findFirst({
    where: {
      OR: [
        { mallUserId: 'boss1' },
        { phone: 'boss1' },
        { phone: { contains: 'boss1' } },
      ],
    },
  });

  if (!boss1User) {
    console.error('❌ boss1 사용자를 찾을 수 없습니다.');
    console.log('   boss1 사용자가 존재하는지 확인해주세요.');
    return;
  }

  console.log('✅ boss1 사용자 찾음:');
  console.log(`   ID: ${boss1User.id}`);
  console.log(`   mallUserId: ${boss1User.mallUserId}`);
  console.log(`   phone: ${boss1User.phone}`);
  console.log(`   name: ${boss1User.name}`);

  // boss1의 AffiliateProfile 확인/생성
  let boss1Profile = await prisma.affiliateProfile.findFirst({
    where: { userId: boss1User.id },
  });
  
  if (!boss1Profile) {
    console.log('\n⚠️  boss1의 AffiliateProfile이 없습니다. 생성 중...');
    const { randomBytes } = await import('crypto');
    const affiliateCode = `AFF-BOSS1-${randomBytes(2).toString('hex').toUpperCase()}`;
    
    try {
      boss1Profile = await prisma.affiliateProfile.create({
        data: {
          userId: boss1User.id,
          affiliateCode,
          type: 'BRANCH_MANAGER',
          status: 'ACTIVE',
          displayName: boss1User.mallNickname || boss1User.mallUserId || 'boss1',
          nickname: boss1User.mallNickname || boss1User.mallUserId || 'boss1',
          landingSlug: boss1User.mallUserId || 'boss1',
          landingAnnouncement: '파트너 전용 샘플 계정입니다.',
          welcomeMessage: '반갑습니다! 파트너몰 테스트 계정입니다.',
        },
      });
      console.log('✅ boss1 AffiliateProfile 생성 완료');
    } catch (error: any) {
      if (error?.code === 'P2002') {
        // 이미 존재하는 경우 다시 조회
        boss1Profile = await prisma.affiliateProfile.findFirst({
          where: { userId: boss1User.id },
        });
        if (boss1Profile) {
          console.log('✅ boss1 AffiliateProfile이 이미 존재합니다.');
        }
      } else {
        throw error;
      }
    }
  } else {
    console.log(`\n✅ boss1 AffiliateProfile 찾음: ID ${boss1Profile.id}`);
  }

  // 2. user1 사용자 찾기
  let user1User = await prisma.user.findFirst({
    where: {
      OR: [
        { mallUserId: 'user1' },
        { phone: 'user1' },
        { phone: { contains: 'user1' } },
      ],
    },
  });

  if (!user1User) {
    console.log('\n⚠️  user1 사용자가 없습니다. 생성 중...');
    try {
      user1User = await prisma.user.create({
        data: {
          mallUserId: 'user1',
          phone: 'user1',
          name: '판매원',
          password: '1101', // 기본 비밀번호
          role: 'community',
        },
      });
      console.log('✅ user1 사용자 생성 완료');
    } catch (error: any) {
      if (error?.code === 'P2002') {
        // 이미 존재하는 경우 다시 조회
        user1User = await prisma.user.findFirst({
          where: {
            OR: [
              { mallUserId: 'user1' },
              { phone: 'user1' },
            ],
          },
        });
        if (user1User) {
          console.log('✅ user1 사용자가 이미 존재합니다.');
        } else {
          console.error('❌ user1 사용자 생성 실패:', error);
          return;
        }
      } else {
        console.error('❌ user1 사용자 생성 실패:', error);
        return;
      }
    }
  }

  console.log('\n✅ user1 사용자 찾음:');
  console.log(`   ID: ${user1User.id}`);
  console.log(`   mallUserId: ${user1User.mallUserId}`);
  console.log(`   phone: ${user1User.phone}`);
  console.log(`   name: ${user1User.name}`);

  // user1의 AffiliateProfile 확인/생성
  let user1Profile = await prisma.affiliateProfile.findFirst({
    where: { userId: user1User.id },
  });
  
  if (!user1Profile) {
    console.log('\n⚠️  user1의 AffiliateProfile이 없습니다. 생성 중...');
    const { randomBytes } = await import('crypto');
    const affiliateCode = `AFF-USER1-${randomBytes(2).toString('hex').toUpperCase()}`;
    
    try {
      user1Profile = await prisma.affiliateProfile.create({
        data: {
          userId: user1User.id,
          affiliateCode,
          type: 'SALES_AGENT',
          status: 'ACTIVE',
          displayName: user1User.mallNickname || user1User.mallUserId || 'user1',
          nickname: user1User.mallNickname || user1User.mallUserId || 'user1',
          landingSlug: user1User.mallUserId || 'user1',
          landingAnnouncement: '파트너 전용 샘플 계정입니다.',
          welcomeMessage: '반갑습니다! 파트너몰 테스트 계정입니다.',
        },
      });
      console.log('✅ user1 AffiliateProfile 생성 완료');
    } catch (error: any) {
      if (error?.code === 'P2002') {
        // 이미 존재하는 경우 다시 조회
        user1Profile = await prisma.affiliateProfile.findFirst({
          where: { userId: user1User.id },
        });
        if (user1Profile) {
          console.log('✅ user1 AffiliateProfile이 이미 존재합니다.');
        }
      } else {
        throw error;
      }
    }
  } else {
    console.log(`\n✅ user1 AffiliateProfile 찾음: ID ${user1Profile.id}`);
  }

  // 3. AffiliateRelation 확인
  const existingRelation = await prisma.affiliateRelation.findFirst({
    where: {
      managerId: boss1Profile.id,
      agentId: user1Profile.id,
    },
  });

  if (existingRelation) {
    if (existingRelation.status === 'ACTIVE') {
      console.log('\n✅ boss1과 user1의 관계가 이미 존재합니다 (ACTIVE):');
      console.log(`   Relation ID: ${existingRelation.id}`);
      console.log(`   Status: ${existingRelation.status}`);
      console.log(`   Connected At: ${existingRelation.connectedAt || 'N/A'}`);
      return;
    } else {
      console.log('\n⚠️  관계가 존재하지만 비활성 상태입니다. 활성화 중...');
      await prisma.affiliateRelation.update({
        where: { id: existingRelation.id },
        data: {
          status: 'ACTIVE',
          connectedAt: existingRelation.connectedAt || new Date(),
          disconnectedAt: null,
        },
      });
      console.log('✅ 관계 활성화 완료');
      return;
    }
  }

  // 4. AffiliateRelation 생성
  console.log('\n⚠️  boss1과 user1의 관계가 없습니다. 생성 중...');
  const now = new Date();
  const newRelation = await prisma.affiliateRelation.create({
    data: {
      managerId: boss1Profile.id,
      agentId: user1Profile.id,
      status: 'ACTIVE',
      connectedAt: now,
      notes: 'boss1과 user1의 관계 복구',
      updatedAt: now,
    },
  });

  console.log('\n✅ boss1과 user1의 관계 생성 완료!');
  console.log(`   Relation ID: ${newRelation.id}`);
  console.log(`   Manager ID: ${boss1Profile.id} (boss1)`);
  console.log(`   Agent ID: ${user1Profile.id} (user1)`);
  console.log(`   Status: ${newRelation.status}`);

  // 5. 최종 확인
  const finalCheck = await prisma.affiliateRelation.findFirst({
    where: {
      managerId: boss1Profile.id,
      agentId: user1Profile.id,
      status: 'ACTIVE',
    },
    include: {
      AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile: {
        select: {
          id: true,
          displayName: true,
          affiliateCode: true,
          type: true,
        },
      },
      AffiliateProfile_AffiliateRelation_agentIdToAffiliateProfile: {
        select: {
          id: true,
          displayName: true,
          affiliateCode: true,
          type: true,
        },
      },
    },
  });

  if (finalCheck) {
    console.log('\n✅ 최종 확인 완료:');
    console.log(`   대리점장: ${finalCheck.AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile.displayName} (${finalCheck.AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile.affiliateCode})`);
    console.log(`   판매원: ${finalCheck.AffiliateProfile_AffiliateRelation_agentIdToAffiliateProfile.displayName} (${finalCheck.AffiliateProfile_AffiliateRelation_agentIdToAffiliateProfile.affiliateCode})`);
    console.log('\n🎉 복구 완료! 이제 대리점장 대시보드에서 user1 판매원이 보일 것입니다.');
  }
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

