# ✅ 배포 전 최종 체크리스트

**작성일**: 2025-11-23  
**배포 플랫폼**: Vercel

---

## 🔴 필수 작업 (배포 전 반드시 완료)

### 1. 환경 변수 설정 (Vercel 대시보드)

Vercel 프로젝트 → Settings → Environment Variables에서 다음 변수들을 설정:

#### 데이터베이스
- [ ] `DATABASE_URL` - PostgreSQL 연결 문자열

#### 인증
- [ ] `NEXTAUTH_SECRET` - NextAuth 비밀키 (랜덤 문자열)
- [ ] `NEXTAUTH_URL` - 프로덕션 도메인 (예: `https://your-domain.com`)

#### 구글 드라이브 (자동 백업)
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL` - `cruisedot@cruisedot-478810.iam.gserviceaccount.com`
- [ ] `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` - 서비스 계정 개인키 (전체, 줄바꿈 포함)
- [ ] `GOOGLE_DRIVE_SHARED_DRIVE_ID` - `0AJVz1C-KYWR0Uk9PVA`

#### Cron Job 보안
- [ ] `CRON_SECRET` - Cron job 인증용 비밀키 (랜덤 문자열)

#### 기타 필수
- [ ] `NEXT_PUBLIC_BASE_URL` - 프로덕션 도메인
- [ ] 기타 API 키들 (OpenAI, Google 등)

### 2. 빌드 테스트

로컬에서 빌드 성공 확인:
```bash
npm run build
```

- [ ] 빌드 성공 확인
- [ ] `.next` 폴더 생성 확인
- [ ] 빌드 에러 없음 확인

### 3. 데이터베이스 준비

- [ ] 프로덕션 데이터베이스 연결 확인
- [ ] 데이터베이스 백업 완료
- [ ] Prisma 마이그레이션 준비 완료

### 4. 코드 커밋 및 푸시

- [ ] 모든 변경사항 커밋
- [ ] GitHub/GitLab에 푸시 완료
- [ ] `.env` 파일은 커밋하지 않았는지 확인

---

## 🟡 권장 작업 (배포 전 확인)

### 5. 핵심 기능 테스트 (배포 후 즉시)

배포 후 다음 기능들을 테스트:

- [ ] 로그인/로그아웃
- [ ] 관리자 패널 접근
- [ ] 계약서 완료 → 구글 드라이브 백업 확인
- [ ] 수당 보고서 엑셀 다운로드
- [ ] APIS 엑셀 다운로드
- [ ] 지급명세서 생성 및 발송
- [ ] 여권 만료 알람 표시

### 6. 모니터링 설정

- [ ] Vercel 대시보드 접근 권한 확인
- [ ] 에러 로그 모니터링 방법 확인
- [ ] 성능 메트릭 확인 방법 확인

---

## 🟢 배포 후 확인

### 즉시 확인 (배포 직후 1시간)

- [ ] 사이트 접속 확인
- [ ] 로그인/로그아웃 작동 확인
- [ ] 주요 페이지 로딩 확인
- [ ] Vercel 대시보드에서 에러 로그 확인
- [ ] Cron job 설정 확인 (Vercel 대시보드 → Settings → Cron Jobs)

### 24시간 후 확인

- [ ] 구글 드라이브 자동 백업 작동 확인
- [ ] 사용자 피드백 수집
- [ ] 에러 발생률 확인
- [ ] 성능 메트릭 확인

---

## 📝 배포 명령어

### Vercel CLI 사용

```bash
# Vercel CLI 설치 (없는 경우)
npm i -g vercel

# 로그인
vercel login

# 프로덕션 배포
vercel --prod
```

### Git 연동 (권장)

1. GitHub/GitLab에 코드 푸시
2. Vercel 대시보드에서 프로젝트 연결
3. 자동 배포 설정 (main 브랜치 푸시 시 자동 배포)

---

## ⚠️ 문제 해결

### 빌드 실패
1. Vercel 대시보드에서 빌드 로그 확인
2. 환경 변수 누락 확인
3. 로컬에서 `npm run build` 재시도

### 데이터베이스 연결 실패
1. `DATABASE_URL` 환경 변수 확인
2. 데이터베이스 접근 권한 확인
3. Vercel의 IP 화이트리스트 확인 (필요한 경우)

### Cron Job 작동 안 함
1. Vercel Cron Jobs 설정 확인 (Settings → Cron Jobs)
2. `CRON_SECRET` 환경 변수 확인
3. API 엔드포인트가 올바르게 구현되었는지 확인
4. Vercel 대시보드에서 cron 실행 로그 확인

---

## ✅ 체크리스트 요약

### 배포 전 필수
- [ ] 환경 변수 설정 완료
- [ ] 빌드 테스트 성공
- [ ] 데이터베이스 준비 완료
- [ ] 코드 커밋 및 푸시 완료

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

**모든 체크리스트를 완료하면 배포 준비 완료!** 🚀
