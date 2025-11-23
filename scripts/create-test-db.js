#!/usr/bin/env node

/**
 * 테스트 데이터베이스 생성 스크립트
 * 운영 DATABASE_URL을 기반으로 테스트 데이터베이스(neondb_test)를 생성합니다.
 */

import { Client } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// .env 파일 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

// 환경 변수 확인
const databaseUrl = process.env.DATABASE_URL;
const testDbName = 'neondb_test';

if (!databaseUrl) {
  console.error('❌ 오류: DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  console.error('💡 .env 파일에 DATABASE_URL을 설정하세요.');
  process.exit(1);
}

// DATABASE_URL 파싱
const url = new URL(databaseUrl);
const originalDbName = url.pathname.slice(1).split('?')[0] || 'postgres'; // /dbname?options -> dbname

// 쿼리 파라미터 분리
const searchParams = url.searchParams.toString();

// 기본 데이터베이스 연결 URL 생성 (postgres 또는 defaultdb 시도)
// Neon의 경우 보통 postgres를 사용
const defaultDbNames = ['postgres', 'defaultdb', 'neondb'];

console.log('────────────────────────────────────────────');
console.log('  📦 테스트 데이터베이스 생성 시작');
console.log('────────────────────────────────────────────');
console.log(`📌 원본 데이터베이스: ${originalDbName}`);
console.log(`📌 생성할 테스트 DB: ${testDbName}`);
console.log(`🔗 연결 대상: ${url.hostname}`);
console.log('');

async function createDatabase() {
  let client = null;
  let connected = false;

  // 여러 기본 데이터베이스 이름 시도
  for (const defaultDbName of defaultDbNames) {
    try {
      // 기본 데이터베이스로 연결 URL 생성
      url.pathname = `/${defaultDbName}`;
      if (searchParams) {
        url.search = searchParams;
      }
      const baseConnectionString = url.toString();

      console.log(`🔍 '${defaultDbName}' 데이터베이스로 연결 시도 중...`);
      
      client = new Client({
        connectionString: baseConnectionString,
        ssl: { rejectUnauthorized: false }, // Neon SSL 연결
      });

      // 연결 시도
      await client.connect();
      connected = true;
      console.log(`✅ '${defaultDbName}' 데이터베이스에 연결되었습니다.`);
      console.log('');
      break; // 성공하면 루프 종료
      
    } catch (error) {
      if (client) {
        await client.end().catch(() => {});
      }
      // 다음 DB 시도
      continue;
    }
  }

  if (!connected || !client) {
    console.error('❌ 오류: 기본 데이터베이스에 연결할 수 없습니다.');
    console.error('💡 Neon 대시보드에서 수동으로 데이터베이스를 생성해주세요.');
    process.exit(1);
  }

  try {
    // 기존 데이터베이스 존재 여부 확인
    const checkQuery = `
      SELECT 1 FROM pg_database WHERE datname = $1
    `;
    const checkResult = await client.query(checkQuery, [testDbName]);

    if (checkResult.rows.length > 0) {
      console.log(`ℹ️  데이터베이스 '${testDbName}'가 이미 존재합니다.`);
      console.log('✅ 스킵합니다.');
      await client.end();
      return;
    }

    // 데이터베이스 생성
    // 참고: CREATE DATABASE는 transaction 내에서 실행할 수 없으므로 직접 실행
    // SQL 인젝션 방지를 위해 테이블명 검증
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(testDbName)) {
      throw new Error(`잘못된 데이터베이스 이름: ${testDbName}`);
    }
    
    const createQuery = `CREATE DATABASE ${testDbName}`;
    
    console.log(`📤 데이터베이스 '${testDbName}' 생성 중...`);
    await client.query(createQuery);
    
    console.log('');
    console.log('────────────────────────────────────────────');
    console.log(`  ✅ 데이터베이스 '${testDbName}' 생성 완료!`);
    console.log('────────────────────────────────────────────');
    
  } catch (error) {
    // 이미 존재하는 경우 에러 무시
    if (error.code === '42P04' || error.message.includes('already exists')) {
      console.log(`ℹ️  데이터베이스 '${testDbName}'가 이미 존재합니다.`);
      console.log('✅ 스킵합니다.');
      return;
    }
    
    // 다른 에러는 출력
    console.error('');
    console.error('❌ 오류 발생:');
    console.error(`   코드: ${error.code || 'N/A'}`);
    console.error(`   메시지: ${error.message}`);
    
    // 권한 오류인 경우
    if (error.code === '42501' || error.message.includes('permission denied')) {
      console.log('');
      console.log('💡 권한 오류: 데이터베이스 생성 권한이 없습니다.');
      console.log('   Neon 대시보드에서 수동으로 데이터베이스를 생성해주세요.');
    }
    
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// 실행
createDatabase()
  .then(() => {
    console.log('');
    console.log('🎉 완료! 이제 다음 명령어를 실행하세요:');
    console.log('   sh scripts/setup-test-db.sh');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 중 오류:', error);
    process.exit(1);
  });

