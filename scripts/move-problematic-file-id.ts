
import { getDriveClient, findOrCreateFolder, moveFileToFolder } from '../lib/google-drive';
import prisma from '../lib/prisma';

async function main() {
    console.log('Starting move script (ID based)...');

    try {
        const config = await prisma.systemConfig.findUnique({
            where: { configKey: 'google_drive_cruise_images_folder_id' },
            select: { configValue: true },
        });

        const rootFolderId = config?.configValue || '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck';
        console.log('Root Folder ID:', rootFolderId);

        const fileId = '19dgHN4JMsi5DZ7kFUcBaytypLjskyfn0'; // ID from debug script
        console.log('Target File ID:', fileId);

        // 1. Create Trash folder
        const folderRes = await findOrCreateFolder('Trash_Debug', rootFolderId);
        if (!folderRes.ok || !folderRes.folderId) {
            console.error('Failed to create folder:', folderRes.error);
            return;
        }
        console.log('Trash folder ID:', folderRes.folderId);

        // 2. Move file
        const moveRes = await moveFileToFolder(fileId, folderRes.folderId, rootFolderId);
        if (moveRes.ok) {
            console.log('Successfully moved file to Trash_Debug.');
        } else {
            console.error('Failed to move file:', moveRes.error);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
