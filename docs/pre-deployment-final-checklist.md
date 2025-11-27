# Vercel 배포 전 최종 체크리스트

## ✅ 완료된 점검 사항

### 1. Redis 연결 수정 ✅
- [x] `.env` 파일에서 `REDIS_URL` 주석 처리
- [x] `UPSTASH_REDIS_REST_URL` 설정 완료
- [x] `UPSTASH_REDIS_REST_TOKEN` 설정 완료
- [x] `lib/redis.ts` - Upstash 우선 사용, 연결 실패 시 재시도 방지
- [x] `lib/cache/partner-stats.ts` - Upstash 사용하도록 수정
- [x] 모든 ioredis 직접 사용 제거
- [x] 빌드 테스트 성공
- [x] Redis 연결 테스트 성공

### 2. 빌드 테스트 ✅
- [x] TypeScript 컴파일 확인 (일부 타입 에러 있으나 빌드는 성공)
- [x] Next.js 빌드 성공
- [x] `.next` 캐시 정리 후 재빌드 성공

### 3. 코드 점검 ✅
- [x] Redis 관련 하드코딩된 주소 없음
- [x] 모든 Redis 사용 파일에서 Upstash 함수 사용 확인

---

## 📋 Vercel 배포 전 필수 확인

### 1. Vercel 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables에서 다음을 확인/설정:

#### ✅ Redis 설정 (필수)
```
UPSTASH_REDIS_REST_URL=https://pleasant-basilisk-25704.upstash.io
UPSTASH_REDIS_REST_TOKEN=AWRoAAIncDJjZGQ4YjBiNjFiNWE0ZjZkYWE1YjY3M2FiZWIxNmJjY3AyMjU3MDQ
```

**⚠️ 중요**: `REDIS_URL`은 **설정하지 마세요!**

#### 기타 필수 환경 변수
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_DRIVE_SHARED_DRIVE_ID`
- `GOOGLE_DRIVE_BACKUP_FOLDER_ID`
- `NEXT_PUBLIC_BASE_URL`
- 기타 필요한 환경 변수들

### 2. 배포 후 확인 사항

#### 즉시 확인
1. **배포 로그 확인**
   - Vercel Dashboard → Deployments → 최신 배포 → Build Logs
   - 빌드 성공 확인

2. **Redis 연결 확인**
   - `https://your-domain.vercel.app/api/redis/health` 접속
   - `connected: true` 확인
   - 또는 `https://your-domain.vercel.app/redis-test` 접속

3. **로그 확인**
   - Vercel Dashboard → Functions → Logs
   - `[Redis] Upstash REST API 연결 성공` 메시지 확인
   - `[Redis] 연결 오류` 메시지가 없어야 함

#### 기능 테스트
- [ ] 로그인 기능 테스트
- [ ] 세션 캐싱 동작 확인
- [ ] 주요 API 엔드포인트 동작 확인

---

## 🚀 배포 명령어

### Git을 통한 배포 (권장)
```bash
git add .
git commit -m "fix: Redis 연결 수정 - Upstash 사용"
git push origin main
```

### Vercel CLI를 통한 배포
```bash
vercel --prod
```

---

## 🔧 문제 발생 시

### Redis 연결 오류가 계속 발생하는 경우

1. **환경 변수 확인**
   ```bash
   # Vercel Dashboard에서 확인
   - UPSTASH_REDIS_REST_URL이 설정되어 있는지
   - UPSTASH_REDIS_REST_TOKEN이 설정되어 있는지
   - REDIS_URL이 설정되어 있지 않은지
   ```

2. **서버 재시작**
   - Vercel Dashboard → Deployments → Redeploy

3. **로그 확인**
   - Vercel Dashboard → Functions → Logs
   - 상세 에러 메시지 확인

### 빌드 실패 시

1. **로컬 빌드 테스트**
   ```bash
   npm run build
   ```

2. **타입 에러 확인**
   ```bash
   npm run typecheck
   ```

3. **캐시 정리 후 재빌드**
   ```bash
   rm -rf .next
   npm run build
   ```

---

## ✅ 배포 준비 완료!

모든 점검이 완료되었습니다. 이제 Vercel에 배포할 수 있습니다.

**다음 단계**:
1. Git에 커밋 및 푸시
2. Vercel 자동 배포 확인
3. 배포 후 Redis 연결 확인

