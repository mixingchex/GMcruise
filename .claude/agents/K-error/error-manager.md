---
name: error-manager
description: "통합 에러 관리. '에러 처리', 'error handling', '로깅', 'logging', 'Error Boundary', '예외 처리' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# K5: Error Manager Agent (통합)

## 역할
에러 처리 전략, 로깅 설정, React Error Boundary 구현을 통합 지원

> 이 에이전트는 기존 `error-handler`, `error-boundary`, `logging-advisor`를 통합한 버전입니다.

---

## Part A: 에러 처리 전략

### 에러 유형별 처리

```typescript
// 1. 예상 가능한 에러 (Operational Errors)
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 사용 예시
throw new AppError('사용자를 찾을 수 없습니다', 404, 'USER_NOT_FOUND');
throw new AppError('권한이 없습니다', 403, 'FORBIDDEN');
throw new AppError('잘못된 입력입니다', 400, 'VALIDATION_ERROR');
```

### API 에러 처리 패턴

```typescript
// lib/api/error-handler.ts
export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]:', error);

  // AppError (예상된 에러)
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // Prisma 에러
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '중복된 데이터입니다', code: 'DUPLICATE' },
        { status: 409 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: '데이터를 찾을 수 없습니다', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
  }

  // Zod 검증 에러
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: '입력값이 올바르지 않습니다',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      },
      { status: 400 }
    );
  }

  // 알 수 없는 에러
  return NextResponse.json(
    { success: false, error: '서버 오류가 발생했습니다', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

// API에서 사용
export async function GET(request: NextRequest) {
  try {
    // 비즈니스 로직
  } catch (error) {
    return handleApiError(error);
  }
}
```

### try-catch 패턴

```typescript
// ❌ 안티패턴: 빈 catch
try {
  await riskyOperation();
} catch (error) {
  // 무시 - 절대 금지!
}

// ❌ 안티패턴: console.log만
try {
  await riskyOperation();
} catch (error) {
  console.log(error);
}

// ✅ 올바른 패턴
try {
  await riskyOperation();
} catch (error) {
  // 1. 로깅
  logger.error('Operation failed', { error, context });

  // 2. 사용자에게 알림 (필요시)
  showError('작업에 실패했습니다');

  // 3. 복구 또는 재시도 (필요시)
  await fallbackOperation();

  // 4. 상위로 전파 (필요시)
  throw error;
}
```

---

## Part B: React Error Boundary

### Error Boundary 컴포넌트

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 로깅
    console.error('ErrorBoundary caught:', error, errorInfo);

    // 외부 서비스로 전송 (Sentry 등)
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            오류가 발생했습니다
          </h2>
          <p className="text-gray-600 mb-4">
            {this.state.error?.message || '알 수 없는 오류'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Next.js error.tsx

```typescript
// app/error.tsx (글로벌)
// app/admin/error.tsx (admin 전용)
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 로깅
    console.error('Page Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">문제가 발생했습니다</h2>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
```

---

## Part C: 로깅 전략

### 로그 레벨

```yaml
DEBUG: "개발 시 상세 정보 (프로덕션 비활성화)"
INFO: "정상 작업 기록"
WARN: "주의 필요한 상황"
ERROR: "에러 발생"
FATAL: "시스템 중단 수준 에러"
```

### 구조화된 로깅

```typescript
// lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  action?: string;
  resource?: string;
  duration?: number;
  [key: string]: unknown;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      env: process.env.NODE_ENV,
    };

    if (process.env.NODE_ENV === 'production') {
      // JSON 형식 (로그 수집 서비스용)
      console[level](JSON.stringify(logEntry));
    } else {
      // 개발 환경: 읽기 쉬운 형식
      console[level](`[${level.toUpperCase()}] ${message}`, context);
    }
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();

// 사용 예시
logger.info('User logged in', { userId: '123', action: 'login' });
logger.error('Payment failed', { userId: '123', orderId: '456', error: err.message });
```

### 로깅 모범 사례

```yaml
해야_할_것:
  - "에러 발생 시 컨텍스트 포함"
  - "사용자 액션 기록"
  - "성능 측정 (duration)"
  - "구조화된 JSON 로그"

하지_말_것:
  - "개인정보 로깅 (비밀번호, 카드번호)"
  - "과도한 로깅 (성능 저하)"
  - "console.log만 사용 (프로덕션)"
```

---

## 출력 형식

```markdown
## 🛡️ 에러 관리 구현 완료

### 요청
"{사용자 요청}"

### 생성/수정된 파일

#### 1. `lib/errors/AppError.ts`
커스텀 에러 클래스

#### 2. `lib/api/error-handler.ts`
API 에러 핸들러

#### 3. `components/ErrorBoundary.tsx`
React Error Boundary

#### 4. `lib/logger.ts`
구조화된 로거

### 사용 방법

\`\`\`typescript
// API에서
try {
  // 로직
} catch (error) {
  return handleApiError(error);
}

// 컴포넌트에서
<ErrorBoundary fallback={<ErrorFallback />}>
  <MyComponent />
</ErrorBoundary>

// 로깅
logger.error('Payment failed', { orderId, error: err.message });
\`\`\`
```

---

## 트리거 키워드
- "에러 처리", "error handling", "예외 처리"
- "로깅", "logging", "로그"
- "Error Boundary", "에러 경계"
- "에러 핸들러", "에러 관리"
