/**
 * Google Apps Script - 전화상담 고객 데이터 저장 및 상세기록 누적 업데이트
 *
 * ⚠️ 중요: 이 스크립트를 Google Apps Script에 배포해야 H열 누적 기록이 작동합니다!
 *
 * 스프레드시트 구조:
 * A열: 유입날짜
 * B열: 이름
 * C열: 연락처
 * D열: 유입경로
 * E열: 상품명
 * F열: 채널
 * G열: 담당자
 * H열: 상세기록 (누적) ← 기록보기에서 작성한 내용이 여기에 누적됩니다
 * I열: 오디오 녹음 링크 (누적) ← 상담 녹음 파일 링크가 여기에 누적됩니다
 *
 * =====================================================
 * 배포 방법:
 * =====================================================
 * 1. Google 스프레드시트 열기
 * 2. 상단 메뉴 > 확장 프로그램 > Apps Script 클릭
 * 3. 기존 코드 모두 삭제 후, 이 파일 내용 전체 복사-붙여넣기
 * 4. 위 SPREADSHEET_ID를 실제 스프레드시트 ID로 교체
 *    (URL에서 https://docs.google.com/spreadsheets/d/여기가ID/edit 부분)
 * 5. 상단 메뉴 > 배포 > 새 배포 클릭
 * 6. 톱니바퀴 > 웹 앱 선택
 * 7. 설정:
 *    - 설명: 전화상담 고객 API
 *    - 실행 계정: 나
 *    - 액세스 권한: 모든 사용자 (익명 사용자 포함)
 * 8. 배포 클릭 > 액세스 승인 > 계정 선택 > 고급 > (안전하지 않음) 이동 > 허용
 * 9. 배포 URL 복사 (https://script.google.com/macros/s/.../exec)
 * 10. Vercel 환경변수 NEXT_PUBLIC_GOOGLE_SCRIPT_URL에 설정
 *
 * ⚠️ 기존 배포가 있는 경우:
 * - 배포 > 배포 관리 > 연필 아이콘 > 버전: 새 버전 > 배포 클릭
 * =====================================================
 */

// 스프레드시트 ID (URL에서 /d/ 다음의 문자열)
const SPREADSHEET_ID = '1HeRlmTFrTgtFwU3PiswoOyL7EaBvL0ijwR74Uc2umgs';
const SHEET_NAME = '고객관리'; // 시트 이름 - 대리점장/판매원 모두 이 시트로 데이터 저장

function doPost(e) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    // 시트 이름으로 찾고, 없으면 첫 번째 시트 사용
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.getSheets()[0]; // 첫 번째 시트 사용
      Logger.log('시트 "' + SHEET_NAME + '"를 찾지 못해 첫 번째 시트 사용: ' + sheet.getName());
    }

    // FormData에서 파라미터 추출
    const params = e.parameter;
    const action = params.action || 'addRow'; // 기본 액션: 새 행 추가

    if (action === 'updateNote') {
      // 상세기록 누적 업데이트
      return updateNote(sheet, params);
    } else if (action === 'updateAudioUrl') {
      // 오디오 URL 누적 업데이트 (I열)
      return updateAudioUrl(sheet, params);
    } else {
      // 새 행 추가 (기존 기능)
      return addNewRow(sheet, params);
    }

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 새 행 추가 (전화상담 신청 시)
 */
function addNewRow(sheet, params) {
  const timestamp = params.timestamp || new Date().toLocaleString('ko-KR');
  const name = params.name || '';
  const phone = params.phone || '';
  const source = params.source || '(홈페이지)';
  const productName = params.productName || '';
  const channel = params.channel || '본사';
  const manager = params.manager || '';

  // 새 행 추가
  sheet.appendRow([
    timestamp,    // A: 유입날짜
    name,         // B: 이름
    phone,        // C: 연락처
    source,       // D: 유입경로
    productName,  // E: 상품명
    channel,      // F: 채널
    manager,      // G: 담당자
    ''            // H: 상세기록 (초기값 빈 문자열)
  ]);

  Logger.log('새 행 추가 완료: ' + name + ', ' + phone);

  return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'addRow' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 상세기록 누적 업데이트
 * 연락처로 고객을 찾아 H열에 기록 누적 (이름이 다를 수 있으므로 연락처 우선 검색)
 */
function updateNote(sheet, params) {
  const name = params.name || '';
  const phone = params.phone || '';
  const note = params.note || '';
  const timestamp = params.timestamp || new Date().toLocaleString('ko-KR');

  if (!phone || !note) {
    Logger.log('필수 정보 누락 - phone: ' + phone + ', note: ' + note);
    return ContentService.createTextOutput(JSON.stringify({ error: '필수 정보가 누락되었습니다. (연락처, 기록)' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 정규화된 전화번호 (하이픈 제거)
  const normalizedPhone = phone.replace(/-/g, '');
  Logger.log('상세기록 업데이트 시도 - 이름: ' + name + ', 연락처: ' + normalizedPhone);

  // 데이터 범위 가져오기
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  let updatedCount = 0;
  let matchedRows = [];

  // 2행부터 검색 (1행은 헤더)
  for (let i = 1; i < values.length; i++) {
    const rowName = String(values[i][1] || '').trim(); // B열: 이름
    const rowPhone = String(values[i][2] || '').replace(/-/g, ''); // C열: 연락처 (정규화)

    // 연락처가 일치하는 행 찾기 (이름은 선택적으로 체크)
    if (rowPhone === normalizedPhone) {
      const rowIndex = i + 1; // 시트 행 번호 (1-indexed)
      const currentNote = String(values[i][7] || ''); // H열 (index 7)

      // 새 기록 포맷: [날짜] 기록내용
      const newNoteEntry = '[' + timestamp + '] ' + note;

      // 기존 기록이 있으면 줄바꿈으로 구분하여 누적
      const updatedNote = currentNote ? currentNote + '\n' + newNoteEntry : newNoteEntry;

      // H열 업데이트 (8번째 열)
      sheet.getRange(rowIndex, 8).setValue(updatedNote);
      updatedCount++;
      matchedRows.push({ row: rowIndex, name: rowName });

      Logger.log('상세기록 업데이트 완료 - 행: ' + rowIndex + ', 고객: ' + rowName + ', 연락처: ' + rowPhone);
    }
  }

  if (updatedCount === 0) {
    Logger.log('일치하는 고객을 찾을 수 없음 - 이름: ' + name + ', 연락처: ' + normalizedPhone);
    Logger.log('검색한 전체 행 수: ' + (values.length - 1));
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: '일치하는 고객을 찾을 수 없습니다. 스프레드시트에 해당 연락처가 있는지 확인해주세요.',
      searched: { name, phone: normalizedPhone },
      totalRows: values.length - 1
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  Logger.log('총 ' + updatedCount + '개 행 업데이트 완료');
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    action: 'updateNote',
    updatedCount: updatedCount,
    matchedRows: matchedRows
  }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 오디오 URL 누적 업데이트
 * 연락처로 고객을 찾아 I열에 오디오 링크 누적
 */
function updateAudioUrl(sheet, params) {
  const name = params.name || '';
  const phone = params.phone || '';
  const audioUrl = params.audioUrl || '';
  const fileName = params.fileName || '';
  const timestamp = params.timestamp || new Date().toLocaleString('ko-KR');

  if (!phone || !audioUrl) {
    Logger.log('필수 정보 누락 - phone: ' + phone + ', audioUrl: ' + audioUrl);
    return ContentService.createTextOutput(JSON.stringify({ error: '필수 정보가 누락되었습니다. (연락처, 오디오URL)' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 정규화된 전화번호 (하이픈 제거)
  const normalizedPhone = phone.replace(/-/g, '');
  Logger.log('오디오 URL 업데이트 시도 - 이름: ' + name + ', 연락처: ' + normalizedPhone);

  // 데이터 범위 가져오기
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  let updatedCount = 0;
  let matchedRows = [];

  // 2행부터 검색 (1행은 헤더)
  for (let i = 1; i < values.length; i++) {
    const rowName = String(values[i][1] || '').trim(); // B열: 이름
    const rowPhone = String(values[i][2] || '').replace(/-/g, ''); // C열: 연락처 (정규화)

    // 연락처가 일치하는 행 찾기
    if (rowPhone === normalizedPhone) {
      const rowIndex = i + 1; // 시트 행 번호 (1-indexed)
      const currentAudioUrls = String(values[i][8] || ''); // I열 (index 8)

      // 새 오디오 URL 포맷: [날짜] 파일명: URL
      const newAudioEntry = '[' + timestamp + '] ' + (fileName || '녹음파일') + ': ' + audioUrl;

      // 기존 URL이 있으면 줄바꿈으로 구분하여 누적
      const updatedAudioUrls = currentAudioUrls ? currentAudioUrls + '\n' + newAudioEntry : newAudioEntry;

      // I열 업데이트 (9번째 열)
      sheet.getRange(rowIndex, 9).setValue(updatedAudioUrls);
      updatedCount++;
      matchedRows.push({ row: rowIndex, name: rowName });

      Logger.log('오디오 URL 업데이트 완료 - 행: ' + rowIndex + ', 고객: ' + rowName);
    }
  }

  if (updatedCount === 0) {
    Logger.log('일치하는 고객을 찾을 수 없음 - 이름: ' + name + ', 연락처: ' + normalizedPhone);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: '일치하는 고객을 찾을 수 없습니다.',
      searched: { name, phone: normalizedPhone }
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  Logger.log('총 ' + updatedCount + '개 행 오디오 URL 업데이트 완료');
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    action: 'updateAudioUrl',
    updatedCount: updatedCount,
    matchedRows: matchedRows
  }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET 요청 처리 (테스트용)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: '전화상담 고객 API 정상 작동 중',
    actions: ['addRow', 'updateNote', 'updateAudioUrl']
  }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 테스트 함수 - Apps Script 편집기에서 직접 실행 가능
 */
function testAddRow() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  addNewRow(sheet, {
    timestamp: new Date().toLocaleString('ko-KR'),
    name: '테스트고객',
    phone: '01012345678',
    source: '(홈페이지)',
    productName: '테스트 크루즈 상품',
    channel: '본사',
    manager: ''
  });
}

function testUpdateNote() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  updateNote(sheet, {
    name: '테스트고객',
    phone: '01012345678',
    note: '테스트 상세기록입니다.',
    timestamp: new Date().toLocaleString('ko-KR')
  });
}

function testUpdateAudioUrl() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  updateAudioUrl(sheet, {
    name: '테스트고객',
    phone: '01012345678',
    audioUrl: 'https://drive.google.com/file/d/TEST_FILE_ID/view',
    fileName: '테스트_녹음파일.mp3',
    timestamp: new Date().toLocaleString('ko-KR')
  });
}
