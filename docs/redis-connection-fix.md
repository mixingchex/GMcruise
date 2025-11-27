# Upstash Redis 연결 문제 해결 가이드

## 🔴 문제 발견

현재 환경 변수 설정이 잘못되었습니다:

```env
# ❌ 잘못된 설정
REDIS_URL = https://pleasant-basilisk-25704.upstash.io 
UPSTASH_REDIS_REST_TOKEN = AWRoAAIncDJjZGQ4YjBiNjFiNWE0ZjZkYWE1YjY3M2FiZWIxNmJjY3AyMjU3MDQ
```

## ✅ 올바른 설정

`.env` 파일을 다음과 같이 수정하세요:

```env
# ✅ 올바른 설정
UPSTASH_REDIS_REST_URL=https://pleasant-basilisk-25704.upstash.io
UPSTASH_REDIS_REST_TOKEN=AWRoAAIncDJjZGQ4YjBiNjFiNWE0ZjZkYWE1YjY3M2FiZWIxNmJjY3AyMjU3MDQ

# ⚠️ REDIS_URL은 제거하거나 주석 처리하세요
# REDIS_URL=...
```

## 📋 수정 사항

1. **변수명 변경**: `REDIS_URL` → `UPSTASH_REDIS_REST_URL`
2. **공백 제거**: `=` 앞뒤 공백 제거 (선택사항이지만 권장)
3. **따옴표 불필요**: 값에 공백이 없으면 따옴표 불필요

## 🔍 왜 이렇게 해야 하나요?

코드 로직 (`lib/redis.ts`)을 보면:

1. 먼저 `UPSTASH_REDIS_REST_URL`과 `UPSTASH_REDIS_REST_TOKEN`을 확인합니다
2. 둘 다 없으면 `REDIS_URL`을 확인합니다
3. `REDIS_URL`이 있으면 **ioredis로 TCP 연결**을 시도합니다
4. 하지만 Upstash는 **REST API만** 지원하므로 TCP 연결이 실패합니다

따라서 `REDIS_URL`을 설정하면 안 됩니다!

## 🧪 테스트 방법

1. `.env` 파일 수정 후 저장
2. 서버 재시작 (중요!)
3. 다음 명령어로 테스트:

```bash
npm run test:redis
```

또는 직접:

```bash
tsx scripts/test-redis-connection.ts
```

## 📝 확인 체크리스트

- [ ] `UPSTASH_REDIS_REST_URL` 설정됨 (https://로 시작)
- [ ] `UPSTASH_REDIS_REST_TOKEN` 설정됨 (공백 없음)
- [ ] `REDIS_URL` 제거 또는 주석 처리됨
- [ ] 서버 재시작 완료
- [ ] 로그인 시 Redis 연결 성공 메시지 확인

## 🐛 여전히 안 되면?

1. **환경 변수 확인**:
   ```bash
   # 터미널에서 확인 (서버 실행 중)
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

2. **로그 확인**:
   - 서버 로그에서 `[Redis]` 메시지 확인
   - 에러 메시지의 상태 코드 확인 (401, 404 등)

3. **Upstash 콘솔 확인**:
   - https://console.upstash.com 에서 Redis 인스턴스 상태 확인
   - REST URL과 Token이 올바른지 확인

## 💡 참고

- Upstash는 REST API만 지원합니다 (TCP 연결 불가)
- 로컬 Redis를 사용하려면 `REDIS_URL=redis://localhost:6379` 형식 사용
- 하지만 Upstash와 로컬 Redis를 동시에 사용할 수 없습니다

