# Vercel 배포 가이드

## 📋 배포 전 체크리스트

### 1. 환경변수 설정 (Vercel 대시보드)

Vercel 프로젝트 설정 → Environment Variables에서 다음 환경변수를 설정하세요:

#### 필수 환경변수
```
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_DRIVE_CLIENT_ID=your_google_drive_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_drive_client_secret
DATABASE_URL=postgresql://user:password@host:port/database
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

#### 선택사항 환경변수
```
# 각 대리점장/판매원이 개별 설정하므로 선택사항
ALIGO_API_KEY=optional
ALIGO_SENDER_PHONE=optional
```

#### 환경별 설정
- **Production**: 프로덕션 환경변수 설정
- **Preview**: 프리뷰 환경변수 설정 (선택사항)
- **Development**: 개발 환경변수 설정 (선택사항)

### 2. 데이터베이스 인덱스 적용

배포 전에 프로덕션 데이터베이스에 성능 최적화 인덱스를 적용해야 합니다.

#### 방법 1: psql을 통한 직접 적용 (권장)

```bash
# 프로덕션 DB에 연결
psql $DATABASE_URL

# 인덱스 적용
\i prisma/migrations/add_dashboard_stats_indexes.sql

# 또는 직접 SQL 실행
```

#### 방법 2: Prisma Studio를 통한 적용

```bash
# Prisma Studio 실행
npx prisma studio

# SQL 탭에서 직접 실행
```

#### 적용할 인덱스 SQL

```sql
-- 대시보드 통계 쿼리 최적화를 위한 인덱스 추가
-- AffiliateLead 테이블
CREATE INDEX IF NOT EXISTS "idx_affiliate_lead_manager_created" 
ON "AffiliateLead"("managerId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_affiliate_lead_agent_created" 
ON "AffiliateLead"("agentId", "createdAt");

-- AffiliateSale 테이블
CREATE INDEX IF NOT EXISTS "idx_affiliate_sale_manager_created" 
ON "AffiliateSale"("managerId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_affiliate_sale_agent_created" 
ON "AffiliateSale"("agentId", "createdAt");
```

### 3. 로컬 빌드 테스트 (선택사항)

```bash
# 환경변수 확인
npm run check:env

# 빌드 테스트
npm run build
```

> **참고**: `next.config.mjs`에서 타입 에러를 무시하도록 설정되어 있어 빌드는 성공할 수 있지만, 타입 에러는 나중에 수정하는 것을 권장합니다.

### 4. Git 커밋 및 푸시

```bash
# 변경사항 커밋
git add .
git commit -m "배포 준비: 인덱스 추가, 페이지네이션 개선, 카카오톡 제거"

# 메인 브랜치에 푸시
git push origin main
```

## 🚀 배포 실행

### 방법 1: Git 푸시를 통한 자동 배포 (권장)

```bash
git push origin main
```

Vercel이 자동으로 감지하여 배포를 시작합니다.

### 방법 2: Vercel CLI를 통한 배포

```bash
# Vercel CLI 설치 (처음만)
npm i -g vercel

# 로그인
vercel login

# 프로덕션 배포
vercel --prod
```

## ✅ 배포 후 확인사항

### 1. 빌드 로그 확인

Vercel 대시보드 → Deployments → 최신 배포 → Build Logs 확인
- ✅ 빌드 성공 여부
- ✅ 환경변수 로드 확인
- ✅ Prisma Client 생성 확인

### 2. 애플리케이션 동작 확인

- [ ] 홈페이지 접속 확인
- [ ] 로그인 기능 확인
- [ ] 대리점장 대시보드 접속 확인
- [ ] 어필리에이트 기능 확인
- [ ] 고객 관리 기능 확인
- [ ] 구매 관리 기능 확인

### 3. 데이터베이스 연결 확인

- [ ] 대시보드 통계 로드 확인
- [ ] 고객 목록 조회 확인
- [ ] 예약 목록 조회 확인

### 4. API 기능 확인

- [ ] SMS 발송 기능 (알리고 API 개별 설정 필요)
- [ ] Google Drive 파일 업로드 확인
- [ ] Gemini API 동작 확인

### 5. 성능 확인

- [ ] 대시보드 로딩 속도 확인 (인덱스 적용 효과)
- [ ] 구매고객 목록 페이지네이션 동작 확인
- [ ] 대량 데이터 조회 시 성능 확인

## 🔧 문제 해결

### 빌드 실패 시

1. **환경변수 누락**
   - Vercel 대시보드에서 환경변수 확인
   - `npm run check:env` 로컬에서 테스트

2. **Prisma Client 생성 실패**
   - `postinstall` 스크립트 확인
   - `vercel.json`의 `PRISMA_GENERATE_SKIP_AUTOINSTALL` 확인

3. **타입 에러**
   - `next.config.mjs`에서 `ignoreBuildErrors: true` 설정 확인
   - 배포 후 타입 에러 수정 권장

### 런타임 에러 시

1. **데이터베이스 연결 실패**
   - `DATABASE_URL` 확인
   - 데이터베이스 접근 권한 확인

2. **API 키 오류**
   - `GEMINI_API_KEY` 유효성 확인
   - `GOOGLE_DRIVE_CLIENT_ID/SECRET` 확인

3. **인덱스 미적용으로 인한 성능 저하**
   - 프로덕션 DB에 인덱스 적용 확인
   - `psql`로 인덱스 존재 여부 확인:
     ```sql
     \d+ "AffiliateLead"
     \d+ "AffiliateSale"
     ```

## 📝 배포 후 작업

### 1. 대리점장/판매원 알리고 설정 안내

각 대리점장과 판매원에게 다음 문서를 공유하세요:
- `docs/알리고_API_설정_가이드.md`

### 2. 모니터링 설정

- Vercel Analytics 활성화 (선택사항)
- 에러 로깅 설정 (Sentry 등, 선택사항)
- 성능 모니터링 설정 (선택사항)

### 3. 백업 설정 확인

- 데이터베이스 자동 백업 확인
- Vercel Cron Jobs 동작 확인:
  - `/api/cron/database-backup` (매일 03:00)
  - `/api/cron/expire-trips` (매일 05:00)
  - `/api/cron/payslip-sender` (매월 1일 03:00)
  - `/api/cron/community-bot` (매일 17:00)

## 🎯 성능 최적화 확인

배포 후 다음 사항들이 적용되었는지 확인:

1. ✅ **데이터베이스 인덱스**: 대시보드 통계 쿼리 최적화
2. ✅ **페이지네이션**: 구매고객 목록 페이지네이션 (50개씩)
3. ✅ **카카오톡 제거**: 유료 기능 제거로 비용 절감
4. ✅ **알리고 개별 설정**: 각 대리점장/판매원이 개별 API 키 사용

## 📞 지원

배포 중 문제가 발생하면:
1. Vercel 대시보드 로그 확인
2. 데이터베이스 로그 확인
3. 환경변수 재확인
4. 필요시 롤백 (Vercel 대시보드에서 이전 배포로 복구)

---

**마지막 업데이트**: 2025-01-28
**작성자**: AI Assistant



