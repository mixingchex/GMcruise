#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 파일 명시적으로 로드
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
// .env 파일도 로드 (fallback)
dotenv.config();

/**
 * 마이그레이션 실행 전 환경변수 확인 스크립트
 */

const REQUIRED_ENV_VARS = [
  // Google Drive 인증
  'GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'GOOGLE_DRIVE_SHARED_DRIVE_ID',
  'GOOGLE_DRIVE_ROOT_FOLDER_ID',
  
  // Google Sheets
  'COMMUNITY_BACKUP_SPREADSHEET_ID',
  'TRIP_APIS_ARCHIVE_SPREADSHEET_ID',
  
  // Google Drive 폴더 ID
  'GOOGLE_DRIVE_PASSPORT_FOLDER_ID',
  'GOOGLE_DRIVE_PRODUCTS_FOLDER_ID',
  'GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID',
  'GOOGLE_DRIVE_COMPANY_LOGO_FOLDER_ID',
  'GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID',
  
  // 업로드 폴더
  'GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID',
  'GOOGLE_DRIVE_UPLOADS_PROFILES_FOLDER_ID',
  'GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID',
  'GOOGLE_DRIVE_UPLOADS_AUDIO_FOLDER_ID',
  'GOOGLE_DRIVE_UPLOADS_DOCUMENTS_FOLDER_ID',
  'GOOGLE_DRIVE_UPLOADS_VIDEOS_FOLDER_ID',
  'GOOGLE_DRIVE_UPLOADS_SALES_AUDIO_FOLDER_ID',
  'GOOGLE_DRIVE_UPLOADS_FONTS_FOLDER_ID',
  'GOOGLE_DRIVE_CONTRACTS_PDFS_FOLDER_ID',
  
  // 어필리에이트 문서
  'GOOGLE_DRIVE_CONTRACTS_FOLDER_ID',
  'GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID',
  'GOOGLE_DRIVE_CONTRACT_AUDIO_FOLDER_ID',
  'GOOGLE_DRIVE_ID_CARD_FOLDER_ID',
  'GOOGLE_DRIVE_BANKBOOK_FOLDER_ID',
];

const OPTIONAL_ENV_VARS = [
  'DATABASE_URL', // 데이터베이스 마이그레이션에 필요
];

function checkEnvVars() {
  console.log('🔍 마이그레이션 환경변수 확인 중...\n');
  
  const missing: string[] = [];
  const present: string[] = [];
  const empty: string[] = [];
  
  // 필수 환경변수 확인
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      missing.push(envVar);
    } else if (value.trim() === '') {
      empty.push(envVar);
    } else {
      present.push(envVar);
      // 민감한 정보는 마스킹
      if (envVar.includes('PRIVATE_KEY')) {
        console.log(`  ✅ ${envVar}: ${value.substring(0, 20)}... (${value.length}자)`);
      } else {
        console.log(`  ✅ ${envVar}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      }
    }
  }
  
  // 선택적 환경변수 확인
  console.log('\n📋 선택적 환경변수:');
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar];
    if (value) {
      console.log(`  ✅ ${envVar}: 설정됨`);
    } else {
      console.log(`  ⚠️  ${envVar}: 설정되지 않음 (데이터베이스 마이그레이션에 필요)`);
    }
  }
  
  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('📊 확인 결과:');
  console.log(`  ✅ 설정됨: ${present.length}개`);
  console.log(`  ❌ 누락됨: ${missing.length}개`);
  console.log(`  ⚠️  비어있음: ${empty.length}개`);
  console.log('='.repeat(60));
  
  if (missing.length > 0) {
    console.log('\n❌ 누락된 필수 환경변수:');
    missing.forEach(envVar => {
      console.log(`  - ${envVar}`);
    });
    console.log('\n⚠️  .env.local 파일에 위 환경변수들을 설정해주세요.');
    return false;
  }
  
  if (empty.length > 0) {
    console.log('\n⚠️  비어있는 환경변수:');
    empty.forEach(envVar => {
      console.log(`  - ${envVar}`);
    });
    console.log('\n⚠️  위 환경변수들의 값을 설정해주세요.');
    return false;
  }
  
  console.log('\n✅ 모든 필수 환경변수가 설정되어 있습니다!');
  console.log('🚀 마이그레이션을 시작할 수 있습니다.\n');
  
  return true;
}

// 실행
const allGood = checkEnvVars();

if (!allGood) {
  console.log('\n📚 참고 문서:');
  console.log('  - GOOGLE_DRIVE_자동화_백업_문서.md');
  console.log('  - 마이그레이션_전_체크리스트.md');
  console.log('  - VERCEL_환경변수_전체_목록.md\n');
  process.exit(1);
} else {
  console.log('다음 단계:');
  console.log('  1. Dry-run 실행: npm run migrate:uploads -- --dry-run');
  console.log('  2. 실제 마이그레이션: npm run migrate:uploads\n');
  process.exit(0);
}

