# Redis & Cron 설정 상태 확인

**확인일**: 2025-01-28

---

## ✅ Redis 설정 상태

### 설치된 패키지
- ✅ `@upstash/redis@1.35.7` - Upstash Redis (REST API)
- ✅ `ioredis@5.8.2` - 일반 Redis 클라이언트

### 설정 파일
- ✅ `lib/redis.ts` - Redis 캐싱 유틸리티 (Upstash + ioredis 지원)

### 환경 변수
- ✅ `.env` 파일에 `REDIS_URL=redis://localhost:6379` 설정됨

### 지원 기능
- ✅ Upstash REST API 우선 사용
- ✅ 일반 Redis (ioredis) 하위 호환성 지원
- ✅ 캐시 조회/저장/삭제 기능
- ✅ 패턴 기반 캐시 삭제

### 사용 위치
- ✅ `app/api/admin/dashboard/route.ts` - 대시보드 API (5분 TTL)
- ✅ `app/api/admin/customers/route.ts` - 고객 목록 API (1분 TTL)

---

## ⚠️ Cron 설정 상태

### 설정 스크립트
- ✅ `scripts/setup-cron.sh` - Cron 설정 스크립트 존재

### 실제 Cron 작업
- ❌ **아직 등록되지 않음**

### 등록해야 할 Cron 작업
```bash
0 * * * * cd /home/userhyeseon28/projects/cruise-guide && npm run update:dashboard-stats >> /home/userhyeseon28/projects/cruise-guide/logs/dashboard-stats.log 2>&1
```

**설명**: 매 시간마다 통계 데이터 자동 업데이트

---

## 🚀 다음 단계

### 1. Cron 작업 등록 (필수)

**자동 등록**:
```bash
cd /home/userhyeseon28/projects/cruise-guide
./scripts/setup-cron.sh
```

**또는 수동 등록**:
```bash
crontab -e
# 다음 라인 추가:
0 * * * * cd /home/userhyeseon28/projects/cruise-guide && npm run update:dashboard-stats >> /home/userhyeseon28/projects/cruise-guide/logs/dashboard-stats.log 2>&1
```

### 2. Redis 서버 실행 (로컬 개발 시)

**Docker 사용**:
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

**또는 Upstash 사용** (권장):
- Upstash 계정 생성 후 환경 변수 추가:
  ```env
  UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
  UPSTASH_REDIS_REST_TOKEN=your-token
  ```

### 3. Redis 연결 테스트

```bash
# Node.js로 테스트
node -e "
const { getCache, setCache } = require('./lib/redis.ts');
(async () => {
  await setCache('test', { message: 'Hello' }, 60);
  const data = await getCache('test');
  console.log('Redis 테스트:', data);
})();
"
```

---

## 📋 설정 확인 체크리스트

- [x] Redis 라이브러리 설치 완료
- [x] Redis 유틸리티 파일 생성 완료
- [x] 환경 변수 설정 완료
- [x] API에 캐싱 적용 완료
- [x] Cron 설정 스크립트 생성 완료
- [ ] **Cron 작업 등록 필요** ⚠️
- [ ] Redis 서버 실행 (로컬 개발 시)
- [ ] Redis 연결 테스트

---

## 💡 참고사항

### Upstash Redis 사용 시
- 무료 플랜: 10,000 요청/일
- REST API 방식으로 서버리스 환경에 적합
- 환경 변수만 설정하면 자동으로 Upstash 사용

### 일반 Redis 사용 시
- 로컬 개발: `REDIS_URL=redis://localhost:6379`
- 프로덕션: Redis 클라우드 서비스 URL 사용

### Cron 작업 확인
```bash
# 현재 등록된 Cron 작업 확인
crontab -l

# Cron 로그 확인
tail -f /home/userhyeseon28/projects/cruise-guide/logs/dashboard-stats.log
```

---

**상태**: Redis 설정 완료 ✅, Cron 등록 필요 ⚠️


