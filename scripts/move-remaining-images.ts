import { getDriveClient } from '@/lib/google-drive';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 남은 이미지 파일들을 카테고리 폴더로 이동 (페이지네이션 처리)
 */
async function moveRemainingImages() {
    console.log('🚀 Moving remaining images...\n');

    const drive = getDriveClient();
    const rootFolderId = '0AJVz1C-KYWR0Uk9PVA';
    const travelGuideFolderId = '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck';

    try {
        // 1. 카테고리 폴더들 가져오기
        const categoriesRes = await drive.files.list({
            q: `'${travelGuideFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            pageSize: 100,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const categories = categoriesRes.data.files || [];
        console.log(`📁 Found ${categories.length} category folders\n`);

        // 2. 루트 폴더의 모든 이미지 파일 가져오기 (페이지네이션 처리)
        let allImages: any[] = [];
        let pageToken: string | undefined | null = undefined;

        do {
            const imagesRes = await drive.files.list({
                q: `'${rootFolderId}' in parents and (mimeType contains 'image/' or name contains '.png' or name contains '.jpg' or name contains '.webp') and trashed = false`,
                fields: 'files(id, name), nextPageToken',
                pageSize: 100,
                pageToken: pageToken || undefined,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });

            allImages = allImages.concat(imagesRes.data.files || []);
            pageToken = imagesRes.data.nextPageToken;

        } while (pageToken);

        console.log(`🖼️  Found ${allImages.length} total images in root\n`);

        let movedCount = 0;
        let skippedCount = 0;

        // 3. 각 이미지를 카테고리별로 이동
        for (const image of allImages) {
            const fileName = image.name || '';

            // 파일 이름에서 카테고리 추출
            const categoryMatch = fileName.match(/^([^_]+)__/);

            if (categoryMatch) {
                const categoryName = categoryMatch[1].trim();

                // 매칭되는 카테고리 폴더 찾기
                const targetCategory = categories.find(cat => {
                    const catName = cat.name || '';
                    return catName.includes(categoryName) || categoryName.includes(catName);
                });

                if (targetCategory) {
                    console.log(`📦 Moving: ${fileName.substring(0, 50)}...`);

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
                        console.error(`   ❌ Failed: ${error.message}`);
                    }
                }
            }

            skippedCount++;
        }

        console.log('\n✅ Complete!');
        console.log(`   Moved: ${movedCount} images`);
        console.log(`   Skipped: ${skippedCount} images`);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

moveRemainingImages()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch(() => process.exit(1));
