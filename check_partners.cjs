
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const profiles = await prisma.affiliateProfile.findMany({
        where: {
            metadata: {
                not: PrismaClient.JsonNull
            }
        },
        select: {
            id: true,
            displayName: true,
            landingSlug: true,
            metadata: true
        }
    });

    console.log('Found profiles with custom templates:', profiles.length);

    for (const p of profiles) {
        const meta = p.metadata;
        if (meta && meta.b2bLandingTemplate) {
            console.log(`Profile: ${p.displayName} (${p.landingSlug}) has custom template.`);
            // Check if images are present in custom template
            const jayImg = meta.b2bLandingTemplate.match(/alt="제이 점장"/);
            console.log(`  - Has Jay Image: ${!!jayImg}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
