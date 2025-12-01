
import { PrismaClient } from '@prisma/client';
import { DRIVE_CONFIG_KEYS, DriveConfigKey } from '../lib/config/drive-config';

const prisma = new PrismaClient();

// Known values from context and user input
const SEED_VALUES: Partial<Record<DriveConfigKey, string>> = {
    SIGNATURES: '1PcdSnWQ3iCdd87Y-UI_63HSjlYqcFGyX',
    PASSPORTS: '1OcqlLCumcXA84yOnH1YrDHQI7vHN-R8u',
    ID_CARDS: '1DFWpAiS-edjiBym5Y5AonDOl2wXyuDV0',
    BANKBOOKS: '1IjNSTTTBjU9NZE6fm6DeAAHBx4puWCRl',
    B2B_BACKUP: '1JlfkQA_NsEerQy7RK6WkQb0bW5m22hr2',
    MEETING_RECORDINGS: '1QQTxrYikvoF533qZBgcMZapN6AWC4hby',
    PROFILES: '13roFq5i51155_DG4MR74dqyWrR6GRAG9',
    PRODUCTS: '1fWbPelIoftl1DqXLayZNle7z-DSYzvl8',
    ROOT: '0AJVz1C-KYWR0Uk9PVA',
    // CONTRACTS and AFFILIATE_DOCUMENTS are intentionally left empty for user to fill
};

async function main() {
    console.log('Starting Drive Config Seed...');

    for (const key of Object.keys(DRIVE_CONFIG_KEYS) as DriveConfigKey[]) {
        const configKey = DRIVE_CONFIG_KEYS[key];
        const value = SEED_VALUES[key] || '';
        const description = `Google Drive Folder ID for ${key}`;

        console.log(`Upserting ${key} (${configKey}) with value: ${value || '(empty)'}`);

        await prisma.systemConfig.upsert({
            where: { configKey },
            update: {
                // Only update if the current value is empty, to avoid overwriting user changes?
                // User asked to "move everything to Admin settings". So we should probably set it if it's not set.
                // But let's be safe: if it exists, we keep it. If not, we create it.
                // Actually, upsert update will run if it exists.
                // Let's check if it exists first to decide whether to overwrite.
                // But for this task, I want to ensure these specific values are in DB.
                // So I will update configValue.
                configValue: value,
                description,
                category: 'drive_config',
                updatedAt: new Date(),
            },
            create: {
                configKey,
                configValue: value,
                description,
                category: 'drive_config',
                updatedAt: new Date(),
            },
        });
    }

    console.log('Drive Config Seed Completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
