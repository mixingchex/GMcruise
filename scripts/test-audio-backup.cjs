/**
 * 오디오 백업 자동화 테스트
 * 1. Google Drive 업로드 테스트 (UPLOADS_AUDIO 폴더)
 * 2. 스프레드시트 오디오 URL 전송 테스트 (updateAudioUrl action)
 */

require('dotenv').config({ path: '.env.local' });

const UPLOADS_AUDIO_FOLDER_ID = process.env.GOOGLE_DRIVE_UPLOADS_AUDIO_FOLDER_ID || '1XfdoQrODfjZOaQzV6X859fE2mCG4QuwY';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwVYYHKLyNfXwO3fSX19jmb7hF3Bh2oyay7lrlw3mJx42eL9kQANxhwxLrQyzbEj29x/exec';

async function testGoogleDriveConnection() {
  console.log('\n========================================');
  console.log('1. Google Drive 연결 테스트');
  console.log('========================================');

  try {
    const { google } = require('googleapis');

    const credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!credentials.client_email || !credentials.private_key) {
      console.log('❌ Google 서비스 계정 환경변수 누락');
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // UPLOADS_AUDIO 폴더 확인
    const folderRes = await drive.files.get({
      fileId: UPLOADS_AUDIO_FOLDER_ID,
      fields: 'id, name',
      supportsAllDrives: true,
    });

    console.log(`✅ UPLOADS_AUDIO 폴더 확인: ${folderRes.data.name} (${UPLOADS_AUDIO_FOLDER_ID})`);
    return true;
  } catch (error) {
    console.log('❌ Google Drive 연결 실패:', error.message);
    return false;
  }
}

async function testSpreadsheetAudioUrl() {
  console.log('\n========================================');
  console.log('2. 스프레드시트 오디오 URL 전송 테스트');
  console.log('========================================');

  try {
    const testData = {
      action: 'updateAudioUrl',
      timestamp: new Date().toLocaleString('ko-KR'),
      name: '테스트_오디오백업',
      phone: '010-9999-0000',
      audioUrl: 'https://drive.google.com/file/d/TEST_AUDIO_FILE_ID/view',
      fileName: '테스트_녹음파일.mp3',
    };

    const formData = new URLSearchParams();
    Object.entries(testData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    console.log('전송 데이터:', testData);

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const result = await response.text();
    console.log('응답:', result);

    const parsed = JSON.parse(result);
    if (parsed.success || parsed.error?.includes('찾을 수 없습니다')) {
      // 고객을 찾을 수 없어도 Apps Script가 정상 동작하면 OK
      console.log('✅ 스프레드시트 연동 정상 (Apps Script 응답 성공)');
      return true;
    } else {
      console.log('⚠️ 응답:', parsed);
      return false;
    }
  } catch (error) {
    console.log('❌ 스프레드시트 전송 실패:', error.message);
    return false;
  }
}

async function testSpreadsheetNote() {
  console.log('\n========================================');
  console.log('3. 스프레드시트 상담기록(note) 전송 테스트');
  console.log('========================================');

  try {
    const testData = {
      action: 'updateNote',
      timestamp: new Date().toLocaleString('ko-KR'),
      name: '테스트_상담기록',
      phone: '010-9999-0000',
      note: '자동화 테스트 상담 기록입니다.',
    };

    const formData = new URLSearchParams();
    Object.entries(testData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    console.log('전송 데이터:', testData);

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const result = await response.text();
    console.log('응답:', result);

    const parsed = JSON.parse(result);
    if (parsed.success || parsed.error?.includes('찾을 수 없습니다')) {
      console.log('✅ 상담기록 전송 정상 (Apps Script 응답 성공)');
      return true;
    } else {
      console.log('⚠️ 응답:', parsed);
      return false;
    }
  } catch (error) {
    console.log('❌ 상담기록 전송 실패:', error.message);
    return false;
  }
}

async function testAddNewRow() {
  console.log('\n========================================');
  console.log('4. 스프레드시트 새 행 추가 테스트 (addRow)');
  console.log('========================================');

  try {
    const testData = {
      action: 'addRow',
      timestamp: new Date().toLocaleString('ko-KR'),
      name: '자동화테스트고객',
      phone: '010-8888-7777',
      source: '(자동화테스트)',
      productName: '테스트 크루즈',
      channel: '본사',
      manager: '',
    };

    const formData = new URLSearchParams();
    Object.entries(testData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    console.log('전송 데이터:', testData);

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const result = await response.text();
    console.log('응답:', result);

    const parsed = JSON.parse(result);
    if (parsed.success) {
      console.log('✅ 새 행 추가 성공!');
      return true;
    } else {
      console.log('⚠️ 응답:', parsed);
      return false;
    }
  } catch (error) {
    console.log('❌ 새 행 추가 실패:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 오디오 백업 자동화 테스트 시작...\n');
  console.log('UPLOADS_AUDIO 폴더:', UPLOADS_AUDIO_FOLDER_ID);
  console.log('Apps Script URL:', GOOGLE_SCRIPT_URL.substring(0, 60) + '...');

  const results = {
    driveConnection: await testGoogleDriveConnection(),
    audioUrl: await testSpreadsheetAudioUrl(),
    note: await testSpreadsheetNote(),
    addRow: await testAddNewRow(),
  };

  console.log('\n========================================');
  console.log('📊 테스트 결과 요약');
  console.log('========================================');
  console.log(`Google Drive 연결: ${results.driveConnection ? '✅' : '❌'}`);
  console.log(`오디오 URL 전송 (updateAudioUrl): ${results.audioUrl ? '✅' : '❌'}`);
  console.log(`상담기록 전송 (updateNote): ${results.note ? '✅' : '❌'}`);
  console.log(`새 행 추가 (addRow): ${results.addRow ? '✅' : '❌'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '🎉 모든 테스트 통과!' : '⚠️ 일부 테스트 실패'}`);
}

runAllTests().catch(console.error);
