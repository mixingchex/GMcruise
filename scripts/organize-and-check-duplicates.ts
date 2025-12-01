import { getDriveClient } from '@/lib/google-drive';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 1. 관광지 이미지를 카테고리별 폴더로 자동 분류
 * 2. 계약서 PDF 중복 체크
 */
async function organizeAndCheckDuplicates() {
    console.log('🚀 Starting Drive Organization & Duplicate Check...\n');

    const drive = getDriveClient();
    const rootFolderId = '0AJVz1C-KYWR0Uk9PVA'; // cruisedot-documents
    const travelGuidesFolderId = '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck'; // Travel_Guides
    const contractsFolderId = '1pWt8VN9WD_79eJcp4_SmFfbekMOcykTT'; // contracts-pdfs

    try {
        // ========== PART 1: 관광지 이미지 정리 ==========
        console.log('📂 PART 1: Organizing Travel Guide Images...\n');

        // Travel_Guides 폴더의 하위 카테고리 폴더 가져오기
        const categoriesRes = await drive.files.list({
            q: `'${travelGuidesFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const categories = categoriesRes.data.files || [];
        console.log(`📁 Found ${categories.length} category folders:`);
        categories.forEach(cat => console.log(`   - ${cat.name} (${cat.id})`));
        console.log('');

        // 루트 폴더의 이미지 파일 가져오기
        const imagesRes = await drive.files.list({
            q: `'${rootFolderId}' in parents and (mimeType contains 'image/' or name contains '.png' or name contains '.jpg') and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const images = imagesRes.data.files || [];
        console.log(`🖼️  Found ${images.length} image files in root folder\n`);

        let movedImages = 0;
        let skippedImages = 0;

        for (const image of images) {
            const fileName = image.name || '';
            let moved = false;

            // 파일 이름에서 카테고리 추출 (예: "하코다테 오타루__..." -> "하코다테 오타루")
            const categoryMatch = fileName.match(/^([^_]+)__/);

            if (categoryMatch) {
                const categoryName = categoryMatch[1].trim();

                // 매칭되는 카테고리 폴더 찾기
                const targetCategory = categories.find(cat =>
                    cat.name?.includes(categoryName) || categoryName.includes(cat.name || '')
                );

                if (targetCategory) {
                    console.log(`📦 Moving: ${fileName}`);
                    console.log(`   → Category: ${targetCategory.name}`);

                    try {
                        await drive.files.update({
                            fileId: image.id!,
                            addParents: targetCategory.id!,
                            removeParents: rootFolderId,
                            fields: 'id, parents',
                            supportsAllDrives: true,
                        } as any);

                        movedImages++;
                        moved = true;
                    } catch (error: any) {
                        console.error(`   ❌ Failed: ${error.message}`);
                    }
                }
            }

            if (!moved) {
                console.log(`⏭️  Skipped: ${fileName} (no matching category)`);
                skippedImages++;
            }
        }

        console.log(`\n✅ Image Organization Complete!`);
        console.log(`   Moved: ${movedImages} images`);
        console.log(`   Skipped: ${skippedImages} images\n`);

        // ========== PART 2: 계약서 PDF 중복 체크 ==========
        console.log('📂 PART 2: Checking Contract PDF Duplicates...\n');

        const contractsRes = await drive.files.list({
            q: `'${contractsFolderId}' in parents and mimeType = 'application/pdf' and trashed = false`,
            fields: 'files(id, name, size, createdTime)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const contracts = contractsRes.data.files || [];
        console.log(`📄 Found ${contracts.length} PDF files in contracts-pdfs folder\n`);

        // 파일 이름별로 그룹화
        const fileGroups = new Map<string, typeof contracts>();

        for (const file of contracts) {
            const name = file.name || '';
            if (!fileGroups.has(name)) {
                fileGroups.set(name, []);
            }
            fileGroups.get(name)!.push(file);
        }

        // 중복 파일 찾기
        const duplicates = Array.from(fileGroups.entries()).filter(([_, files]) => files.length > 1);

        if (duplicates.length === 0) {
            console.log('✅ No duplicate files found!\n');
        } else {
            console.log(`⚠️  Found ${duplicates.length} duplicate file names:\n`);

            for (const [name, files] of duplicates) {
                console.log(`📌 "${name}" (${files.length} copies):`);
                files.forEach((file, idx) => {
                    console.log(`   ${idx + 1}. ID: ${file.id}, Size: ${file.size} bytes, Created: ${file.createdTime}`);
                });
                console.log('');
            }

            console.log('💡 Tip: You can manually delete older duplicates from Google Drive.\n');
        }

        console.log('🎉 All checks complete!');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

organizeAndCheckDuplicates()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Fatal Error:', error);
        process.exit(1);
    });
