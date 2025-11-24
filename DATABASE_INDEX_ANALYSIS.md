# 📊 데이터베이스 인덱스 분석 및 최적화
**작성일**: 2025-11-23  
**목적**: 실제 쿼리 패턴 분석 및 최적 인덱스 추가

---

## 🔍 쿼리 패턴 분석

### 1. User 테이블 쿼리 패턴

#### 패턴 1: 관리자 고객 목록 조회 (`/api/admin/customers`)
**WHERE 조건 조합**:
```typescript
{
  role: { not: 'admin' },
  customerStatus: 'active' | 'hibernated' | 'locked' | null,
  isHibernated: true | false,
  isLocked: true | false,
  updatedAt: { gte: startDate, lte: endDate }, // 월별 필터
  // 검색: name, phone, email contains
}
```

**ORDER BY**:
- `createdAt` (기본)
- `name`
- `tripCount`
- `lastActiveAt`

**현재 인덱스**:
- ✅ `@@index([role])`
- ✅ `@@index([role, customerStatus])`
- ✅ `@@index([isHibernated, lastActiveAt])`
- ✅ `@@index([customerStatus])`
- ✅ `@@index([createdAt])`
- ✅ `@@index([lastActiveAt])`

**부족한 인덱스**:
- ❌ `[role, isHibernated, customerStatus]` - 활성/동면 필터링
- ❌ `[role, updatedAt]` - 월별 필터링
- ❌ `[role, customerStatus, updatedAt]` - 인증서 처리 날짜 필터

#### 패턴 2: 관리자 대시보드 통계 (`/api/admin/dashboard`)
**WHERE 조건**:
```typescript
// 활성 사용자
{ isHibernated: false }
// 동면 사용자
{ isHibernated: true }
// 지니 사용자
{ role: 'user' }
// 크루즈몰 사용자
{ role: 'community' }
```

**현재 인덱스**: 충분함 ✅

---

### 2. AffiliateSale 테이블 쿼리 패턴

#### 패턴 1: 파트너 대시보드 (`/api/partner/dashboard/stats`)
**WHERE 조건 조합**:
```typescript
{
  OR: [
    { managerId: profile.id },
    { agentId: profile.id }
  ],
  saleDate: { gte: startDate, lte: endDate }, // 월별 필터
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}
```

**ORDER BY**:
- `saleDate desc`
- `createdAt desc`

**현재 인덱스**:
- ✅ `@@index([agentId])`
- ✅ `@@index([managerId])`
- ✅ `@@index([saleDate])`
- ✅ `@@index([status])`

**부족한 인덱스**:
- ❌ `[managerId, status, saleDate]` - 대리점장 판매 조회
- ❌ `[agentId, status, saleDate]` - 판매원 판매 조회
- ❌ `[managerId, saleDate]` - 월별 판매 통계
- ❌ `[agentId, saleDate]` - 월별 판매 통계

#### 패턴 2: 관리자 대시보드 어필리에이트 통계
**WHERE 조건**:
```typescript
// 최근 판매
{ orderBy: { saleDate: 'desc' }, take: 5 }
```

**현재 인덱스**: `[saleDate]` 있음 ✅

---

### 3. Trip 테이블 쿼리 패턴

#### 패턴 1: 관리자 대시보드 현재 여행
**WHERE 조건**:
```typescript
{
  status: 'InProgress',
  orderBy: { startDate: 'asc' }
}
```

**현재 인덱스**:
- ✅ `@@index([userId, status])`
- ✅ `@@index([startDate])`

**부족한 인덱스**:
- ❌ `[status, startDate]` - 상태별 날짜 정렬

---

### 4. CommunityPost 테이블 쿼리 패턴

#### 패턴 1: 커뮤니티 게시글 목록
**WHERE 조건**:
```typescript
{
  category: 'cruisedot-news' | 'review' | 'question',
  isDeleted: false,
  orderBy: { createdAt: 'desc' }
}
```

**현재 인덱스**:
- ✅ `@@index([category, isDeleted])`
- ✅ `@@index([createdAt])`
- ✅ `@@index([isDeleted, createdAt])`

**현재 인덱스**: 충분함 ✅

---

## 🎯 권장 인덱스 추가

### User 테이블
```prisma
model User {
  // ... 기존 필드
  
  // 추가 권장 인덱스
  @@index([role, isHibernated, customerStatus])  // 활성/동면 필터링
  @@index([role, updatedAt])                    // 월별 필터링
  @@index([role, customerStatus, updatedAt])    // 인증서 처리 날짜 필터
  @@index([role, createdAt])                    // 역할별 가입일 정렬
}
```

### AffiliateSale 테이블
```prisma
model AffiliateSale {
  // ... 기존 필드
  
  // 추가 권장 인덱스
  @@index([managerId, status, saleDate])        // 대리점장 판매 조회
  @@index([agentId, status, saleDate])          // 판매원 판매 조회
  @@index([managerId, saleDate])                // 대리점장 월별 통계
  @@index([agentId, saleDate])                  // 판매원 월별 통계
}
```

### Trip 테이블
```prisma
model Trip {
  // ... 기존 필드
  
  // 추가 권장 인덱스
  @@index([status, startDate])                  // 상태별 날짜 정렬
}
```

---

## 📋 인덱스 추가 계획

### 1단계: User 테이블 인덱스 추가
- [ ] `[role, isHibernated, customerStatus]`
- [ ] `[role, updatedAt]`
- [ ] `[role, customerStatus, updatedAt]`
- [ ] `[role, createdAt]`

### 2단계: AffiliateSale 테이블 인덱스 추가
- [ ] `[managerId, status, saleDate]`
- [ ] `[agentId, status, saleDate]`
- [ ] `[managerId, saleDate]`
- [ ] `[agentId, saleDate]`

### 3단계: Trip 테이블 인덱스 추가
- [ ] `[status, startDate]`

---

## ⚠️ 주의사항

### 인덱스 추가 시 고려사항
1. **인덱스 개수 제한**: 너무 많은 인덱스는 INSERT/UPDATE 성능 저하
2. **카디널리티**: 높은 카디널리티 필드를 앞에 배치
3. **쿼리 패턴**: 실제 사용되는 쿼리 패턴에 맞춰 설계

### 권장 순서
1. **높은 카디널리티 필드** → **낮은 카디널리티 필드**
2. **WHERE 조건** → **ORDER BY 조건**

---

## 🚀 다음 단계

1. 스키마 파일에 인덱스 추가
2. 마이그레이션 생성 및 실행
3. 성능 측정 (Before/After)










