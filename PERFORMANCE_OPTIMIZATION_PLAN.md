# ⚡ 성능 최적화 계획
**작성일**: 2025-11-23  
**대상**: 관리자 모드, 파트너 모드  
**목적**: 페이지 로딩 속도 및 API 응답 속도 개선

---

## 📊 현재 상태 분석

### 관리자 모드
- **페이지 수**: 77개
- **API 엔드포인트**: 244개 파일에서 DB 쿼리 사용
- **주요 페이지**:
  - 대시보드 (`/admin/dashboard`)
  - 고객 관리 (`/admin/customers`)
  - 어필리에이트 관리 (`/admin/affiliate/*`)
  - 상품 관리 (`/admin/products`)

### 파트너 모드
- **페이지 수**: 26개
- **API 엔드포인트**: 60개 파일에서 DB 쿼리 사용
- **주요 페이지**:
  - 대시보드 (`/partner/[partnerId]/dashboard`)
  - 고객 관리 (`/partner/[partnerId]/customers`)
  - 예약 관리 (`/partner/[partnerId]/reservation`)

---

## 🎯 최적화 목표

### 1. 페이지 로딩 속도
- **현재**: 3-5초
- **목표**: 1-2초 이내

### 2. API 응답 속도
- **현재**: 1-3초
- **목표**: 500ms 이내

### 3. 데이터베이스 쿼리
- **현재**: N+1 쿼리 문제 가능성
- **목표**: 최적화된 쿼리, 필요한 필드만 선택

---

## 🔧 최적화 작업 계획

### 1단계: 데이터베이스 쿼리 최적화

#### 1.1 Select 필드 최적화
**문제**: 모든 필드를 가져오는 경우
```typescript
// ❌ 나쁜 예
const users = await prisma.user.findMany();

// ✅ 좋은 예
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    phone: true,
    // 필요한 필드만 선택
  }
});
```

**대상 파일**:
- `app/api/admin/dashboard/route.ts`
- `app/api/admin/customers/route.ts`
- `app/api/partner/dashboard/stats/route.ts`
- `app/api/partner/customers/route.ts`

#### 1.2 Include 최적화
**문제**: 불필요한 관계 데이터 로딩
```typescript
// ❌ 나쁜 예
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    trips: true,
    reviews: true,
    comments: true,
    // 모든 관계를 가져옴
  }
});

// ✅ 좋은 예
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    trips: {
      select: {
        id: true,
        cruiseName: true,
        startDate: true,
        // 필요한 필드만 선택
      },
      take: 10, // 최근 10개만
    }
  }
});
```

#### 1.3 페이지네이션 개선
**문제**: 모든 데이터를 한 번에 로딩
```typescript
// ❌ 나쁜 예
const customers = await prisma.user.findMany();

// ✅ 좋은 예
const customers = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' },
});
```

**대상 페이지**:
- `/admin/customers`
- `/admin/affiliate/profiles`
- `/partner/[partnerId]/customers`

---

### 2단계: 프론트엔드 최적화

#### 2.1 데이터 페칭 최적화
**문제**: 컴포넌트 마운트 시 모든 데이터 로딩
```typescript
// ❌ 나쁜 예
useEffect(() => {
  fetchAllData();
}, []);

// ✅ 좋은 예
useEffect(() => {
  fetchInitialData(); // 필수 데이터만
}, []);

// 필요할 때 추가 데이터 로딩
const loadMore = () => {
  fetchAdditionalData();
};
```

#### 2.2 React.memo 사용
**문제**: 불필요한 리렌더링
```typescript
// ✅ 좋은 예
const CustomerCard = React.memo(({ customer }) => {
  return <div>{customer.name}</div>;
});
```

#### 2.3 가상 스크롤링
**문제**: 많은 항목을 한 번에 렌더링
**해결**: react-window 또는 react-virtual 사용

**대상 페이지**:
- 고객 목록 페이지
- 상품 목록 페이지

---

### 3단계: 캐싱 전략

#### 3.1 API 응답 캐싱
```typescript
// ✅ 좋은 예
export async function GET() {
  const cacheKey = 'dashboard-stats';
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }
  
  const data = await fetchDashboardData();
  await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5분 캐시
  
  return NextResponse.json(data);
}
```

**대상 API**:
- `/api/admin/dashboard`
- `/api/partner/dashboard/stats`
- 통계 데이터 API

#### 3.2 정적 데이터 캐싱
- 상품 목록
- 설정 데이터
- 드롭다운 옵션

---

### 4단계: 이미지 최적화

#### 4.1 이미지 지연 로딩
```typescript
// ✅ 좋은 예
<Image
  src={imageUrl}
  alt="상품 이미지"
  loading="lazy"
  width={300}
  height={200}
/>
```

#### 4.2 이미지 최적화
- WebP 형식 사용
- 적절한 크기로 리사이즈
- CDN 사용 고려

---

## 📋 작업 우선순위

### 🔴 높은 우선순위 (즉시 진행)
1. **관리자 대시보드 최적화**
   - API 쿼리 최적화
   - 필요한 필드만 선택
   - 캐싱 추가

2. **고객 목록 페이지 최적화**
   - 페이지네이션 개선
   - Select 필드 최적화
   - 가상 스크롤링 추가

3. **파트너 대시보드 최적화**
   - API 쿼리 최적화
   - 통계 데이터 캐싱

### 🟡 중간 우선순위
4. **어필리에이트 관리 페이지 최적화**
5. **상품 관리 페이지 최적화**
6. **이미지 최적화**

### 🟢 낮은 우선순위
7. **전체 페이지 React.memo 적용**
8. **전역 캐싱 시스템 구축**

---

## 🛠️ 작업 시작

### 1단계: 관리자 대시보드 최적화
- [x] API 쿼리 분석 ✅
- [x] Select 필드 최적화 ✅
  - currentTrips: take: 10 추가, select로 필요한 필드만 선택
  - productViews: select로 필요한 필드만 선택
  - recentAffiliateSales: select로 필요한 필드만 선택
- [ ] 불필요한 Include 제거 (일부 완료)
- [ ] 캐싱 추가
- [ ] 성능 측정

### 2단계: 고객 목록 페이지 최적화
- [ ] 페이지네이션 개선
- [ ] Select 필드 최적화
- [ ] 가상 스크롤링 추가
- [ ] 성능 측정

### 3단계: 파트너 대시보드 최적화
- [ ] API 쿼리 분석
- [ ] Select 필드 최적화
- [ ] 캐싱 추가
- [ ] 성능 측정

---

## 📊 성능 측정 방법

### Before/After 비교
```typescript
// 성능 측정
console.time('query-time');
const data = await prisma.user.findMany();
console.timeEnd('query-time');
```

### Lighthouse 점수
- Performance: 90+ 목표
- 현재 측정 필요

---

## ✅ 완료 체크리스트

- [ ] 관리자 대시보드 최적화
- [ ] 고객 목록 페이지 최적화
- [ ] 파트너 대시보드 최적화
- [ ] API 응답 속도 개선
- [ ] 페이지 로딩 속도 개선
- [ ] 성능 측정 및 문서화

---

**다음 단계**: 관리자 대시보드 최적화부터 시작

