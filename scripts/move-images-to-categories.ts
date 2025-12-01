import { getDriveClient } from '@/lib/google-drive';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 루트 폴더의 이미지를 "여행 가이드 자료" 하위 카테고리로 자동 이동
 */
async function moveImagesToCategories() {
    console.log('🚀 Moving images to category folders...\n');

    const drive = getDriveClient();
    const rootFolderId = '0AJVz1C-KYWR0Uk9PVA';
    const travelGuideFolderId = '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck';

    try {
        // 1. "여행 가이드 자료" 폴더의 카테고리 폴더들 가져오기
        console.log('📂 Fetching category folders...\n');
        const categoriesRes = await drive.files.list({
            q: `'${travelGuideFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const categories = categoriesRes.data.files || [];
        console.log(`Found ${categories.length} category folders\n`);

        // 2. 루트 폴더의 이미지 파일들 가져오기
        const imagesRes = await drive.files.list({
            q: `'${rootFolderId}' in parents and (mimeType contains 'image/' or name contains '.png' or name contains '.jpg' or name contains '.webp') and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const images = imagesRes.data.files || [];
        console.log(`Found ${images.length} image files in root\n`);

        let movedCount = 0;
        let skippedCount = 0;

        // 3. 각 이미지를 카테고리별로 이동
        for (const image of images) {
            const fileName = image.name || '';

            // 파일 이름에서 카테고리 추출 (예: "후쿠오카 기항지__..." -> "후쿠오카 기항지")
            const categoryMatch = fileName.match(/^([^_]+)__/);

            if (categoryMatch) {
                const categoryName = categoryMatch[1].trim();

                // 매칭되는 카테고리 폴더 찾기
                const targetCategory = categories.find(cat => {
                    const catName = cat.name || '';
                    return catName.includes(categoryName) || categoryName.includes(catName);
                });

                if (targetCategory) {
                    console.log(`📦 Moving: ${fileName.substring(0, 60)}...`);
                    console.log(`   → ${targetCategory.name}\n`);

                    try {
                        await drive.files.update({
                            fileId: image.id!,
                            addParents: targetCategory.id!,
                            removeParents: rootFolderId,
                            fields: 'id, parents',
                            supportsAllDrives: true,
                        } as any);

                        movedCount++;
                        continue;
                    } catch (error: any) {
                        console.error(`   ❌ Failed: ${error.message}\n`);
                    }
                }
            }

            console.log(`⏭️  Skipped: ${fileName.substring(0, 60)}...`);
            skippedCount++;
        }

        console.log('\n✅ Migration Complete!');
        console.log(`   Moved: ${movedCount} images`);
        console.log(`   Skipped: ${skippedCount} images`);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

moveImagesToCategories()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch(() => process.exit(1));
