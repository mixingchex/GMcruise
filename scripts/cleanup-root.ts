import { getDriveClient, findOrCreateFolder } from '@/lib/google-drive';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 루트 폴더의 남은 파일들을 분석하고 정리하는 스크립트
 */
async function analyzeAndCleanupRoot() {
    console.log('🔍 Analyzing remaining files in root folder...\n');

    const drive = getDriveClient();
    const rootFolderId = '0AJVz1C-KYWR0Uk9PVA';

    try {
        // 1. 루트 폴더의 파일 목록 가져오기 (폴더 제외)
        const res = await drive.files.list({
            q: `'${rootFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name, mimeType, createdTime)',
            pageSize: 1000, // 많이 가져오기
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = res.data.files || [];
        console.log(`📄 Found ${files.length} loose files in root folder.\n`);

        if (files.length === 0) {
            console.log('✅ Root folder is clean!');
            return;
        }

        // 2. 파일 패턴 분석
        console.log('📊 File Patterns:');
        const patterns = {
            timestamp: 0, // 176... 형식
            kakao: 0, // KakaoTalk...
            signature: 0, // signature...
            other: 0
        };

        files.slice(0, 20).forEach(f => console.log(`   - ${f.name} (${f.mimeType})`));
        console.log('   ... and more\n');

        // 3. 정리 폴더 생성 (미분류_업로드_파일)
        console.log('📁 Creating cleanup folder: "미분류_업로드_파일" (Unsorted_Uploads)...');
        const cleanupFolder = await findOrCreateFolder('미분류_업로드_파일', rootFolderId);

        if (!cleanupFolder.ok || !cleanupFolder.folderId) {
            throw new Error('Failed to create cleanup folder');
        }

        console.log(`   Target Folder ID: ${cleanupFolder.folderId}\n`);

        // 4. 파일 이동
        console.log('🚀 Moving files to cleanup folder...');
        let movedCount = 0;

        // 배치 처리 (한 번에 여러 개는 안 되므로 반복문)
        // 병렬 처리로 속도 향상
        const batchSize = 10;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            await Promise.all(batch.map(async (file) => {
                try {
                    await drive.files.update({
                        fileId: file.id!,
                        addParents: cleanupFolder.folderId!,
                        removeParents: rootFolderId,
                        fields: 'id, parents',
                        supportsAllDrives: true,
                    } as any);
                    process.stdout.write('.');
                    movedCount++;
                } catch (err: any) {
                    console.error(`\n❌ Failed to move ${file.name}: ${err.message}`);
                }
            }));
        }

        console.log(`\n\n✅ Cleanup Complete!`);
        console.log(`   Moved ${movedCount} files to "미분류_업로드_파일" folder.`);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

analyzeAndCleanupRoot()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
