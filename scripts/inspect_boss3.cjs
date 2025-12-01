const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Inspecting boss3 user data...');

    // Search for profile directly
    try {
        const profile = await prisma.affiliateProfile.findFirst({
            where: {
                OR: [
                    { affiliateCode: 'boss3' },
                    { landingSlug: 'boss3' }
                ]
            },
            include: { User: true }
        });

        if (profile) {
            console.log('Found profile by code/slug:', JSON.stringify(profile, null, 2));

            // Check leads
            const leads = await prisma.affiliateLead.findMany({
                where: {
                    OR: [
                        { managerId: profile.id },
                        { agentId: profile.id }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            console.log('Recent leads for boss3:', JSON.stringify(leads, null, 2));
            return;
        }
    } catch (e) {
        console.log('Error searching by affiliateCode/landingSlug:', e.message);
    }

    console.log('Profile boss3 not found.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
