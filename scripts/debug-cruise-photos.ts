
import { getDriveClient } from '../lib/google-drive';
import prisma from '../lib/prisma';

async function main() {
    console.log('Starting debug script...');

    try {
        const config = await prisma.systemConfig.findUnique({
            where: { configKey: 'google_drive_cruise_images_folder_id' },
            select: { configValue: true },
        });

        const rootFolderId = config?.configValue || '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck';
        console.log('Root Folder ID:', rootFolderId);

        const drive = getDriveClient();

        // 1. List files in Root
        console.log('\n--- Listing files in ROOT ---');
        const rootFiles = await listFiles(drive, rootFolderId);
        const targetImage = rootFiles.find(f => f.name?.includes('MSC유리비') || f.name?.includes('landing'));

        if (targetImage) {
            console.log('FOUND TARGET IMAGE IN ROOT:', targetImage.name, targetImage.id);
        } else {
            console.log('Target image NOT found in root.');
        }

        // 2. List folders in Root to find a subfolder
        console.log('\n--- Finding subfolders ---');
        const folders = await listFolders(drive, rootFolderId);
        console.log('Found folders:', folders.map(f => f.name).slice(0, 5));

        if (folders.length > 0) {
            const subfolder = folders[0];
            console.log(`\n--- Listing files in subfolder: ${subfolder.name} (${subfolder.id}) ---`);
            const subFiles = await listFiles(drive, subfolder.id);
            const targetInSub = subFiles.find(f => f.name?.includes('MSC유리비') || f.name?.includes('landing'));

            if (targetInSub) {
                console.log('FOUND TARGET IMAGE IN SUBFOLDER:', targetInSub.name, targetInSub.id);
                if (targetImage && targetInSub.id === targetImage.id) {
                    console.log('!!! CRITICAL: Same file ID found in both root and subfolder (Multi-parent issue) !!!');
                }
            } else {
                console.log('Target image NOT found in subfolder.');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

async function listFiles(drive: any, folderId: string) {
    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
        fields: 'files(id, name, parents)',
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives'
    });
    return res.data.files || [];
}

async function listFolders(drive: any, folderId: string) {
    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        pageSize: 10,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives'
    });
    return res.data.files || [];
}

main();
