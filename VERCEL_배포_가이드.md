# Vercel 배포 가이드 🚀

## 📋 배포 전 체크리스트

- [✅] 빌드 성공 확인 (npm run build)
- [✅] 모든 기능 테스트 완료
- [✅] 샘플 데이터 준비 완료
- [ ] Vercel 계정 준비
- [ ] GitHub 레포지토리 푸시
- [ ] 환경변수 준비

---

## 🔧 1단계: GitHub에 코드 푸시

### 현재 변경사항 확인
```bash
git status
```

### 변경사항 커밋 및 푸시
```bash
# 모든 변경사항 추가
git add .

# 커밋 메시지 작성
git commit -m "배포 준비 완료: 정액제 시스템, 샘플 상품, PG 차단 기능 추가

- 정액제 계약서 내용 수정 (제1조, 제6조, 제9조)
- 샘플 크루즈 상품 9개 추가 (롯데JTB, 크루즈닷, 더블유)
- 무료체험 사용자 PG 결제 차단 기능 구현
- isValidMobilePhone 함수 추가 및 빌드 경고 해결
- 최종 배포 점검 리포트 작성

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 푸시
git push origin main
```

---

## 🌐 2단계: Vercel 배포

### Option A: Vercel CLI 사용 (추천)

1. **Vercel CLI 설치**
```bash
npm install -g vercel
```

2. **로그인**
```bash
vercel login
```

3. **배포 실행**
```bash
# 프로덕션 배포
vercel --prod
```

### Option B: Vercel 웹사이트 사용

1. https://vercel.com 접속
2. "Add New Project" 클릭
3. GitHub 레포지토리 연결
4. `cruise-guide` 레포지토리 선택
5. 환경변수 설정 (아래 참조)
6. "Deploy" 클릭

---

## 🔐 3단계: 환경변수 설정

Vercel 프로젝트 설정에서 다음 환경변수를 추가하세요:

### 필수 환경변수

```bash
# 데이터베이스 (Vercel Postgres 또는 외부 DB)
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# 세션 암호화
SESSION_SECRET="your-super-secret-key-at-least-32-chars-long"

# 기본 URL
NEXT_PUBLIC_BASE_URL="https://your-domain.vercel.app"

# Google Sheets (무료체험 데이터)
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_TRIAL_SHEET_ID="your-google-sheet-id"

# PG 결제 (웰컴페이먼츠) - 인증 결제
PG_MID_AUTH="your-merchant-id"
PG_SIGNKEY="your-signkey"
PG_FIELD_ENCRYPT_IV="your-encrypt-iv"
PG_FIELD_ENCRYPT_KEY="your-encrypt-key"

# PG 결제 - 비인증 결제 (선택사항)
PG_MID_NON_AUTH="your-non-auth-mid"
PG_SIGNKEY_NON_AUTH="your-non-auth-signkey"
PG_FIELD_ENCRYPT_IV_NON_AUTH="your-non-auth-iv"
PG_FIELD_ENCRYPT_KEY_NON_AUTH="your-non-auth-key"

# 웰컴페이먼츠 결제 URL
NEXT_PUBLIC_WELCOME_PAY_URL="https://payment.welcomepayments.co.kr/pay"
WELCOME_PAY_URL="https://payment.welcomepayments.co.kr/pay"
```

### 선택적 환경변수

```bash
# 관리자 이메일
ADMIN_EMAIL="admin@example.com"

# 이메일 전송 (계약서 PDF)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# AWS S3 (파일 업로드)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-northeast-2"
AWS_BUCKET_NAME="your-bucket-name"
```

---

## 🗄️ 4단계: 데이터베이스 설정

### Option A: Vercel Postgres (추천)

1. Vercel 프로젝트 대시보드에서 "Storage" 탭 클릭
2. "Create Database" → "Postgres" 선택
3. 데이터베이스 생성
4. 환경변수 자동 설정됨 (DATABASE_URL)

### Option B: 외부 PostgreSQL

Supabase, Railway, Neon 등의 PostgreSQL 서비스 사용 가능

1. PostgreSQL 데이터베이스 생성
2. CONNECTION_STRING 복사
3. Vercel 환경변수에 `DATABASE_URL` 설정

### 데이터베이스 마이그레이션

배포 후 Vercel 대시보드에서:

```bash
# Vercel 프로젝트 터미널에서 실행
npx prisma migrate deploy
```

또는 로컬에서:

```bash
# .env에 프로덕션 DATABASE_URL 설정 후
npx prisma migrate deploy
```

---

## 📊 5단계: 샘플 데이터 추가 (배포 후)

배포가 완료되면 샘플 크루즈 상품을 추가하세요:

### Vercel 프로젝트 터미널에서:

```bash
npx tsx scripts/add-sample-products.ts
```

또는 로컬에서 프로덕션 DB에:

```bash
# .env에 프로덕션 DATABASE_URL 설정
DATABASE_URL="프로덕션-DB-URL" npx tsx scripts/add-sample-products.ts
```

---

## ✅ 6단계: 배포 확인

### 배포 완료 후 확인 사항

1. **홈페이지 접속**
   - https://your-domain.vercel.app

2. **크루즈가이드 지니 테스트**
   - 채팅봇 대화 테스트
   - AI 추천 기능 확인

3. **크루즈몰 테스트**
   - 상품 목록 확인 (9개 샘플 상품)
   - 상품 상세 페이지 확인
   - 장바구니 기능 확인

4. **정액제 무료체험 테스트**
   - `/subscription/login` 접속
   - 무료체험 신청
   - 7일 카운트다운 확인
   - PG 결제 차단 확인 ⚠️

5. **파트너 로그인 테스트**
   - `/partner` 접속
   - 판매원 대시보드 확인
   - 고객 목록 확인

6. **관리자 패널 테스트**
   - `/admin/login` 접속
   - 상품 관리 확인
   - 계약서 관리 확인

---

## 🔧 문제 해결

### 빌드 실패 시

1. Vercel 빌드 로그 확인
2. 환경변수 누락 확인
3. Node.js 버전 확인 (권장: 18.x 이상)

### 데이터베이스 연결 실패 시

1. `DATABASE_URL` 환경변수 확인
2. 데이터베이스 방화벽 설정 확인 (Vercel IP 허용)
3. SSL 연결 설정 확인

### PG 결제 오류 시

1. PG 환경변수 모두 설정되었는지 확인
2. 웰컴페이먼츠 테스트 모드 사용 확인
3. 결제 URL이 올바른지 확인

---

## 📝 배포 후 할 일

### 즉시
1. [x] 샘플 상품 9개 추가
2. [ ] 관리자 계정 생성
3. [ ] 테스트 파트너 계정 생성
4. [ ] 정액제 무료체험 테스트

### 1주일 내
1. [ ] Google Analytics 설정
2. [ ] Sentry 에러 모니터링 설정
3. [ ] 실제 PG 테스트 (소액 결제)
4. [ ] 커스텀 도메인 연결

### 지속적
1. [ ] 사용자 피드백 수집
2. [ ] 성능 모니터링
3. [ ] 보안 업데이트
4. [ ] 기능 개선

---

## 🎯 도메인 설정 (선택사항)

### 커스텀 도메인 연결

1. Vercel 프로젝트 → "Settings" → "Domains"
2. 도메인 입력 (예: cruiseguide.kr)
3. DNS 설정:
   - A 레코드: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`

4. SSL 인증서 자동 발급 (Let's Encrypt)

---

## 📞 지원

### 문제 발생 시

1. **Vercel 문서**: https://vercel.com/docs
2. **Next.js 문서**: https://nextjs.org/docs
3. **Prisma 문서**: https://www.prisma.io/docs
4. **GitHub Issues**: 프로젝트 레포지토리

---

## 🎉 축하합니다!

배포가 완료되었습니다! 🎊

**프로덕션 URL**: https://your-domain.vercel.app

이제 크루즈가이드 지니 서비스를 실제 사용자들에게 제공할 수 있습니다.

---

**작성일**: 2025-01-28
**버전**: 1.0
