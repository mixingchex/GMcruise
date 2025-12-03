// 테스트: 판매원 문서 업로드 테스트
// 실제 Google Drive에 업로드하여 폴더 구조가 올바르게 생성되는지 확인

import { uploadAffiliateInfoFile } from '../lib/google-drive-affiliate-info';
import { findOrCreateFolder } from '../lib/google-drive';
import { getDriveFolderId } from '../lib/config/drive-config';

async function testAffiliateUpload() {
  console.log('=== 판매원 문서 업로드 테스트 시작 ===\n');

  try {
    // 1. AFFILIATE_DOCUMENTS 폴더 ID 확인
    console.log('1. AFFILIATE_DOCUMENTS 폴더 ID 확인...');
    const affiliateDocsFolderId = await getDriveFolderId('AFFILIATE_DOCUMENTS');
    console.log('   폴더 ID:', affiliateDocsFolderId);

    if (!affiliateDocsFolderId) {
      console.error('   ❌ AFFILIATE_DOCUMENTS 폴더 ID가 없습니다.');
      return;
    }
    console.log('   ✅ 폴더 ID 확인 완료');

    // 2. 테스트용 판매원 폴더 생성 테스트
    console.log('\n2. 테스트 폴더 생성 테스트...');
    const testFolderName = 'TEST_UPLOAD_' + Date.now();
    const folderResult = await findOrCreateFolder(testFolderName, affiliateDocsFolderId);

    if (folderResult.ok) {
      console.log('   ✅ 테스트 폴더 생성 성공:', folderResult.folderId);
    } else {
      console.error('   ❌ 테스트 폴더 생성 실패:', folderResult.error);
      return;
    }

    // 3. ID_Cards 하위 폴더 생성 테스트
    console.log('\n3. ID_Cards 하위 폴더 생성 테스트...');
    const idCardsResult = await findOrCreateFolder('ID_Cards', folderResult.folderId);

    if (idCardsResult.ok) {
      console.log('   ✅ ID_Cards 폴더 생성 성공:', idCardsResult.folderId);
    } else {
      console.error('   ❌ ID_Cards 폴더 생성 실패:', idCardsResult.error);
    }

    // 4. BankBooks 하위 폴더 생성 테스트
    console.log('\n4. BankBooks 하위 폴더 생성 테스트...');
    const bankBooksResult = await findOrCreateFolder('BankBooks', folderResult.folderId);

    if (bankBooksResult.ok) {
      console.log('   ✅ BankBooks 폴더 생성 성공:', bankBooksResult.folderId);
    } else {
      console.error('   ❌ BankBooks 폴더 생성 실패:', bankBooksResult.error);
    }

    // 5. 테스트 이미지 업로드 (더미 이미지)
    console.log('\n5. 테스트 이미지 업로드...');

    // 1x1 빨간색 PNG 이미지 (최소 크기)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8bit RGB
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
      0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
      0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, // IEND chunk
      0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    // uploadAffiliateInfoFile 사용 (userId 대신 테스트용으로 'TEST' 사용)
    const uploadResult = await uploadAffiliateInfoFile(
      'TEST',
      testImageBuffer,
      'test_idcard.png',
      'image/png',
      'idCard'
    );

    if (uploadResult.ok) {
      console.log('   ✅ 테스트 이미지 업로드 성공');
      console.log('   URL:', uploadResult.url);
      console.log('   File ID:', uploadResult.fileId);
    } else {
      console.error('   ❌ 테스트 이미지 업로드 실패:', uploadResult.error);
    }

    console.log('\n=== 테스트 완료 ===');
    console.log('\n⚠️ Google Drive에서 테스트 폴더를 확인하고 삭제해주세요:');
    console.log(`   - 폴더명: ${testFolderName}`);
    console.log(`   - 또는 "TEST_UPLOAD_" 로 시작하는 폴더들`);

  } catch (error: any) {
    console.error('\n=== ❌ 테스트 실패 ===');
    console.error('에러:', error.message);
    console.error('스택:', error.stack);
  }
}

// 실행
testAffiliateUpload()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('예외 발생:', error);
    process.exit(1);
  });
