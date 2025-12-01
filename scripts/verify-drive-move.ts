import { getDriveClient } from '@/lib/google-drive';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 구글 드라이브 파일 실제 이동 확인 및 재시도
 */
async function verifyAndMove() {
    console.log('🔍 Verifying Drive files...\n');

    const drive = getDriveClient();
    const rootFolderId = '0AJVz1C-KYWR0Uk9PVA';

    try {
        // 루트 폴더의 파일 목록 다시 확인
        const response = await drive.files.list({
            q: `'${rootFolderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType)',
            pageSize: 20,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = response.data.files || [];
        console.log(`📂 Current files in root folder: ${files.length}\n`);

        files.forEach((file, idx) => {
            console.log(`${idx + 1}. ${file.name} (${file.mimeType})`);
        });

        console.log('\n🔍 Checking if files were actually moved...');

        // 계약서 파일 확인
        const contractFiles = files.filter(f => f.name?.startsWith('contract-'));
        console.log(`\n📄 Contract files still in root: ${contractFiles.length}`);
        contractFiles.forEach(f => console.log(`   - ${f.name}`));

        // 이미지 파일 확인
        const imageFiles = files.filter(f =>
            f.mimeType?.includes('image') || f.name?.endsWith('.png') || f.name?.endsWith('.jpg')
        );
        console.log(`\n🖼️  Image files still in root: ${imageFiles.length}`);

        if (imageFiles.length > 0) {
            console.log('\n⚠️  Files were NOT moved. This might be because:');
            console.log('   1. Shared Drive requires different permissions');
            console.log('   2. Service account needs "Content Manager" role');
            console.log('   3. Files might be owned by different account\n');
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

verifyAndMove()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
