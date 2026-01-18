# 래퍼 로거 사용 가이드

## 개요
console.log를 안전하게 Winston logger로 전환하기 위한 래퍼 함수입니다.

## 핵심 컨셉

### 전략 A - Phase 1: 래퍼 방식
1. **현재 단계**: 모든 console.* 호출을 래퍼 함수로 변환
2. **초기 동작**: 래퍼는 내부적으로 console을 호출 (USE_WINSTON=false)
3. **최종 목표**: 모든 파일 변환 완료 후 Winston 활성화 (USE_WINSTON=true)

### 장점
- 점진적 마이그레이션 가능
- 언제든지 롤백 가능 (Feature Flag 토글)
- 빌드 실패 위험 없음
- 기존 동작 100% 유지

## 사용법

### Before (기존)
```typescript
console.log('[Payment]', data);
console.error('[Payment] Error:', error);
console.warn('[Payment] Warning:', warning);
console.debug('[Payment] Debug:', debug);
```

### After (래퍼 사용)
```typescript
import { log, error, warn, debug } from '@/lib/logger-wrapper';

log('[Payment]', data);
error('[Payment] Error:', error);
warn('[Payment] Warning:', warning);
debug('[Payment] Debug:', debug);
```

### 또는 default import
```typescript
import logger from '@/lib/logger-wrapper';

logger.log('[Payment]', data);
logger.error('[Payment] Error:', error);
logger.warn('[Payment] Warning:', warning);
logger.debug('[Payment] Debug:', debug);
```

## Feature Flag 제어

### Winston 비활성화 (기본값, 안전)
```bash
# .env 파일에 추가 또는 수정
USE_WINSTON=false
```
- console.log/error/warn/debug 그대로 사용
- 기존 동작과 100% 동일
- 로그 파일 생성 안됨

### Winston 활성화 (모든 파일 전환 후)
```bash
# .env 파일에 추가 또는 수정
USE_WINSTON=true
```
- Winston logger 사용
- 구조화된 JSON 로그
- logs/combined.log, logs/error.log 파일 생성
- 타임스탬프, 로그 레벨, 메타데이터 자동 추가

## 자동 변환 스크립트

### 단일 파일 변환 (dry-run)
```bash
npx jscodeshift -t scripts/migrate-console-to-winston.js app/api/payment/webhook/route.ts --dry
```

### 단일 파일 변환 (실제 적용)
```bash
npx jscodeshift -t scripts/migrate-console-to-winston.js app/api/payment/webhook/route.ts
```

### 여러 파일 변환
```bash
npx jscodeshift -t scripts/migrate-console-to-winston.js "app/api/payment/**/*.ts" --parser=tsx
```

### 전체 프로젝트 변환 (주의: 테스트 필요)
```bash
npx jscodeshift -t scripts/migrate-console-to-winston.js "app/**/*.{ts,tsx}" --parser=tsx
```

## 변환 예시

### API Route 파일
**Before:**
```typescript
export async function POST(request: NextRequest) {
  console.log('[Webhook] Received');

  try {
    // ...
    console.log('[Webhook] Processing:', data);
  } catch (error) {
    console.error('[Webhook] Error:', error);
  }
}
```

**After (자동 변환):**
```typescript
import { log, error } from '@/lib/logger-wrapper';

export async function POST(request: NextRequest) {
  log('[Webhook] Received');

  try {
    // ...
    log('[Webhook] Processing:', data);
  } catch (error) {
    error('[Webhook] Error:', error);
  }
}
```

### React 컴포넌트
**Before:**
```typescript
'use client';

export function PaymentForm() {
  const handleSubmit = async () => {
    console.log('[Form] Submitting');

    try {
      const response = await fetch('/api/payment');
      console.log('[Form] Response:', response);
    } catch (error) {
      console.error('[Form] Error:', error);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**After (자동 변환):**
```typescript
'use client';
import { log, error } from '@/lib/logger-wrapper';

export function PaymentForm() {
  const handleSubmit = async () => {
    log('[Form] Submitting');

    try {
      const response = await fetch('/api/payment');
      log('[Form] Response:', response);
    } catch (error) {
      error('[Form] Error:', error);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## 단계별 마이그레이션 계획

### Phase 1.1: 결제 핵심 파일 (Week 1)
- [ ] app/api/payment/webhook/route.ts
- [ ] app/api/payment/initialize/route.ts
- [ ] app/api/payment/cancel/route.ts
- [ ] lib/payment/welcomepay.ts

### Phase 1.2: 보안/인증 파일 (Week 1)
- [ ] lib/auth/auth.ts
- [ ] lib/security/*.ts
- [ ] middleware.ts

### Phase 1.3: 나머지 API Routes (Week 2)
- [ ] app/api/**/*.ts (자동 변환)

### Phase 1.4: 컴포넌트 (Week 3)
- [ ] app/**/*.tsx (자동 변환)

### Phase 2: Winston 활성화
- [ ] USE_WINSTON=true 설정
- [ ] 로그 파일 모니터링
- [ ] 성능 테스트
- [ ] 프로덕션 배포

## 검증 체크리스트

### 변환 후 확인사항
- [ ] TypeScript 컴파일 에러 없음
- [ ] Import 경로 정확 (@/lib/logger-wrapper)
- [ ] console.* 호출이 모두 래퍼 함수로 변경됨
- [ ] 동작 테스트 (로그 출력 확인)

### Winston 활성화 전 확인사항
- [ ] 전체 프로젝트에서 console.* 호출 0개 (래퍼만 사용)
- [ ] logs/ 디렉토리 생성됨
- [ ] .gitignore에 logs/*.log 추가됨
- [ ] 로그 로테이션 설정 확인 (10MB, 30 파일)

## 트러블슈팅

### Import 에러
```
Cannot find module '@/lib/logger-wrapper'
```
**해결**: tsconfig.json의 paths 설정 확인
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Winston 활성화 시 로그 안보임
**원인**: Winston은 기본적으로 파일에만 기록
**해결**: logger-v2.ts의 Console transport 확인 (development 환경에서 활성화됨)

### 로그 파일 용량 증가
**해결**: logger-v2.ts의 maxsize, maxFiles 조정
```typescript
new winston.transports.File({
  filename: 'logs/combined.log',
  maxsize: 10485760, // 10MB
  maxFiles: 30,      // 최대 30개 파일
})
```

## 롤백 가이드

### 긴급 롤백 (Winston 비활성화)
```bash
# .env 파일 수정
USE_WINSTON=false

# 또는 환경변수 제거
# USE_WINSTON 줄 삭제 또는 주석 처리
```

### 완전 롤백 (래퍼 제거)
```bash
# 백업에서 복원
git checkout HEAD -- lib/logger.ts

# 또는 백업 파일 사용
cp lib/logger.ts.original-backup lib/logger.ts

# 변경사항 되돌리기
git revert <commit-hash>
```

## 모니터링

### 로그 파일 위치
- `logs/combined.log` - 모든 로그
- `logs/error.log` - 에러 로그만

### 실시간 로그 확인
```bash
# combined.log 실시간 모니터링
tail -f logs/combined.log

# error.log 실시간 모니터링
tail -f logs/error.log

# 최근 100줄 확인
tail -n 100 logs/combined.log
```

### 로그 검색
```bash
# 특정 키워드 검색
grep "Payment" logs/combined.log

# 에러만 검색
grep "error" logs/combined.log

# 날짜별 검색 (ISO 8601 형식)
grep "2026-01-19" logs/combined.log
```

## 성능 고려사항

### Winston의 성능 영향
- 파일 I/O 비동기 처리 (non-blocking)
- 메모리 버퍼링 사용
- 로그 레벨별 필터링
- 프로덕션 환경에서 debug 로그 자동 비활성화

### 권장사항
- 고빈도 로깅은 debug 레벨 사용
- 대량 데이터는 로깅하지 말고 별도 저장
- 민감 정보는 로깅 금지 (비밀번호, 토큰 등)

## 참고 자료
- [Winston 공식 문서](https://github.com/winstonjs/winston)
- [jscodeshift 가이드](https://github.com/facebook/jscodeshift)
- 프로젝트 내부: docs/refactoring/MIGRATION-GUIDE-CONSOLE.md
