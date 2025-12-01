// scripts/test_simple_upload.ts
// 간단한 Google Drive 업로드 테스트

import { uploadFileToDrive } from '../lib/google-drive';
import { getDriveFolderId } from '../lib/config/drive-config';

async function testSimpleUpload() {
  console.log('🧪 간단한 텍스트 파일 업로드 테스트...\n');

  try {
    // CASHFLOW 폴더 ID 가져오기
    const folderId = await getDriveFolderId('CASHFLOW');
    console.log('✅ CASHFLOW 폴더 ID:', folderId);
    console.log('');

    // 간단한 텍스트 버퍼 생성
    const testBuffer = Buffer.from('테스트 파일입니다 - ' + new Date().toISOString());

    console.log('📤 업로드 시도 중...');
    // 업로드 시도
    const result = await uploadFileToDrive({
      folderId,
      fileName: 'test_' + Date.now() + '.txt',
      mimeType: 'text/plain',
      buffer: testBuffer,
      makePublic: false,
    });

    if (result.ok) {
      console.log('\n✅ 업로드 성공!');
      console.log('   파일 ID:', result.fileId);
      console.log('   URL:', result.url);
      console.log('\n📂 확인: https://drive.google.com/drive/folders/1kv9XlTFLh8QqTlDvakwaxB_LtTQxv6Hx');
    } else {
      console.log('\n❌ 업로드 실패:', result.error);
    }
  } catch (error: any) {
    console.error('\n❌ 오류:', error.message);
    console.error('상세:', error);
  }
}

testSimpleUpload();
