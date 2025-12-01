import prisma from '../lib/prisma';

async function checkUser1() {
  const user = await prisma.user.findFirst({
    where: { id: 3 },
    select: {
      id: true,
      mallUserId: true,
      phone: true,
      AffiliateProfile: {
        select: {
          id: true,
          type: true,
          displayName: true,
          status: true,
        },
      },
    },
  });

  console.log('user1 정보:', JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}

checkUser1();
