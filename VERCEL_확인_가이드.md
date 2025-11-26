# Vercel 배포 확인 가이드

> **작성일**: 2025년 1월 28일  
> **목적**: Vercel 배포 상태 확인 및 모니터링

---

## 🌐 Vercel 대시보드 접속

### 브라우저 접속
1. **Vercel 대시보드**: https://vercel.com/dashboard
2. **로그인**: GitHub 계정으로 로그인 (권장)

### 프로젝트 찾기
- **프로젝트명**: cruise-guide (또는 GMcruise)
- **GitHub 저장소**: monicajeon28/GMcruise

---

## 📋 확인 사항

### 1. 배포 상태 확인

#### 대시보드에서 확인
1. **프로젝트 선택**: cruise-guide 프로젝트 클릭
2. **최신 배포 확인**:
   - ✅ **성공** (초록색) → 정상 배포 완료
   - ❌ **실패** (빨간색) → 빌드 로그 확인 필요
   - ⏳ **진행 중** (노란색) → 배포 대기 중

#### 배포 URL 확인
- 프로덕션 URL: `https://[프로젝트명].vercel.app`
- 프리뷰 URL: 각 배포마다 고유 URL 생성

---

### 2. 빌드 로그 확인

#### 확인 방법
1. **프로젝트** > **Deployments** 탭
2. **최신 배포** 클릭
3. **Build Logs** 탭 확인

#### 확인 사항
- ✅ 빌드 성공 여부
- ⚠️ 타입 에러 경고 (무시 설정됨)
- ⚠️ Prerender 경고 (동적 페이지이므로 정상)
- ✅ 환경 변수 로드 확인

---

### 3. 환경 변수 설정 확인

#### 확인 방법
1. **프로젝트** > **Settings** > **Environment Variables**
2. 다음 환경 변수가 설정되어 있는지 확인:

#### 필수 환경 변수
- [ ] `DATABASE_URL` - PostgreSQL 연결 문자열
- [ ] `GEMINI_API_KEY` - Google Gemini API 키
- [ ] `NEXT_PUBLIC_BASE_URL` - 기본 URL

#### 결제 시스템 (결제 기능 사용 시)
- [ ] `PG_SIGNKEY` / `PG_SIGNKEY_NON_AUTH`
- [ ] `PG_MID_AUTH` / `PG_MID_NON_AUTH`
- [ ] `PG_FIELD_ENCRYPT_IV` / `PG_FIELD_ENCRYPT_IV_NON_AUTH`
- [ ] `PG_FIELD_ENCRYPT_KEY` / `PG_FIELD_ENCRYPT_KEY_NON_AUTH`
- [ ] `NEXT_PUBLIC_WELCOME_PAY_URL` / `WELCOME_PAY_URL`

#### 구글 드라이브 백업 (자동 백업 사용 시)
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`
- [ ] `GOOGLE_DRIVE_SHARED_DRIVE_ID`

#### Cron Job 보안
- [ ] `CRON_SECRET` - Cron Job 인증 비밀 키

---

### 4. Cron Jobs 설정 확인

#### 확인 방법
1. **프로젝트** > **Settings** > **Cron Jobs**
2. 다음 Cron Job이 설정되어 있는지 확인:

#### 설정된 Cron Jobs
- [ ] `/api/cron/database-backup`: `0 3 * * *` (UTC 오전 3시 = KST 오전 12시)
- [ ] `/api/cron/expire-trips`: `0 5 * * *` (UTC 오전 5시 = KST 오전 2시)
- [ ] `/api/cron/payslip-sender`: `0 3 1 * *` (매월 1일 UTC 오전 3시 = KST 오전 12시)
- [ ] `/api/cron/community-bot`: `0 17 * * *` (UTC 오후 5시 = KST 오전 2시 다음날)

---

### 5. 에러 로그 확인

#### 확인 방법
1. **프로젝트** > **Logs** 탭
2. **최근 24시간** 로그 확인
3. **에러 필터링**: 에러 레벨만 확인

#### 확인 사항
- [ ] 에러 로그 없음 → ✅ 정상
- [ ] 에러 로그 있음 → 에러 내용 확인 및 수정 필요

---

## 🖥️ Vercel CLI 사용 (선택사항)

### CLI 설치 확인
```bash
vercel --version
```

### CLI 명령어

#### 로그인
```bash
vercel login
```

#### 프로젝트 목록 확인
```bash
vercel projects
```

#### 배포 목록 확인
```bash
vercel ls
```

#### 배포 상세 정보
```bash
vercel inspect [deployment-url]
```

#### 환경 변수 확인
```bash
vercel env ls
```

---

## 🔧 문제 해결

### 배포 실패 시
1. **빌드 로그 확인**: 에러 메시지 확인
2. **환경 변수 확인**: 필수 환경 변수 설정 여부 확인
3. **타입 에러 확인**: 필요 시 `ignoreBuildErrors: false`로 변경
4. **재배포 시도**: 수정 후 재배포

### 환경 변수 누락 시
1. **Vercel 대시보드** > **Settings** > **Environment Variables**
2. **필수 환경 변수 추가**
3. **재배포** (환경 변수 변경 후 자동 재배포 또는 수동 재배포)

### Cron Job 실행 안 됨
1. **Cron Job 설정 확인**: `vercel.json` 파일 확인
2. **CRON_SECRET 확인**: 환경 변수 설정 확인
3. **수동 실행 테스트**: API 엔드포인트 직접 호출

---

## ✅ 체크리스트

### 즉시 확인 (5분)
- [ ] Vercel 대시보드 접속
- [ ] 최신 배포 상태 확인
- [ ] 배포 URL 접속 확인

### 환경 변수 확인 (10분)
- [ ] 모든 필수 환경 변수 설정 확인
- [ ] 결제 관련 환경 변수 확인 (결제 기능 사용 시)
- [ ] 구글 드라이브 환경 변수 확인 (백업 사용 시)

### 기능 테스트 (15분)
- [ ] 배포된 사이트 접속
- [ ] 로그인 테스트
- [ ] 주요 기능 동작 확인

---

## 📝 참고 문서

- **모니터링 체크리스트**: `배포후_모니터링_체크리스트.md`
- **모니터링 요약**: `배포후_모니터링_요약.md`
- **배포 완료 리포트**: `배포_완료_최종_수정.md`

---

**작성자**: AI Assistant  
**상태**: Vercel 대시보드 확인 중  
**다음 단계**: 배포 상태 확인 및 환경 변수 설정 확인



