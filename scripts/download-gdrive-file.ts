#!/usr/bin/env tsx
/**
 * Google Drive에서 파일 다운로드
 * 사용법: npx tsx scripts/download-gdrive-file.ts <fileId> [outputFileName]
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

async function downloadFile(fileId: string, outputFileName?: string) {
  try {
    // 서비스 계정 인증
    const serviceAccountPath = path.join(
      process.cwd(),
      '..',
      '.backup-config',
      'cruisedot-backup-service-account.json'
    );

    if (!fs.existsSync(serviceAccountPath)) {
      console.error('서비스 계정 파일을 찾을 수 없습니다:', serviceAccountPath);
      process.exit(1);
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, 'utf-8')
    );

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 파일 정보 가져오기
    const fileInfo = await drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: 'id, name, size, mimeType',
    });

    const fileName = outputFileName || fileInfo.data.name || `download_${fileId}`;
    const outputPath = path.join(process.cwd(), fileName);

    console.log(`📥 다운로드 중: ${fileInfo.data.name}`);
    console.log(`   크기: ${fileInfo.data.size ? (parseInt(fileInfo.data.size!) / 1024 / 1024).toFixed(2) + ' MB' : '알 수 없음'}`);
    console.log(`   저장 위치: ${outputPath}\n`);

    // 파일 다운로드
    const response = await drive.files.get(
      {
        fileId,
        supportsAllDrives: true,
        alt: 'media',
      },
      { responseType: 'stream' }
    );

    const writeStream = fs.createWriteStream(outputPath);
    response.data.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log(`✅ 다운로드 완료: ${outputPath}`);
    console.log(`\n복원 명령어:`);
    console.log(`  ./scripts/restore-db.sh ${outputPath}`);
  } catch (error: any) {
    console.error('다운로드 오류:', error.message);
    process.exit(1);
  }
}

const fileId = process.argv[2];
const outputFileName = process.argv[3];

if (!fileId) {
  console.error('사용법: npx tsx scripts/download-gdrive-file.ts <fileId> [outputFileName]');
  process.exit(1);
}

downloadFile(fileId, outputFileName);








