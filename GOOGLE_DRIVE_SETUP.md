# 구글 드라이브 자동 백업 설정 가이드

## 📋 필요한 환경 변수

`.env` 파일에 다음 변수들을 추가하세요:

```bash
# 구글 드라이브 서비스 계정 설정
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# 공유 드라이브 ID (선택사항, 개인 드라이브를 사용하는 경우 생략 가능)
GOOGLE_DRIVE_SHARED_DRIVE_ID="your-shared-drive-id"

# 특정 폴더 ID (선택사항)
GOOGLE_DRIVE_PAYSLIP_FOLDER_ID="folder-id-for-payslips"
GOOGLE_DRIVE_SIGNATURES_FOLDER_ID="folder-id-for-signatures"
```

---

## 🔐 구글 서비스 계정 생성 방법

### 1. Google Cloud Console 접속
https://console.cloud.google.com/

### 2. 프로젝트 선택 또는 생성
- 기존 프로젝트가 있으면 선택
- 없으면 새 프로젝트 생성

### 3. 서비스 계정 만들기
1. **IAM 및 관리자** → **서비스 계정** 메뉴로 이동
2. **서비스 계정 만들기** 클릭
3. 서비스 계정 정보 입력:
   - **이름**: `cruise-guide-drive-service`
   - **ID**: 자동 생성됨
   - **설명**: 크루즈가이드 구글 드라이브 자동 백업용
4. **만들고 계속하기** 클릭
5. 역할 선택 (선택사항, 건너뛰기 가능)
6. **완료** 클릭

### 4. 서비스 계정 키 생성
1. 생성된 서비스 계정 클릭
2. **키** 탭으로 이동
3. **키 추가** → **새 키 만들기**
4. **JSON** 선택
5. **만들기** 클릭
6. JSON 파일이 자동으로 다운로드됩니다

### 5. Google Drive API 활성화
1. **API 및 서비스** → **라이브러리** 메뉴로 이동
2. "Google Drive API" 검색
3. **사용 설정** 클릭

---

## 📁 구글 드라이브 설정

### 방법 1: 개인 드라이브 사용
1. 구글 드라이브 접속: https://drive.google.com/
2. 서비스 계정 이메일 주소 확인 (JSON 파일의 `client_email`)
3. 백업할 폴더를 서비스 계정과 공유:
   - 폴더 우클릭 → **공유**
   - 서비스 계정 이메일 입력
   - **편집자** 권한 부여
   - **전송** 클릭

### 방법 2: 공유 드라이브 사용 (권장)
1. 구글 드라이브에서 공유 드라이브 생성
2. 서비스 계정을 공유 드라이브에 추가 (편집자 권한)
3. 공유 드라이브 ID를 환경 변수에 추가

**공유 드라이브 ID 찾기:**
- 공유 드라이브로 이동
- URL에서 ID 확인: `https://drive.google.com/drive/folders/{SHARED_DRIVE_ID}`

---

## ⚙️ .env 파일 설정 예시

다운로드한 JSON 파일을 열고 다음 정보를 `.env`에 복사:

```bash
# JSON 파일에서 복사
GOOGLE_SERVICE_ACCOUNT_EMAIL="cruise-guide-drive@my-project.iam.gserviceaccount.com"

# JSON 파일의 private_key 값을 그대로 복사 (줄바꿈 포함)
# ⚠️ 주의: 따옴표 안에 전체 키를 넣어야 합니다
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
...전체 키 내용...
-----END PRIVATE KEY-----"

# 선택사항: 공유 드라이브 사용 시
GOOGLE_DRIVE_SHARED_DRIVE_ID="0ABcDefGhIjKlMnOpQrStUvWxYz"
```

**중요한 팁:**
- Private Key는 반드시 따옴표(`"`)로 감싸야 합니다
- `\n` (줄바꿈)이 포함되어야 합니다
- 키의 시작과 끝에 `-----BEGIN PRIVATE KEY-----`와 `-----END PRIVATE KEY-----`가 있어야 합니다

---

## ✅ 설정 확인

설정이 완료되면 다음 명령어로 테스트:

```bash
cd /home/userhyeseon28/projects/cruise-guide
npx tsx scripts/test-document-sync.ts
```

성공하면 다음과 같은 메시지가 표시됩니다:

```
🚀 문서 동기화 테스트 시작...
✅ 테스트 프로필: boss1 (ID: 1)
📁 구글 드라이브 폴더 구조 생성 중...
✅ 폴더 구조 생성 성공!
📤 계약서 PDF를 구글 드라이브에 업로드 중...
✅ PDF 업로드 성공!
🎉 모든 테스트 완료!
```

---

## 🔒 보안 주의사항

1. **절대로** `.env` 파일을 Git에 커밋하지 마세요
2. 서비스 계정 키는 안전하게 보관하세요
3. 프로덕션 환경에서는 환경 변수를 서버에 직접 설정하세요
4. 키가 유출되면 즉시 Google Cloud Console에서 키를 삭제하고 새로 생성하세요

---

## 🎯 자동 백업되는 항목

설정 완료 후 다음 항목들이 자동으로 구글 드라이브에 백업됩니다:

### 1. 계약서 완료 시 (자동)
- ✅ 계약서 PDF
- ✅ 신분증
- ✅ 통장 사본
- ✅ 서명 이미지

### 2. 매일 새벽 3시 (자동)
- ✅ 전체 데이터베이스 (14개 테이블)

### 3. 매월 1일 오전 9시 (자동)
- ✅ 승인된 지급명세서 PDF

### 4. 수동 동기화
- 관리자 패널 → 테스트 대시보드 → 문서 동기화

---

## 📦 폴더 구조

```
Google Drive Root/
├── DB_BACKUP/                    (데이터베이스 백업)
│   └── 2025-11/
│       └── 22/
│           ├── User_20251122_030000.xlsx
│           ├── Trip_20251122_030000.xlsx
│           └── ...
├── Affiliate_Documents/          (어필리에이트 문서)
│   ├── AFF-BOSS1_홍길동/
│   │   ├── Contracts/
│   │   ├── ID_Cards/
│   │   ├── Bankbooks/
│   │   └── Signatures/
│   └── AFF-USER1_김철수/
│       └── ...
└── Payslips/                     (지급명세서, 옵션)
    └── 2025-11/
        ├── payslip_홍길동_202511.pdf
        └── ...
```

---

## 🆘 문제 해결

### "Google Drive 서비스 계정 정보가 설정되어 있지 않습니다"
→ `.env` 파일에 `GOOGLE_SERVICE_ACCOUNT_EMAIL`과 `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`를 추가하세요.

### "Permission denied"
→ 서비스 계정에 구글 드라이브 폴더 접근 권한을 부여하세요.

### "Invalid key format"
→ Private Key가 올바른 형식인지 확인하세요. `\n`과 `-----BEGIN/END-----`가 포함되어야 합니다.

### "API not enabled"
→ Google Cloud Console에서 Google Drive API를 활성화하세요.

---

## 📞 추가 도움이 필요하신가요?

구글 드라이브 설정이 완료되면 저에게 알려주세요!
테스트를 다시 실행해드릴게요! 🚀















