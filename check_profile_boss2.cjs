const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const profile = await prisma.affiliateProfile.findUnique({
        where: { userId: 78 }
    });
    console.log(JSON.stringify(profile));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
