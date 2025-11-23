import prisma from '../lib/prisma.ts';

async function main() {
  const userId = 1; // boss1
  const profileId = 1;

  const landingPages = await prisma.landingPage.findMany({
    where: { adminId: userId },
    include: {
      CustomerGroup: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('landingPages length:', landingPages.length);

  const sharedEntries = await prisma.sharedLandingPage.findMany({
    where: { managerProfileId: profileId },
    include: {
      LandingPage: {
        include: {
          CustomerGroup: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('sharedEntries length:', sharedEntries.length);
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



