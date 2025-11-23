#!/usr/bin/env tsx
/**
 * Google Drive에서 모든 PostgreSQL 덤프 파일 검색 (날짜 제한 없음)
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

async function findAllBackupFiles() {
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

    console.log('🔍 Google Drive에서 모든 PostgreSQL 덤프 파일 검색 중...\n');
    console.log(`Shared Drive ID: ${sharedDriveId}`);
    console.log(`Root Folder ID: ${rootFolderId}\n`);

    // 광범위한 검색 쿼리들 (날짜 제한 없음)
    const searchQueries = [
      // PostgreSQL 관련 직접 검색
      "name contains 'postgres'",
      "name contains 'pg_dump'",
      "name contains 'pgdump'",
      "name contains 'postgresql'",
      
      // SQL/Dump 파일 확장자
      "name contains '.sql'",
      "name contains '.dump'",
      "mimeType = 'application/sql'",
      "mimeType = 'application/x-sql'",
      "mimeType = 'text/plain' and name contains '.sql'",
      
      // 백업 관련
      "name contains 'backup' and (name contains 'db' or name contains 'database')",
      "name contains 'backup' and (name contains 'sql' or name contains 'dump')",
      "name contains 'cruise-guide' and (name contains 'db' or name contains 'database' or name contains 'sql' or name contains 'dump')",
      
      // 날짜 패턴 (모든 년도)
      "name contains '2025' and (name contains '.sql' or name contains '.dump')",
      "name contains '2024' and (name contains '.sql' or name contains '.dump')",
      "name contains 'backup' and name contains '2025'",
      "name contains 'backup' and name contains '2024'",
      
      // 일반적인 백업 파일명 패턴
      "name contains 'db_backup'",
      "name contains 'database_backup'",
      "name contains 'db_dump'",
      "name contains 'database_dump'",
    ];

    const allFiles: any[] = [];
    const seenIds = new Set<string>();

    console.log('검색 쿼리 실행 중...\n');

    for (const query of searchQueries) {
      try {
        let pageToken: string | undefined = undefined;
        let totalFound = 0;

        do {
          const response = await drive.files.list({
            q: query,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: 'allDrives',
            fields: 'nextPageToken, files(id, name, createdTime, modifiedTime, size, mimeType, webViewLink, parents)',
            orderBy: 'modifiedTime desc',
            pageSize: 100,
            pageToken,
          });

          if (response.data.files && response.data.files.length > 0) {
            for (const file of response.data.files) {
              if (!seenIds.has(file.id!)) {
                seenIds.add(file.id!);
                allFiles.push(file);
                totalFound++;
              }
            }
          }

          pageToken = response.data.nextPageToken || undefined;
        } while (pageToken);

        if (totalFound > 0) {
          console.log(`✅ "${query.substring(0, 50)}..." → ${totalFound}개 파일 발견`);
        }
      } catch (error: any) {
        console.error(`❌ "${query.substring(0, 50)}..." → 오류: ${error.message}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 검색 결과 요약`);
    console.log('='.repeat(60));
    console.log(`전체 발견 파일: ${allFiles.length}개\n`);

    if (allFiles.length === 0) {
      console.log('❌ PostgreSQL 덤프 파일을 찾을 수 없습니다.\n');
      console.log('다음 방법을 시도해보세요:');
      console.log('1. Google Drive 웹에서 직접 확인:');
      console.log(`   https://drive.google.com/drive/folders/${rootFolderId}`);
      console.log('2. 다른 폴더나 계정에 저장되었을 수 있습니다.');
      console.log('3. 파일명이 완전히 다를 수 있습니다.\n');
      return;
    }

    // 파일명으로 필터링 (DB 관련 파일만)
    const dbFiles = allFiles.filter((file) => {
      const name = file.name.toLowerCase();
      return (
        name.includes('postgres') ||
        name.includes('pg_dump') ||
        name.includes('pgdump') ||
        name.includes('postgresql') ||
        name.endsWith('.sql') ||
        name.endsWith('.dump') ||
        (name.includes('backup') && (name.includes('db') || name.includes('database') || name.includes('sql') || name.includes('dump'))) ||
        name.includes('db_backup') ||
        name.includes('database_backup') ||
        name.includes('db_dump') ||
        name.includes('database_dump')
      );
    });

    // 날짜순 정렬
    dbFiles.sort((a, b) => {
      const timeA = new Date(a.modifiedTime || a.createdTime || 0).getTime();
      const timeB = new Date(b.modifiedTime || b.createdTime || 0).getTime();
      return timeB - timeA;
    });

    console.log(`🎯 DB 관련 파일: ${dbFiles.length}개\n`);

    if (dbFiles.length > 0) {
      console.log('📋 발견된 PostgreSQL 덤프 파일 목록:\n');

      for (const file of dbFiles) {
        const modifiedTime = file.modifiedTime
          ? new Date(file.modifiedTime).toLocaleString('ko-KR')
          : '알 수 없음';
        const createdTime = file.createdTime
          ? new Date(file.createdTime).toLocaleString('ko-KR')
          : '알 수 없음';
        const size = file.size
          ? (parseInt(file.size) / 1024 / 1024).toFixed(2) + ' MB'
          : '알 수 없음';

        console.log(`📄 ${file.name}`);
        console.log(`   수정일: ${modifiedTime}`);
        console.log(`   생성일: ${createdTime}`);
        console.log(`   크기: ${size}`);
        console.log(`   ID: ${file.id}`);
        if (file.webViewLink) {
          console.log(`   링크: ${file.webViewLink}`);
        }
        console.log('');
      }

      // 20일 근처 파일 강조
      const nov20Files = dbFiles.filter((file) => {
        const modifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : null;
        if (!modifiedTime) return false;
        return (
          modifiedTime >= new Date('2025-11-20T00:00:00') &&
          modifiedTime < new Date('2025-11-21T00:00:00')
        );
      });

      if (nov20Files.length > 0) {
        console.log('\n🎯 20일 날짜의 파일:\n');
        for (const file of nov20Files) {
          const modifiedTime = file.modifiedTime
            ? new Date(file.modifiedTime).toLocaleString('ko-KR')
            : '알 수 없음';
          console.log(`   ✅ ${file.name} (${modifiedTime})`);
          console.log(`      다운로드: npx tsx scripts/download-gdrive-file.ts ${file.id} "${file.name}"`);
        }
      }

      // 다운로드 스크립트 생성
      const downloadScript = dbFiles.slice(0, 10).map((file) => {
        return `# ${file.name} (${file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('ko-KR') : '날짜 없음'})\n` +
               `npx tsx scripts/download-gdrive-file.ts ${file.id} "${file.name}"\n`;
      }).join('\n');

      fs.writeFileSync(
        path.join(process.cwd(), 'scripts', 'download-all-backups.sh'),
        '#!/bin/bash\n# Google Drive에서 모든 백업 파일 다운로드\n\n' + downloadScript
      );

      console.log('\n💾 다운로드 스크립트 생성: scripts/download-all-backups.sh');
      console.log('   최신 10개 파일의 다운로드 명령어가 포함되어 있습니다.\n');
    } else {
      console.log('⚠️  DB 관련 파일로 필터링된 결과가 없습니다.\n');
      console.log('전체 파일 목록 (참고용):\n');
      
      const sorted = allFiles
        .sort((a, b) => {
          const timeA = new Date(a.modifiedTime || a.createdTime || 0).getTime();
          const timeB = new Date(b.modifiedTime || b.createdTime || 0).getTime();
          return timeB - timeA;
        })
        .slice(0, 30);

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

findAllBackupFiles();








