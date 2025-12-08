
import { getDriveClient, findOrCreateFolder, moveFileToFolder } from '../lib/google-drive';
import prisma from '../lib/prisma';

async function main() {
    console.log('Starting move script...');

    try {
        const config = await prisma.systemConfig.findUnique({
            where: { configKey: 'google_drive_cruise_images_folder_id' },
            select: { configValue: true },
        });

        const rootFolderId = config?.configValue || '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck';
        console.log('Root Folder ID:', rootFolderId);

        const drive = getDriveClient();

        // 1. Find the file
        const res = await drive.files.list({
            q: `'${rootFolderId}' in parents and name contains 'landing_exposure/MSC유리비아호' and trashed=false`,
            fields: 'files(id, name)',
        });

        const file = res.data.files?.[0];
        if (!file) {
            console.log('File not found in root.');
            return;
        }
        console.log('Found file:', file.name, file.id);

        // 2. Create Trash folder
        const folderRes = await findOrCreateFolder('Trash_Debug', rootFolderId);
        if (!folderRes.ok || !folderRes.folderId) {
            console.error('Failed to create folder:', folderRes.error);
            return;
        }
        console.log('Trash folder ID:', folderRes.folderId);

        // 3. Move file
        const moveRes = await moveFileToFolder(file.id!, folderRes.folderId, rootFolderId);
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
