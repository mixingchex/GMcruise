/**
 * 방금 추가한 고객 데이터로 업데이트 테스트
 */

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwVYYHKLyNfXwO3fSX19jmb7hF3Bh2oyay7lrlw3mJx42eL9kQANxhwxLrQyzbEj29x/exec';

async function testUpdateAudioUrl() {
  console.log('\n========================================');
  console.log('1. 오디오 URL 업데이트 테스트 (방금 추가한 고객)');
  console.log('========================================');

  const testData = {
    action: 'updateAudioUrl',
    timestamp: new Date().toLocaleString('ko-KR'),
    name: '자동화테스트고객',
    phone: '010-8888-7777',
    audioUrl: 'https://drive.google.com/file/d/TEST_AUDIO_123/view',
    fileName: '테스트_녹음_' + Date.now() + '.mp3',
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
  return parsed.success;
}

async function testUpdateNote() {
  console.log('\n========================================');
  console.log('2. 상담기록 업데이트 테스트 (방금 추가한 고객)');
  console.log('========================================');

  const testData = {
    action: 'updateNote',
    timestamp: new Date().toLocaleString('ko-KR'),
    name: '자동화테스트고객',
    phone: '010-8888-7777',
    note: '자동화 테스트 상담 기록 - ' + new Date().toLocaleString('ko-KR'),
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
  return parsed.success;
}

async function run() {
  console.log('🚀 기존 고객 데이터 업데이트 테스트\n');

  const audioResult = await testUpdateAudioUrl();
  const noteResult = await testUpdateNote();

  console.log('\n========================================');
  console.log('📊 결과 요약');
  console.log('========================================');
  console.log(`오디오 URL 업데이트: ${audioResult ? '✅ 성공' : '❌ 실패'}`);
  console.log(`상담기록 업데이트: ${noteResult ? '✅ 성공' : '❌ 실패'}`);
}

run().catch(console.error);
