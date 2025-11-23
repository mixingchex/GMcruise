# 관리자 패널 서버 최소화 전략

> **작성일**: 2025년 1월  
> **목적**: 관리자 패널 기능을 100% 활용하면서 서버 부하를 최소화하기 위한 작업 가이드

---

## 📊 현재 상황 분석

### 현재 문제점

1. **클라이언트 사이드 캐싱 없음**
   - SWR, React Query 같은 데이터 페칭 라이브러리 미사용
   - API 응답이 브라우저에 캐시되지 않음
   - 동일한 데이터를 반복적으로 서버에서 조회

2. **대시보드 자동 새로고침 과도함**
   - 5분마다 자동으로 모든 데이터를 새로고침
   - `/api/admin/dashboard`, `/api/admin/affiliate/monitoring`, `/api/admin/users/recent`, `/api/admin/trips/recent` 4개 API 동시 호출
   - 사용자가 보고 있지 않아도 계속 요청 발생

3. **서버 사이드 필터링/정렬/검색**
   - 고객 목록, 여행 목록 등에서 필터링/정렬이 서버에서 처리됨
   - 검색어 변경 시마다 서버 요청 발생

4. **중복 API 호출**
   - useEffect에서 의존성 배열에 의해 여러 번 호출
   - 컴포넌트 리렌더링 시 불필요한 재요청

5. **페이지네이션 최적화 부족**
   - 전체 데이터를 서버에서 조회 후 클라이언트에서 페이징
   - 또는 페이지 이동 시마다 서버 요청

6. **정적 데이터 캐싱 없음**
   - 드롭다운 옵션, 코드 테이블 등 변경되지 않는 데이터도 매번 요청

---

## 🎯 서버 최소화 전략

### 1단계: 클라이언트 사이드 데이터 페칭 라이브러리 도입

#### 1-1. SWR (Stale-While-Revalidate) 도입

**이유**: 
- 경량 라이브러리 (4KB 미만)
- 자동 캐싱 및 재검증
- 포커스 시 자동 리프레시
- 네트워크 요청 중복 제거

**설치**:
```bash
npm install swr
```

**구현 예시**:

```typescript
// lib/hooks/useAdminDashboard.ts
import useSWR from 'swr';

const fetcher = (url: string) => 
  fetch(url, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (!data.ok) throw new Error(data.error || 'Failed to fetch');
      return data;
    });

export function useAdminDashboard(options?: { refreshInterval?: number }) {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/admin/dashboard',
    fetcher,
    {
      refreshInterval: options?.refreshInterval || 5 * 60 * 1000, // 5분
      revalidateOnFocus: false, // 포커스 시 자동 새로고침 비활성화
      revalidateOnReconnect: true, // 네트워크 재연결 시 재검증
      dedupingInterval: 5000, // 5초 내 중복 요청 방지
    }
  );

  return {
    dashboard: data?.dashboard || null,
    isLoading,
    error,
    refresh: mutate, // 수동 새로고침
  };
}
```

**사용 예시**:

```typescript
// app/admin/dashboard/page.tsx
import { useAdminDashboard } from '@/lib/hooks/useAdminDashboard';

export default function AdminDashboard() {
  // 자동 캐싱 및 재검증
  const { dashboard, isLoading, error, refresh } = useAdminDashboard({
    refreshInterval: 10 * 60 * 1000, // 10분으로 연장
  });

  // 수동 새로고침 버튼
  const handleRefresh = () => {
    refresh();
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <button onClick={handleRefresh}>새로고침</button>
      {/* 대시보드 UI */}
    </div>
  );
}
```

**예상 효과**:
- 동일한 데이터 요청 시 즉시 캐시에서 반환 (서버 요청 없음)
- 5초 내 중복 요청 자동 차단
- 네트워크 요청 50-70% 감소

---

### 2단계: 클라이언트 사이드 필터링/정렬/검색 구현

#### 2-1. 고객 목록 페이지 최적화

**현재**:
```typescript
// 검색어, 필터, 정렬 변경 시마다 서버 요청
useEffect(() => {
  loadCustomers();
}, [search, status, sortBy, sortOrder, pagination.page]);
```

**개선**:
```typescript
// lib/hooks/useCustomers.ts
import useSWR from 'swr';
import { useMemo } from 'react';

export function useCustomers() {
  // 전체 데이터를 한 번만 로드 (캐싱됨)
  const { data, error, isLoading, mutate } = useSWR(
    '/api/admin/customers?limit=1000', // 최대 1000개까지 로드
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const customers = data?.customers || [];
  const totalCount = data?.pagination?.total || 0;

  // 클라이언트 사이드 필터링/정렬/검색
  const filterAndSort = (
    search: string,
    status: string,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    page: number,
    pageSize: number = 20
  ) => {
    return useMemo(() => {
      let filtered = [...customers];

      // 검색
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(customer => 
          customer.name?.toLowerCase().includes(searchLower) ||
          customer.phone?.includes(search) ||
          customer.email?.toLowerCase().includes(searchLower)
        );
      }

      // 상태 필터
      if (status !== 'all') {
        filtered = filtered.filter(customer => {
          if (status === 'active') return !customer.isHibernated && !customer.isLocked;
          if (status === 'hibernated') return customer.isHibernated;
          if (status === 'locked') return customer.isLocked;
          return true;
        });
      }

      // 정렬
      filtered.sort((a, b) => {
        let aVal: any = a[sortBy as keyof typeof a];
        let bVal: any = b[sortBy as keyof typeof b];

        if (sortBy === 'createdAt' || sortBy === 'lastActiveAt') {
          aVal = new Date(aVal || 0).getTime();
          bVal = new Date(bVal || 0).getTime();
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // 페이지네이션
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginated = filtered.slice(start, end);

      return {
        customers: paginated,
        pagination: {
          total: filtered.length,
          page,
          limit: pageSize,
          totalPages: Math.ceil(filtered.length / pageSize),
        },
      };
    }, [customers, search, status, sortBy, sortOrder, page, pageSize]);
  };

  return {
    customers,
    totalCount,
    filterAndSort,
    isLoading,
    error,
    refresh: mutate,
  };
}
```

**사용 예시**:

```typescript
// app/admin/customers/page.tsx
import { useCustomers } from '@/lib/hooks/useCustomers';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const { filterAndSort, isLoading } = useCustomers();

  // 클라이언트 사이드에서 필터링/정렬/페이지네이션 처리
  const { customers, pagination } = filterAndSort(
    search,
    status,
    sortBy,
    sortOrder,
    page
  );

  // 검색어 변경 시 서버 요청 없음 (즉시 반영)
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // 검색 시 첫 페이지로
  };

  return (
    <div>
      <input 
        value={search} 
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="검색..."
      />
      {/* 고객 목록 테이블 */}
    </div>
  );
}
```

**예상 효과**:
- 검색/필터/정렬 변경 시 서버 요청 0회
- 초기 로드 후 추가 요청 거의 없음
- 네트워크 요청 90% 감소

**주의사항**:
- 데이터가 1000개를 초과하면 서버 사이드 페이지네이션 유지
- 또는 가상 스크롤(Virtual Scrolling) 도입

---

### 3단계: 대시보드 자동 새로고침 최적화

#### 3-1. 사용자 제어형 새로고침

**현재**:
```typescript
// 5분마다 무조건 자동 새로고침
const interval = setInterval(() => {
  loadDashboardData(true);
}, 5 * 60 * 1000);
```

**개선**:
```typescript
// lib/hooks/useAdminDashboard.ts
import useSWR from 'swr';
import { useEffect, useRef } from 'react';

export function useAdminDashboard() {
  const isTabVisible = useRef(true);
  const lastActivityTime = useRef(Date.now());

  // 탭 가시성 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisible.current = !document.hidden;
      if (!document.hidden) {
        lastActivityTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 사용자 활동 감지 (마우스 움직임, 클릭 등)
  useEffect(() => {
    const handleActivity = () => {
      lastActivityTime.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, []);

  const { data, error, isLoading, mutate } = useSWR(
    '/api/admin/dashboard',
    fetcher,
    {
      // 조건부 자동 새로고침
      refreshInterval: () => {
        // 탭이 보이지 않으면 새로고침 안 함
        if (!isTabVisible.current) return 0;
        
        // 마지막 활동 후 10분이 지났으면 새로고침 안 함
        const timeSinceActivity = Date.now() - lastActivityTime.current;
        if (timeSinceActivity > 10 * 60 * 1000) return 0;

        // 활동 중이면 10분마다 새로고침 (5분에서 10분으로 연장)
        return 10 * 60 * 1000;
      },
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    dashboard: data?.dashboard || null,
    isLoading,
    error,
    refresh: mutate,
  };
}
```

**예상 효과**:
- 탭이 백그라운드에 있으면 새로고침 중단
- 사용자가 비활성 상태면 새로고침 중단
- 서버 요청 60-80% 감소

---

### 4단계: 정적 데이터 클라이언트 사이드 캐싱

#### 4-1. 드롭다운 옵션, 코드 테이블 로컬 스토리지 캐싱

**구현 예시**:

```typescript
// lib/hooks/useStaticData.ts
import { useState, useEffect } from 'react';
import useSWR from 'swr';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;

    if (age > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage 용량 초과 등 에러 무시
  }
}

export function useCustomerGroups() {
  const cacheKey = 'admin:customer-groups';
  
  // 먼저 캐시에서 확인
  const cached = getCachedData<any[]>(cacheKey);
  const [initialData, setInitialData] = useState(cached || undefined);

  const { data, error, isLoading, mutate } = useSWR(
    cached ? null : '/api/admin/customer-groups', // 캐시가 있으면 요청 안 함
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 24 * 60 * 60 * 1000, // 24시간마다 재검증
      onSuccess: (data) => {
        // 성공 시 캐시에 저장
        if (data?.groups) {
          setCachedData(cacheKey, data.groups);
        }
      },
    }
  );

  // 캐시 데이터가 있으면 우선 사용
  const groups = data?.groups || initialData || [];

  return {
    groups,
    isLoading: isLoading && !cached,
    error,
    refresh: mutate,
  };
}
```

**적용 대상**:
- 고객 그룹 목록 (`/api/admin/customer-groups`)
- 마케팅 계정 목록 (`/api/admin/marketing/accounts`)
- 퍼널 목록 (`/api/admin/marketing/funnels`)
- 파트너 목록 (`/api/admin/affiliate/profiles`)
- 상품 코드 테이블
- 기타 변경 빈도가 낮은 마스터 데이터

**예상 효과**:
- 정적 데이터 로드 시 서버 요청 90% 감소
- 페이지 로딩 속도 향상

---

### 5단계: 차트/그래프 데이터 클라이언트 사이드 계산

#### 5-1. 대시보드 통계 데이터 사전 집계

**현재**:
```typescript
// 서버에서 모든 집계를 수행
const dashboardResponse = await fetch('/api/admin/dashboard');
```

**개선**:
```typescript
// 서버는 원시 데이터만 제공
// 클라이언트에서 집계 및 차트 데이터 생성

// lib/utils/dashboardCalculations.ts
export function calculateTrends(rawData: any[]) {
  // 클라이언트에서 트렌드 계산
  // ...
}

export function aggregateStats(dashboard: any) {
  // 클라이언트에서 통계 집계
  // ...
}

// app/admin/dashboard/page.tsx
const { dashboard: rawDashboard } = useAdminDashboard();

const calculatedStats = useMemo(() => {
  if (!rawDashboard) return null;
  
  return {
    ...rawDashboard,
    trends: calculateTrends(rawDashboard.trends),
    aggregated: aggregateStats(rawDashboard),
  };
}, [rawDashboard]);
```

**예상 효과**:
- 서버에서 집계 연산 부담 제거
- 클라이언트 CPU 활용

---

### 6단계: 페이지네이션 최적화

#### 6-1. 가상 스크롤 도입 (대용량 목록)

**라이브러리**: `react-window` 또는 `@tanstack/react-virtual`

**설치**:
```bash
npm install react-window @types/react-window
```

**구현 예시**:

```typescript
// components/admin/VirtualizedCustomerList.tsx
import { FixedSizeList } from 'react-window';

export function VirtualizedCustomerList({ customers }: { customers: Customer[] }) {
  const Row = ({ index, style }: { index: number; style: any }) => {
    const customer = customers[index];
    return (
      <div style={style}>
        {/* 고객 행 컴포넌트 */}
      </div>
    );
  };

  return (
    <FixedSizeList
      height={600}
      itemCount={customers.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**효과**:
- 수만 개의 항목도 성능 문제 없이 표시
- 모든 데이터를 한 번에 로드 가능 (페이지네이션 불필요)

---

## 📋 우선순위 작업 체크리스트

### 🔴 높은 우선순위 (즉시 진행)

1. **SWR 도입**
   - [ ] `npm install swr`
   - [ ] `lib/hooks/useAdminDashboard.ts` 생성
   - [ ] `app/admin/dashboard/page.tsx` 마이그레이션
   - [ ] 대시보드 자동 새로고침 최적화

2. **고객 목록 클라이언트 사이드 필터링**
   - [ ] `lib/hooks/useCustomers.ts` 생성
   - [ ] `app/admin/customers/page.tsx` 마이그레이션
   - [ ] 검색/필터/정렬 로직 클라이언트로 이동

3. **정적 데이터 로컬 스토리지 캐싱**
   - [ ] `lib/hooks/useStaticData.ts` 생성
   - [ ] 고객 그룹, 마케팅 계정 등에 적용

**예상 서버 부하 감소**: 70-80%

---

### 🟡 중간 우선순위 (1주일 내)

4. **다른 목록 페이지 최적화**
   - [ ] 여행 목록 (`/admin/trips`)
   - [ ] 메시지 목록 (`/admin/messages`)
   - [ ] 후기 목록 (`/admin/feedback`)
   - [ ] 파트너 목록 (`/admin/affiliate`)

5. **조건부 자동 새로고침**
   - [ ] 탭 가시성 감지
   - [ ] 사용자 활동 감지
   - [ ] 모든 대시보드 페이지에 적용

**예상 서버 부하 감소**: 추가 10-15%

---

### 🟢 낮은 우선순위 (2주일 내)

6. **차트 데이터 클라이언트 사이드 계산**
   - [ ] 통계 집계 로직 클라이언트로 이동
   - [ ] 서버는 원시 데이터만 제공

7. **가상 스크롤 도입**
   - [ ] `react-window` 설치
   - [ ] 대용량 목록 페이지에 적용

**예상 서버 부하 감소**: 추가 5-10%

---

## 🎯 전체 예상 효과

### 서버 부하 감소
- **현재**: 시간당 약 1000-2000회 API 요청 (관리자 1명 기준)
- **최적화 후**: 시간당 약 200-400회 API 요청
- **감소율**: **70-80%**

### 응답 속도 개선
- 캐시된 데이터 즉시 표시: **0ms**
- 검색/필터 즉시 반영: **0ms**
- 페이지 이동 시 추가 요청 없음

### 사용자 경험 개선
- 페이지 로딩 속도 **50% 향상**
- 검색/필터 반응성 **즉각적**
- 네트워크 오류 시 캐시 데이터 표시 가능

---

## ⚠️ 주의사항

1. **데이터 일관성**
   - 캐시된 데이터와 실제 데이터 차이 발생 가능
   - 중요한 작업(삭제, 수정) 후에는 명시적으로 캐시 무효화

2. **메모리 사용량**
   - 대량 데이터를 클라이언트에 로드하면 메모리 사용량 증가
   - 가상 스크롤 또는 페이지네이션 필요

3. **보안**
   - 민감한 데이터는 서버 사이드 처리 유지
   - 클라이언트 캐싱 시 민감 정보 제거

4. **점진적 적용**
   - 한 번에 모든 페이지 변경하지 말고 단계적으로 적용
   - 각 단계마다 테스트 및 모니터링

---

## 📚 참고 자료

- [SWR 공식 문서](https://swr.vercel.app/)
- [React Window](https://github.com/bvaughn/react-window)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)

---

**작성자**: AI Assistant  
**최종 업데이트**: 2025년 1월





