import { getDriveClient } from '@/lib/google-drive';
import dotenv from 'dotenv';

dotenv.config();

async function checkFolderStructure() {
    console.log('🔍 Checking actual folder structure...\n');

    const drive = getDriveClient();
    const rootFolderId = '0AJVz1C-KYWR0Uk9PVA';
    const mysteryFolderId = '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck';

    try {
        // 1. 루트 폴더의 모든 폴더 확인
        console.log('📂 Folders in ROOT (cruisedot-documents):\n');
        const rootFolders = await drive.files.list({
            q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        rootFolders.data.files?.forEach(folder => {
            console.log(`   📁 ${folder.name} (${folder.id})`);
        });

        // 2. 사장님이 주신 폴더 ID의 실제 이름 확인
        console.log('\n📂 Checking folder ID: 17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck\n');

        try {
            const folderInfo = await drive.files.get({
                fileId: mysteryFolderId,
                fields: 'id, name, parents',
                supportsAllDrives: true,
            });

            console.log(`   ✅ Found: "${folderInfo.data.name}"`);
            console.log(`   ID: ${folderInfo.data.id}`);
            console.log(`   Parent: ${folderInfo.data.parents?.[0]}\n`);

            // 3. 이 폴더 안의 하위 폴더들 확인
            console.log(`📂 Subfolders inside "${folderInfo.data.name}":\n`);
            const subfolders = await drive.files.list({
                q: `'${mysteryFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });

            if (subfolders.data.files && subfolders.data.files.length > 0) {
                subfolders.data.files.forEach(folder => {
                    console.log(`   📁 ${folder.name} (${folder.id})`);
                });
            } else {
                console.log('   (No subfolders found)');
            }

        } catch (error: any) {
            console.error(`   ❌ Cannot access folder: ${error.message}`);
            console.log('   This folder might not exist or service account has no access.');
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

checkFolderStructure()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch(() => process.exit(1));
