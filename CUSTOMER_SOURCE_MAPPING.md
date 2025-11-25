# Customer 인터페이스 소스값 매핑 가이드

## Customer 인터페이스 구조

```typescript
interface Customer {
  id: number;
  name: string | null;
  phone: string | null; // 식별자 (로그인 ID 역할)
  
  // 1. 고객 유형 (가장 중요)
  customerType?: 
    | 'test'          // 3일 무료 체험 (비번 1101)
    | 'cruise-guide'  // 유료 서비스 고객 (비번 3800)
    | 'mall'          // 크루즈몰 일반 회원
    | 'prospect'      // 잠재 고객 (DB에는 있는데 가입 안 함)
    | 'partner'       // 파트너 (판매원/대리점장)
    | 'admin';        // 관리자

  // 2. 서비스 상태
  status?: 
    | 'active'      // 정상 이용 중
    | 'package'     // 패키지 이용 중
    | 'dormant'     // 휴면
    | 'locked'      // 잠김 (관리자 차단)
    | 'test-locked'; // 체험 기간 만료

  // 3. 역할 (권한 레벨)
  role?: 'user' | 'admin'; 

  // 4. 파트너 연결 정보 (영업 관리용)
  affiliateOwnership?: {
    ownerType: 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
    ownerName: string | null;
    managerProfile: any | null;
  } | null;

  // 5. 여행 정보 연결 (Trip 대신 UserTrip 사용!)
  trips: {
    id: number;
    cruiseName: string | null;
    startDate: string | null;
    endDate: string | null;
  }[];
}
```

## 고객 정보 소스값 매핑

### 1. customerType 결정 로직

`customerType`은 `User.customerSource`와 `User.role` 값을 기반으로 결정됩니다.

| DB 값 (customerSource) | DB 값 (role) | customerType | 설명 |
|------------------------|--------------|--------------|------|
| `'admin'` | - | `'admin'` | 관리자 |
| `'mall-admin'` | - | `'admin'` | 몰 관리자 |
| - | `'admin'` | `'admin'` | 역할이 관리자인 경우 |
| `'mall-signup'` | - | `'mall'` | 크루즈몰 회원가입 |
| - | `'community'` | `'mall'` | 커뮤니티 역할 (몰 회원) |
| `'test-guide'` | - | `'test'` | 3일 무료 체험 |
| `'test'` | - | `'test'` | 테스트 사용자 |
| `'cruise-guide'` | - | `'cruise-guide'` | 유료 서비스 고객 |
| `'affiliate-manual'` | - | `'prospect'` | 판매원이 수동 등록한 잠재 고객 |
| `'product-inquiry'` | - | `'prospect'` | 상품 문의 고객 |
| `'phone-consultation'` | - | `'prospect'` | 전화 상담 신청 고객 |
| `null` 또는 기타 | `'admin'` | `'admin'` | 역할이 관리자인 경우 |
| `null` 또는 기타 | 기타 | `'prospect'` | 기본값 (잠재 고객) |

**매핑 함수 위치**: `app/api/partner/customers/route.ts`의 `determineCustomerType` 함수

### 2. status 결정 로직

`status`는 `User.customerStatus` 또는 `AffiliateLead.status` 값을 기반으로 결정됩니다.

| DB 값 (customerStatus) | status | 설명 |
|------------------------|-------|------|
| `'purchase_confirmed'` | `'package'` | 패키지 구매 완료 |
| `'active'` | `'active'` | 정상 이용 중 |
| `'package'` | `'package'` | 패키지 이용 중 |
| `'dormant'` | `'dormant'` | 휴면 상태 |
| `'locked'` | `'locked'` | 잠김 (관리자 차단) |
| `'test-locked'` | `'test-locked'` | 체험 기간 만료 |
| 기타 | `'active'` | 기본값 |

**우선순위**:
1. `User.customerStatus` (있으면)
2. `AffiliateLead.status` (User가 없으면)
3. `'active'` (기본값)

### 3. role 결정 로직

| DB 값 (User.role) | role | 설명 |
|-------------------|------|------|
| `'admin'` | `'admin'` | 관리자 권한 |
| `'user'` | `'user'` | 일반 사용자 |
| `'community'` | `'user'` | 커뮤니티 회원 (일반 사용자로 처리) |
| `null` | `'user'` | 기본값 |

### 4. affiliateOwnership 결정 로직

`affiliateOwnership`은 `AffiliateLead`의 `agentId`와 `managerId`를 기반으로 결정됩니다.

| 조건 | ownerType | ownerName | managerProfile |
|------|-----------|-----------|----------------|
| `lead.agentId === profile.id` | `'SALES_AGENT'` | 판매원 이름 | 대리점장 정보 (있으면) |
| `lead.managerId === profile.id` | `'BRANCH_MANAGER'` | 대리점장 이름 | `null` |
| 기타 | `null` | - | - |

### 5. trips 결정 로직

`trips`는 `User.userTrips`에서 가져옵니다.

- `User`가 있으면: `User.userTrips`에서 최신 여행 정보를 가져옴
- `User`가 없으면: 빈 배열 `[]`

**데이터 구조**:
```typescript
trips: {
  id: number;
  cruiseName: string | null;
  startDate: string | null; // ISO string
  endDate: string | null;   // ISO string
}[]
```

## 주요 customerSource 값 목록

### 실제 사용되는 customerSource 값들:

1. **`'test-guide'`** → `customerType: 'test'`
   - 3일 무료 체험 사용자
   - 비밀번호: `1101`

2. **`'cruise-guide'`** → `customerType: 'cruise-guide'`
   - 유료 서비스 고객
   - 비밀번호: `3800`

3. **`'mall-signup'`** → `customerType: 'mall'`
   - 크루즈몰 회원가입 고객
   - `role: 'community'`와 함께 사용

4. **`'affiliate-manual'`** → `customerType: 'prospect'`
   - 판매원이 수동으로 등록한 잠재 고객

5. **`'product-inquiry'`** → `customerType: 'prospect'`
   - 상품 문의 고객

6. **`'phone-consultation'`** → `customerType: 'prospect'`
   - 전화 상담 신청 고객

7. **`'admin'`** → `customerType: 'admin'`
   - 관리자

8. **`'mall-admin'`** → `customerType: 'admin'`
   - 몰 관리자

9. **`'landing-page'`** → (특별 처리 없음, 기본값 `'prospect'`)
   - 랜딩페이지로 유입된 고객

## 구현 위치

- **타입 정의**: `types/customer.ts`
- **매핑 로직**: `app/api/partner/customers/route.ts` (line 369-390)
- **사용 예시**: `app/admin/customers/page.tsx`, `components/admin/CustomerTable.tsx`

## 주의사항

1. **User가 없는 경우**: `AffiliateLead`만 있는 경우 `customerType`은 `'prospect'`로 설정됩니다.

2. **status 매핑**: DB의 `customerStatus` 값 `'purchase_confirmed'`는 Customer 인터페이스의 `status: 'package'`로 매핑됩니다.

3. **trips 배열**: 항상 배열이어야 하며, `User`가 없으면 빈 배열 `[]`을 반환합니다.

4. **affiliateOwnership**: `AffiliateLead`의 소유권 정보가 없으면 `null`을 반환합니다.





