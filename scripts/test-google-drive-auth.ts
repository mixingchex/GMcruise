// scripts/test-google-drive-auth.ts
// Google Drive 인증 테스트 스크립트

import { findOrCreateFolder } from '../lib/google-drive';

async function testGoogleDriveAuth() {
  console.log('🔍 Google Drive 인증 테스트 시작...');
  console.log('='.repeat(50));
  
  // 1. 환경 변수 확인
  console.log('\n📋 환경 변수 확인:');
  const privateKeyEnv = 
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;
  
  const clientEmail = 
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.CLIENT_EMAIL;
  
  console.log(`  - Private Key 존재: ${privateKeyEnv ? '✅ 있음' : '❌ 없음'}`);
  console.log(`  - Client Email 존재: ${clientEmail ? '✅ 있음' : '❌ 없음'}`);
  
  if (!privateKeyEnv) {
    console.error('\n❌ Private Key가 환경 변수에 없습니다!');
    console.error('   확인할 환경 변수:');
    console.error('   - GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY');
    console.error('   - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
    process.exit(1);
  }
  
  if (!clientEmail) {
    console.error('\n❌ Client Email이 환경 변수에 없습니다!');
    console.error('   확인할 환경 변수:');
    console.error('   - GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL');
    console.error('   - GOOGLE_SERVICE_ACCOUNT_EMAIL');
    process.exit(1);
  }
  
  // 2. Private Key 형식 확인
  console.log('\n📋 Private Key 형식 확인:');
  let privateKey = privateKeyEnv
    .replace(/^["']|["']$/g, '')
    .trim();
  
  const hasBegin = privateKey.includes('-----BEGIN PRIVATE KEY-----');
  const hasEnd = privateKey.includes('-----END PRIVATE KEY-----');
  const hasNewlines = privateKey.includes('\n');
  const lineCount = privateKey.split('\n').length;
  
  console.log(`  - BEGIN 라인: ${hasBegin ? '✅ 있음' : '❌ 없음'}`);
  console.log(`  - END 라인: ${hasEnd ? '✅ 있음' : '❌ 없음'}`);
  console.log(`  - 개행 문자: ${hasNewlines ? '✅ 있음' : '❌ 없음'}`);
  console.log(`  - 총 라인 수: ${lineCount}`);
  console.log(`  - Private Key 길이: ${privateKey.length}자`);
  
  if (!hasBegin || !hasEnd) {
    console.error('\n❌ Private Key 형식이 올바르지 않습니다!');
    console.error('   -----BEGIN PRIVATE KEY-----와 -----END PRIVATE KEY-----가 필요합니다.');
    process.exit(1);
  }
  
  // 3. 줄바꿈 문자 처리
  console.log('\n📋 줄바꿈 문자 처리:');
  if (!hasNewlines) {
    console.log('  - 이스케이프된 줄바꿈 문자 처리 중...');
    privateKey = privateKey
      .replace(/\\\\n/g, '\n')
      .replace(/\\\\r\\\\n/g, '\n')
      .replace(/\\\\r/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\r\\n/g, '\n')
      .replace(/\\r/g, '\n');
    console.log(`  - 처리 후 라인 수: ${privateKey.split('\n').length}`);
  } else {
    console.log('  - 실제 개행 문자가 이미 포함되어 있습니다.');
  }
  
  // 4. Google Drive API 호출 테스트 (findOrCreateFolder를 통해 간접 테스트)
  console.log('\n📋 Google Drive API 호출 테스트:');
  try {
    // 테스트 폴더 찾기/생성 시도
    const result = await findOrCreateFolder('TEST_FOLDER', process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || undefined);
    
    if (result.ok) {
      console.log('  ✅ Google Drive API 호출 성공!');
      console.log(`  - 테스트 폴더 ID: ${result.folderId || 'N/A'}`);
      
      console.log('\n' + '='.repeat(50));
      console.log('✅ Google Drive 인증 테스트 완료!');
      console.log('   모든 검증을 통과했습니다.');
      process.exit(0);
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (apiError: any) {
    console.error('  ❌ Google Drive API 호출 실패!');
    console.error(`  - 오류: ${apiError.message}`);
    
    if (apiError.message?.includes('JWT') || apiError.message?.includes('invalid_grant') || apiError.message?.includes('Invalid JWT')) {
      console.error('\n💡 JWT Signature 오류 해결 방법:');
      console.error('   1. Google Cloud Console에서 서비스 계정 키 재생성');
      console.error('   2. 새로운 Private Key를 환경 변수에 설정');
      console.error('   3. Private Key의 줄바꿈 문자(\\n)가 올바르게 처리되었는지 확인');
      console.error('   4. Vercel 환경 변수에서 Private Key를 다시 설정');
      console.error('\n📝 Private Key 설정 방법:');
      console.error('   - Vercel 대시보드 > Settings > Environment Variables');
      console.error('   - GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY 추가');
      console.error('   - 전체 Private Key를 복사 (-----BEGIN PRIVATE KEY-----부터 -----END PRIVATE KEY-----까지)');
      console.error('   - 여러 줄 입력 시 Vercel이 자동으로 처리');
      console.error('\n📖 자세한 가이드: Google_Drive_인증_오류_해결_가이드.md 파일 참고');
    } else {
      console.error('\n💡 가능한 원인:');
      console.error('   1. 서비스 계정에 Google Drive API 권한이 없음');
      console.error('   2. 서비스 계정이 공유 드라이브에 접근 권한이 없음');
      console.error('   3. 서비스 계정 키가 만료되었거나 재생성됨');
    }
    
    process.exit(1);
  }
}

testGoogleDriveAuth().catch((error) => {
  console.error('❌ 예상치 못한 오류:', error);
  process.exit(1);
});

