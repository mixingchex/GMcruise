
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Resetting B2B landing templates for all partners...');

    // 1. Find all profiles (filtering in memory to avoid JSON path issues)
    const allProfiles = await prisma.affiliateProfile.findMany();
    const profiles = allProfiles.filter(profile => {
        const metadata = profile.metadata || {};
        return metadata.b2bLandingTemplate !== undefined && metadata.b2bLandingTemplate !== null;
    });

    console.log(`Found ${profiles.length} profiles with custom templates.`);

    let updatedCount = 0;

    for (const profile of profiles) {
        const metadata = profile.metadata || {};

        // Check if b2bLandingTemplate exists and delete it
        if (metadata.b2bLandingTemplate) {
            delete metadata.b2bLandingTemplate;

            await prisma.affiliateProfile.update({
                where: { id: profile.id },
                data: { metadata },
            });
            updatedCount++;
        }
    }

    console.log(`Successfully reset templates for ${updatedCount} profiles.`);
    console.log('All partners should now use the global SystemConfig template.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
