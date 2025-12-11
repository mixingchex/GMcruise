/**
 * 전체 플로우 자동화 테스트
 * 1. 새 고객 추가 (addRow)
 * 2. 오디오 URL 업데이트 (updateAudioUrl)
 * 3. 상담기록 업데이트 (updateNote)
 */

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwVYYHKLyNfXwO3fSX19jmb7hF3Bh2oyay7lrlw3mJx42eL9kQANxhwxLrQyzbEj29x/exec';

const testPhone = '010-' + String(Math.floor(Math.random() * 9000) + 1000) + '-' + String(Math.floor(Math.random() * 9000) + 1000);
const testName = '플로우테스트_' + Date.now().toString().slice(-4);

async function sendRequest(data) {
  const formData = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  return JSON.parse(await response.text());
}

async function runFullFlow() {
  console.log('🚀 전체 플로우 자동화 테스트 시작\n');
  console.log(`테스트 고객: ${testName} (${testPhone})\n`);

  // Step 1: 새 고객 추가
  console.log('========================================');
  console.log('Step 1: 새 고객 추가 (addRow)');
  console.log('========================================');

  const addRowResult = await sendRequest({
    action: 'addRow',
    timestamp: new Date().toLocaleString('ko-KR'),
    name: testName,
    phone: testPhone,
    source: '(플로우테스트)',
    productName: '테스트 크루즈 상품',
    channel: '본사',
    manager: '',
  });
  console.log('결과:', addRowResult);

  if (!addRowResult.success) {
    console.log('❌ Step 1 실패 - 중단');
    return;
  }
  console.log('✅ Step 1 성공\n');

  // Step 2: 오디오 URL 업데이트
  console.log('========================================');
  console.log('Step 2: 오디오 URL 업데이트 (updateAudioUrl)');
  console.log('========================================');

  const audioResult = await sendRequest({
    action: 'updateAudioUrl',
    timestamp: new Date().toLocaleString('ko-KR'),
    name: testName,
    phone: testPhone,
    audioUrl: 'https://drive.google.com/file/d/FULL_FLOW_TEST_AUDIO/view',
    fileName: '플로우테스트_녹음.mp3',
  });
  console.log('결과:', audioResult);

  if (!audioResult.success) {
    console.log('❌ Step 2 실패');
  } else {
    console.log('✅ Step 2 성공\n');
  }

  // Step 3: 상담기록 업데이트
  console.log('========================================');
  console.log('Step 3: 상담기록 업데이트 (updateNote)');
  console.log('========================================');

  const noteResult = await sendRequest({
    action: 'updateNote',
    timestamp: new Date().toLocaleString('ko-KR'),
    name: testName,
    phone: testPhone,
    note: '플로우 테스트 완료 - 오디오/상담기록 연동 정상',
  });
  console.log('결과:', noteResult);

  if (!noteResult.success) {
    console.log('❌ Step 3 실패');
  } else {
    console.log('✅ Step 3 성공\n');
  }

  // 최종 결과
  console.log('========================================');
  console.log('📊 전체 플로우 테스트 결과');
  console.log('========================================');
  console.log(`Step 1 (addRow): ${addRowResult.success ? '✅' : '❌'}`);
  console.log(`Step 2 (updateAudioUrl): ${audioResult.success ? '✅' : '❌'}`);
  console.log(`Step 3 (updateNote): ${noteResult.success ? '✅' : '❌'}`);

  const allPassed = addRowResult.success && audioResult.success && noteResult.success;
  console.log(`\n${allPassed ? '🎉 전체 플로우 성공!' : '⚠️ 일부 단계 실패'}`);
  console.log(`\n📋 스프레드시트에서 "${testName}" 고객 확인해보세요!`);
}

runFullFlow().catch(console.error);
