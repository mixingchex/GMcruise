import { getDriveClient } from '@/lib/google-drive';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 파일 이동 상태 검증 스크립트
 */
async function verifyFileMigration() {
    console.log('🔍 Verifying file migration status...\n');

    const drive = getDriveClient();
    const rootFolderId = '0AJVz1C-KYWR0Uk9PVA';
    const travelGuideFolderId = '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck';

    try {
        // 1. 루트 폴더의 현재 파일 상태 확인
        console.log('📂 Checking ROOT folder...\n');
        const rootFiles = await drive.files.list({
            q: `'${rootFolderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType)',
            pageSize: 50,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = rootFiles.data.files || [];
        const imageFiles = files.filter(f =>
            f.mimeType?.includes('image') ||
            f.name?.endsWith('.png') ||
            f.name?.endsWith('.jpg') ||
            f.name?.endsWith('.webp')
        );

        console.log(`Total files in root: ${files.length}`);
        console.log(`Image files in root: ${imageFiles.length}\n`);

        if (imageFiles.length > 0) {
            console.log('⚠️  Images still in root folder:');
            imageFiles.forEach((f, idx) => {
                console.log(`   ${idx + 1}. ${f.name}`);
            });
            console.log('');
        } else {
            console.log('✅ No images in root folder!\n');
        }

        // 2. "여행 가이드 자료" 폴더 확인
        console.log('📂 Checking "여행 가이드 자료" folder...\n');

        const travelGuideInfo = await drive.files.get({
            fileId: travelGuideFolderId,
            fields: 'id, name',
            supportsAllDrives: true,
        });

        console.log(`Folder name: "${travelGuideInfo.data.name}"`);
        console.log(`Folder ID: ${travelGuideInfo.data.id}\n`);

        // 3. 카테고리 폴더들 확인
        const categories = await drive.files.list({
            q: `'${travelGuideFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        console.log(`📁 Category folders: ${categories.data.files?.length || 0}\n`);

        // 4. 각 카테고리 폴더의 파일 개수 확인
        if (categories.data.files && categories.data.files.length > 0) {
            console.log('📊 Files per category:\n');

            for (const category of categories.data.files.slice(0, 10)) {
                const filesInCategory = await drive.files.list({
                    q: `'${category.id}' in parents and trashed = false`,
                    fields: 'files(id)',
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                });

                const count = filesInCategory.data.files?.length || 0;
                console.log(`   📁 ${category.name}: ${count} files`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('\n📋 SUMMARY:\n');
        console.log(`   Root folder images: ${imageFiles.length}`);
        console.log(`   Category folders: ${categories.data.files?.length || 0}`);

        if (imageFiles.length === 0) {
            console.log('\n✅ Migration appears SUCCESSFUL!');
            console.log('   All images have been moved to category folders.');
        } else {
            console.log('\n⚠️  Migration INCOMPLETE or FAILED');
            console.log('   Some images are still in the root folder.');
            console.log('\n💡 Possible reasons:');
            console.log('   1. Browser cache - try hard refresh (Ctrl+Shift+R)');
            console.log('   2. Permission issues with Shared Drive');
            console.log('   3. Files owned by different account');
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

verifyFileMigration()
    .then(() => {
        console.log('\n✅ Verification complete!');
        process.exit(0);
    })
    .catch(() => process.exit(1));
