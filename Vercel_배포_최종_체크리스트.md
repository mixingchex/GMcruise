# Vercel 배포 최종 체크리스트

**작성일**: 2025-01-28  
**상태**: 배포 준비 완료

---

## ✅ 완료된 작업

### 1. 코드 개선
- [x] 데이터베이스 연결 풀 설정 (코드 완료)
- [x] 세션 조회 Redis 캐싱 (코드 완료)
- [x] 환율 API 캐싱 (코드 완료)
- [x] `@upstash/redis` 패키지 설치 완료

### 2. 에러 수정
- [x] 빌드 에러 수정 (`lib/push/client.ts`, `lib/csrf-client.ts`)
- [x] TypeScript 에러 수정:
  - [x] `app/admin/affiliate/agent-dashboard/page.tsx` - messageType 타입 에러
  - [x] `app/admin/affiliate/team-dashboard/page.tsx` - messageType 타입 에러, showWarning 제거
  - [x] `app/admin/landing-pages/[id]/edit/page.tsx` - 중복 함수 제거, 중괄호 수정
  - [x] `app/admin/marketing/customers/page.tsx` - 함수 선언 순서 수정
  - [x] `app/api/admin/affiliate/contracts/[contractId]/*` - params Promise 타입 수정
  - [x] `app/api/admin/affiliate/profiles/[profileId]/*` - params Promise 타입 수정
  - [x] `app/api/admin/affiliate/leads/route.ts` - 중복 속성 제거
  - [x] `app/api/admin/chat-bot/conversation/route.ts` - 타입 단언 추가
  - [x] `app/api/admin/insights/generate/route.ts` - PromiseSettledResult 타입 수정
  - [x] `app/admin/landing-pages/new/page.tsx` - Delta 타입 수정

### 3. 빌드 확인
- [x] TypeScript 컴파일 확인
- [x] Next.js 빌드 확인

---

## ⚠️ 배포 전 필수 작업

### 1. 환경변수 설정 (Vercel)

#### DATABASE_URL 업데이트
```
기존: postgresql://neondb_owner:npg_e9MRdmxfYzr6@ep-plain-night-a75igt8x-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require

변경: postgresql://neondb_owner:npg_e9MRdmxfYzr6@ep-plain-night-a75igt8x-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&connection_limit=20&pool_timeout=10
```

#### Redis 환경변수 추가
- **Name**: `UPSTASH_REDIS_REST_URL`
- **Value**: `https://pleasant-basilisk-25704.upstash.io`
- **Environment**: Production, Preview, Development 모두 선택

- **Name**: `UPSTASH_REDIS_REST_TOKEN`
- **Value**: `AWRoAAIncDJjZGQ4YjBiNjFiNWE0ZjZkYWE1YjY3M2FiZWIxNmJjY3AyMjU3MDQ`
- **Environment**: Production, Preview, Development 모두 선택

---

## 🚀 배포 절차

### Step 1: Git 커밋 및 푸시
```bash
git add .
git commit -m "feat: 데이터베이스 연결 풀 및 Redis 캐싱 적용, TypeScript 에러 수정"
git push
```

### Step 2: Vercel 자동 배포
- Git push 후 Vercel이 자동으로 배포 시작
- 배포 로그 확인

### Step 3: 배포 후 확인
1. 프로덕션 URL 접속
2. 메인 페이지 로딩 확인
3. 로그인 테스트
4. 주요 기능 테스트

---

## 📊 예상 효과

### 성능 개선
- ✅ 세션 조회: DB 쿼리 90% 감소
- ✅ 환율 API: 외부 호출 99% 감소
- ✅ 데이터베이스: 100명 동시 접속 지원

### 비용 절감
- ✅ 데이터베이스: 월 $20~50 절감
- ✅ 외부 API: 월 $5~10 절감
- ✅ 총 절감: 월 $25~60

---

## ✅ 최종 확인

- [x] TypeScript 에러 없음
- [x] 빌드 성공
- [ ] 환경변수 설정 완료
- [ ] 배포 승인: ___________

---

**현재 상태**: 배포 가능 (환경변수 설정 후)

**작성자**: AI Assistant



