const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const profile = await prisma.affiliateProfile.findFirst({
        include: { User: true }
    });
    if (profile) {
        console.log(`User ID: ${profile.userId}`);
    } else {
        console.log("No profile found");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
