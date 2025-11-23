#!/usr/bin/env tsx
/**
 * Google Drive에서 20일 오전 백업한 PostgreSQL 덤프 파일 찾기 (개선 버전)
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

    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '0AJVz1C-KYWR0Uk9PVA';
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '0AJVz1C-KYWR0Uk9PVA';

    console.log('🔍 Google Drive에서 백업 파일 검색 중...\n');
    console.log(`Shared Drive ID: ${sharedDriveId}`);
    console.log(`Root Folder ID: ${rootFolderId}\n`);

    // 더 광범위한 검색 쿼리들
    const searchQueries = [
      // 날짜 포함 파일
      "name contains '20251120'",
      "name contains '2025-11-20'",
      "name contains '11-20'",
      "name contains '1120'",
      
      // PostgreSQL 관련
      "name contains 'postgres'",
      "name contains 'pg_dump'",
      "name contains 'pgdump'",
      "name contains '.sql'",
      "name contains '.dump'",
      
      // 백업 관련
      "name contains 'backup' and (name contains 'db' or name contains 'database')",
      "name contains 'cruise-guide' and name contains 'backup'",
      
      // 최근 수정된 파일 (20일 근처)
      "modifiedTime > '2025-11-20T00:00:00' and modifiedTime < '2025-11-21T00:00:00'",
    ];

    const allFiles: any[] = [];
    const seenIds = new Set<string>();

    for (const query of searchQueries) {
      try {
        console.log(`검색 중: ${query.substring(0, 60)}...`);
        
        const response = await drive.files.list({
          q: query,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: 'allDrives',
          fields: 'files(id, name, createdTime, modifiedTime, size, mimeType, webViewLink, parents)',
          orderBy: 'modifiedTime desc',
          pageSize: 100,
        });

        if (response.data.files && response.data.files.length > 0) {
          for (const file of response.data.files) {
            if (!seenIds.has(file.id!)) {
              seenIds.add(file.id!);
              allFiles.push(file);
            }
          }
          console.log(`  → ${response.data.files.length}개 파일 발견\n`);
        } else {
          console.log(`  → 파일 없음\n`);
        }
      } catch (error: any) {
        console.error(`  ❌ 오류: ${error.message}\n`);
      }
    }

    // 날짜 필터링 (20일 오전: 00:00 ~ 12:00)
    const targetDate = new Date('2025-11-20T12:00:00');
    const filteredFiles = allFiles.filter((file) => {
      const modifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : null;
      const createdTime = file.createdTime ? new Date(file.createdTime) : null;
      const fileTime = modifiedTime || createdTime;
      
      if (!fileTime) return false;
      
      // 20일 00:00 ~ 21일 00:00 사이
      return fileTime >= new Date('2025-11-20T00:00:00') && 
             fileTime < new Date('2025-11-21T00:00:00');
    });

    // 파일명으로도 필터링
    const dbRelatedFiles = filteredFiles.filter((file) => {
      const name = file.name.toLowerCase();
      return (
        name.includes('20251120') ||
        name.includes('2025-11-20') ||
        name.includes('11-20') ||
        name.includes('postgres') ||
        name.includes('pg_dump') ||
        name.includes('pgdump') ||
        name.includes('.sql') ||
        name.includes('.dump') ||
        (name.includes('backup') && (name.includes('db') || name.includes('database')))
      );
    });

    console.log('\n' + '='.repeat(60));
    console.log(`📊 검색 결과 요약`);
    console.log('='.repeat(60));
    console.log(`전체 발견 파일: ${allFiles.length}개`);
    console.log(`20일 날짜 필터링: ${filteredFiles.length}개`);
    console.log(`DB 관련 파일: ${dbRelatedFiles.length}개\n`);

    if (dbRelatedFiles.length === 0 && filteredFiles.length > 0) {
      console.log('⚠️ 20일 날짜의 파일은 있지만 DB 관련 파일은 아닙니다:\n');
      for (const file of filteredFiles.slice(0, 10)) {
        const modifiedTime = file.modifiedTime
          ? new Date(file.modifiedTime).toLocaleString('ko-KR')
          : '알 수 없음';
        console.log(`  - ${file.name} (${modifiedTime})`);
      }
    }

    if (dbRelatedFiles.length > 0) {
      console.log('\n✅ PostgreSQL 덤프 파일 후보:\n');
      
      // 날짜순 정렬
      dbRelatedFiles.sort((a, b) => {
        const timeA = new Date(a.modifiedTime || a.createdTime || 0).getTime();
        const timeB = new Date(b.modifiedTime || b.createdTime || 0).getTime();
        return timeB - timeA;
      });

      for (const file of dbRelatedFiles) {
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

      // 다운로드 스크립트 생성
      if (dbRelatedFiles.length > 0) {
        const downloadScript = dbRelatedFiles.map((file, index) => {
          return `# ${file.name}\n` +
                 `# npx tsx scripts/download-gdrive-file.ts ${file.id} "${file.name}"\n`;
        }).join('\n');

        fs.writeFileSync(
          path.join(process.cwd(), 'scripts', 'download-backups.sh'),
          '#!/bin/bash\n# Google Drive에서 백업 파일 다운로드\n\n' + downloadScript
        );

        console.log('💾 다운로드 스크립트 생성: scripts/download-backups.sh\n');
      }
    } else {
      console.log('\n❌ 20일 오전 PostgreSQL 덤프 파일을 찾을 수 없습니다.\n');
      console.log('다음 방법을 시도해보세요:');
      console.log('1. Google Drive 웹에서 직접 확인:');
      console.log(`   https://drive.google.com/drive/folders/${rootFolderId}`);
      console.log('2. 다른 폴더에 저장되었을 수 있습니다.');
      console.log('3. 파일명이 다를 수 있습니다 (예: 날짜 형식이 다름).\n');
    }

    // 모든 파일 목록 (참고용)
    if (allFiles.length > 0 && dbRelatedFiles.length === 0) {
      console.log('\n📋 발견된 모든 파일 (참고용):\n');
      const sorted = allFiles
        .sort((a, b) => {
          const timeA = new Date(a.modifiedTime || a.createdTime || 0).getTime();
          const timeB = new Date(b.modifiedTime || b.createdTime || 0).getTime();
          return timeB - timeA;
        })
        .slice(0, 20);

      for (const file of sorted) {
        const modifiedTime = file.modifiedTime
          ? new Date(file.modifiedTime).toLocaleString('ko-KR')
          : '알 수 없음';
        console.log(`  - ${file.name} (${modifiedTime})`);
      }
    }

  } catch (error: any) {
    console.error('오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

findBackupFiles();








