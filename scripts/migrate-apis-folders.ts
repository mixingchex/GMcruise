import { getDriveClient, findOrCreateFolder } from '@/lib/google-drive';
import { getDriveFolderId } from '@/lib/config/drive-config';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 루트 폴더에 있는 여행별 APIS 폴더들을 APIS 메인 폴더로 이동시키는 스크립트
 * 패턴: "[Ship Name] - [YYYY-MM-DD]"
 */
async function migrateApisFolders() {
    console.log('🔍 Starting APIS Folder Migration...');

    const drive = getDriveClient();
    const rootFolderId = await getDriveFolderId('ROOT');
    const apisMainFolderId = await getDriveFolderId('APIS_MAIN');

    if (!apisMainFolderId) {
        console.error('❌ APIS_MAIN folder ID not found in config.');
        return;
    }

    console.log(`   Root Folder: ${rootFolderId}`);
    console.log(`   APIS Main Folder: ${apisMainFolderId}`);

    try {
        // 1. 루트 폴더의 폴더 목록 가져오기
        const res = await drive.files.list({
            q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            pageSize: 1000,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const folders = res.data.files || [];
        console.log(`📂 Found ${folders.length} folders in root.`);

        // 2. 여행 폴더 패턴 매칭 (Ship Name - YYYY-MM-DD)
        // 예: "Sim Ship - 2025-12-04"
        // 날짜 형식이 포함된 폴더를 찾습니다.
        const tripFolderPattern = /.+ - \d{4}-\d{2}-\d{2}/;

        const tripFolders = folders.filter(f => f.name && tripFolderPattern.test(f.name));

        console.log(`🎯 Found ${tripFolders.length} potential trip folders to move:`);
        tripFolders.forEach(f => console.log(`   - ${f.name}`));

        if (tripFolders.length === 0) {
            console.log('✅ No trip folders found in root to migrate.');
            return;
        }

        // 3. 폴더 이동
        console.log('\n🚀 Moving folders to APIS Main Folder...');
        let movedCount = 0;

        for (const folder of tripFolders) {
            try {
                await drive.files.update({
                    fileId: folder.id!,
                    addParents: apisMainFolderId,
                    removeParents: rootFolderId,
                    fields: 'id, parents',
                    supportsAllDrives: true,
                } as any);
                console.log(`   ✅ Moved: ${folder.name}`);
                movedCount++;
            } catch (err: any) {
                console.error(`   ❌ Failed to move ${folder.name}: ${err.message}`);
            }
        }

        console.log(`\n✨ Migration Complete! Moved ${movedCount} folders.`);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

migrateApisFolders()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
