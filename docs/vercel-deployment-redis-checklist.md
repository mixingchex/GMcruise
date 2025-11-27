# Vercel 배포 전 Redis 설정 체크리스트

## ✅ 완료된 작업

1. **환경 변수 수정**
   - `REDIS_URL` 주석 처리 완료
   - `UPSTASH_REDIS_REST_URL` 설정 완료
   - `UPSTASH_REDIS_REST_TOKEN` 설정 완료

2. **코드 수정**
   - `lib/redis.ts`: Upstash Redis 우선 사용, 연결 실패 시 재시도 방지
   - `lib/cache/partner-stats.ts`: Upstash Redis 사용하도록 변경
   - 모든 ioredis 직접 사용 제거

3. **테스트**
   - Redis 연결 테스트 성공
   - 브라우저 테스트 페이지 생성 (`/redis-test`)

## 📋 Vercel 배포 전 확인 사항

### 1. 환경 변수 설정 (Vercel Dashboard)

다음 환경 변수들이 설정되어 있는지 확인:

```
UPSTASH_REDIS_REST_URL=https://pleasant-basilisk-25704.upstash.io
UPSTASH_REDIS_REST_TOKEN=AWRoAAIncDJjZGQ4YjBiNjFiNWE0ZjZkYWE1YjY3M2FiZWIxNmJjY3AyMjU3MDQ
```

**중요**: `REDIS_URL`은 설정하지 마세요!

### 2. 배포 후 확인

배포 후 다음을 확인하세요:

1. **로그 확인**
   - Vercel Dashboard → Functions → Logs
   - `[Redis] Upstash REST API 연결 성공` 메시지 확인
   - `[Redis] 연결 오류` 메시지가 없어야 함

2. **Health Check**
   - `https://your-domain.vercel.app/api/redis/health` 접속
   - `connected: true` 확인

3. **테스트 페이지**
   - `https://your-domain.vercel.app/redis-test` 접속
   - 연결 성공 메시지 확인

### 3. 문제 발생 시

만약 배포 후에도 Redis 연결 오류가 발생하면:

1. Vercel 환경 변수 확인
2. 서버 재시작 (Redeploy)
3. 로그에서 상세 에러 메시지 확인

## 🔧 로컬 테스트 명령어

```bash
# Redis 연결 테스트
npm run test:redis

# 빌드 테스트
npm run test:build

# 타입 체크
npm run typecheck
```

