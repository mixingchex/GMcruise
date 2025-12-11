# 가격 자동화 시스템 계획

## 개요

크루즈 상품의 기간별 가격 관리 및 수당 자동 계산 시스템

## 사용자 요구사항

1. **최고가(정가)**: 상품별 최고가 등록 → 할인율 계산 기준
2. **기간별 가격**: 판매 기간에 따른 가격 차등 (예: 11월 1-29일 = X가격, 12월 1-31일 = Y가격)
3. **객실별 가격**: 각 기간마다 객실 타입별(발코니, 오션뷰, 인사이드 등) 가격 설정
4. **판매가 + 입금가**: 둘 다 기간별로 변경됨
5. **달력 기반 기간 설정**: 사용자가 달력에서 시작일/종료일 선택
6. **기간 중복 없음**: 한 상품에 대해 기간이 겹치지 않음
7. **과거 가격 조회**: 판매 기록 확인 시 해당 시점 가격 조회 필요
8. **수당 자동 연동**: 가격 설정 시 판매원/대리점장 수당 자동 계산

---

## 데이터베이스 스키마 설계

### 1. ProductMaxPrice (신규 테이블) - 상품별 최고가

```prisma
model ProductMaxPrice {
  id              Int       @id @default(autoincrement())
  cruiseProductId Int       @unique
  cabinType       String
  maxPrice        Int       // 최고가 (정가)
  currency        String    @default("KRW")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  CruiseProduct   CruiseProduct @relation(fields: [cruiseProductId], references: [id], onDelete: Cascade)

  @@unique([cruiseProductId, cabinType])
  @@index([cruiseProductId])
}
```

### 2. ProductPricePeriod (신규 테이블) - 기간별 가격

```prisma
model ProductPricePeriod {
  id              Int       @id @default(autoincrement())
  cruiseProductId Int
  name            String    // 기간명 (예: "조기예약 할인", "성수기 가격")
  startDate       DateTime  // 기간 시작일
  endDate         DateTime  // 기간 종료일
  isActive        Boolean   @default(true)
  metadata        Json?     // 추가 메타데이터
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  CruiseProduct       CruiseProduct          @relation(fields: [cruiseProductId], references: [id], onDelete: Cascade)
  ProductCabinPrice   ProductCabinPrice[]

  @@index([cruiseProductId])
  @@index([startDate, endDate])
  @@index([isActive])
}
```

### 3. ProductCabinPrice (신규 테이블) - 기간별 객실 가격

```prisma
model ProductCabinPrice {
  id                   Int       @id @default(autoincrement())
  productPricePeriodId Int
  cabinType            String    // 객실 타입 (발코니, 오션뷰 등)
  fareCategory         String    // 요금 카테고리 (adult, adult3rd, child2to11, infantUnder2)
  fareLabel            String?   // 표시용 라벨
  saleAmount           Int       // 판매가
  costAmount           Int       // 입금가 (원가)
  netRevenue           Int?      // 순매출 (saleAmount - costAmount, 자동계산)
  currency             String    @default("KRW")
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  ProductPricePeriod   ProductPricePeriod @relation(fields: [productPricePeriodId], references: [id], onDelete: Cascade)

  @@unique([productPricePeriodId, cabinType, fareCategory])
  @@index([productPricePeriodId])
  @@index([cabinType])
}
```

### 4. CruiseProduct 수정 (기존 테이블)

```prisma
model CruiseProduct {
  // ... 기존 필드들 ...

  // 추가 필드
  maxPrice           Int?      // 대표 최고가 (메인 객실 기준)

  // 관계 추가
  ProductMaxPrice    ProductMaxPrice[]
  ProductPricePeriod ProductPricePeriod[]
}
```

---

## 수당 계산 로직

### 수당 분배 구조 (기존 유지)

```
판매가 - 입금가 = 순매출
순매출 = 본사수당 + 대리점장수당 + 판매원수당
```

### 시나리오별 수당 계산

1. **대리점장 직접 판매**
   - 본사수당: hqShareAmount
   - 대리점장수당: branchShareAmount + salesShareAmount

2. **팀(판매원) 판매**
   - 본사수당: hqShareAmount
   - 대리점장수당: branchShareAmount
   - 판매원수당: salesShareAmount

3. **본사 직접 판매**
   - 본사수당: hqShareAmount + branchShareAmount + salesShareAmount

### 자동 연동 로직

```typescript
// 기간별 가격 저장 시 AffiliateCommissionTier 자동 생성/업데이트
async function syncCommissionTiers(
  productPricePeriodId: number,
  cabinPrices: ProductCabinPrice[]
) {
  for (const price of cabinPrices) {
    const netRevenue = price.saleAmount - price.costAmount;

    // 기본 수당 비율 (설정 가능)
    const hqShare = Math.floor(netRevenue * 0.3);      // 30% 본사
    const branchShare = Math.floor(netRevenue * 0.4); // 40% 대리점장
    const salesShare = netRevenue - hqShare - branchShare; // 나머지 판매원

    await prisma.affiliateCommissionTier.upsert({
      where: {
        affiliateProductId_cabinType_fareCategory_fareLabel: {
          affiliateProductId,
          cabinType: price.cabinType,
          fareCategory: price.fareCategory,
          fareLabel: price.fareLabel || '',
        }
      },
      create: {
        affiliateProductId,
        cabinType: price.cabinType,
        fareCategory: price.fareCategory,
        fareLabel: price.fareLabel,
        saleAmount: price.saleAmount,
        costAmount: price.costAmount,
        hqShareAmount: hqShare,
        branchShareAmount: branchShare,
        salesShareAmount: salesShare,
      },
      update: {
        saleAmount: price.saleAmount,
        costAmount: price.costAmount,
        hqShareAmount: hqShare,
        branchShareAmount: branchShare,
        salesShareAmount: salesShare,
      }
    });
  }
}
```

---

## API 엔드포인트

### 1. 기간별 가격 관리

```
POST   /api/admin/products/[productCode]/price-periods
GET    /api/admin/products/[productCode]/price-periods
PUT    /api/admin/products/[productCode]/price-periods/[periodId]
DELETE /api/admin/products/[productCode]/price-periods/[periodId]
```

### 2. 객실별 가격 관리

```
POST   /api/admin/products/[productCode]/price-periods/[periodId]/cabin-prices
PUT    /api/admin/products/[productCode]/price-periods/[periodId]/cabin-prices/[priceId]
DELETE /api/admin/products/[productCode]/price-periods/[periodId]/cabin-prices/[priceId]
```

### 3. 최고가 관리

```
POST   /api/admin/products/[productCode]/max-prices
PUT    /api/admin/products/[productCode]/max-prices
GET    /api/admin/products/[productCode]/max-prices
```

### 4. 현재 적용 가격 조회 (Mall용)

```
GET    /api/mall/products/[productCode]/current-price
       - 현재 날짜 기준 적용 가격 반환
       - 할인율 계산 포함
```

### 5. 특정 시점 가격 조회 (판매 기록용)

```
GET    /api/admin/products/[productCode]/price-at?date=YYYY-MM-DD
       - 특정 날짜의 적용 가격 반환
       - 판매 기록 조회 시 사용
```

---

## UI 컴포넌트

### 1. 가격 기간 관리 (관리자 페이지)

```
/app/admin/products/[productCode]/pricing/page.tsx
```

- 달력 기반 기간 선택
- 기간 목록 표시 (시작일-종료일, 상태)
- 기간별 객실 가격 편집 모달

### 2. 최고가 설정

```
/components/admin/MaxPriceEditor.tsx
```

- 객실 타입별 최고가 설정
- 메인 최고가 (대표 가격) 자동 설정

### 3. 기간별 가격표 에디터

```
/components/admin/PeriodPricingEditor.tsx
```

- 기간 선택 달력
- 객실 타입 × 연령 카테고리 매트릭스
- 판매가 / 입금가 동시 입력
- 순매출 및 수당 자동 계산 미리보기

### 4. Mall 할인 표시

```
/components/mall/ProductPriceDisplay.tsx
```

- 최고가 취소선 표시
- 현재 할인가 강조
- 할인율 배지 (예: "30% OFF")

---

## 구현 순서

### Phase 1: 데이터베이스 스키마
1. Prisma 스키마에 신규 테이블 추가
2. 마이그레이션 실행
3. 기존 데이터 마이그레이션 (basePrice → ProductPricePeriod)

### Phase 2: API 개발
1. 기간별 가격 CRUD API
2. 최고가 설정 API
3. 현재/과거 가격 조회 API
4. 수당 자동 연동 로직

### Phase 3: 관리자 UI
1. 최고가 설정 컴포넌트
2. 기간 관리 달력 UI
3. 기간별 가격표 에디터
4. 수당 미리보기 기능

### Phase 4: Mall 연동
1. 상품 상세 페이지 할인가 표시
2. 할인율 계산 및 배지 표시
3. 상품 목록 할인 정보 표시

### Phase 5: 판매 기록 연동
1. 판매 시점 가격 스냅샷 저장
2. 판매 기록 조회 시 해당 가격 표시

---

## 할인율 계산 공식

```typescript
// 할인율 계산
function calculateDiscountRate(maxPrice: number, currentPrice: number): number {
  if (maxPrice <= 0) return 0;
  const discount = ((maxPrice - currentPrice) / maxPrice) * 100;
  return Math.round(discount); // 정수로 반올림
}

// 예시:
// 최고가: 1,000,000원
// 현재가: 700,000원
// 할인율: (1,000,000 - 700,000) / 1,000,000 * 100 = 30%
```

---

## 현재 날짜 기준 가격 조회 로직

```typescript
async function getCurrentPrice(productCode: string, cabinType: string) {
  const now = new Date();

  const period = await prisma.productPricePeriod.findFirst({
    where: {
      CruiseProduct: { productCode },
      startDate: { lte: now },
      endDate: { gte: now },
      isActive: true,
    },
    include: {
      ProductCabinPrice: {
        where: { cabinType },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  if (!period) {
    // 적용 기간 없으면 기본가격 사용
    return null;
  }

  return period.ProductCabinPrice;
}
```

---

## 데이터 마이그레이션 계획

기존 `basePrice` 데이터를 새 구조로 마이그레이션:

```typescript
async function migrateExistingPrices() {
  const products = await prisma.cruiseProduct.findMany({
    where: { basePrice: { not: null } },
  });

  for (const product of products) {
    // 기본 기간 생성 (현재~미래)
    const period = await prisma.productPricePeriod.create({
      data: {
        cruiseProductId: product.id,
        name: '기본 가격',
        startDate: new Date(),
        endDate: new Date('2099-12-31'),
        isActive: true,
      },
    });

    // 기본 객실 가격 생성
    await prisma.productCabinPrice.create({
      data: {
        productPricePeriodId: period.id,
        cabinType: 'standard',
        fareCategory: 'adult',
        saleAmount: product.basePrice,
        costAmount: Math.floor(product.basePrice * 0.7), // 임시 원가
      },
    });

    // 최고가 설정 (기본가격 = 최고가)
    await prisma.cruiseProduct.update({
      where: { id: product.id },
      data: { maxPrice: product.basePrice },
    });
  }
}
```

---

## 질문/확인 사항

1. ✅ 입금가도 기간별로 변경됨 → 반영됨
2. ✅ 달력으로 기간 선택 → UI 계획에 포함
3. ✅ 기간 중복 없음 → 중복 검증 로직 필요
4. ✅ 과거 가격 조회 필요 → API 설계에 포함
5. ✅ 프로모션/쿠폰은 나중에 → 현재 범위 외
6. ✅ 기존 시스템에 추가 → 마이그레이션 계획 포함

---

## 구현 시작 준비 체크리스트

- [ ] Prisma 스키마 작성
- [ ] 마이그레이션 실행
- [ ] API 라우트 생성
- [ ] 관리자 UI 컴포넌트 개발
- [ ] Mall 할인 표시 연동
- [ ] 테스트 및 검증
