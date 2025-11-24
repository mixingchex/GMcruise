# 📊 데이터 구조 불일치 정밀 진단 보고서

**생성일**: 2025-01-27  
**분석 범위**: Prisma Schema vs 실제 코드 사용  
**중점 분석**: 대소문자 및 필드명 불일치

---

## 🔴 [1] 크루즈 상품 & Trip (가장 중요 - 심각한 불일치 발견)

### 📘 **DB 정의(Schema):**
```prisma
model CruiseProduct {
  id                 Int                 @id @default(autoincrement())
  productCode        String              @unique
  // ... 기타 필드들
  UserTrip           UserTrip[]          // ✅ 대문자 UserTrip 관계만 존재
}

model Trip {
  id               Int               @id @default(autoincrement())
  productCode      String            @unique
  shipName         String
  departureDate    DateTime
  // ❌ userId 필드 없음!
  // ❌ CruiseProduct와의 직접 관계 없음!
}

model UserTrip {
  id                 Int                  @id @default(autoincrement())
  userId             Int
  productId          Int?
  cruiseName         String?
  companionType      String?
  destination        Json?
  startDate          DateTime?
  endDate            DateTime?
  // ... 기타 필드들
  CruiseProduct      CruiseProduct?       @relation(fields: [productId], references: [id])
}
```

### 💻 **코드 사용(Current Code):**

#### ❌ **불일치 1-1: ProductDetailPage에서 존재하지 않는 Trip 관계 접근**
**위치**: `app/products/[productCode]/page.tsx:157-159`
```typescript
const product = await prisma.cruiseProduct.findUnique({
  where: { productCode },
  select: {
    // ... 기타 필드들
    Trip: {  // ❌ 존재하지 않는 관계!
      select: { id: true },
    },
  },
});
```
**문제**: `CruiseProduct` 모델에는 `Trip` 관계가 없고, `UserTrip[]` 관계만 존재합니다.

#### ❌ **불일치 1-2: Trip 모델에 userId 필드가 없는데 사용 시도**
**위치**: `app/api/trips/route.ts:25-26`
```typescript
const trips = await prisma.trip.findMany({
  where: { userId: sess.userId },  // ❌ Trip 모델에 userId 필드 없음!
  // ...
});
```
**문제**: `Trip` 모델은 `productCode`만 가지고 있고 `userId` 필드가 없습니다. 사용자별 여행은 `UserTrip` 모델을 사용해야 합니다.

#### ❌ **불일치 1-3: Trip 모델에 존재하지 않는 필드 접근**
**위치**: `app/api/trips/route.ts:28-39`
```typescript
select: {
  id: true,
  cruiseName: true,      // ❌ Trip 모델에 없음
  companionType: true,   // ❌ Trip 모델에 없음
  destination: true,     // ❌ Trip 모델에 없음
  startDate: true,       // ❌ Trip 모델에 없음 (departureDate만 있음)
  endDate: true,         // ✅ 있음
  nights: true,          // ❌ Trip 모델에 없음
  days: true,            // ❌ Trip 모델에 없음
  visitCount: true,      // ❌ Trip 모델에 없음
  createdAt: true,       // ❌ Trip 모델에 없음
}
```
**문제**: `Trip` 모델에는 `departureDate`, `shipName`, `productCode`만 있고, 나머지 필드들은 `UserTrip` 모델에 있습니다.

### 🚨 **상태**: **심각한 불일치** ⚠️

**영향도**: 
- `app/api/trips/route.ts`는 런타임 에러 발생 가능성 높음
- `app/products/[productCode]/page.tsx`의 `Trip` 관계 접근은 Prisma 에러 발생

**권장 수정**:
1. `app/api/trips/route.ts`는 `prisma.userTrip.findMany`로 변경 필요
2. `app/products/[productCode]/page.tsx`는 `UserTrip` 관계로 변경 또는 제거 필요

---

## 🟡 [2] 고객 정보 (Customer)

### 📘 **DB 정의(Schema):**
```prisma
model User {
  id          Int       @id @default(autoincrement())
  name        String?
  phone       String?
  password    String
  email       String?   @unique
  // ... 기타 필드들
}
```

### 💻 **코드 사용(Current Code):**

#### ✅ **일치: 로그인/회원가입 시 필드명 일치**
**위치**: `app/api/auth/login/route.ts:43, 395-398`
```typescript
let { phone, password, name, mode, ... } = await req.json();

// 신규 사용자 생성 시
const newUser = await prisma.user.create({
  data: {
    name: name || '3일체험고객',
    phone: phone || `test-${Date.now()}`,
    password: normalizedTestPassword,
    // ...
  },
});
```

**위치**: `app/login/page.tsx:62`
```typescript
body: JSON.stringify({ 
  phone: trimmedPhone, 
  password: trimmedPassword, 
  name: trimmedName, 
  mode: 'user' 
}),
```

### 🚨 **상태**: **일치** ✅

**비고**: 고객 등록 시 사용하는 필드명(`name`, `phone`, `password`)이 DB 스키마와 일치합니다.

---

## 🟡 [3] 어필리에이트 (Affiliate/수당)

### 📘 **DB 정의(Schema):**
```prisma
model AffiliateLink {
  id                 Int                  @id @default(autoincrement())
  code               String               @unique
  affiliateProductId Int?                 // ✅ 소문자 affiliateProductId
  productCode        String?
  // ...
  AffiliateProduct   AffiliateProduct?    @relation(fields: [affiliateProductId], references: [id])
}

model AffiliateProduct {
  id              Int               @id @default(autoincrement())
  productCode     String
  cruiseProductId Int?              // ✅ 소문자 cruiseProductId
  // ...
  CruiseProduct   CruiseProduct?    @relation(fields: [cruiseProductId], references: [id])
  AffiliateLink   AffiliateLink[]
}
```

### 💻 **코드 사용(Current Code):**

#### ✅ **일치: AffiliateLink와 AffiliateProduct 연결**
**위치**: `app/products/[productCode]/page.tsx:79-93`
```typescript
const link = await prisma.affiliateLink.findUnique({
  where: { code: linkCode },
  select: {
    id: true,
    code: true,
    productCode: true,  // ✅ 직접 필드 접근
    metadata: true,
    AffiliateProfile_AffiliateLink_managerIdToAffiliateProfile: {
      select: { affiliateCode: true },
    },
    // ...
  },
});
```

**관계 확인**: 
- `AffiliateLink.affiliateProductId` → `AffiliateProduct.id` ✅
- `AffiliateProduct.cruiseProductId` → `CruiseProduct.id` ✅
- `AffiliateLink.productCode` (직접 필드) ✅

### 🚨 **상태**: **일치** ✅

**비고**: 어필리에이트 링크와 상품 연결은 스키마와 코드가 일치합니다. `affiliateProductId`와 `cruiseProductId` 모두 소문자 camelCase로 정확히 사용되고 있습니다.

---

## 🔴 [4] 여권 & APIS (Passport)

### 📘 **DB 정의(Schema):**
```prisma
model PassportRequestLog {
  id          Int                      @id @default(autoincrement())
  userId      Int
  adminId     Int
  templateId  Int?
  // ❌ passportId 필드 없음!
  // ❌ PassportSubmission과의 직접 관계 없음!
}

model PassportSubmission {
  id          Int                       @id @default(autoincrement())
  userId      Int
  tripId      Int?                      // ✅ UserTrip과 연결
  token       String                    @unique
  // ...
  UserTrip    UserTrip?                 @relation(fields: [tripId], references: [id])
  User        User                      @relation(fields: [userId], references: [id])
}
```

### 💻 **코드 사용(Current Code):**

#### ⚠️ **주의 필요: PassportRequestLog와 PassportSubmission 간 직접 연결 없음**
**관계 구조**:
- `PassportRequestLog` → `User` (userId로 연결)
- `PassportSubmission` → `UserTrip` (tripId로 연결)
- `PassportSubmission` → `User` (userId로 연결)

**실제 연결 방식**: 
- 두 모델은 직접 연결되지 않고, `User`와 `UserTrip`을 통해 간접적으로 연결됩니다.
- `PassportRequestLog.userId`와 `PassportSubmission.userId`가 같은 사용자를 가리키는 경우가 많지만, 명시적인 관계는 없습니다.

### 🚨 **상태**: **설계상 의도된 구조** (불일치 아님) ✅

**비고**: 
- `PassportRequestLog`는 요청 로그만 저장하고, 실제 여권 데이터는 `PassportSubmission`에 저장됩니다.
- 두 모델은 `userId`를 통해 간접적으로 연결되며, `PassportSubmission`은 `tripId`를 통해 특정 여행과 연결됩니다.
- 코드에서 `passportId` 같은 필드를 찾지 않는 것이 정상입니다.

---

## 📋 종합 요약

### 🔴 **심각한 불일치 (즉시 수정 필요)**

1. **`app/api/trips/route.ts`**: 
   - `prisma.trip.findMany({ where: { userId } })` 사용
   - `Trip` 모델에 `userId` 필드 없음
   - **수정 필요**: `prisma.userTrip.findMany`로 변경

2. **`app/products/[productCode]/page.tsx`**: 
   - `Trip: { select: { id: true } }` 관계 접근
   - `CruiseProduct` 모델에 `Trip` 관계 없음
   - **수정 필요**: `UserTrip` 관계로 변경 또는 제거

3. **`app/api/trips/route.ts`**: 
   - `Trip` 모델에 존재하지 않는 필드들(`cruiseName`, `companionType`, `destination`, `startDate`, `nights`, `days`, `visitCount`, `createdAt`) 접근
   - **수정 필요**: `UserTrip` 모델 사용으로 변경

### ✅ **일치 확인**

1. **고객 정보 (Customer)**: 필드명 일치
2. **어필리에이트 (Affiliate)**: 관계 및 필드명 일치
3. **여권 (Passport)**: 설계상 의도된 구조

---

## 🎯 권장 조치사항

### 우선순위 1 (즉시 수정)
1. `app/api/trips/route.ts` 전체 로직을 `UserTrip` 모델 기반으로 재작성
2. `app/products/[productCode]/page.tsx`에서 `Trip` 관계 제거 또는 `UserTrip`으로 변경

### 우선순위 2 (검토 필요)
1. 프로젝트 전체에서 `prisma.trip` 사용처 검색 및 `UserTrip`으로 변경 여부 확인
2. `Trip` 모델과 `UserTrip` 모델의 역할 명확화 문서화

---

**보고서 작성 완료**

