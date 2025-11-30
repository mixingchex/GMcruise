
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const config = await prisma.systemConfig.findUnique({
        where: { configKey: 'B2B_LANDING_TEMPLATE' }
    });

    if (config) {
        console.log('Found config. Length:', config.configValue.length);
        // Extract mentor section to check images
        const mentorSection = config.configValue.match(/<section.*멘토.*<\/section>/s);
        if (mentorSection) {
            console.log('Mentor Section found.');
            // Check for Jay and Noah images
            const jayImg = config.configValue.match(/alt="제이 점장"[^>]*src="([^"]*)"/);
            const noahImg = config.configValue.match(/alt="노아 점장"[^>]*src="([^"]*)"/);

            console.log('Jay Image:', jayImg ? jayImg[1] : 'Not found');
            console.log('Noah Image:', noahImg ? noahImg[1] : 'Not found');
        } else {
            console.log('Mentor Section NOT found in config.');
            // Print a chunk of config to see what's in there
            console.log('Config start:', config.configValue.substring(0, 500));
        }
    } else {
        console.log('Config not found');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
