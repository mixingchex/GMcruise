import prisma from '../lib/prisma';

async function main() {
  console.log('=== user1 \D Ux ===\n');

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: { contains: 'user1' } },
        { mallUserId: 'user1' },
      ],
    },
  });

  if (!user) {
    console.log('L user1D >D  ÆµÈä.');
    return;
  }

  console.log(' User ID:', user.id);
  console.log(' t„:', user.name);

  const profiles = await prisma.affiliateProfile.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  });

  console.log('\n\D ©]:');
  if (profiles.length === 0) {
    console.log('L AffiliateProfilet ÆµÈä!');
    console.log('’ äÐ \DD Ý1t| iÈä.');
    return;
  }

  profiles.forEach((p) => {
    console.log(`- ID: ${p.id}, Type: ${p.type}, Status: ${p.status}`);
  });

  const active = profiles.find(p => p.status === 'ACTIVE');
  if (!active) {
    console.log('\nL ACTIVE \Dt ÆµÈä!');
    return;
  }

  const leadCount = await prisma.affiliateLead.count({
    where: { agentId: active.id },
  });

  console.log(`\nôù à: ${leadCount}…`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
