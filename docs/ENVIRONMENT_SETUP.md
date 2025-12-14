# 환경 변수 설정 가이드

> 크루즈 가이드 프로젝트의 환경 변수 설정 가이드입니다.

## 📋 목차
1. [필수 환경 변수](#필수-환경-변수)
2. [선택적 환경 변수](#선택적-환경-변수)
3. [파트너 예약 메시지 시스템](#파트너-예약-메시지-시스템)
4. [파일 업로드 및 저장소](#파일-업로드-및-저장소)
5. [설정 방법](#설정-방법)

---

## 필수 환경 변수

### 데이터베이스 (Prisma)

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
DIRECT_URL="postgresql://user:password@host:5432/dbname"
```

**설명:**
- `DATABASE_URL`: Prisma가 사용하는 데이터베이스 연결 문자열
- `DIRECT_URL`: Connection pooling을 우회하는 직접 연결 (마이그레이션용)

**설정 위치:** `.env`

---

### 인증 시스템

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

**설명:**
- `NEXTAUTH_URL`: NextAuth.js가 사용하는 기본 URL
- `NEXTAUTH_SECRET`: 세션 암호화에 사용되는 비밀 키

**생성 방법:**
```bash
# NEXTAUTH_SECRET 생성
openssl rand -base64 32
```

**설정 위치:** `.env`

---

## 선택적 환경 변수

### 결제 시스템 (웰컴페이먼츠)

```env
NEXT_PUBLIC_WELCOME_PAY_URL="https://pay.welcomepayments.com/payment"
# 또는
WELCOME_PAY_URL="https://pay.welcomepayments.com/payment"
```

**설명:**
- 웰컴페이먼츠 결제 페이지 URL
- `NEXT_PUBLIC_` 접두사: 클라이언트에서 접근 가능
- 접두사 없음: 서버에서만 접근 가능

**설정 위치:** `.env.local` 또는 `.env`

---

## 파트너 예약 메시지 시스템

### Cron Job 인증

```env
CRON_SECRET="your-random-secret-key"
```

**설명:**
- 예약 메시지 자동 발송 Cron Job 인증 키
- Vercel Cron에서 호출 시 헤더로 전송되어 인증에 사용

**생성 방법:**
```bash
# 랜덤 시크릿 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**필수 여부:** 예약 메시지 기능 사용 시 **필수**

**설정 위치:** `.env`

---

### SMS 발송 서비스

```env
SMS_PROVIDER_API_KEY="your-sms-api-key"
SMS_PROVIDER_API_SECRET="your-sms-api-secret"
SMS_SENDER_PHONE="01012345678"
```

**설명:**
- SMS 발송 서비스 API 인증 정보
- 발신번호는 사전 등록 필요

**지원 서비스 (예시):**
- 알리고 (Aligo)
- 쿨메시지 (CoolSMS)
- 네이버 클라우드 SMS

**필수 여부:** SMS 예약 메시지 기능 사용 시 **필수**

**설정 위치:** `.env`

---

### 이메일 발송 서비스

```env
EMAIL_PROVIDER="smtp"
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_FROM_NAME="크루즈 가이드"

# SMTP 설정
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_SECURE="true"
```

**설명:**
- 이메일 발송 서비스 설정
- Gmail, SendGrid, AWS SES 등 지원

**Gmail 앱 비밀번호 생성:**
1. Google 계정 보안 설정
2. 2단계 인증 활성화
3. 앱 비밀번호 생성

**필수 여부:** 이메일 예약 메시지 기능 사용 시 **필수**

**설정 위치:** `.env`

---

### 카카오 알림톡 (선택)

```env
KAKAO_API_KEY="your-kakao-api-key"
KAKAO_SENDER_KEY="your-sender-key"
KAKAO_TEMPLATE_CODE="your-template-code"
```

**설명:**
- 카카오 비즈니스 API 인증 정보
- 알림톡 템플릿 사전 등록 필요

**필수 여부:** 선택 사항

**설정 위치:** `.env`

---

## 파일 업로드 및 저장소

### Google Drive 백업 (어필리에이트 계약서 음성 녹음)

```env
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL="your-service-account@project-id.iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_PARENT_FOLDER_ID="your-google-drive-folder-id"
```

**설명:**
- 어필리에이트 계약서 음성 녹음 파일을 Google Drive에 백업
- Service Account 방식 사용

**Google Drive API 설정 방법:**

1. **Google Cloud Console에서 프로젝트 생성**
   - https://console.cloud.google.com

2. **Google Drive API 활성화**
   - APIs & Services > Library
   - "Google Drive API" 검색 및 활성화

3. **Service Account 생성**
   - IAM & Admin > Service Accounts
   - Create Service Account
   - JSON 키 다운로드

4. **JSON 키에서 정보 추출**
   ```json
   {
     "client_email": "your-service-account@...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   }
   ```

5. **백업 폴더 생성 및 공유**
   - Google Drive에서 폴더 생성
   - Service Account 이메일과 폴더 공유 (편집자 권한)
   - 폴더 ID는 URL에서 확인: `https://drive.google.com/drive/folders/FOLDER_ID`

**필수 여부:** 음성 녹음 Google Drive 백업 기능 사용 시 **필수**

**설정 위치:** `.env`

**주의사항:**
- `private_key`는 `\n` 개행 문자를 포함해야 함
- 환경 변수에 설정 시 따옴표로 감싸기
- `.env` 파일에 설정 시 멀티라인 지원 여부 확인

---

## 설정 방법

### 1. 로컬 개발 환경

**.env 파일 생성**

```bash
# 프로젝트 루트에 .env 파일 생성
cp .env.example .env

# 에디터로 열어서 값 입력
nano .env
```

**.env 파일 구조**

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generated-secret"

# Cron (Scheduled Messages)
CRON_SECRET="your-cron-secret"

# SMS Provider (Optional)
SMS_PROVIDER_API_KEY="..."
SMS_PROVIDER_API_SECRET="..."

# Email Provider (Optional)
EMAIL_FROM="..."
SMTP_HOST="..."
SMTP_USER="..."
SMTP_PASSWORD="..."

# Google Drive Backup (Optional)
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL="..."
GOOGLE_DRIVE_PRIVATE_KEY="..."
GOOGLE_DRIVE_PARENT_FOLDER_ID="..."
```

---

### 2. Vercel 배포

**Vercel Dashboard에서 설정**

1. 프로젝트 선택
2. Settings > Environment Variables
3. 각 환경 변수 추가
   - **Name**: 변수 이름
   - **Value**: 변수 값
   - **Environment**: Production, Preview, Development 선택

**CLI로 설정**

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 환경 변수 추가
vercel env add CRON_SECRET
# 값 입력 후 환경 선택 (Production, Preview, Development)

# 환경 변수 확인
vercel env ls

# 환경 변수 pull (로컬 테스트용)
vercel env pull
```

**Cron Secret 설정**

Vercel Cron Job에서 자동으로 `CRON_SECRET` 헤더를 전송하도록 설정:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/send-scheduled-messages",
      "schedule": "* * * * *",
      "headers": {
        "x-cron-secret": "$CRON_SECRET"
      }
    }
  ]
}
```

---

## 환경별 설정 예시

### Development (개발)

```env
DATABASE_URL="postgresql://localhost:5432/cruise-dev"
NEXTAUTH_URL="http://localhost:3000"
CRON_SECRET="dev-secret-not-for-production"
```

### Staging (스테이징)

```env
DATABASE_URL="postgresql://staging-db:5432/cruise-staging"
NEXTAUTH_URL="https://staging.cruise-guide.com"
CRON_SECRET="staging-secret-abc123"
```

### Production (프로덕션)

```env
DATABASE_URL="postgresql://prod-db:5432/cruise-prod"
NEXTAUTH_URL="https://cruise-guide.com"
CRON_SECRET="prod-secret-xyz789-very-long-and-random"
```

---

## 보안 주의사항

### ⚠️ 절대 금지

- ❌ `.env` 파일을 Git에 커밋하지 마세요
- ❌ 환경 변수를 공개 저장소에 업로드하지 마세요
- ❌ 클라이언트 코드에서 서버 전용 환경 변수를 사용하지 마세요

### ✅ 권장 사항

- ✅ `.env.example` 파일로 필요한 환경 변수 목록 관리
- ✅ Production 환경에서는 강력한 시크릿 사용
- ✅ 시크릿은 정기적으로 교체
- ✅ 팀원과 환경 변수를 안전하게 공유 (1Password, LastPass 등 사용)

---

## 검증 방법

### 환경 변수 로드 확인

**서버 사이드에서 확인:**

```typescript
// app/api/test/env/route.ts
export async function GET() {
  return Response.json({
    hasDatabase: !!process.env.DATABASE_URL,
    hasNextAuth: !!process.env.NEXTAUTH_SECRET,
    hasCronSecret: !!process.env.CRON_SECRET,
    hasSMS: !!process.env.SMS_PROVIDER_API_KEY,
    hasEmail: !!process.env.SMTP_HOST,
  })
}
```

**로컬에서 테스트:**

```bash
# 서버 시작
pnpm dev

# API 호출
curl http://localhost:3000/api/test/env
```

---

## 문제 해결

### Prisma 마이그레이션 실패

```bash
# DATABASE_URL이 설정되었는지 확인
echo $DATABASE_URL

# 마이그레이션 재시도
pnpm prisma migrate deploy
```

### Cron Job 인증 실패

```bash
# CRON_SECRET이 일치하는지 확인
# Vercel Dashboard > Environment Variables > CRON_SECRET
# vercel.json의 headers.x-cron-secret과 동일해야 함
```

### 파일 업로드 실패

```bash
# Google Drive 설정 확인
# 1. Service Account Email이 올바른지
# 2. Private Key가 개행 문자를 포함하는지
# 3. 폴더가 Service Account와 공유되었는지
```

---

## 추가 리소스

- [Prisma 환경 변수](https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices)
- [NextAuth.js 설정](https://next-auth.js.org/configuration/options)
- [Vercel 환경 변수](https://vercel.com/docs/projects/environment-variables)
- [Google Drive API](https://developers.google.com/drive/api/guides/about-sdk)

---

**최종 업데이트**: 2025년 12월 14일
**작성자**: AI Assistant
