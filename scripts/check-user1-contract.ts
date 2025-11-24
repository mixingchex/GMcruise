import prisma from '../lib/prisma';

async function main() {
  console.log('=== user1 계약서 확인 ===\n');

  // user1 찾기
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

  console.log(`✅ user1: ID ${user.id}, Phone: ${user.phone}, MallUserId: ${user.mallUserId}`);

  // user1의 프로필
  const profile = await prisma.affiliateProfile.findFirst({
    where: { userId: user.id },
  });

  if (profile) {
    console.log(`✅ Profile: ID ${profile.id}, Type: ${profile.type}, Status: ${profile.status}`);
  } else {
    console.log('⚠️  user1의 프로필을 찾을 수 없습니다.');
  }

  // 모든 계약서 확인
  const allContracts = await prisma.affiliateContract.findMany({
    select: {
      id: true,
      userId: true,
      phone: true,
      status: true,
      createdAt: true,
      invitedByProfileId: true,
      User_AffiliateContract_userIdToUser: {
        select: {
          id: true,
          name: true,
          phone: true,
          mallUserId: true,
        },
      },
      AffiliateProfile: {
        select: {
          id: true,
          displayName: true,
          type: true,
        },
      },
    },
  });

  console.log(`\n전체 계약서: ${allContracts.length}개`);
  allContracts.forEach(c => {
    console.log(`  - Contract ID: ${c.id}`);
    console.log(`    userId: ${c.userId}, phone: ${c.phone}`);
    console.log(`    invitedByProfileId: ${c.invitedByProfileId}, status: ${c.status}`);
    if (c.AffiliateProfile) {
      console.log(`    Profile: ${c.AffiliateProfile.id} - ${c.AffiliateProfile.displayName} (${c.AffiliateProfile.type})`);
    }
    if (c.User_AffiliateContract_userIdToUser) {
      console.log(`    User: ${c.User_AffiliateContract_userIdToUser.name} (${c.User_AffiliateContract_userIdToUser.phone})`);
    }
    console.log('');
  });

  // user1의 계약서 (userId로)
  const user1ContractsByUserId = allContracts.filter(c => c.userId === user.id);
  console.log(`user1의 계약서 (userId=${user.id}로 검색): ${user1ContractsByUserId.length}개`);
  user1ContractsByUserId.forEach(c => {
    console.log(`  - ID: ${c.id}, InvitedByProfileId: ${c.invitedByProfileId}, Status: ${c.status}`);
  });

  // user1의 계약서 (phone으로)
  if (user.phone) {
    const user1ContractsByPhone = allContracts.filter(c => c.phone === user.phone);
    console.log(`\nuser1의 계약서 (phone=${user.phone}으로 검색): ${user1ContractsByPhone.length}개`);
    user1ContractsByPhone.forEach(c => {
      console.log(`  - ID: ${c.id}, InvitedByProfileId: ${c.invitedByProfileId}, Status: ${c.status}`);
    });
  }

  // 프로필로 연결된 계약서 검색
  if (profile) {
    const contractsByProfile = allContracts.filter(c => c.AffiliateProfile?.id === profile.id);
    console.log(`\nuser1의 계약서 (Profile relation으로 검색): ${contractsByProfile.length}개`);
    contractsByProfile.forEach(c => {
      console.log(`  - ID: ${c.id}, UserId: ${c.userId}, Status: ${c.status}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
