import { getDriveClient } from '@/lib/google-drive';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 구글 드라이브 루트 폴더에 흩어진 파일들을 올바른 폴더로 자동 이동
 */
async function organizeDriveFiles() {
    console.log('🚀 Starting Drive File Organization...');

    const drive = getDriveClient();
    const rootFolderId = '0AJVz1C-KYWR0Uk9PVA'; // cruisedot-documents

    // 폴더 매핑 (파일 이름 패턴 -> 목적지 폴더 ID)
    const folderMapping = [
        { pattern: /^contract-/, folderId: '1pWt8VN9WD_79eJcp4_SmFfbekMOcykTT', folderName: 'contracts-pdfs' },
        { pattern: /passport|여권/, folderId: '1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI', folderName: 'Passports' },
        { pattern: /bankbook|통장/, folderId: '1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI', folderName: 'Bankbooks' },
        { pattern: /주주구성|기본정보|사업자/, folderId: '1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI', folderName: 'Affiliate_Documents' },
    ];

    try {
        // 1. 루트 폴더의 모든 파일 가져오기
        console.log('📂 Fetching files from root folder...');
        const response = await drive.files.list({
            q: `'${rootFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name, mimeType, parents)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = response.data.files || [];
        console.log(`📊 Found ${files.length} files in root folder`);

        if (files.length === 0) {
            console.log('✅ No files to organize!');
            return;
        }

        // 2. 각 파일을 올바른 폴더로 이동
        let movedCount = 0;
        let skippedCount = 0;

        for (const file of files) {
            const fileName = file.name || '';
            let moved = false;

            // 파일 이름 패턴 매칭
            for (const mapping of folderMapping) {
                if (mapping.pattern.test(fileName)) {
                    console.log(`📦 Moving: ${fileName} → ${mapping.folderName}`);

                    try {
                        await drive.files.update({
                            fileId: file.id!,
                            addParents: mapping.folderId,
                            removeParents: rootFolderId,
                            fields: 'id, parents',
                            supportsAllDrives: true,
                        } as any);

                        movedCount++;
                        moved = true;
                        break;
                    } catch (error: any) {
                        console.error(`❌ Failed to move ${fileName}:`, error.message);
                    }
                }
            }

            if (!moved) {
                console.log(`⏭️  Skipped: ${fileName} (no matching pattern)`);
                skippedCount++;
            }
        }

        console.log('\n✅ Organization Complete!');
        console.log(`   Moved: ${movedCount} files`);
        console.log(`   Skipped: ${skippedCount} files`);

    } catch (error) {
        console.error('❌ Organization failed:', error);
        throw error;
    }
}

organizeDriveFiles()
    .then(() => {
        console.log('🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error:', error);
        process.exit(1);
    });
