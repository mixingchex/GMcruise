
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating Drive Config with User Provided IDs...');

    const updates = [
        { key: 'google_drive_contracts_folder_id', value: '1HN-w4tNLdmfW5K5N3zF52P_InrUdBkQ', description: 'Google Drive Folder ID for CONTRACTS' },
        { key: 'google_drive_affiliate_documents_folder_id', value: '1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI', description: 'Google Drive Folder ID for AFFILIATE_DOCUMENTS' },
    ];

    for (const update of updates) {
        await prisma.systemConfig.upsert({
            where: { configKey: update.key },
            update: {
                configValue: update.value,
                category: 'drive_config',
                updatedAt: new Date()
            },
            create: {
                configKey: update.key,
                configValue: update.value,
                description: update.description,
                category: 'drive_config',
                updatedAt: new Date()
            },
        });
        console.log(`Updated ${update.key} -> ${update.value}`);
    }

    console.log('Update Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
