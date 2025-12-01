# Excel Backup 설정 가이드

## 개요

판매원별 수당 계산 (Cashflow) 및 거래처용 월별 엑셀 (Totalcash)을 Google Drive에 자동으로 백업하는 기능입니다.

## 구현된 기능

### 1. 엑셀 생성 및 업로드
- **Cashflow** (판매원별 수당): `lib/affiliate/excel-backup.ts`
  - 판매원별 수당 요약 시트
  - 판매 상세내역 시트
  - 은행 계좌 정보 포함
  - 원천징수(3.3%) 계산 포함

- **Totalcash** (거래처용 월별): `lib/affiliate/excel-backup.ts`
  - 거래처별 월별 집계 시트
  - 판매 상세내역 시트
  - 브랜치 수당 및 오버라이드 포함
  - 본사 직판 포함

### 2. API 엔드포인트

#### 수동 업로드 (관리자 패널)
- **경로**: `POST /api/admin/affiliate/excel-backup`
- **권한**: 관리자 only
- **요청 예시**:
  ```json
  {
    "period": "2025-12",
    "type": "all"  // "cashflow" | "totalcash" | "all"
  }
  ```

#### 자동 업로드 (Cron Job)
- **경로**: `GET /api/cron/excel-backup`
- **스케줄**: 매월 1일 02:00 (UTC)
- **설정**: `vercel.json`에 추가됨

### 3. Google Drive 폴더
- **Cashflow**: https://drive.google.com/drive/folders/1kv9XlTFLh8QqTlDvakwaxB_LtTQxv6Hx
- **Totalcash**: https://drive.google.com/drive/folders/1GC4hwjkVNqUmBGhaE5PmldoMr0WUEkGo

## 환경 변수 설정

### 필수 환경 변수

```bash
# Google Drive 인증
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"

# 또는 다음 이름도 지원:
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="..."
GOOGLE_SERVICE_ACCOUNT_EMAIL="..."

# Cashflow 폴더 ID
GOOGLE_DRIVE_CASHFLOW_FOLDER_ID="1kv9XlTFLh8QqTlDvakwaxB_LtTQxv6Hx"

# Totalcash 폴더 ID
GOOGLE_DRIVE_TOTALCASH_FOLDER_ID="1GC4hwjkVNqUmBGhaE5PmldoMr0WUEkGo"

# Cron Secret (선택 사항, 보안 강화)
CRON_SECRET="your-random-secret-here"
```

### Vercel 설정

1. **Vercel Dashboard** → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 위의 환경 변수들을 추가

#### ⚠️ PRIVATE_KEY 설정 주의사항

**잘못된 예시** (줄바꿈이 제대로 처리되지 않음):
```
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
```

**올바른 예시** (이스케이프된 줄바꿈 사용):
```
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
```

또는 **Vercel UI에서 직접 입력** (자동으로 처리됨):
1. Vercel Dashboard → Settings → Environment Variables
2. Key: `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`
3. Value: Private key를 그대로 붙여넣기 (BEGIN/END 포함)
4. Vercel이 자동으로 줄바꿈 처리

## Google Drive 서비스 계정 설정

### 1. Google Cloud Console에서 서비스 계정 생성

1. https://console.cloud.google.com/ 접속
2. 프로젝트 선택 또는 생성
3. **IAM & Admin** → **Service Accounts** → **Create Service Account**
4. 서비스 계정 이름 입력 → **Create and Continue**
5. **Role** 선택: `Editor` 또는 `Drive File Access`
6. **Done** 클릭

### 2. Private Key 다운로드

1. 생성한 서비스 계정 클릭
2. **Keys** 탭 → **Add Key** → **Create New Key**
3. **JSON** 선택 → **Create**
4. JSON 파일 다운로드
5. JSON 파일에서 `private_key`와 `client_email` 복사

### 3. Google Drive 폴더 공유

1. Cashflow 폴더: https://drive.google.com/drive/folders/1kv9XlTFLh8QqTlDvakwaxB_LtTQxv6Hx
2. Totalcash 폴더: https://drive.google.com/drive/folders/1GC4hwjkVNqUmBGhaE5PmldoMr0WUEkGo
3. 각 폴더에 서비스 계정 이메일 (`client_email`)을 **Editor** 권한으로 공유

## SystemConfig DB 설정

폴더 ID는 환경 변수 대신 DB에 저장할 수도 있습니다.

```sql
INSERT INTO SystemConfig (configKey, configValue) VALUES
('google_drive_cashflow_folder_id', '1kv9XlTFLh8QqTlDvakwaxB_LtTQxv6Hx'),
('google_drive_totalcash_folder_id', '1GC4hwjkVNqUmBGhaE5PmldoMr0WUEkGo');
```

우선순위: DB > ENV > DEFAULT

## 테스트

### 로컬 테스트

```bash
# 현재 월 엑셀 생성 및 업로드
npx tsx scripts/test_excel_upload.ts

# 최근 3개월 엑셀 생성 및 업로드
npx tsx scripts/test_excel_upload.ts --multi
```

### API 테스트

```bash
# 수동 업로드 테스트
curl -X POST https://your-domain.com/api/admin/affiliate/excel-backup \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"period": "2025-12", "type": "all"}'

# Cron Job 테스트
curl https://your-domain.com/api/cron/excel-backup \
  -H "Authorization: Bearer your-cron-secret"
```

## 트러블슈팅

### JWT Signature 오류

**에러 메시지**:
```
Error: Google Drive 인증 실패 (JWT Signature 오류): invalid_grant: Invalid JWT Signature.
```

**해결 방법**:
1. Private Key의 줄바꿈 문자(`\n`)가 올바르게 이스케이프되었는지 확인
2. Private Key가 `-----BEGIN PRIVATE KEY-----`로 시작하고 `-----END PRIVATE KEY-----`로 끝나는지 확인
3. Vercel Dashboard에서 환경 변수를 다시 설정 (UI를 통해 직접 붙여넣기)
4. 서비스 계정이 활성화되어 있는지 확인

### 폴더 접근 권한 오류

**에러 메시지**:
```
Error: insufficientPermissions
```

**해결 방법**:
1. Google Drive에서 폴더를 서비스 계정 이메일과 공유했는지 확인
2. 서비스 계정에 **Editor** 권한이 있는지 확인
3. 폴더 ID가 올바른지 확인

### Prisma 필드 오류

**에러 메시지**:
```
Unknown field `bankAccountNumber`
```

**해결 방법**:
- 이미 수정됨: `bankAccountNumber` → `bankAccount`
- Prisma schema와 일치하도록 필드명 확인

## 파일 구조

```
lib/
  ├── affiliate/
  │   └── excel-backup.ts          # 엑셀 생성 및 업로드 유틸리티
  ├── config/
  │   └── drive-config.ts          # Google Drive 폴더 ID 설정
  └── google-drive.ts              # Google Drive 클라이언트

app/api/
  ├── admin/affiliate/excel-backup/
  │   └── route.ts                 # 수동 업로드 API
  └── cron/excel-backup/
      └── route.ts                 # 자동 업로드 Cron Job

scripts/
  └── test_excel_upload.ts         # 테스트 스크립트

vercel.json                        # Cron Job 스케줄 설정
```

## 사용 방법

### 1. 관리자 패널에서 수동 업로드

```typescript
// 프론트엔드에서 호출
const uploadExcel = async (period: string) => {
  const response = await fetch('/api/admin/affiliate/excel-backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period, type: 'all' }),
  });
  const data = await response.json();
  console.log('Upload result:', data);
};

// 사용 예시
uploadExcel('2025-12'); // 2025년 12월 데이터 업로드
```

### 2. 자동 업로드 (Cron Job)

매월 1일 02:00(UTC)에 자동으로 전월 데이터를 업로드합니다.

- 스케줄: `0 2 1 * *` (UTC)
- 한국 시간: 매월 1일 11:00 (UTC+9)

## 생성되는 엑셀 파일

### Cashflow (판매원별 수당)
- **파일명**: `판매원별수당_YYYY-MM.xlsx`
- **시트1** - 판매원별 수당 요약:
  - 이름, 유형, 아이디, 연락처
  - 판매건수, 총판매액, 총수당
  - 원천징수(3.3%), 실수령액
  - 은행명, 계좌번호, 예금주
- **시트2** - 판매 상세내역:
  - 이름, 유형, 판매일, 상품명, 고객명
  - 판매액, 수당

### Totalcash (거래처용 월별)
- **파일명**: `거래처월별_YYYY-MM.xlsx`
- **시트1** - 거래처별 월별 집계:
  - 대리점장, 아이디, 연락처, 이메일
  - 판매건수, 총판매액
  - 브랜치수당, 오버라이드, 총지급액
- **시트2** - 판매 상세내역:
  - 대리점장, 판매일, 상품명, 고객명
  - 판매액, 브랜치수당, 오버라이드

## 다음 단계

현재 Google Drive JWT 인증 오류가 발생하고 있습니다. 다음을 수행하세요:

1. ✅ 코드 구현 완료
2. ⚠️ Vercel 환경 변수 설정 필요
3. ⚠️ Google Drive 서비스 계정 설정 필요
4. ⚠️ 폴더 공유 설정 필요
5. ⚠️ 테스트 및 검증 필요
