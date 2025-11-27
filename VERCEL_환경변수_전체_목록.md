# Vercel 환경변수 전체 설정 가이드

새로 만든 Vercel 프로젝트에 설정해야 할 모든 환경변수 목록입니다.

---

## 📋 목차
1. [필수 환경변수 (반드시 설정)](#1-필수-환경변수-반드시-설정)
2. [결제 시스템 환경변수](#2-결제-시스템-환경변수)
3. [AI 및 외부 API 환경변수](#3-ai-및-외부-api-환경변수)
4. [Google 서비스 환경변수](#4-google-서비스-환경변수)
5. [이메일 발송 환경변수](#5-이메일-발송-환경변수)
6. [기타 서비스 환경변수](#6-기타-서비스-환경변수)
7. [선택적 환경변수](#7-선택적-환경변수)
8. [Vercel 설정 방법](#8-vercel-설정-방법)

---

## 1. 필수 환경변수 (반드시 설정)

### 데이터베이스
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```
- **설명**: PostgreSQL 데이터베이스 연결 URL
- **필수**: ✅ 예
- **확인 방법**: 데이터베이스 제공업체(예: Supabase, Neon, AWS RDS)에서 확인

### 기본 URL
```bash
NEXT_PUBLIC_BASE_URL=https://www.cruisedot.co.kr
```
- **설명**: 웹사이트 기본 URL (마지막 슬래시 없이)
- **필수**: ✅ 예
- **실제 값**: `https://www.cruisedot.co.kr` (이미 설정된 값)
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
- **필수**: ✅ 예 (페이앱 결제 사용 시)
- **실제 값**: 위 값 그대로 사용 (이미 설정된 값)
- **확인 방법**: PayApp 판매자 사이트 (https://www.payapp.kr) → 설정 → 연동정보

### 웰컴페이먼츠 결제 (인증 결제)
```bash
PG_SIGNKEY=your_signkey_here
PG_MID_AUTH=your_mid_auth_here
PG_FIELD_ENCRYPT_IV=your_field_encrypt_iv_here
PG_FIELD_ENCRYPT_KEY=your_field_encrypt_key_here
```
- **설명**: 웰컴페이먼츠 인증 결제 (본인인증)
- **필수**: ✅ 예 (웰컴페이먼츠 결제 사용 시)
- **확인 방법**: 웰컴페이먼츠 관리자 페이지

### 웰컴페이먼츠 결제 (비인증 결제)
```bash
PG_SIGNKEY_NON_AUTH=your_signkey_non_auth_here
PG_MID_NON_AUTH=your_mid_non_auth_here
PG_FIELD_ENCRYPT_IV_NON_AUTH=your_field_encrypt_iv_non_auth_here
PG_FIELD_ENCRYPT_KEY_NON_AUTH=your_field_encrypt_key_non_auth_here
```
- **설명**: 웰컴페이먼츠 비인증 결제 (카드번호 입력)
- **필수**: ✅ 예 (비인증 결제 사용 시)
- **확인 방법**: 웰컴페이먼츠 관리자 페이지

### 웰컴페이먼츠 결제 페이지 URL
```bash
NEXT_PUBLIC_WELCOME_PAY_URL=https://pay.welcomepayments.co.kr/payment
WELCOME_PAY_URL=https://pay.welcomepayments.co.kr/payment
```
- **설명**: 웰컴페이먼츠 결제 페이지 URL
- **필수**: ✅ 예 (웰컴페이먼츠 결제 사용 시)
- **참고**: 두 개 모두 설정하거나 `NEXT_PUBLIC_WELCOME_PAY_URL`만 설정해도 됨

---

## 3. AI 및 외부 API 환경변수

### Gemini AI
```bash
GEMINI_API_KEY=your_gemini_api_key_here
# 또는 (대체 옵션)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```
- **설명**: Google Gemini AI API 키
- **필수**: ✅ 예 (AI 채팅, 번역, 이미지 분석 기능 사용 시)
- **발급 방법**: Google AI Studio (https://aistudio.google.com) → Get API Key
- **참고**: `GEMINI_API_KEY`가 우선 사용됨

### Gemini 모델 (선택)
```bash
GEMINI_MODEL=gemini-flash-latest
```
- **설명**: 사용할 Gemini 모델 이름
- **필수**: ❌ 아니오 (기본값: `gemini-flash-latest`)
- **옵션**: 
  - `gemini-flash-latest` (기본값, 추천)
  - `gemini-pro-latest`

### YouTube API
```bash
YOUTUBE_API_KEY=your_youtube_api_key_here
```
- **설명**: YouTube Data API 키
- **필수**: ⚠️ 조건부 (YouTube 동영상 기능 사용 시)
- **발급 방법**: Google Cloud Console → API 및 서비스 → 사용자 인증 정보

### OpenWeather API
```bash
OPENWEATHER_API_KEY=your_openweather_api_key_here
```
- **설명**: OpenWeather API 키 (날씨 정보)
- **필수**: ❌ 아니오 (커뮤니티 봇 날씨 기능 사용 시)
- **발급 방법**: OpenWeather (https://openweathermap.org/api)

---

## 4. Google 서비스 환경변수

### Google Drive 서비스 계정
```bash
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=cruisedot@cruisedot-478810.iam.gserviceaccount.com
# 또는 (대체 옵션)
GOOGLE_SERVICE_ACCOUNT_EMAIL=cruisedot@cruisedot-478810.iam.gserviceaccount.com
```
- **설명**: Google Drive 서비스 계정 이메일
- **필수**: ✅ 예 (파일 업로드, 여권 저장 기능 사용 시)
- **실제 값**: `cruisedot@cruisedot-478810.iam.gserviceaccount.com` (이미 설정된 값)
- **확인 방법**: Google Cloud Console → IAM 및 관리자 → 서비스 계정

```bash
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
# 또는 (대체 옵션)
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```
- **설명**: Google Drive 서비스 계정 Private Key
- **필수**: ✅ 예 (파일 업로드, 여권 저장 기능 사용 시)
- **⚠️ 중요**: 
  - JSON 형식의 Private Key를 그대로 복사
  - 줄바꿈(`\n`)을 포함하여 전체 키를 복사
  - Vercel에서는 여러 줄 입력 시 자동으로 처리됨

### Google Drive 폴더 ID (선택)
```bash
GOOGLE_DRIVE_PASSPORT_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_ROOT_FOLDER_ID=0AJVz1C-KYWR0Uk9PVA
GOOGLE_DRIVE_SHARED_DRIVE_ID=0AJVz1C-KYWR0Uk9PVA
GOOGLE_DRIVE_PRODUCTS_FOLDER_ID=18YuEBt313yyKI3F7PSzjFFRF3Af-bVPH
GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_AUDIO_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_PROFILES_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_AUDIO_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_DOCUMENTS_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_VIDEOS_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_SALES_AUDIO_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_UPLOADS_FONTS_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_CONTRACTS_PDFS_FOLDER_ID=your_folder_id_here
```
- **설명**: Google Drive 폴더 ID (각 기능별 저장 폴더)
- **필수**: ❌ 아니오 (코드에서 기본값 사용)
- **실제 값**: 
  - `GOOGLE_DRIVE_SHARED_DRIVE_ID`: `0AJVz1C-KYWR0Uk9PVA` (이미 설정된 값)
  - `GOOGLE_DRIVE_PRODUCTS_FOLDER_ID`: `18YuEBt313yyKI3F7PSzjFFRF3Af-bVPH` (이미 설정된 값)
- **새 폴더**: `public/uploads/**`와 `public/contracts/pdfs`를 Google Drive로 옮겼다면 위 `GOOGLE_DRIVE_UPLOADS_*`·`GOOGLE_DRIVE_CONTRACTS_PDFS_FOLDER_ID` 값도 반드시 채워야 합니다.
- **확인 방법**: Google Drive에서 폴더 열기 → URL에서 `folders/` 뒤의 ID

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
- **Gmail 사용 시**: 앱 비밀번호 생성 필요 (https://myaccount.google.com/apppasswords)

### SMTP 서버 설정
```bash
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_FROM_ADDRESS=noreply@cruisedot.com
```
- **설명**: SMTP 서버 호스트, 포트, 발신자 주소
- **필수**: ❌ 아니오 (기본값 사용 가능)
- **기본값**: 
  - `EMAIL_SMTP_HOST`: `smtp.gmail.com`
  - `EMAIL_SMTP_PORT`: `587`
  - `EMAIL_FROM_ADDRESS`: `EMAIL_USER` 또는 `noreply@cruisedot.com`

### 관리자 이메일
```bash
HEAD_OFFICE_EMAIL=hyeseon28@gmail.com
# 또는 (대체 옵션)
ADMIN_EMAIL=hyeseon28@gmail.com
```
- **설명**: 본사/관리자 이메일 주소
- **필수**: ❌ 아니오 (계약서 PDF 발송 등에 사용)
- **실제 값**: `hyeseon28@gmail.com` (이미 설정된 값)
- **참고**: 회사 이메일은 `hyeseon28@naver.com` (공개 페이지용)

---

## 6. 기타 서비스 환경변수

### 카카오톡
```bash
NEXT_PUBLIC_KAKAO_JS_KEY=your_kakao_js_key_here
NEXT_PUBLIC_KAKAO_CHANNEL_ID=your_channel_id_here
```
- **설명**: 카카오톡 JavaScript SDK 키 및 채널 ID
- **필수**: ⚠️ 조건부 (카카오톡 로그인/채널 기능 사용 시)
- **발급 방법**: 카카오 개발자 콘솔 (https://developers.kakao.com)

### 소켓 서버 (선택)
```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```
- **설명**: WebSocket 소켓 서버 URL
- **필수**: ❌ 아니오 (비디오 컨퍼런스 기능 사용 시)
- **기본값**: `http://localhost:3001`

### Cron 작업 보안
```bash
CRON_SECRET=your_secret_key_here
```
- **설명**: Cron 작업 보안을 위한 시크릿 키
- **필수**: ❌ 아니오 (커뮤니티 봇 등 Cron 작업 사용 시)
- **기본값**: `your-secret-key-here` (프로덕션에서는 반드시 변경)

---

## 7. 선택적 환경변수

### 개발/디버깅
```bash
NODE_ENV=production
ANALYZE=false
```
- **설명**: 
  - `NODE_ENV`: 환경 모드 (Vercel에서 자동 설정)
  - `ANALYZE`: 번들 분석 활성화 (`true`일 때만)
- **필수**: ❌ 아니오 (Vercel에서 자동 설정)

---

## 8. Vercel 설정 방법

### 8-1. Vercel 대시보드 접속
1. https://vercel.com 접속
2. 로그인
3. 프로젝트 선택

### 8-2. 환경변수 추가
1. **Settings** 클릭
2. **Environment Variables** 클릭
3. **Add New** 클릭
4. 다음 정보 입력:
   - **Key**: 환경변수 이름 (예: `DATABASE_URL`)
   - **Value**: 환경변수 값
   - **Environment**: 
     - **Production**: 프로덕션 환경
     - **Preview**: 프리뷰 환경
     - **Development**: 개발 환경
5. **Save** 클릭

### 8-3. 환경변수 추가 순서 (권장)

#### 1단계: 필수 환경변수
- `DATABASE_URL`
- `NEXT_PUBLIC_BASE_URL`

#### 2단계: 결제 시스템
- 페이앱: `PAYAPP_USERID`, `PAYAPP_LINKKEY`, `PAYAPP_LINKVAL`
- 웰컴페이먼츠: `PG_SIGNKEY`, `PG_MID_AUTH`, `PG_FIELD_ENCRYPT_IV`, `PG_FIELD_ENCRYPT_KEY`
- 웰컴페이먼츠 비인증: `PG_SIGNKEY_NON_AUTH`, `PG_MID_NON_AUTH`, `PG_FIELD_ENCRYPT_IV_NON_AUTH`, `PG_FIELD_ENCRYPT_KEY_NON_AUTH`
- `NEXT_PUBLIC_WELCOME_PAY_URL`

#### 3단계: AI 및 외부 API
- `GEMINI_API_KEY`
- `YOUTUBE_API_KEY` (사용 시)
- `OPENWEATHER_API_KEY` (사용 시)

#### 4단계: Google 서비스
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`
- Google Drive 폴더 ID들 (필요 시)

#### 5단계: 이메일 발송
- `EMAIL_USER`, `EMAIL_PASS`
- `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT` (기본값과 다를 때만)
- `HEAD_OFFICE_EMAIL` (필요 시)

#### 6단계: 기타 서비스
- `NEXT_PUBLIC_KAKAO_JS_KEY`, `NEXT_PUBLIC_KAKAO_CHANNEL_ID` (사용 시)
- `NEXT_PUBLIC_SOCKET_URL` (사용 시)
- `CRON_SECRET` (사용 시)

### 8-4. 환경변수 일괄 추가 (JSON 형식)

Vercel CLI를 사용하면 JSON 파일로 일괄 추가할 수 있습니다:

```bash
# vercel env add 명령어 사용
vercel env add DATABASE_URL production
# 값을 입력하라고 하면 붙여넣기
```

또는 Vercel 대시보드에서 하나씩 추가하는 것을 권장합니다.

### 8-5. 재배포

환경변수 추가 후:
1. **Deployments** 탭 클릭
2. 최신 배포의 **"..."** 메뉴 클릭
3. **Redeploy** 선택
4. 재배포 완료 대기

---

## 9. 환경변수 확인 체크리스트

### 필수 확인
- [ ] `DATABASE_URL` 설정
- [ ] `NEXT_PUBLIC_BASE_URL` 설정

### 결제 시스템 확인
- [ ] 페이앱 환경변수 3개 설정 (페이앱 사용 시)
- [ ] 웰컴페이먼츠 환경변수 10개 설정 (웰컴페이먼츠 사용 시)

### AI 및 외부 API 확인
- [ ] `GEMINI_API_KEY` 설정
- [ ] `YOUTUBE_API_KEY` 설정 (YouTube 기능 사용 시)
- [ ] `OPENWEATHER_API_KEY` 설정 (날씨 기능 사용 시)

### Google 서비스 확인
- [ ] `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` 설정
- [ ] `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` 설정

### 이메일 발송 확인
- [ ] `EMAIL_USER`, `EMAIL_PASS` 설정 (이메일 발송 사용 시)

### 기타 확인
- [ ] `NEXT_PUBLIC_KAKAO_JS_KEY` 설정 (카카오톡 기능 사용 시)
- [ ] `CRON_SECRET` 설정 (Cron 작업 사용 시)

---

## 10. 문제 해결

### 환경변수가 적용되지 않는 경우
1. **재배포 확인**: 환경변수 추가 후 반드시 Redeploy 실행
2. **이름 확인**: 대소문자 정확히 일치하는지 확인
3. **Environment 확인**: Production, Preview, Development 중 올바른 환경에 설정되었는지 확인

### Private Key 입력 시 주의사항
- Google Drive Private Key는 여러 줄로 구성됨
- Vercel에서는 여러 줄 입력 시 자동으로 처리되지만, 전체 키를 정확히 복사해야 함
- `-----BEGIN PRIVATE KEY-----`부터 `-----END PRIVATE KEY-----`까지 모두 포함

### 보안 주의사항
- ⚠️ 민감한 정보(API 키, Private Key 등)는 절대 공개하지 마세요
- ⚠️ Vercel 환경변수는 암호화되어 저장되지만, 팀원과 공유할 때는 주의하세요
- ⚠️ 프로덕션 환경에서는 반드시 강력한 비밀번호와 시크릿 키를 사용하세요

---

## 11. 빠른 참조: 전체 환경변수 목록

```bash
# 필수
DATABASE_URL=
NEXT_PUBLIC_BASE_URL=

# 페이앱
PAYAPP_USERID=
PAYAPP_LINKKEY=
PAYAPP_LINKVAL=

# 웰컴페이먼츠
PG_SIGNKEY=
PG_MID_AUTH=
PG_FIELD_ENCRYPT_IV=
PG_FIELD_ENCRYPT_KEY=
PG_SIGNKEY_NON_AUTH=
PG_MID_NON_AUTH=
PG_FIELD_ENCRYPT_IV_NON_AUTH=
PG_FIELD_ENCRYPT_KEY_NON_AUTH=
NEXT_PUBLIC_WELCOME_PAY_URL=

# Gemini AI
GEMINI_API_KEY=
GEMINI_MODEL=

# YouTube
YOUTUBE_API_KEY=

# OpenWeather
OPENWEATHER_API_KEY=

# Google Drive
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_DRIVE_PASSPORT_FOLDER_ID=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
GOOGLE_DRIVE_SHARED_DRIVE_ID=
GOOGLE_DRIVE_PRODUCTS_FOLDER_ID=
GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID=

# 이메일
EMAIL_USER=
EMAIL_PASS=
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=
EMAIL_FROM_ADDRESS=
HEAD_OFFICE_EMAIL=

# 카카오톡
NEXT_PUBLIC_KAKAO_JS_KEY=
NEXT_PUBLIC_KAKAO_CHANNEL_ID=

# 기타
NEXT_PUBLIC_SOCKET_URL=
CRON_SECRET=
```

---

**모든 환경변수 설정 후 반드시 Redeploy를 실행하세요!** 🚀

