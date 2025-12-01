
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectBossAccounts() {
    try {
        console.log('--- Inspecting Boss Accounts (boss1 ~ boss5) ---');

        const bossIds = ['boss1', 'boss2', 'boss3', 'boss4', 'boss5'];

        for (const mallUserId of bossIds) {
            const user = await prisma.user.findFirst({
                where: { mallUserId: mallUserId },
                include: {
                    AffiliateProfile: true
                }
            });

            if (!user) {
                console.log(`[MISSING] User ${mallUserId} not found.`);
                continue;
            }

            console.log(`\n[User: ${mallUserId}]`);
            console.log(`- ID: ${user.id}`);
            console.log(`- Name: ${user.name}`);

            if (!user.AffiliateProfile) {
                console.log(`- [WARNING] No AffiliateProfile found!`);
                continue;
            }

            const profile = user.AffiliateProfile;
            console.log(`- Profile ID: ${profile.id}`);
            console.log(`- Type: ${profile.type}`);
            console.log(`- Status: ${profile.status}`);

            // Check Template
            if (profile.b2bLandingTemplate) {
                const tpl = profile.b2bLandingTemplate;
                if (typeof tpl === 'string' && tpl.trim().startsWith('<')) {
                    console.log(`- Template: Valid HTML String. Length: ${tpl.length}`);
                } else {
                    console.log(`- [WARNING] Template is not a valid HTML string.`);
                }
            } else {
                console.log(`- [INFO] No B2B Landing Template set (using global default).`);
            }
        }

        console.log('\n--- Checking Default Template Configuration ---');
        const systemConfig = await prisma.systemConfig.findFirst({
            where: { configKey: 'B2B_LANDING_TEMPLATE' }
        });

        if (systemConfig) {
            console.log(`[OK] Default System Template exists.`);
            const tpl = systemConfig.configValue;
            if (typeof tpl === 'string' && tpl.trim().startsWith('<')) {
                console.log(`- Template: Valid HTML String. Length: ${tpl.length}`);
            } else {
                console.log(`- [ERROR] Default System Template is not a valid HTML string.`);
            }
        } else {
            console.log(`[WARNING] 'B2B_LANDING_TEMPLATE' key missing in SystemConfig.`);
        }

    } catch (error) {
        console.error('Error inspecting accounts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectBossAccounts();
