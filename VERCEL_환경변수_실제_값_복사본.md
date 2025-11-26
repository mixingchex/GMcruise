# Vercel 환경변수 실제 값 복사본

**⚠️ 중요**: 이 파일의 실제 값들을 Vercel에 그대로 복사해서 붙여넣으세요!

---

## 📋 Vercel 설정 순서

### 기본 설정 방법
1. Vercel 대시보드 접속: https://vercel.com
2. 프로젝트 선택 (cruise-guide)
3. **Settings** → **Environment Variables** 클릭
4. **"Add New"** 버튼 클릭
5. 아래 환경변수를 하나씩 추가
6. **Key**와 **Value**를 정확히 복사
7. **Environment**는 **Production, Preview, Development 모두 선택** (또는 **"All"** 선택)
8. **Save** 버튼 클릭
9. 모든 환경변수 추가 후 **Redeploy** 실행

### 상세 가이드
- 📖 **단계별 상세 가이드**: `Vercel_환경변수_설정_상세_가이드.md` 파일 참조

---

## 1. 필수 환경변수 (반드시 설정)

### 데이터베이스
```
Key: DATABASE_URL
Value: (실제 데이터베이스 URL - PostgreSQL)
Environment: Production, Preview, Development
```

### 기본 URL
```
Key: NEXT_PUBLIC_BASE_URL
Value: https://www.cruisedot.co.kr
Environment: Production, Preview, Development
```

---

## 2. 페이앱 결제 (실제 값)

```
Key: PAYAPP_USERID
Value: hyeseon28
Environment: Production, Preview, Development
```

```
Key: PAYAPP_LINKKEY
Value: CPe1Qyvoll6bPRHfd5pTZO1DPJnCCRVaOgT+oqg6zaM=
Environment: Production, Preview, Development
```

```
Key: PAYAPP_LINKVAL
Value: CPe1Qyvoll6bPRHfd5pTZJKhziNbvfVO9tbzpmrIe6s=
Environment: Production, Preview, Development
```

---

## 3. 웰컴페이먼츠 결제

**⚠️ 주의**: 아래 값들은 실제 웰컴페이먼츠 관리자 페이지에서 확인한 값으로 교체해야 합니다.

### 인증 결제
```
Key: PG_SIGNKEY
Value: (웰컴페이먼츠에서 발급받은 실제 값)
Environment: Production, Preview, Development
```

```
Key: PG_MID_AUTH
Value: (웰컴페이먼츠에서 발급받은 실제 값)
Environment: Production, Preview, Development
```

```
Key: PG_FIELD_ENCRYPT_IV
Value: (웰컴페이먼츠에서 발급받은 실제 값)
Environment: Production, Preview, Development
```

```
Key: PG_FIELD_ENCRYPT_KEY
Value: (웰컴페이먼츠에서 발급받은 실제 값)
Environment: Production, Preview, Development
```

### 비인증 결제
```
Key: PG_SIGNKEY_NON_AUTH
Value: (웰컴페이먼츠에서 발급받은 실제 값)
Environment: Production, Preview, Development
```

```
Key: PG_MID_NON_AUTH
Value: (웰컴페이먼츠에서 발급받은 실제 값)
Environment: Production, Preview, Development
```

```
Key: PG_FIELD_ENCRYPT_IV_NON_AUTH
Value: (웰컴페이먼츠에서 발급받은 실제 값)
Environment: Production, Preview, Development
```

```
Key: PG_FIELD_ENCRYPT_KEY_NON_AUTH
Value: (웰컴페이먼츠에서 발급받은 실제 값)
Environment: Production, Preview, Development
```

### 웰컴페이먼츠 URL
```
Key: NEXT_PUBLIC_WELCOME_PAY_URL
Value: https://pay.welcomepayments.co.kr/payment
Environment: Production, Preview, Development
```

```
Key: WELCOME_PAY_URL
Value: https://pay.welcomepayments.co.kr/payment
Environment: Production, Preview, Development
```

---

## 4. Gemini AI

**⚠️ 주의**: 아래 값은 Google AI Studio에서 발급받은 실제 API 키로 교체해야 합니다.

```
Key: GEMINI_API_KEY
Value: (Google AI Studio에서 발급받은 실제 API 키)
Environment: Production, Preview, Development
```

**선택사항**:
```
Key: GEMINI_MODEL
Value: gemini-flash-latest
Environment: Production, Preview, Development
```

---

## 5. Google Drive 서비스 (실제 값)

### 서비스 계정 이메일
```
Key: GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
Value: cruisedot@cruisedot-478810.iam.gserviceaccount.com
Environment: Production, Preview, Development
```

또는 (대체 옵션):
```
Key: GOOGLE_SERVICE_ACCOUNT_EMAIL
Value: cruisedot@cruisedot-478810.iam.gserviceaccount.com
Environment: Production, Preview, Development
```

### 서비스 계정 Private Key

**⚠️ 중요**: Private Key는 JSON 키 파일에서 `private_key` 값을 그대로 복사해야 합니다.

```
Key: GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
Value: -----BEGIN PRIVATE KEY-----
(여기에 실제 Private Key 전체 내용을 붙여넣기)
-----END PRIVATE KEY-----
Environment: Production, Preview, Development
```

**참고**: 
- JSON 키 파일 위치: `.backup/google-drive-keys/cruisedot-478810-20bf2e8f57dd.json`
- `private_key` 필드의 값을 그대로 복사 (줄바꿈 포함)
- Vercel에서는 여러 줄 입력 시 자동으로 처리됨

또는 (대체 옵션):
```
Key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
Value: (위와 동일한 Private Key)
Environment: Production, Preview, Development
```

### Google Drive 폴더 ID (실제 값)

```
Key: GOOGLE_DRIVE_SHARED_DRIVE_ID
Value: 0AJVz1C-KYWR0Uk9PVA
Environment: Production, Preview, Development
```

```
Key: GOOGLE_DRIVE_ROOT_FOLDER_ID
Value: 0AJVz1C-KYWR0Uk9PVA
Environment: Production, Preview, Development
```

```
Key: GOOGLE_DRIVE_PRODUCTS_FOLDER_ID
Value: 18YuEBt313yyKI3F7PSzjFFRF3Af-bVPH
Environment: Production, Preview, Development
```

**선택사항** (기본값 사용 시 생략 가능):
```
Key: GOOGLE_DRIVE_PASSPORT_FOLDER_ID
Value: (필요 시 설정)
Environment: Production, Preview, Development
```

```
Key: GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID
Value: (필요 시 설정)
Environment: Production, Preview, Development
```

```
Key: GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID
Value: (필요 시 설정)
Environment: Production, Preview, Development
```

```
Key: GOOGLE_DRIVE_AUDIO_FOLDER_ID
Value: (필요 시 설정)
Environment: Production, Preview, Development
```

---

## 6. 이메일 발송

**⚠️ 주의**: 아래 값들은 실제 이메일 계정 정보로 교체해야 합니다.

### SMTP 계정 (우선순위 순)

**방법 1 (권장)**:
```
Key: EMAIL_USER
Value: (실제 Gmail 주소, 예: your-email@gmail.com)
Environment: Production, Preview, Development
```

```
Key: EMAIL_PASS
Value: (Gmail 앱 비밀번호)
Environment: Production, Preview, Development
```

**방법 2 (대체)**:
```
Key: EMAIL_SMTP_USER
Value: (실제 Gmail 주소)
Environment: Production, Preview, Development
```

```
Key: EMAIL_SMTP_PASSWORD
Value: (Gmail 앱 비밀번호)
Environment: Production, Preview, Development
```

### SMTP 서버 설정 (선택사항, 기본값 사용 시 생략 가능)

```
Key: EMAIL_SMTP_HOST
Value: smtp.gmail.com
Environment: Production, Preview, Development
```

```
Key: EMAIL_SMTP_PORT
Value: 587
Environment: Production, Preview, Development
```

```
Key: EMAIL_FROM_ADDRESS
Value: noreply@cruisedot.com
Environment: Production, Preview, Development
```

### 관리자 이메일 (실제 값)

```
Key: HEAD_OFFICE_EMAIL
Value: hyeseon28@gmail.com
Environment: Production, Preview, Development
```

또는 (대체 옵션):
```
Key: ADMIN_EMAIL
Value: hyeseon28@gmail.com
Environment: Production, Preview, Development
```

---

## 7. 기타 서비스

### YouTube API (실제 값)

**⚠️ 주의**: YouTube 기능 사용 시에만 필요합니다.

```
Key: YOUTUBE_API_KEY
Value: AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM
Environment: Production, Preview, Development
```

**실제 값**: `AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM` (이미 설정된 값)

### WeatherAPI.com (실제 값) ⭐ 새로 추가

**⚠️ 주의**: 지니 브리핑 14일 날씨 예보 기능 사용 시 필요합니다.

```
Key: WEATHER_API_KEY
Value: 8cf954892eb9405681b63201252611
Environment: Production, Preview, Development
```

**실제 값**: `8cf954892eb9405681b63201252611` (이미 설정된 값)
**용도**: 14일 날씨 예보 제공 (100명까지 무료)

### OpenWeather API (선택사항)

**⚠️ 주의**: 커뮤니티 봇 날씨 기능 사용 시에만 필요합니다.

```
Key: OPENWEATHER_API_KEY
Value: (OpenWeather에서 발급받은 실제 API 키)
Environment: Production, Preview, Development
```

**참고**: 현재 프로젝트에서 실제 값이 확인되지 않았습니다. OpenWeather 사이트에서 발급받아야 합니다.

**📖 상세 가이드**: `OPENWEATHER_API_KEY_발급_가이드.md` 파일 참조
- OpenWeather 계정 생성 방법
- API 키 발급 단계별 가이드
- Vercel 설정 방법
- 테스트 방법

### 카카오톡 (실제 값)

**⚠️ 주의**: 카카오톡 로그인/채널 기능 사용 시에만 필요합니다.

```
Key: NEXT_PUBLIC_KAKAO_JS_KEY
Value: e4d764f905271796dccf37c55a5b84d7
Environment: Production, Preview, Development
```

**실제 값**: `e4d764f905271796dccf37c55a5b84d7` (이미 설정된 값)

```
Key: NEXT_PUBLIC_KAKAO_CHANNEL_ID
Value: CzxgPn
Environment: Production, Preview, Development
```

**실제 값**: `CzxgPn` (이미 설정된 값)

### 소켓 서버 (기본값)

**⚠️ 주의**: 비디오 컨퍼런스 기능 사용 시에만 필요합니다.

```
Key: NEXT_PUBLIC_SOCKET_URL
Value: http://localhost:3001
Environment: Production, Preview, Development
```

**기본값**: `http://localhost:3001` (코드에서 사용하는 기본값)
**참고**: 프로덕션에서는 실제 소켓 서버 URL로 변경 필요

### Cron 작업 보안 (선택사항)

**⚠️ 주의**: 커뮤니티 봇 등 Cron 작업 사용 시에만 필요합니다.

```
Key: CRON_SECRET
Value: (강력한 랜덤 문자열)
Environment: Production, Preview, Development
```

**기본값**: 코드에서 `your-secret-key-here` 사용 (실제 값은 별도 설정 필요)
**참고**: 보안을 위해 강력한 랜덤 문자열로 설정해야 합니다.

**📖 상세 가이드**: `CRON_SECRET_생성_가이드.md` 파일 참조
- 랜덤 문자열 생성 방법 (온라인/터미널/Node.js)
- Vercel 설정 방법
- 테스트 방법
- 보안 주의사항

---

## 8. 빠른 복사용 전체 목록

### 필수 (반드시 설정)
- `DATABASE_URL` = (실제 데이터베이스 URL)
- `NEXT_PUBLIC_BASE_URL` = `https://www.cruisedot.co.kr`

### 페이앱 (실제 값 그대로 복사)
- `PAYAPP_USERID` = `hyeseon28`
- `PAYAPP_LINKKEY` = `CPe1Qyvoll6bPRHfd5pTZO1DPJnCCRVaOgT+oqg6zaM=`
- `PAYAPP_LINKVAL` = `CPe1Qyvoll6bPRHfd5pTZJKhziNbvfVO9tbzpmrIe6s=`

### 웰컴페이먼츠 (실제 값으로 교체 필요)
- `PG_SIGNKEY` = (실제 값)
- `PG_MID_AUTH` = (실제 값)
- `PG_FIELD_ENCRYPT_IV` = (실제 값)
- `PG_FIELD_ENCRYPT_KEY` = (실제 값)
- `PG_SIGNKEY_NON_AUTH` = (실제 값)
- `PG_MID_NON_AUTH` = (실제 값)
- `PG_FIELD_ENCRYPT_IV_NON_AUTH` = (실제 값)
- `PG_FIELD_ENCRYPT_KEY_NON_AUTH` = (실제 값)
- `NEXT_PUBLIC_WELCOME_PAY_URL` = `https://pay.welcomepayments.co.kr/payment`
- `WELCOME_PAY_URL` = `https://pay.welcomepayments.co.kr/payment`

### Gemini AI (실제 값으로 교체 필요)
- `GEMINI_API_KEY` = (실제 API 키)

### Google Drive (실제 값 그대로 복사)
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` = `cruisedot@cruisedot-478810.iam.gserviceaccount.com`
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` = (JSON 키 파일의 private_key 값)
- `GOOGLE_DRIVE_SHARED_DRIVE_ID` = `0AJVz1C-KYWR0Uk9PVA`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` = `0AJVz1C-KYWR0Uk9PVA`
- `GOOGLE_DRIVE_PRODUCTS_FOLDER_ID` = `18YuEBt313yyKI3F7PSzjFFRF3Af-bVPH`

### 이메일 (실제 값으로 교체 필요)
- `EMAIL_USER` = (실제 Gmail 주소)
- `EMAIL_PASS` = (Gmail 앱 비밀번호)
- `HEAD_OFFICE_EMAIL` = `hyeseon28@gmail.com`

### 기타 (실제 값 확인 완료)
- `WEATHER_API_KEY` = `8cf954892eb9405681b63201252611` ✅ (실제 값) ⭐ 새로 추가
- `YOUTUBE_API_KEY` = `AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM` ✅ (실제 값)
- `OPENWEATHER_API_KEY` = (OpenWeather에서 발급 필요)
- `NEXT_PUBLIC_KAKAO_JS_KEY` = `e4d764f905271796dccf37c55a5b84d7` ✅ (실제 값)
- `NEXT_PUBLIC_KAKAO_CHANNEL_ID` = `CzxgPn` ✅ (실제 값)
- `NEXT_PUBLIC_SOCKET_URL` = `http://localhost:3001` (기본값, 프로덕션에서는 변경 필요)
- `CRON_SECRET` = (강력한 랜덤 문자열로 별도 설정 필요)

---

## 9. 설정 완료 후 확인

1. ✅ 모든 환경변수 추가 완료
2. ✅ Production, Preview, Development 모두 선택 확인
3. ✅ **Redeploy** 실행
4. ✅ 배포 완료 후 기능 테스트

---

## 10. 실제 값 확인 방법

### 페이앱
- PayApp 판매자 사이트: https://www.payapp.kr
- 설정 → 연동정보

### 웰컴페이먼츠
- 웰컴페이먼츠 관리자 페이지
- 연동 정보 확인

### Gemini API
- Google AI Studio: https://aistudio.google.com
- Get API Key

### Google Drive Private Key
- JSON 키 파일: `.backup/google-drive-keys/cruisedot-478810-20bf2e8f57dd.json`
- `private_key` 필드 값 복사

### Gmail 앱 비밀번호
- Google 계정 관리: https://myaccount.google.com
- 보안 → 2단계 인증 → 앱 비밀번호

---

**모든 환경변수 설정 후 반드시 Redeploy를 실행하세요!** 🚀

