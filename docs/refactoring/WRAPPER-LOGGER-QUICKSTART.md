# 래퍼 로거 빠른 시작 가이드

## 1분 안에 시작하기

### Step 1: 테스트 실행
```bash
# Winston 비활성화 상태로 테스트
npx tsx scripts/test-wrapper-logger.ts
```

예상 출력:
```
=== Wrapper Logger Test ===
USE_WINSTON: false
Expected behavior: console.*

Test 1: log()
[Test] This is a log message { test: true, timestamp: '2026-01-19T...' }

...

✅ Winston is DISABLED (default)
Using console.* for output (safe mode)
```

### Step 2: Winston 활성화 테스트
```bash
# Winston 활성화 상태로 테스트
USE_WINSTON=true npx tsx scripts/test-wrapper-logger.ts
```

예상 출력:
```
=== Wrapper Logger Test ===
USE_WINSTON: true
Expected behavior: Winston logger

...

✅ Winston is ENABLED
Check logs:
  - logs/combined.log (all logs)
  - logs/error.log (errors only)

Run: tail -f logs/combined.log
```

### Step 3: 로그 파일 확인 (Winston 활성화 시)
```bash
# 로그 파일 확인
cat logs/combined.log

# 실시간 모니터링
tail -f logs/combined.log
```

## 첫 파일 마이그레이션

### 자동 변환 (권장)
```bash
# 1. dry-run으로 미리보기
npx jscodeshift -t scripts/migrate-console-to-winston.js app/api/payment/webhook/route.ts --dry

# 2. 변환 적용
npx jscodeshift -t scripts/migrate-console-to-winston.js app/api/payment/webhook/route.ts
```

### 수동 변환
**Before:**
```typescript
export async function POST(request: NextRequest) {
  console.log('[Webhook] Received');
  console.error('[Webhook] Error:', error);
}
```

**After:**
```typescript
import { log, error } from '@/lib/logger-wrapper';

export async function POST(request: NextRequest) {
  log('[Webhook] Received');
  error('[Webhook] Error:', error);
}
```

## 환경 설정

### .env 파일 설정
```bash
# 1. .env.example을 .env로 복사 (아직 없다면)
cp .env.example .env

# 2. Winston 설정 추가/수정
echo "USE_WINSTON=false" >> .env
```

### Winston 활성화 (모든 파일 전환 후)
```bash
# .env 파일에서 수정
USE_WINSTON=true
```

## 파일별 변환 현황

### 우선순위 1: 결제 핵심 (Week 1)
```bash
# 결제 웹훅
npx jscodeshift -t scripts/migrate-console-to-winston.js app/api/payment/webhook/route.ts

# 결제 초기화
npx jscodeshift -t scripts/migrate-console-to-winston.js app/api/payment/initialize/route.ts

# 결제 취소
npx jscodeshift -t scripts/migrate-console-to-winston.js app/api/payment/cancel/route.ts

# 웰컴페이 라이브러리
npx jscodeshift -t scripts/migrate-console-to-winston.js lib/payment/welcomepay.ts
```

### 우선순위 2: 보안/인증 (Week 1)
```bash
# 인증
npx jscodeshift -t scripts/migrate-console-to-winston.js lib/auth/auth.ts

# 보안
npx jscodeshift -t scripts/migrate-console-to-winston.js "lib/security/*.ts" --parser=tsx

# 미들웨어
npx jscodeshift -t scripts/migrate-console-to-winston.js middleware.ts
```

### 우선순위 3: 나머지 API (Week 2)
```bash
# 모든 API Routes (주의: 테스트 필요)
npx jscodeshift -t scripts/migrate-console-to-winston.js "app/api/**/*.ts" --parser=tsx
```

## 체크리스트

### 변환 전
- [ ] 백업 파일 확인: `lib/logger.ts.original-backup` 존재
- [ ] 테스트 스크립트 실행 성공
- [ ] Winston 비활성화 확인: `USE_WINSTON=false`

### 변환 후
- [ ] TypeScript 컴파일 에러 없음: `npm run build`
- [ ] Import 경로 확인: `@/lib/logger-wrapper`
- [ ] console.* 호출 제거됨
- [ ] 로컬 테스트 성공

### Winston 활성화 전
- [ ] 전체 프로젝트 변환 완료
- [ ] console.* 사용 0개 (grep으로 확인)
- [ ] logs/ 디렉토리 생성
- [ ] .gitignore에 `logs/*.log` 추가

### Winston 활성화 후
- [ ] 로그 파일 생성 확인: `logs/combined.log`
- [ ] 로그 내용 확인 (JSON 형식)
- [ ] 성능 테스트
- [ ] 프로덕션 배포

## 문제 해결

### console.* 사용 개수 확인
```bash
# 전체 프로젝트에서 console 사용 찾기
grep -r "console\." app lib --include="*.ts" --include="*.tsx" | wc -l

# 파일별 상세 목록
grep -r "console\." app lib --include="*.ts" --include="*.tsx"
```

### Import 에러
```bash
# tsconfig.json 확인
cat tsconfig.json | grep -A 5 "paths"

# 예상 출력:
# "paths": {
#   "@/*": ["./*"]
# }
```

### 롤백
```bash
# Winston 비활성화
echo "USE_WINSTON=false" > .env

# 또는 완전 롤백
git checkout HEAD -- lib/logger.ts
git revert <commit-hash>
```

## 다음 단계

1. **Phase 1.1**: 결제 핵심 파일 변환 (Week 1)
2. **Phase 1.2**: 보안/인증 파일 변환 (Week 1)
3. **Phase 1.3**: 나머지 API 변환 (Week 2)
4. **Phase 1.4**: 컴포넌트 변환 (Week 3)
5. **Phase 2**: Winston 활성화 및 모니터링

## 참고 자료
- 상세 가이드: `docs/refactoring/WRAPPER-LOGGER-GUIDE.md`
- 마이그레이션 가이드: `docs/refactoring/MIGRATION-GUIDE-CONSOLE.md`
- 마이그레이션 상태: `docs/refactoring/MIGRATION-STATUS.md`
