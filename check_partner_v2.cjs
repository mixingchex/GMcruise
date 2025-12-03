const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const affiliates = await prisma.affiliateProfile.findMany({
            take: 5
        });

        console.log('Affiliates found:', affiliates.length);

        for (const p of affiliates) {
            const user = await prisma.user.findUnique({
                where: { id: p.userId }
            });
            if (user) {
                console.log(`- Name: ${user.name}, Phone: ${user.phone}, ProfileID: ${p.id}, Type: ${p.type}`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
