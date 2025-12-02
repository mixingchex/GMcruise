// scripts/move_excel_files.ts
// 루트 폴더에 있는 엑셀 파일들을 올바른 폴더로 이동

import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

const privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const serviceAccountEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;

if (!privateKey || !serviceAccountEmail) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const auth = new google.auth.JWT(serviceAccountEmail, undefined, privateKey, SCOPES);
const drive = google.drive({ version: 'v3', auth });

const ROOT_FOLDER_ID = '0AJVz1C-KYWR0Uk9PVA';
const CASHFLOW_FOLDER_ID = '1kv9XlTFLh8QqTlDvakwaxB_LtTQxv6Hx';
const TOTALCASH_FOLDER_ID = '1GC4hwjkVNqUmBGhaE5PmldoMr0WUEkGo';

async function moveFiles() {
  try {
    console.log('🔍 루트 폴더에서 엑셀 파일 검색 중...\n');

    // 루트 폴더에서 엑셀 파일 찾기
    const response = await drive.files.list({
      q: `'${ROOT_FOLDER_ID}' in parents and (name contains '판매원별수당' or name contains '거래처월별') and trashed=false`,
      fields: 'files(id, name, parents, createdTime)',
      orderBy: 'createdTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = response.data.files || [];

    if (files.length === 0) {
      console.log('✅ 루트 폴더에 이동할 엑셀 파일이 없습니다.\n');
      console.log('파일들이 이미 올바른 위치에 있거나, 아직 업로드되지 않았습니다.');
      return;
    }

    console.log(`📂 발견된 파일: ${files.length}개\n`);

    for (const file of files) {
      console.log(`📄 ${file.name}`);
      console.log(`   ID: ${file.id}`);
      console.log(`   생성: ${file.createdTime}`);

      let targetFolderId: string;
      let targetFolderName: string;

      if (file.name.includes('판매원별수당')) {
        targetFolderId = CASHFLOW_FOLDER_ID;
        targetFolderName = 'cashflow';
      } else if (file.name.includes('거래처월별')) {
        targetFolderId = TOTALCASH_FOLDER_ID;
        targetFolderName = 'totalcash';
      } else {
        console.log('   ⚠️  알 수 없는 파일 형식, 건너뜀\n');
        continue;
      }

      console.log(`   → ${targetFolderName} 폴더로 이동 중...`);

      // 파일 이동
      await drive.files.update({
        fileId: file.id!,
        addParents: targetFolderId,
        removeParents: file.parents?.join(','),
        supportsAllDrives: true,
      });

      console.log(`   ✅ 이동 완료!\n`);
    }

    console.log('🎉 모든 파일 이동 완료!');
    console.log('\n📂 폴더 확인:');
    console.log(`   Cashflow: https://drive.google.com/drive/folders/${CASHFLOW_FOLDER_ID}`);
    console.log(`   Totalcash: https://drive.google.com/drive/folders/${TOTALCASH_FOLDER_ID}`);

  } catch (error: any) {
    console.error('❌ 오류 발생:', error.message);
    if (error.code) {
      console.error('   오류 코드:', error.code);
    }
    process.exit(1);
  }
}

moveFiles();
