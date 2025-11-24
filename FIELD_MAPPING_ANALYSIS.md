# 📊 필드 매칭 분석표 (Trip → UserTrip 변환 규칙)

**생성일**: 2025-01-27  
**목적**: `prisma.trip` → `prisma.userTrip` 전환 시 필드명 변환 규칙 정의

---

## 🔍 모델 필드 비교

### Trip 모델 필드
```prisma
model Trip {
  id               Int       @id
  productCode      String    @unique  // ⚠️ UserTrip에는 없음 (관계로 접근)
  shipName         String              // ⚠️ UserTrip에는 없음 (관계로 접근)
  departureDate    DateTime            // → UserTrip.startDate
  googleFolderId   String?             // ⚠️ UserTrip에는 없음 (위험!)
  spreadsheetId    String?             // ⚠️ UserTrip에는 없음 (위험!)
  status           String              // ✅ 동일
  endDate          DateTime?           // ✅ 동일
  // ❌ userId 없음!
  // ❌ cruiseName, companionType, destination, nights, days, visitCount 없음!
}
```

### UserTrip 모델 필드
```prisma
model UserTrip {
  id                 Int
  userId             Int              // ✅ Trip에는 없음
  productId          Int?             // → CruiseProduct.id
  reservationCode    String?
  cruiseName         String?          // ✅ Trip에는 없음
  companionType      String?           // ✅ Trip에는 없음
  destination        Json?             // ✅ Trip에는 없음
  startDate          DateTime?         // ← Trip.departureDate
  endDate            DateTime?         // ✅ 동일
  nights             Int               // ✅ Trip에는 없음
  days               Int               // ✅ Trip에는 없음
  visitCount         Int               // ✅ Trip에는 없음
  status             String            // ✅ 동일
  createdAt          DateTime          // ✅ Trip에는 없음
  updatedAt          DateTime          // ✅ Trip에는 없음
  CruiseProduct      CruiseProduct?    // 관계로 productCode, shipName 접근
}
```

---

## 📋 필드 변환 규칙표

| Trip 필드 | UserTrip 필드 | 변환 방법 | 위험도 | 비고 |
|-----------|---------------|-----------|--------|------|
| `id` | `id` | ✅ 직접 매핑 | 🟢 안전 | 동일 |
| `productCode` | `CruiseProduct.productCode` | 🔄 관계 접근 필요 | 🟡 주의 | `include: { CruiseProduct: { select: { productCode: true } } }` |
| `shipName` | `CruiseProduct.shipName` | 🔄 관계 접근 필요 | 🟡 주의 | `include: { CruiseProduct: { select: { shipName: true } } }` |
| `departureDate` | `startDate` | ✅ 직접 매핑 | 🟢 안전 | 필드명만 변경 |
| `endDate` | `endDate` | ✅ 직접 매핑 | 🟢 안전 | 동일 |
| `status` | `status` | ✅ 직접 매핑 | 🟢 안전 | 동일 |
| `googleFolderId` | ❌ 없음 | ⚠️ **매핑 불가** | 🔴 **위험** | UserTrip에는 이 필드가 없음 |
| `spreadsheetId` | ❌ 없음 | ⚠️ **매핑 불가** | 🔴 **위험** | UserTrip에는 이 필드가 없음 |
| `userId` | `userId` | ✅ 직접 매핑 | 🟢 안전 | Trip에는 없지만 UserTrip에는 있음 |
| `cruiseName` | `cruiseName` | ✅ 직접 매핑 | 🟢 안전 | Trip에는 없지만 UserTrip에는 있음 |
| `companionType` | `companionType` | ✅ 직접 매핑 | 🟢 안전 | Trip에는 없지만 UserTrip에는 있음 |
| `destination` | `destination` | ✅ 직접 매핑 | 🟢 안전 | Trip에는 없지만 UserTrip에는 있음 |
| `startDate` | `startDate` | ✅ 직접 매핑 | 🟢 안전 | Trip에는 없지만 UserTrip에는 있음 |
| `nights` | `nights` | ✅ 직접 매핑 | 🟢 안전 | Trip에는 없지만 UserTrip에는 있음 |
| `days` | `days` | ✅ 직접 매핑 | 🟢 안전 | Trip에는 없지만 UserTrip에는 있음 |
| `visitCount` | `visitCount` | ✅ 직접 매핑 | 🟢 안전 | Trip에는 없지만 UserTrip에는 있음 |

---

## 🚨 주요 위험 사항

### 1. `googleFolderId`, `spreadsheetId` 필드 없음
- **위험도**: 🔴 **높음**
- **문제**: `Trip` 모델에만 있는 필드로, `UserTrip`에는 존재하지 않음
- **영향 파일**:
  - `app/api/admin/apis/product-apis-list/route.ts` (line 115-116)
  - `app/api/admin/users/[userId]/route.ts` (line 247-248, 421-422)
  - `app/admin/customers/[userId]/page.tsx` (line 1771-1801)
- **해결 방안**:
  1. `UserTrip` 모델에 필드 추가 (스키마 변경 필요)
  2. 별도 테이블로 분리
  3. `CruiseProduct`에 저장 (상품별로 관리)

### 2. `productCode`로 조회하는 경우
- **위험도**: 🟡 **중간**
- **문제**: `Trip`은 `productCode`가 unique이지만, `UserTrip`은 `productId`로 관계 접근
- **영향 파일**:
  - `app/api/admin/apis/add-customer/route.ts` (line 77)
  - `app/api/admin/apis/generate-by-product/route.ts` (line 81)
  - `app/api/admin/apis/product-apis-list/route.ts` (line 112)
  - `app/api/admin/apis/excel/route.ts` (line 76)
  - `app/api/admin/apis/customer-detail/route.ts` (line 95)
  - `app/api/admin/users/[userId]/route.ts` (line 142, 245, 419)
- **해결 방안**:
  ```typescript
  // ❌ 기존
  const trip = await prisma.trip.findUnique({
    where: { productCode: productCode },
  });
  
  // ✅ 변경
  const cruiseProduct = await prisma.cruiseProduct.findUnique({
    where: { productCode: productCode },
    include: { UserTrip: true },
  });
  // 또는
  const userTrip = await prisma.userTrip.findFirst({
    where: {
      CruiseProduct: { productCode: productCode },
    },
  });
  ```

### 3. `userId` 필드 없음
- **위험도**: 🔴 **높음**
- **문제**: `Trip` 모델에는 `userId`가 없어서 고객별 조회 불가능
- **영향 파일**: 모든 `where: { userId: ... }` 사용하는 파일
- **해결 방안**: `UserTrip` 사용으로 자동 해결

---

## 📁 파일별 필드 사용 분석

### ✅ 이미 수정 완료 (안전)
1. `app/api/trips/route.ts` - ✅ `userTrip` 사용, 필드명 일치
2. `app/api/trips/latest/route.ts` - ✅ `userTrip` 사용, 필드명 일치
3. `app/api/trips/last-completed/route.ts` - ✅ `userTrip` 사용, 필드명 일치
4. `app/api/trips/[tripId]/route.ts` - ✅ `userTrip` 사용, 필드명 일치
5. `app/api/trips/list/route.ts` - ✅ `userTrip` 사용, 필드명 일치
6. `app/api/trips/has/route.ts` - ✅ `userTrip` 사용, 필드명 일치

### 🔴 수정 필요 (위험)

#### 1. `app/api/admin/apis/add-customer/route.ts`
- **사용 필드**: `trip.id` (line 76-79, 91, 99)
- **변환**: `productCode` → `CruiseProduct.productCode` 조회 필요
- **위험도**: 🟡 중간

#### 2. `app/api/admin/apis/generate-by-product/route.ts`
- **사용 필드**: `trip.id`, `trip.productCode`, `trip.shipName`, `trip.departureDate` (line 80-88)
- **변환**: 
  - `trip.productCode` → `CruiseProduct.productCode`
  - `trip.shipName` → `CruiseProduct.shipName`
  - `trip.departureDate` → `UserTrip.startDate`
- **위험도**: 🟡 중간

#### 3. `app/api/admin/apis/product-apis-list/route.ts`
- **사용 필드**: `trip.id`, `trip.googleFolderId`, `trip.spreadsheetId` (line 111-118)
- **변환**: `googleFolderId`, `spreadsheetId`는 UserTrip에 없음! ⚠️
- **위험도**: 🔴 **높음** (필드 없음)

#### 4. `app/api/admin/apis/excel/route.ts`
- **사용 필드**: `trip.id` (line 75-80)
- **변환**: `productCode` → `CruiseProduct.productCode` 조회 필요
- **위험도**: 🟡 중간

#### 5. `app/api/admin/apis/customer-detail/route.ts`
- **사용 필드**: `trip.id` (line 94-97)
- **변환**: `productCode` → `CruiseProduct.productCode` 조회 필요
- **위험도**: 🟡 중간

#### 6. `app/api/admin/customers/[userId]/passport/route.ts`
- **사용 필드**: `trip.id` (line 97-107, 116-119, 125-133)
- **특이사항**: `Trip.create` 사용 (line 125) - 임시 Trip 생성
- **위험도**: 🔴 **높음** (Trip 생성 로직)

#### 7. `app/api/admin/users/[userId]/route.ts`
- **사용 필드**: `trip.id`, `trip.googleFolderId`, `trip.spreadsheetId` (line 141-144, 244-254, 418-432)
- **변환**: `googleFolderId`, `spreadsheetId`는 UserTrip에 없음! ⚠️
- **위험도**: 🔴 **높음** (필드 없음)

#### 8. `app/api/admin/analytics/route.ts`
- **사용 필드**: `trip.departureDate`, `trip.endDate`, `trip.Itinerary` (line 176-198, 365-372)
- **변환**: `departureDate` → `startDate`
- **위험도**: 🟡 중간

#### 9. `app/api/admin/dashboard/route.ts`
- **사용 필드**: `trip.status`, `trip.cruiseName`, `trip.startDate`, `trip.endDate`, `trip.destination`, `trip.User` (line 115-141)
- **변환**: 
  - `trip.User` → `userTrip.User` (관계명 동일)
  - 나머지는 필드명 일치
- **위험도**: 🟡 중간 (관계명 확인 필요)

#### 10. `app/api/cms/products/route.ts`
- **사용 필드**: `trip.productId` (line 212-214)
- **변환**: `productId`는 UserTrip에 있음! ✅
- **위험도**: 🟢 안전

#### 11. `app/api/chat/route.ts`
- **사용 필드**: `trip.cruiseName`, `trip.destination`, `trip.startDate`, `trip.endDate` (line 988-999)
- **변환**: 필드명 일치 ✅
- **위험도**: 🟢 안전

#### 12. `app/api/dday/today/route.ts`
- **사용 필드**: `trip.cruiseName`, `trip.destination`, `trip.startDate`, `trip.endDate` (line 12-15)
- **변환**: 필드명 일치 ✅
- **위험도**: 🟢 안전

#### 13. `app/api/expenses/route.ts`
- **사용 필드**: `trip.id`, `trip.userId` (line 63-65)
- **변환**: `trip.userId`는 Trip에 없음! (이미 에러 가능성)
- **위험도**: 🟡 중간

#### 14. `app/api/ask/route.ts`
- **사용 필드**: `trip.cruiseName`, `trip.destination`, `trip.startDate`, `trip.endDate`, `trip.status` (line 26-36)
- **변환**: 필드명 일치 ✅
- **위험도**: 🟢 안전

#### 15. `app/api/trips/auto-create/route.ts`
- **사용 필드**: `trip.id`, `trip.userId`, `trip.productId`, `trip.reservationCode`, `trip.cruiseName`, `trip.companionType`, `trip.destination`, `trip.startDate`, `trip.endDate`, `trip.nights`, `trip.days`, `trip.visitCount`, `trip.status` (line 88-103)
- **변환**: `Trip.create` → `UserTrip.create` (필드명 일치)
- **위험도**: 🟢 안전

#### 16. `app/api/trips/[tripId]/memories/route.ts`
- **사용 필드**: `trip.id`, `trip.userId`, `trip.cruiseName`, `trip.startDate`, `trip.endDate`, `trip.nights`, `trip.days`, `trip.itineraries` (line 22-32)
- **변환**: 
  - `trip.itineraries` → `userTrip.Itinerary` (관계명 변경)
  - 나머지는 필드명 일치
- **위험도**: 🟡 중간 (관계명 확인 필요)

#### 17. `app/api/feedback/route.ts`
- **사용 필드**: 확인 필요
- **위험도**: 🟡 확인 필요

#### 18. `app/components/OnboardingCard.tsx`
- **사용 필드**: 확인 필요
- **위험도**: 🟡 확인 필요

---

## 📊 수정 우선순위

### 🔴 즉시 수정 필요 (위험 필드 사용)
1. `app/api/admin/apis/product-apis-list/route.ts` - `googleFolderId`, `spreadsheetId`
2. `app/api/admin/users/[userId]/route.ts` - `googleFolderId`, `spreadsheetId`
3. `app/api/admin/customers/[userId]/passport/route.ts` - `Trip.create` 사용

### 🟡 주의해서 수정 (productCode 조회)
4. `app/api/admin/apis/add-customer/route.ts`
5. `app/api/admin/apis/generate-by-product/route.ts`
6. `app/api/admin/apis/excel/route.ts`
7. `app/api/admin/apis/customer-detail/route.ts`
8. `app/api/admin/analytics/route.ts`
9. `app/api/admin/dashboard/route.ts`

### 🟢 안전하게 수정 (필드명 일치)
10. `app/api/chat/route.ts`
11. `app/api/dday/today/route.ts`
12. `app/api/ask/route.ts`
13. `app/api/trips/auto-create/route.ts`
14. `app/api/expenses/route.ts` (userId 확인 필요)
15. `app/api/trips/[tripId]/memories/route.ts` (관계명 확인)

---

## ⚠️ 결정 필요 사항

### 1. `googleFolderId`, `spreadsheetId` 처리 방안
- **옵션 A**: `UserTrip` 모델에 필드 추가 (스키마 변경)
- **옵션 B**: 별도 테이블로 분리
- **옵션 C**: `CruiseProduct`에 저장 (상품별 관리)
- **옵션 D**: 해당 기능 제거 또는 비활성화

### 2. `productCode`로 조회하는 경우
- **옵션 A**: `CruiseProduct`를 먼저 조회한 후 `UserTrip` 조회
- **옵션 B**: `UserTrip`에서 `CruiseProduct.productCode`로 필터링

### 3. `Trip.create` 사용하는 경우
- **옵션 A**: `UserTrip.create`로 변경 (userId 필수)
- **옵션 B**: 임시 Trip 생성 로직 재설계

---

**분석 완료일**: 2025-01-27  
**다음 단계**: 사용자 확인 후 수정 진행

