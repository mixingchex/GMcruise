# Vercel 환경변수 종합 보고서

Vercel에 설정해야 하는 모든 환경변수를 카테고리별로 정리한 종합 보고서입니다.

---

## 📋 목차

1. [필수 환경변수](#1-필수-환경변수)
2. [결제 시스템 환경변수](#2-결제-시스템-환경변수)
3. [AI 및 외부 API 환경변수](#3-ai-및-외부-api-환경변수)
4. [Google 서비스 환경변수](#4-google-서비스-환경변수)
5. [이메일 발송 환경변수](#5-이메일-발송-환경변수)
6. [카카오 관련 환경변수](#6-카카오-관련-환경변수)
7. [기타 서비스 환경변수](#7-기타-서비스-환경변수)
8. [Vercel 자동 동기화 설정](#8-vercel-자동-동기화-설정)
9. [관리자 패널 연동](#9-관리자-패널-연동)
10. [전체 체크리스트](#10-전체-체크리스트)

---

## 1. 필수 환경변수

### 데이터베이스 연결

```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

- **설명**: PostgreSQL 데이터베이스 연결 URL
- **필수**: ✅ 반드시 설정
- **관리자 패널**: ❌ 관리 불가 (보안상 직접 설정)
- **확인 방법**: 데이터베이스 제공업체(예: Supabase, Neon, AWS RDS)에서 확인

### 기본 URL

```bash
NEXT_PUBLIC_BASE_URL=https://www.cruisedot.co.kr
```

- **설명**: 웹사이트 기본 URL (마지막 슬래시 없이)
- **필수**: ✅ 반드시 설정
- **실제 값**: `https://www.cruisedot.co.kr`
- **관리자 패널**: ✅ `/admin/settings` → "기본 설정" 섹션
- **용도**: 결제 콜백, 이메일 링크 등에 사용

---

## 2. 결제 시스템 환경변수

### 페이앱 결제

```bash
PAYAPP_USERID=hyeseon28
PAYAPP_LINKKEY=CPe1Qyvoll6bPRHfd5pTZO1DPJnCCRVaOgT+oqg6zaM=
PAYAPP_LINKVAL=CPe1Qyvoll6bPRHfd5pTZJKhziNbvfVO9tbzpmrIe6s=
```

- **설명**: 페이앱 결제 연동 정보
- **필수**: ✅ 페이앱 결제 사용 시
- **실제 값**: 위 값 그대로 사용
- **관리자 패널**: ⚠️ 현재 미지원 (추가 필요)
- **확인 방법**: PayApp 판매자 사이트 (https://www.payapp.kr) → 설정 → 연동정보

### 웰컴페이먼츠 결제 (인증 결제)

```bash
PG_SIGNKEY=SGI2dkFzRFc1WHp6K1VTOFVUS3dGdz09
PG_MID_AUTH=wpcrdot200
PG_FIELD_ENCRYPT_IV=00e0281fbcbae386
PG_FIELD_ENCRYPT_KEY=3468ac340654c2e5a890fc97d99c214b
PG_MID_PASSWORD=Ronaldo7@@
PG_ADMIN_URL=http://wbiz.paywelcome.co.kr
PG_MERCHANT_NAME=크루즈닷
```

- **설명**: 웰컴페이먼츠 인증 결제 (본인인증)
- **필수**: ✅ 웰컴페이먼츠 결제 사용 시
- **실제 값**: 위 값 참고 (실제 값으로 확인 필요)
- **관리자 패널**: ✅ `/admin/settings` → "PG 결제 설정" 섹션
- **확인 방법**: 웰컴페이먼츠 관리자 페이지

### 웰컴페이먼츠 결제 (비인증 결제)

```bash
PG_SIGNKEY_NON_AUTH=SCtXOVVtV2o4TU1RN1hONHRlNWVTQT09
PG_MID_NON_AUTH=wpcrdot300
PG_FIELD_ENCRYPT_IV_NON_AUTH=5d19f5e8722505c9
PG_FIELD_ENCRYPT_KEY_NON_AUTH=11e782ef3a738e140872b5074967c5de
```

- **설명**: 웰컴페이먼츠 비인증 결제 (카드번호 입력)
- **필수**: ✅ 비인증 결제 사용 시
- **실제 값**: 위 값 참고 (실제 값으로 확인 필요)
- **관리자 패널**: ✅ `/admin/settings` → "PG 결제 설정" 섹션
- **확인 방법**: 웰컴페이먼츠 관리자 페이지

### 웰컴페이먼츠 결제 페이지 URL

```bash
NEXT_PUBLIC_WELCOME_PAY_URL=https://pay.welcomepayments.co.kr/payment
WELCOME_PAY_URL=https://pay.welcomepayments.co.kr/payment
```

- **설명**: 웰컴페이먼츠 결제 페이지 URL
- **필수**: ✅ 웰컴페이먼츠 결제 사용 시
- **관리자 패널**: ⚠️ 현재 미지원 (추가 필요)
- **참고**: 두 개 모두 설정하거나 `NEXT_PUBLIC_WELCOME_PAY_URL`만 설정해도 됨

---

## 3. AI 및 외부 API 환경변수

### Gemini AI

```bash
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here  # 대체 옵션
```

- **설명**: Google Gemini AI API 키
- **필수**: ✅ AI 채팅, 번역, 이미지 분석 기능 사용 시
- **관리자 패널**: ✅ `/admin/settings` → "AI 설정" 섹션
- **발급 방법**: Google AI Studio (https://aistudio.google.com) → Get API Key
- **참고**: `GEMINI_API_KEY`가 우선 사용됨

### Gemini 모델 (선택)

```bash
GEMINI_MODEL=gemini-flash-latest
```

- **설명**: 사용할 Gemini 모델 이름
- **필수**: ❌ 아니오 (기본값: `gemini-flash-latest`)
- **관리자 패널**: ⚠️ 현재 미지원 (추가 필요)
- **옵션**: 
  - `gemini-flash-latest` (기본값, 추천)
  - `gemini-pro-latest`

### YouTube API

```bash
YOUTUBE_API_KEY=AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM
```

- **설명**: YouTube Data API 키
- **필수**: ⚠️ 조건부 (YouTube 동영상 기능 사용 시)
- **실제 값**: `AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM`
- **관리자 패널**: ✅ `/admin/settings` → "기본 설정" 섹션
- **발급 방법**: Google Cloud Console → API 및 서비스 → 사용자 인증 정보

### Weather API

```bash
WEATHER_API_KEY=8cf954892eb9405681b63201252611
```

- **설명**: WeatherAPI.com API 키 (14일 날씨 예보)
- **필수**: ⚠️ 조건부 (지니 브리핑 날씨 기능 사용 시)
- **실제 값**: `8cf954892eb9405681b63201252611`
- **관리자 패널**: ⚠️ 현재 미지원 (추가 필요)
- **용도**: 14일 날씨 예보 제공 (100명까지 무료)

### OpenWeather API (선택)

```bash
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

- **설명**: OpenWeather API 키 (날씨 정보)
- **필수**: ❌ 아니오 (커뮤니티 봇 날씨 기능 사용 시)
- **관리자 패널**: ⚠️ 현재 미지원 (추가 필요)
- **발급 방법**: OpenWeather (https://openweathermap.org/api)

---

## 4. Google 서비스 환경변수

### Google Drive 서비스 계정

```bash
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=cruisedot@cruisedot-478810.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=cruisedot@cruisedot-478810.iam.gserviceaccount.com  # 대체 옵션
```

- **설명**: Google Drive 서비스 계정 이메일
- **필수**: ✅ 파일 업로드, 여권 저장 기능 사용 시
- **실제 값**: `cruisedot@cruisedot-478810.iam.gserviceaccount.com`
- **관리자 패널**: ✅ `/admin/settings` → "Google Drive 설정" 섹션
- **확인 방법**: Google Cloud Console → IAM 및 관리자 → 서비스 계정

### Google Drive Private Key

```bash
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----  # 대체 옵션
```

- **설명**: Google Drive 서비스 계정 Private Key
- **필수**: ✅ 파일 업로드, 여권 저장 기능 사용 시
- **관리자 패널**: ✅ `/admin/settings` → "Google Drive 설정" 섹션
- **⚠️ 중요**: 
  - JSON 형식의 Private Key를 그대로 복사
  - 줄바꿈(`\n`)을 포함하여 전체 키를 복사
  - Vercel에서는 여러 줄 입력 시 자동으로 처리됨

### Google Drive 폴더 ID

**주요 폴더**:
```bash
GOOGLE_DRIVE_SHARED_DRIVE_ID=0AJVz1C-KYWR0Uk9PVA
GOOGLE_DRIVE_ROOT_FOLDER_ID=0AJVz1C-KYWR0Uk9PVA
GOOGLE_DRIVE_PRODUCTS_FOLDER_ID=18YuEBt313yyKI3F7PSzjFFRF3Af-bVPH
GOOGLE_DRIVE_PASSPORT_FOLDER_ID=0AJVz1C-KYWR0Uk9PVA
```

**업로드 폴더**:
```bash
GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_PROFILES_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_AUDIO_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_DOCUMENTS_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_VIDEOS_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_SALES_AUDIO_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_FONTS_FOLDER_ID=your_folder_id_here
```

**계약서/문서 폴더**:
```bash
GOOGLE_DRIVE_CONTRACTS_PDFS_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_CONTRACTS_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_CONTRACT_AUDIO_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_ID_CARD_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_BANKBOOK_FOLDER_ID=your_folder_id_here
```

**기타 폴더**:
```bash
GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_COMPANY_LOGO_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID=your_folder_id_here
```

- **설명**: Google Drive 폴더 ID (각 기능별 저장 폴더)
- **필수**: ❌ 아니오 (코드에서 기본값 사용)
- **관리자 패널**: ✅ `/admin/settings` → "Google Drive 설정" 섹션
- **확인 방법**: Google Drive에서 폴더 열기 → URL에서 `folders/` 뒤의 ID

### Google Sheets

```bash
COMMUNITY_BACKUP_SPREADSHEET_ID=your_spreadsheet_id_here
TRIP_APIS_ARCHIVE_SPREADSHEET_ID=your_spreadsheet_id_here
```

- **설명**: Google Sheets 스프레드시트 ID
- **필수**: ❌ 아니오 (백업 기능 사용 시)
- **관리자 패널**: ✅ `/admin/settings` → "Google Drive 설정" 섹션

---

## 5. 이메일 발송 환경변수

### SMTP 설정 (우선순위 순)

```bash
# 방법 1 (권장)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# 방법 2 (대체)
EMAIL_SMTP_USER=your_email@gmail.com
EMAIL_SMTP_PASSWORD=your_app_password

# 방법 3 (구버전 호환)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

- **설명**: 이메일 발송용 SMTP 계정
- **필수**: ⚠️ 조건부 (이메일 발송 기능 사용 시)
- **관리자 패널**: ✅ `/admin/settings` → "이메일 설정" 섹션
- **Gmail 사용 시**: 앱 비밀번호 생성 필요 (https://myaccount.google.com/apppasswords)

### SMTP 서버 설정

```bash
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_FROM_ADDRESS=noreply@cruisedot.com
EMAIL_FROM_NAME=크루즈닷
```

- **설명**: SMTP 서버 호스트, 포트, 발신자 주소
- **필수**: ❌ 아니오 (기본값 사용 가능)
- **관리자 패널**: ✅ `/admin/settings` → "이메일 설정" 섹션
- **기본값**: 
  - `EMAIL_SMTP_HOST`: `smtp.gmail.com`
  - `EMAIL_SMTP_PORT`: `587`
  - `EMAIL_FROM_ADDRESS`: `EMAIL_USER` 또는 `noreply@cruisedot.com`

### 관리자 이메일

```bash
HEAD_OFFICE_EMAIL=hyeseon28@gmail.com
ADMIN_EMAIL=hyeseon28@gmail.com  # 대체 옵션
```

- **설명**: 본사/관리자 이메일 주소
- **필수**: ❌ 아니오 (계약서 PDF 발송 등에 사용)
- **실제 값**: `hyeseon28@gmail.com`
- **관리자 패널**: ✅ `/admin/settings` → "이메일 설정" 섹션

---

## 6. 카카오 관련 환경변수

### 카카오 JavaScript SDK

```bash
NEXT_PUBLIC_KAKAO_JS_KEY=e4d764f905271796dccf37c55a5b84d7
```

- **설명**: 카카오 JavaScript SDK 키
- **필수**: ✅ 카카오톡 채널 추가, 공유 기능 사용 시
- **실제 값**: `e4d764f905271796dccf37c55a5b84d7`
- **관리자 패널**: ✅ `/admin/settings` → "카카오톡 설정" 섹션

### 카카오 채널

```bash
NEXT_PUBLIC_KAKAO_CHANNEL_ID=CzxgPn
```

- **설명**: 카카오 비즈니스 채널 공개 ID
- **필수**: ✅ 카카오톡 채널 기능 사용 시
- **실제 값**: `CzxgPn`
- **관리자 패널**: ✅ `/admin/settings` → "카카오톡 설정" 섹션

### 카카오 API (고급 기능)

```bash
KAKAO_REST_API_KEY=e75220229cf63f62a0832447850985ea
KAKAO_ADMIN_KEY=6f2872dfa8ac40ab0d9a93a70c542d10
KAKAO_APP_ID=1293313
KAKAO_APP_NAME=크루즈닷
KAKAO_CHANNEL_BOT_ID=68693bcd99efce7dbfa950bb
```

- **설명**: 카카오 REST API, Admin API, 앱 정보
- **필수**: ⚠️ 조건부 (고급 기능 사용 시)
- **실제 값**: 위 값 참고
- **관리자 패널**: ✅ `/admin/settings` → "카카오톡 설정" 섹션

### 알리고 카카오톡 메시지

```bash
ALIGO_KAKAO_SENDER_KEY=13b13496a0f51e9a602706d0dd8b27598088dd5a
ALIGO_KAKAO_CHANNEL_ID=cruisedot
```

- **설명**: 알리고 카카오톡 발신 키 및 채널 ID
- **필수**: ⚠️ 조건부 (알리고 카카오톡 메시지 사용 시)
- **실제 값**: 위 값 참고
- **관리자 패널**: ✅ `/admin/settings` → "SMS API 설정" 섹션

---

## 7. 기타 서비스 환경변수

### 소켓 서버 (선택)

```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

- **설명**: WebSocket 소켓 서버 URL
- **필수**: ❌ 아니오 (비디오 컨퍼런스 기능 사용 시)
- **기본값**: `http://localhost:3001`
- **관리자 패널**: ⚠️ 현재 미지원 (추가 필요)
- **참고**: 프로덕션에서는 실제 소켓 서버 URL로 변경 필요

### Cron 작업 보안

```bash
CRON_SECRET=your_secret_key_here
```

- **설명**: Cron 작업 보안을 위한 시크릿 키
- **필수**: ❌ 아니오 (커뮤니티 봇 등 Cron 작업 사용 시)
- **관리자 패널**: ⚠️ 현재 미지원 (추가 필요)
- **기본값**: `your-secret-key-here` (프로덕션에서는 반드시 변경)

---

## 8. Vercel 자동 동기화 설정

관리자 패널에서 환경변수를 저장하면 자동으로 Vercel에 동기화되도록 하려면 다음 환경변수가 필요합니다:

```bash
VERCEL_API_TOKEN=your_vercel_api_token_here
VERCEL_PROJECT_ID=your_vercel_project_id_here
NEXT_PUBLIC_VERCEL_PROJECT_ID=your_vercel_project_id_here  # 대체 옵션
```

- **설명**: Vercel API 토큰 및 프로젝트 ID
- **필수**: ⚠️ 자동 동기화 사용 시
- **관리자 패널**: ⚠️ 현재 미지원 (보안상 직접 설정 권장)
- **발급 방법**: 
  - Vercel 계정 → Settings → Tokens → Create Token
  - Vercel 프로젝트 → Settings → General → Project ID 확인

---

## 9. 관리자 패널 연동

### 현재 지원되는 환경변수

관리자 패널 (`/admin/settings`)에서 다음 환경변수들을 관리할 수 있습니다:

#### ✅ 완전히 지원되는 카테고리

1. **이메일 설정**
   - `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD`
   - `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`
   - `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`
   - `ADMIN_EMAIL`

2. **AI 설정**
   - `GEMINI_API_KEY`

3. **카카오톡 설정**
   - `NEXT_PUBLIC_KAKAO_JS_KEY`
   - `NEXT_PUBLIC_KAKAO_CHANNEL_ID`
   - `KAKAO_REST_API_KEY`, `KAKAO_ADMIN_KEY`
   - `KAKAO_APP_ID`, `KAKAO_APP_NAME`
   - `KAKAO_CHANNEL_BOT_ID`

4. **PG 결제 설정**
   - `PG_SIGNKEY`, `PG_MID_AUTH`
   - `PG_FIELD_ENCRYPT_IV`, `PG_FIELD_ENCRYPT_KEY`
   - `PG_SIGNKEY_NON_AUTH`, `PG_MID_NON_AUTH`
   - `PG_FIELD_ENCRYPT_IV_NON_AUTH`, `PG_FIELD_ENCRYPT_KEY_NON_AUTH`
   - `PG_MID_PASSWORD`, `PG_ADMIN_URL`, `PG_MERCHANT_NAME`

5. **기본 설정**
   - `NEXT_PUBLIC_BASE_URL`
   - `YOUTUBE_API_KEY`

6. **Google Drive 설정**
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`
   - 모든 Google Drive 폴더 ID
   - Google Sheets ID

7. **SMS API 설정** (별도 섹션)
   - `ALIGO_API_KEY`, `ALIGO_USER_ID`
   - `ALIGO_SENDER_PHONE`
   - `ALIGO_KAKAO_SENDER_KEY`
   - `ALIGO_KAKAO_CHANNEL_ID`

#### ⚠️ 추가 필요한 환경변수

1. **페이앱 결제**
   - `PAYAPP_USERID`
   - `PAYAPP_LINKKEY`
   - `PAYAPP_LINKVAL`

2. **웰컴페이먼츠 URL**
   - `NEXT_PUBLIC_WELCOME_PAY_URL`
   - `WELCOME_PAY_URL`

3. **날씨 API**
   - `WEATHER_API_KEY`
   - `OPENWEATHER_API_KEY`

4. **기타**
   - `GEMINI_MODEL`
   - `NEXT_PUBLIC_SOCKET_URL`
   - `CRON_SECRET`

### 자동 동기화 동작

관리자 패널에서 환경변수를 저장하면:

1. ✅ 로컬 환경변수 (`.env.local`)에 저장
2. ✅ Vercel 환경변수에 자동 동기화 (VERCEL_API_TOKEN 설정 시)
3. ✅ 변경사항 즉시 반영
4. ✅ 성공/실패 메시지 표시

**⚠️ 주의**: Vercel 자동 동기화를 사용하려면 `VERCEL_API_TOKEN`과 `VERCEL_PROJECT_ID`가 Vercel 대시보드에 직접 설정되어 있어야 합니다.

---

## 10. 전체 체크리스트

### 필수 환경변수

- [ ] `DATABASE_URL` (Vercel 대시보드에서 직접 설정)
- [ ] `NEXT_PUBLIC_BASE_URL` (관리자 패널 또는 Vercel)

### 결제 시스템

- [ ] 페이앱: `PAYAPP_USERID`, `PAYAPP_LINKKEY`, `PAYAPP_LINKVAL` (Vercel 직접 설정)
- [ ] 웰컴페이먼츠 인증: `PG_SIGNKEY`, `PG_MID_AUTH`, `PG_FIELD_ENCRYPT_IV`, `PG_FIELD_ENCRYPT_KEY` (관리자 패널)
- [ ] 웰컴페이먼츠 비인증: `PG_SIGNKEY_NON_AUTH`, `PG_MID_NON_AUTH`, `PG_FIELD_ENCRYPT_IV_NON_AUTH`, `PG_FIELD_ENCRYPT_KEY_NON_AUTH` (관리자 패널)
- [ ] 웰컴페이먼츠 URL: `NEXT_PUBLIC_WELCOME_PAY_URL`, `WELCOME_PAY_URL` (Vercel 직접 설정)

### AI 및 외부 API

- [ ] `GEMINI_API_KEY` (관리자 패널)
- [ ] `GEMINI_MODEL` (Vercel 직접 설정, 선택사항)
- [ ] `YOUTUBE_API_KEY` (관리자 패널)
- [ ] `WEATHER_API_KEY` (Vercel 직접 설정)
- [ ] `OPENWEATHER_API_KEY` (Vercel 직접 설정, 선택사항)

### Google 서비스

- [ ] `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` (관리자 패널)
- [ ] `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` (관리자 패널)
- [ ] Google Drive 폴더 ID들 (관리자 패널)

### 이메일 발송

- [ ] `EMAIL_USER`, `EMAIL_PASS` 또는 `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD` (관리자 패널)
- [ ] `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT` (관리자 패널, 선택사항)
- [ ] `ADMIN_EMAIL` (관리자 패널)

### 카카오

- [ ] `NEXT_PUBLIC_KAKAO_JS_KEY` (관리자 패널)
- [ ] `NEXT_PUBLIC_KAKAO_CHANNEL_ID` (관리자 패널)
- [ ] `KAKAO_REST_API_KEY`, `KAKAO_ADMIN_KEY` (관리자 패널, 고급 기능)
- [ ] `ALIGO_KAKAO_SENDER_KEY`, `ALIGO_KAKAO_CHANNEL_ID` (관리자 패널, SMS API 섹션)

### 기타

- [ ] `NEXT_PUBLIC_SOCKET_URL` (Vercel 직접 설정, 선택사항)
- [ ] `CRON_SECRET` (Vercel 직접 설정, 선택사항)

### Vercel 자동 동기화

- [ ] `VERCEL_API_TOKEN` (Vercel 직접 설정)
- [ ] `VERCEL_PROJECT_ID` (Vercel 직접 설정)

---

## 📝 관리자 패널 사용 방법

### 1. 관리자 패널 접속

1. `/admin/settings` 접속
2. 각 카테고리별 섹션에서 환경변수 확인/수정

### 2. 환경변수 수정

1. 해당 섹션의 **"편집하기"** 버튼 클릭
2. 원하는 값 입력/수정
3. **"저장하기"** 버튼 클릭
4. 자동으로 Vercel에 동기화됨

### 3. 자동 동기화 확인

저장 후 다음 메시지가 표시됩니다:

```
✅ Vercel 자동 업데이트: X개 환경변수 업데이트 완료
```

---

## 🚀 빠른 설정 가이드

### 새 Vercel 프로젝트 설정 순서

1. **필수 환경변수 설정** (Vercel 대시보드)
   - `DATABASE_URL`
   - `NEXT_PUBLIC_BASE_URL`

2. **Vercel 자동 동기화 설정** (선택사항)
   - `VERCEL_API_TOKEN`
   - `VERCEL_PROJECT_ID`

3. **관리자 패널에서 나머지 설정**
   - `/admin/settings` 접속
   - 각 섹션별로 환경변수 입력
   - 저장하면 자동으로 Vercel에 동기화

4. **Vercel 대시보드에서 직접 설정** (관리자 패널 미지원 항목)
   - 페이앱 관련
   - 날씨 API
   - 소켓 URL
   - Cron Secret

---

**모든 환경변수 설정 후 반드시 Vercel에서 Redeploy를 실행하세요!** 🚀

