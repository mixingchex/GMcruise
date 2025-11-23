#!/usr/bin/env tsx
/**
 * Google Drive에서 20일 오전 백업한 PostgreSQL 덤프 파일 찾기
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

async function findBackupFiles() {
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

    // 20일 오전 백업 파일 검색 (2025-11-20 00:00 ~ 12:00)
    const searchQueries = [
      // PostgreSQL 덤프 파일 패턴
      "name contains '20251120' and (name contains '.sql' or name contains '.dump' or name contains 'postgres' or name contains 'pg_dump')",
      "name contains 'backup' and name contains '20251120' and (name contains '.sql' or name contains '.dump')",
      "name contains 'db' and name contains '20251120' and (name contains '.sql' or name contains '.dump')",
      // 일반 백업 파일
      "name contains 'cruise-guide' and name contains '20251120'",
    ];

    console.log('🔍 Google Drive에서 백업 파일 검색 중...\n');

    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '0AJVz1C-KYWR0Uk9PVA';
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '0AJVz1C-KYWR0Uk9PVA';

    const allFiles: any[] = [];

    for (const query of searchQueries) {
      try {
        const response = await drive.files.list({
          q: query,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: 'allDrives',
          fields: 'files(id, name, createdTime, modifiedTime, size, mimeType, webViewLink)',
          orderBy: 'modifiedTime desc',
          pageSize: 50,
        });

        if (response.data.files && response.data.files.length > 0) {
          allFiles.push(...response.data.files);
        }
      } catch (error: any) {
        console.error(`검색 쿼리 "${query}" 오류:`, error.message);
      }
    }

    // 중복 제거
    const uniqueFiles = Array.from(
      new Map(allFiles.map((file) => [file.id, file])).values()
    );

    if (uniqueFiles.length === 0) {
      console.log('❌ 20일 오전 백업 파일을 찾을 수 없습니다.\n');
      console.log('다음 위치를 확인해주세요:');
      console.log(`- Google Drive Shared Drive ID: ${sharedDriveId}`);
      console.log(`- Google Drive Root Folder ID: ${rootFolderId}`);
      console.log('\nGoogle Drive 웹에서 직접 확인:');
      console.log('https://drive.google.com/drive/folders/' + rootFolderId);
      return;
    }

    console.log(`✅ ${uniqueFiles.length}개의 파일을 찾았습니다:\n`);

    // 날짜별로 정렬
    uniqueFiles.sort((a, b) => {
      const timeA = new Date(a.modifiedTime || a.createdTime || 0).getTime();
      const timeB = new Date(b.modifiedTime || b.createdTime || 0).getTime();
      return timeB - timeA;
    });

    for (const file of uniqueFiles) {
      const modifiedTime = file.modifiedTime
        ? new Date(file.modifiedTime).toLocaleString('ko-KR')
        : '알 수 없음';
      const size = file.size
        ? (parseInt(file.size) / 1024 / 1024).toFixed(2) + ' MB'
        : '알 수 없음';

      console.log(`📄 ${file.name}`);
      console.log(`   수정일: ${modifiedTime}`);
      console.log(`   크기: ${size}`);
      console.log(`   ID: ${file.id}`);
      if (file.webViewLink) {
        console.log(`   링크: ${file.webViewLink}`);
      }
      console.log('');
    }

    // PostgreSQL 덤프 파일만 필터링
    const dbFiles = uniqueFiles.filter(
      (file) =>
        file.name.includes('.sql') ||
        file.name.includes('.dump') ||
        file.name.toLowerCase().includes('postgres') ||
        file.name.toLowerCase().includes('pg_dump')
    );

    if (dbFiles.length > 0) {
      console.log('\n🎯 PostgreSQL 덤프 파일 후보:');
      for (const file of dbFiles) {
        console.log(`   - ${file.name} (${file.id})`);
      }
    }
  } catch (error: any) {
    console.error('오류 발생:', error.message);
    process.exit(1);
  }
}

findBackupFiles();








