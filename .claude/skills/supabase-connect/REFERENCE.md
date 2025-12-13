# Supabase 데이터베이스 직접 연결 Skill

Supabase PostgreSQL 데이터베이스에 직접 연결하여 테이블 생성, SQL 실행 등의 작업을 수행하는 skill입니다.

## 사용 시점
- Supabase 테이블 생성/수정/삭제 필요 시
- SQL 쿼리 직접 실행 필요 시
- 데이터베이스 스키마 확인 필요 시
- 데이터 마이그레이션 필요 시

## 연결 정보 확인

### 1단계: 프로젝트 .env 파일 확인
```bash
# 현재 작업 중인 프로젝트 폴더에서 .env 파일 읽기
cat .env | grep SUPABASE_DB
```

필요한 환경변수:
- `SUPABASE_DB_HOST`: Pooler 호스트 (예: aws-1-ap-southeast-1.pooler.supabase.com)
- `SUPABASE_DB_PORT`: 포트 (5432 또는 6543)
- `SUPABASE_DB_USER`: 사용자명 (예: postgres.udndnsddtnnbdboutqrj)
- `SUPABASE_DB_PASSWORD`: 데이터베이스 비밀번호

### 2단계: .env에 정보가 없을 경우
사용자에게 다음 정보 요청:
```
Supabase 연결 정보가 필요합니다:
1. Supabase Dashboard > Project Settings > Database > Connection string (URI)
2. Database password

예시 형식:
postgresql://postgres.projectref:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

## 연결 스크립트 템플릿

프로젝트 폴더에 `scripts/supabase_query.mjs` 파일 생성:

```javascript
import pg from 'pg';
import dns from 'dns';

// WSL IPv6 문제 해결 - 반드시 최상단에 위치
dns.setDefaultResultOrder('ipv4first');

const { Client } = pg;

// 실행할 SQL (여기에 작성)
const sql = `
-- SQL 쿼리 작성
SELECT 1;
`;

async function main() {
  // .env에서 읽어온 연결 정보 사용
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: parseInt(process.env.SUPABASE_DB_PORT) || 5432,
    database: 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres.projectref',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false  // SSL 인증서 문제 해결
    }
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected!');

    console.log('Executing SQL...');
    const result = await client.query(sql);
    console.log('Result:', result.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
```

## 실행 방법

```bash
# 프로젝트 폴더에서 실행 (pg 패키지가 설치되어 있어야 함)
node scripts/supabase_query.mjs
```

## 주의사항

### WSL 환경 필수 설정
```javascript
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');  // IPv6 라우팅 문제 해결
```

### SSL 설정
```javascript
ssl: {
  rejectUnauthorized: false  // self-signed certificate 오류 해결
}
```

### 연결 URL 형식
- **Pooler URL 사용** (권장): `aws-*.pooler.supabase.com`
- **Direct URL 사용 금지**: `db.projectref.supabase.co` (IPv6 문제 발생)

## 일반적인 오류와 해결책

| 오류 메시지 | 원인 | 해결책 |
|------------|------|--------|
| `ENETUNREACH IPv6` | WSL IPv6 라우팅 불가 | `dns.setDefaultResultOrder('ipv4first')` |
| `self-signed certificate` | SSL 인증서 검증 실패 | `ssl: { rejectUnauthorized: false }` |
| `Tenant or user not found` | Direct URL 사용 | Pooler URL로 변경 |
| `password authentication failed` | 비밀번호 오류 | .env 파일 비밀번호 확인 |

## 테이블 확인 쿼리

```sql
-- 존재하는 테이블 목록
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- 테이블 컬럼 정보
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'your_table_name';
```

## 예시: 테이블 생성

```javascript
const sql = `
CREATE TABLE IF NOT EXISTS my_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);
`;
```
