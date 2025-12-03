/**
 * Google Drive 폴더 접근 테스트
 */

import { google } from 'googleapis';

const FOLDER_ID = '1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI';

function getServiceAccountAuth() {
  const privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;

  console.log('Service Account Email:', clientEmail);

  if (!privateKey || !clientEmail) {
    throw new Error('Google Service Account credentials not configured');
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

async function testAccess() {
  console.log('=== Google Drive 접근 테스트 ===\n');

  const auth = getServiceAccountAuth();
  const drive = google.drive({ version: 'v3', auth });

  try {
    // 먼저 서비스 계정이 접근 가능한 파일 목록 조회
    console.log('서비스 계정이 접근 가능한 파일 목록:');
    const sharedResponse = await drive.files.list({
      q: "sharedWithMe=true or 'me' in owners",
      fields: 'files(id, name, mimeType)',
      pageSize: 20,
    });

    if (sharedResponse.data.files && sharedResponse.data.files.length > 0) {
      sharedResponse.data.files.forEach((file) => {
        console.log(`  - ${file.name} (${file.id}) [${file.mimeType}]`);
      });
    } else {
      console.log('  (접근 가능한 파일 없음)');
    }

    // 폴더 정보 조회
    console.log(`\n폴더 ID: ${FOLDER_ID}`);
    const response = await drive.files.get({
      fileId: FOLDER_ID,
      fields: 'id, name, mimeType, permissions',
      supportsAllDrives: true,
    });

    console.log('폴더 접근 성공!');
    console.log('폴더 이름:', response.data.name);
    console.log('MIME 타입:', response.data.mimeType);

    // 폴더 내용 조회
    const listResponse = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    console.log('\n폴더 내용:');
    if (listResponse.data.files && listResponse.data.files.length > 0) {
      listResponse.data.files.forEach((file) => {
        console.log(`  - ${file.name} (${file.mimeType})`);
      });
    } else {
      console.log('  (비어있음)');
    }

  } catch (error: any) {
    console.error('폴더 접근 실패:', error.message);
    if (error.response?.data?.error) {
      console.error('에러 상세:', JSON.stringify(error.response.data.error, null, 2));
    }
  }
}

testAccess();
