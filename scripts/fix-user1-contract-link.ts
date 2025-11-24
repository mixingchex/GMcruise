import prisma from '../lib/prisma';

async function main() {
  console.log('=== user1 계약서 연결 수정 ===\n');

  // 1. user1 찾기
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

  // 2. user1의 프로필 찾기
  const profile = await prisma.affiliateProfile.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
  });

  if (!profile) {
    console.log('❌ user1의 활성 프로필을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ Profile: ID ${profile.id}, Type: ${profile.type}`);

  // 3. 연결이 안된 completed 계약서 찾기
  const orphanContract = await prisma.affiliateContract.findFirst({
    where: {
      status: { in: ['completed', 'approved'] },
      OR: [
        { userId: null },
        { phone: '1' }, // 수동 입력으로 잘못된 phone
      ],
    },
  });

  if (!orphanContract) {
    console.log('❌ 연결이 필요한 계약서를 찾을 수 없습니다.');
    return;
  }

  console.log(`\n✅ 수정할 계약서: ID ${orphanContract.id}, Status: ${orphanContract.status}`);
  console.log(`   현재 userId: ${orphanContract.userId}, phone: ${orphanContract.phone}`);

  // 4. 계약서 수정
  await prisma.affiliateContract.update({
    where: { id: orphanContract.id },
    data: {
      userId: user.id,
      phone: user.phone,
    },
  });

  console.log(`\n✅ 계약서 업데이트 완료!`);
  console.log(`   새 userId: ${user.id}, 새 phone: ${user.phone}`);

  // 5. 최종 확인
  const updatedContract = await prisma.affiliateContract.findUnique({
    where: { id: orphanContract.id },
    select: {
      id: true,
      userId: true,
      phone: true,
      status: true,
      User_AffiliateContract_userIdToUser: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  console.log('\n=== 최종 상태 ===');
  console.log(`계약서 ID: ${updatedContract?.id}`);
  console.log(`연결된 User: ${updatedContract?.User_AffiliateContract_userIdToUser?.name} (ID: ${updatedContract?.userId})`);
  console.log(`전화번호: ${updatedContract?.phone}`);
  console.log(`상태: ${updatedContract?.status}`);

  console.log('\n✅ user1이 이제 "나의 공유계약서"에서 계약서를 볼 수 있습니다!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
