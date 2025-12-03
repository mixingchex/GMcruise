const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const affiliates = await prisma.affiliateProfile.findMany({
        take: 5,
        include: { user: true }
    });

    console.log('Affiliates found:', affiliates.length);
    affiliates.forEach(p => {
        console.log(`- Name: ${p.user.name}, Phone: ${p.user.phone}, ProfileID: ${p.id}, Type: ${p.type}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
