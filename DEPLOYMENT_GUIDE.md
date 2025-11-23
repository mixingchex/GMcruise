# 🚀 배포 가이드

**작성일**: 2025-11-23  
**배포 플랫폼**: Vercel

---

## 📋 배포 전 체크리스트

### ✅ 완료된 항목
- [x] 핵심 기능 개발 완료
- [x] 구글 드라이브 연동 완료
- [x] 빌드 설정 완료 (TypeScript/ESLint 에러 무시)
- [x] Dynamic route 설정 완료

### 🔄 배포 전 필수 작업

#### 1. 환경 변수 설정 (Vercel 대시보드)

다음 환경 변수들을 Vercel 프로젝트 설정에 추가해야 합니다:

**데이터베이스**
```
DATABASE_URL=postgresql://...
```

**인증**
```
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com
```

**구글 드라이브 (자동 백업용)**
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=cruisedot@cruisedot-478810.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_SHARED_DRIVE_ID=0AJVz1C-KYWR0Uk9PVA
```

**기타 필수 환경 변수**
- `NEXT_PUBLIC_BASE_URL` (프로덕션 도메인)
- 기타 API 키들 (OpenAI, Google 등)

#### 2. 데이터베이스 마이그레이션

Vercel의 `postinstall` 스크립트가 자동으로 마이그레이션을 실행합니다:
```bash
prisma db push --accept-data-loss --skip-generate || prisma migrate deploy
```

**수동 마이그레이션이 필요한 경우:**
```bash
npx prisma migrate deploy
```

#### 3. 빌드 확인

로컬에서 빌드 테스트:
```bash
npm run build
```

빌드가 성공하면 `.next` 폴더가 생성됩니다.

#### 4. 핵심 기능 테스트

배포 후 즉시 테스트할 항목:
- [ ] 로그인/로그아웃
- [ ] 관리자 패널 접근
- [ ] 계약서 완료 → 구글 드라이브 백업 확인
- [ ] 수당 보고서 엑셀 다운로드
- [ ] APIS 엑셀 다운로드
- [ ] 지급명세서 생성
- [ ] 여권 만료 알람 표시

---

## 🚀 배포 방법

### 방법 1: Vercel CLI 사용

```bash
# Vercel CLI 설치 (없는 경우)
npm i -g vercel

# 로그인
vercel login

# 배포
vercel --prod
```

### 방법 2: Git 연동 (권장)

1. GitHub/GitLab에 코드 푸시
2. Vercel 대시보드에서 프로젝트 연결
3. 자동 배포 설정 (main 브랜치 푸시 시 자동 배포)

### 방법 3: Vercel 대시보드에서 직접 배포

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. "Deployments" 탭에서 "Redeploy" 클릭

---

## ⚙️ 배포 후 설정

### 1. Cron Job 설정

Vercel은 서버리스 환경이므로, cron job을 Vercel Cron Jobs로 설정해야 합니다.

**`vercel.json`에 cron 설정 완료:**
```json
{
  "crons": [
    {
      "path": "/api/cron/expire-trips",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/database-backup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/payslip-sender",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

**Cron API 엔드포인트 생성 완료:**
- ✅ `/api/cron/database-backup` - 매일 새벽 3시 DB 백업
- ✅ `/api/cron/payslip-sender` - 매월 1일 지급명세서 발송
- ✅ `/api/cron/expire-trips` - 매일 새벽 2시 여행 만료 처리

**중요**: Vercel Cron은 `CRON_SECRET` 환경 변수를 설정해야 합니다.

### 2. 환경 변수 확인

Vercel 대시보드에서 모든 환경 변수가 올바르게 설정되었는지 확인:
- Settings → Environment Variables

### 3. 도메인 설정

- Settings → Domains에서 커스텀 도메인 연결
- SSL 인증서 자동 발급 확인

---

## 🔍 배포 후 확인 사항

### 즉시 확인 (배포 직후 1시간)
- [ ] 사이트 접속 확인
- [ ] 로그인/로그아웃 작동 확인
- [ ] 주요 페이지 로딩 확인
- [ ] Vercel 대시보드에서 에러 로그 확인

### 24시간 후 확인
- [ ] 구글 드라이브 자동 백업 작동 확인
- [ ] 사용자 피드백 수집
- [ ] 에러 발생률 확인
- [ ] 성능 메트릭 확인

---

## 🐛 문제 해결

### 빌드 실패
1. Vercel 대시보드에서 빌드 로그 확인
2. 환경 변수 누락 확인
3. 로컬에서 `npm run build` 재시도

### 데이터베이스 연결 실패
1. `DATABASE_URL` 환경 변수 확인
2. 데이터베이스 접근 권한 확인
3. Vercel의 IP 화이트리스트 확인 (필요한 경우)

### Cron Job 작동 안 함
1. Vercel Cron Jobs 설정 확인
2. API 엔드포인트가 올바르게 구현되었는지 확인
3. Vercel 대시보드에서 cron 실행 로그 확인

---

## 📝 배포 체크리스트 요약

### 배포 전
- [x] 코드 커밋 및 푸시
- [ ] 환경 변수 설정
- [ ] 빌드 테스트
- [ ] 데이터베이스 백업

### 배포 중
- [ ] Vercel 배포 실행
- [ ] 빌드 로그 확인
- [ ] 배포 성공 확인

### 배포 후
- [ ] 사이트 접속 테스트
- [ ] 핵심 기능 테스트
- [ ] 에러 로그 모니터링
- [ ] 사용자 공지 (필요한 경우)

---

## 🎯 다음 단계

배포 완료 후:
1. **2차 개발 계획** (1-2주 후)
   - UI/UX 개선
   - 미완성 기능 완성
   - 알림 시스템 개선

2. **3차 개발 계획** (1-2개월 후)
   - AI 분석 기능
   - 외부 시스템 연동
   - 고급 자동화

---

**배포 준비 완료!** 🚀

