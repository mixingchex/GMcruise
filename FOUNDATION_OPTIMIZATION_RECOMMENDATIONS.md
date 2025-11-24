# 🏗️ 뼈대부터 잡는 성능 최적화 권장 사항
**작성일**: 2025-11-23  
**목적**: 근본적인 구조 개선을 통한 성능 최적화

---

## 🎯 핵심 원칙

> **"개별 최적화보다 구조적 개선이 더 큰 효과를 가져온다"**

---

## 1️⃣ 데이터베이스 인덱스 최적화 (최우선)

### 현재 상태
- ✅ 295개의 인덱스가 이미 정의되어 있음
- ⚠️ 자주 사용되는 쿼리 패턴에 맞는 복합 인덱스 부족 가능성

### 권장 작업

#### 1.1 쿼리 패턴 분석
```bash
# 자주 사용되는 쿼리 패턴 분석
# - WHERE 조건 조합
# - ORDER BY 패턴
# - JOIN 패턴
```

**대상 테이블**:
- `User` 테이블: `role`, `customerStatus`, `isHibernated`, `lastActiveAt` 조합
- `AffiliateSale` 테이블: `managerId`, `agentId`, `status`, `saleDate` 조합
- `Trip` 테이블: `userId`, `status`, `startDate` 조합
- `CommunityPost` 테이블: `category`, `isDeleted`, `createdAt` 조합

#### 1.2 복합 인덱스 추가
```prisma
// 예시: User 테이블
model User {
  // ... 기존 필드
  
  // 권장 인덱스 추가
  @@index([role, customerStatus, isHibernated])  // 관리자 고객 목록 조회
  @@index([role, lastActiveAt])                   // 최근 활동 사용자
  @@index([customerStatus, updatedAt])            // 인증서 처리 날짜 필터
}

// 예시: AffiliateSale 테이블
model AffiliateSale {
  // ... 기존 필드
  
  // 권장 인덱스 추가
  @@index([managerId, status, saleDate])         // 대리점장 판매 조회
  @@index([agentId, status, saleDate])           // 판매원 판매 조회
}
```

**예상 효과**: 쿼리 속도 **50-80% 개선**

---

## 2️⃣ 공통 API 레이어 구축

### 현재 문제점
- 각 API마다 인증 로직 중복
- 에러 처리 방식 불일치
- 응답 형식 불일치
- 캐싱 로직 없음

### 권장 구조

#### 2.1 API 미들웨어 구축
```typescript
// lib/api/middleware.ts
export async function withAuth(
  handler: (req: Request, user: User) => Promise<Response>,
  options?: { roles?: string[] }
) {
  return async (req: Request) => {
    // 공통 인증 로직
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // 권한 체크
    if (options?.roles && !options.roles.includes(user.role)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }
    
    try {
      return await handler(req, user);
    } catch (error) {
      return handleError(error);
    }
  };
}
```

#### 2.2 캐싱 레이어 구축
```typescript
// lib/api/cache.ts
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number }
): Promise<T> {
  // Redis 또는 메모리 캐시 사용
  const cached = await cache.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetcher();
  await cache.setex(key, options?.ttl || 300, JSON.stringify(data));
  return data;
}
```

#### 2.3 통일된 응답 형식
```typescript
// lib/api/response.ts
export function successResponse<T>(data: T, meta?: any) {
  return NextResponse.json({
    ok: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  });
}

export function errorResponse(message: string, status = 500, details?: any) {
  return NextResponse.json({
    ok: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
    timestamp: new Date().toISOString(),
  }, { status });
}
```

**예상 효과**: 
- 코드 중복 **70% 감소**
- 유지보수성 **대폭 향상**
- 일관된 에러 처리

---

## 3️⃣ 데이터 페칭 최적화 (프론트엔드)

### 현재 문제점
- 각 컴포넌트마다 `useEffect` + `fetch` 중복
- 로딩 상태 관리 중복
- 에러 처리 중복
- 캐싱 없음

### 권장 구조

#### 3.1 React Query 도입
```typescript
// lib/hooks/useAdminDashboard.ts
import { useQuery } from '@tanstack/react-query';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
  });
}
```

**장점**:
- 자동 캐싱
- 자동 리페칭
- 로딩/에러 상태 관리
- 중복 요청 방지

#### 3.2 공통 데이터 페칭 훅
```typescript
// lib/hooks/useApi.ts
export function useApi<T>(
  endpoint: string,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<T>;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}
```

**예상 효과**: 
- 네트워크 요청 **40-60% 감소**
- 사용자 경험 **대폭 향상**

---

## 4️⃣ 빌드 최적화

### 현재 상태
- Next.js 기본 설정 사용
- 코드 스플리팅 미적용
- 번들 크기 최적화 미적용

### 권장 작업

#### 4.1 동적 임포트 최적화
```typescript
// ❌ 나쁜 예
import HeavyComponent from '@/components/HeavyComponent';

// ✅ 좋은 예
const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // 필요시
});
```

#### 4.2 번들 분석 및 최적화
```bash
# 번들 분석
npm install --save-dev @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... 기존 설정
});
```

#### 4.3 이미지 최적화
```typescript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

**예상 효과**: 
- 초기 로딩 시간 **30-50% 개선**
- 번들 크기 **20-40% 감소**

---

## 5️⃣ 공통 컴포넌트 최적화

### 현재 문제점
- 컴포넌트 재렌더링 과다
- 불필요한 props 전달
- 메모이제이션 미적용

### 권장 작업

#### 5.1 React.memo 적용
```typescript
// components/admin/CustomerCard.tsx
export const CustomerCard = React.memo(({ customer }: { customer: Customer }) => {
  return <div>{customer.name}</div>;
}, (prevProps, nextProps) => {
  // 커스텀 비교 로직
  return prevProps.customer.id === nextProps.customer.id;
});
```

#### 5.2 useMemo, useCallback 활용
```typescript
// 나쁜 예
function CustomerList({ customers }) {
  const sorted = customers.sort((a, b) => a.name.localeCompare(b.name));
  return <div>{sorted.map(...)}</div>;
}

// 좋은 예
function CustomerList({ customers }) {
  const sorted = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name)),
    [customers]
  );
  return <div>{sorted.map(...)}</div>;
}
```

---

## 6️⃣ 모니터링 및 측정

### 권장 도구

#### 6.1 성능 측정
```typescript
// lib/performance.ts
export function measurePerformance(name: string, fn: () => Promise<any>) {
  return async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[Performance] ${name} (failed): ${duration.toFixed(2)}ms`);
      throw error;
    }
  };
}
```

#### 6.2 쿼리 로깅
```typescript
// Prisma 미들웨어
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  if (after - before > 100) { // 100ms 이상 걸리는 쿼리만 로깅
    console.log(`[Slow Query] ${params.model}.${params.action}: ${after - before}ms`);
  }
  
  return result;
});
```

---

## 📋 우선순위별 작업 계획

### 🔴 1단계: 데이터베이스 인덱스 최적화 (1-2일)
1. 쿼리 패턴 분석
2. 복합 인덱스 추가
3. 성능 측정

### 🟡 2단계: 공통 API 레이어 구축 (2-3일)
1. API 미들웨어 구축
2. 캐싱 레이어 구축
3. 기존 API 마이그레이션

### 🟢 3단계: 데이터 페칭 최적화 (2-3일)
1. React Query 도입
2. 공통 훅 구축
3. 기존 컴포넌트 마이그레이션

### 🔵 4단계: 빌드 최적화 (1-2일)
1. 동적 임포트 적용
2. 번들 분석 및 최적화
3. 이미지 최적화

---

## 📊 예상 개선 효과

### 단계별 개선
- **1단계 (인덱스)**: 쿼리 속도 **50-80% 개선**
- **2단계 (API 레이어)**: 코드 중복 **70% 감소**, 유지보수성 향상
- **3단계 (데이터 페칭)**: 네트워크 요청 **40-60% 감소**
- **4단계 (빌드)**: 초기 로딩 **30-50% 개선**

### 종합 효과
- **전체 성능**: **40-60% 개선** 예상
- **코드 품질**: **대폭 향상**
- **유지보수성**: **크게 향상**

---

## 🚀 시작하기

### 즉시 시작 가능한 작업
1. ✅ 데이터베이스 인덱스 분석 및 추가
2. ✅ 공통 API 미들웨어 구축
3. ✅ React Query 도입 준비

### 점진적 적용
- 기존 코드를 한 번에 바꾸지 말고
- 새로운 기능부터 적용
- 점진적으로 마이그레이션

---

**권장 시작점**: 데이터베이스 인덱스 최적화부터 시작










