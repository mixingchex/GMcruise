# 📋 APIS 시스템 전체 플로우 및 소스값 매칭 보고서

**생성일**: 2025-01-27  
**목적**: APIS 생성부터 수당 보고서까지 전체 데이터 흐름 및 소스값 추적

---

## 🔄 전체 플로우 다이어그램

```
[1. 고객 회원가입]
    ↓
[2. 어필리에이트 추적] (쿠키/URL 파라미터)
    ↓
[3. 상품 구매] (Payment 생성)
    ↓
[4. AffiliateSale 생성] (수당 계산)
    ↓
[5. 예약 생성] (Reservation + Traveler)
    ↓
[6. 여권 제출] (PassportSubmission)
    ↓
[7. APIS 생성] (syncApisSpreadsheet)
    ↓
[8. 수당 보고서] (MonthlySettlement)
```

---

## 1️⃣ 고객 회원가입 시 소스값 저장

### 📍 위치: `app/api/auth/login/route.ts`

### 소스값 종류 및 저장 필드

| 소스 | 소스값 | 저장 필드 | 설명 |
|------|--------|-----------|------|
| **일반 회원가입** | `'cruise-guide'` | `User.customerSource` | 크루즈가이드 지니 직접 가입 |
| **크루즈몰 가입** | `'cruise-mall'` | `User.customerSource` | 크루즈몰에서 가입 |
| **3일 체험** | `'test-guide'` | `User.customerSource` | 비밀번호 1101로 테스트 모드 |
| **어필리에이트 링크** | `'affiliate-link'` | `User.customerSource` | 어필리에이트 링크로 유입 |
| **3일 체험 초대** | `'trial-invite-link'` | `User.customerSource` | trialCode로 유입 |
| **관리자 생성** | `'admin'` | `User.customerSource` | 관리자가 직접 생성 |
| **파트너 테스트** | `'partner-test'` | `User.customerSource` | 파트너 테스트 계정 |

### 코드 위치

```typescript
// app/api/auth/login/route.ts:405, 541, 554, 577, 1241, 1258, 1402, 1504, 1551, 1571, 1693

// 예시: 일반 회원가입
customerSource: 'cruise-guide'

// 예시: 어필리에이트 링크
if (affiliateCode) {
  customerSource: 'affiliate-link'
}

// 예시: 3일 체험 초대
if (trialCode) {
  customerSource: 'trial-invite-link'
}
```

### 저장되는 추가 정보

- `User.name` - 고객 이름
- `User.phone` - 전화번호 (고유 식별자)
- `User.email` - 이메일 (선택)
- `User.password` - 비밀번호 (해시)
- `User.role` - 역할 ('user', 'PROSPECT', 'admin' 등)

---

## 2️⃣ 어필리에이트 추적 시스템

### 📍 위치: `components/affiliate/AffiliateTracker.tsx`

### 추적 메커니즘

#### A. 쿠키 기반 추적
```typescript
// 쿠키에 저장되는 값
'affiliate_mall_user_id' = mallUserId (판매원/대리점장 ID)
'affiliate_code' = affiliateCode (어필리에이트 코드)
```

#### B. URL 파라미터 추적
```typescript
// URL 예시
/product?partner=mallUserId
/products/[productCode]?partner=mallUserId&link=linkCode
```

### 소스값 매칭 로직

| 입력 소스 | 추적 방법 | 저장 위치 |
|-----------|-----------|-----------|
| **URL 파라미터 `partner`** | `AffiliateTracker` 컴포넌트 | 쿠키: `affiliate_mall_user_id` |
| **URL 파라미터 `link`** | `AffiliateLink.code` 조회 | 쿠키: `affiliate_code` |
| **로그인 시 `affiliateCode`** | `AffiliateProfile.affiliateCode` 조회 | `AffiliateLead.source` |
| **로그인 시 `trialCode`** | `AffiliateLink.code` 조회 | `AffiliateLead.source` |

### AffiliateLead 생성/업데이트

**위치**: `app/api/auth/login/route.ts:525-566`

```typescript
// AffiliateLead 생성 조건
if (name && phone) {
  // managerId/agentId가 없어도 생성 가능
  await prisma.affiliateLead.create({
    data: {
      customerName: name,
      customerPhone: phone,
      status: 'IN_PROGRESS',
      source: trialCode ? 'trial-invite-link' 
            : (affiliateCode ? 'affiliate-link' 
            : 'test-guide'),
      managerId: managerProfileId || null,
      agentId: agentProfileId || null,
    },
  });
}
```

### 소스값 매칭 규칙

| 상황 | `AffiliateLead.source` | `User.customerSource` | `managerId` | `agentId` |
|------|------------------------|------------------------|-------------|-----------|
| 일반 가입 | 없음 | `'cruise-guide'` | `null` | `null` |
| 어필리에이트 링크 | `'affiliate-link'` | `'affiliate-link'` | 있으면 저장 | 있으면 저장 |
| 3일 체험 초대 | `'trial-invite-link'` | `'trial-invite-link'` | 있으면 저장 | 있으면 저장 |
| 크루즈몰 가입 | 없음 | `'cruise-mall'` | `null` | `null` |

---

## 3️⃣ 상품 구매 시 소스값 생성

### 📍 위치: `app/api/payment/webhook/route.ts`

### Payment 모델 소스값

| 필드 | 소스 | 설명 |
|------|------|------|
| `affiliateCode` | 쿠키 또는 Payment 요청 | 어필리에이트 코드 |
| `affiliateMallUserId` | 쿠키 또는 Payment 요청 | 판매원/대리점장 ID |
| `productCode` | Payment 요청 | 구매한 상품 코드 |
| `buyerName` | Payment 요청 | 구매자 이름 |
| `buyerTel` | Payment 요청 | 구매자 전화번호 |
| `amount` | Payment 요청 | 결제 금액 |

### Payment → AffiliateSale 연결

**위치**: `app/api/payment/webhook/route.ts:181-210`

```typescript
// 1. Payment에서 어필리에이트 정보 추출
const affiliateCode = payment.affiliateCode;
const affiliateMallUserId = payment.affiliateMallUserId;

// 2. managerId/agentId 찾기
let managerId: number | null = null;
let agentId: number | null = null;

if (affiliateCode) {
  const profile = await prisma.affiliateProfile.findUnique({
    where: { affiliateCode },
  });
  
  if (profile?.type === 'BRANCH_MANAGER') {
    managerId = profile.id;
  } else if (profile?.type === 'SALES_AGENT') {
    agentId = profile.id;
    // 판매원인 경우 managerId도 찾기
    const relation = await prisma.affiliateRelation.findFirst({
      where: { agentId: profile.id },
    });
    managerId = relation?.managerId || null;
  }
}

// 3. AffiliateSale 생성
const sale = await prisma.affiliateSale.create({
  data: {
    externalOrderCode: merchant_uid,
    managerId,
    agentId,
    productCode,
    saleAmount: amount,
    // ... 수당 계산
  },
});

// 4. Payment와 연결
await prisma.payment.updateMany({
  where: { orderId: merchant_uid },
  data: { saleId: sale.id },
});
```

### 소스값 매칭 체인

```
Payment.affiliateCode
    ↓
AffiliateProfile.affiliateCode (조회)
    ↓
AffiliateProfile.type 확인
    ↓
BRANCH_MANAGER → managerId 설정
SALES_AGENT → agentId 설정 + managerId 조회
    ↓
AffiliateSale.managerId / AffiliateSale.agentId 저장
```

---

## 4️⃣ 여권 정보 소스값

### 📍 위치: `app/api/partner/reservation/create/route.ts`

### PassportSubmission 모델

| 필드 | 소스 | 설명 |
|------|------|------|
| `userId` | 로그인 세션 | 고객 ID |
| `tripId` | UserTrip.id | 여행 ID (UserTrip과 연결) |
| `token` | 생성된 토큰 | 여권 제출 링크 토큰 |
| `isSubmitted` | 제출 완료 여부 | `true`/`false` |

### PassportSubmissionGuest 모델

| 필드 | 소스 | 설명 |
|------|------|------|
| `submissionId` | PassportSubmission.id | 제출 ID |
| `name` | OCR 또는 수동 입력 | 여권 이름 |
| `passportNumber` | OCR 또는 수동 입력 | 여권번호 |
| `dateOfBirth` | OCR 또는 수동 입력 | 생년월일 |
| `passportExpiryDate` | OCR 또는 수동 입력 | 여권 만료일 |
| `ocrRawData` | OCR 결과 | 원본 OCR 데이터 (JSON) |

### Traveler 모델 (APIS에 사용)

| 필드 | 소스 | 설명 |
|------|------|------|
| `reservationId` | Reservation.id | 예약 ID |
| `userId` | User.id (자동 매칭) | 고객 ID |
| `korName` | OCR 또는 수동 입력 | 한글 이름 |
| `engSurname` | OCR 또는 수동 입력 | 영문 성 |
| `engGivenName` | OCR 또는 수동 입력 | 영문 이름 |
| `passportNo` | OCR 또는 수동 입력 | 여권번호 |
| `birthDate` | OCR 또는 수동 입력 | 생년월일 (String) |
| `expiryDate` | OCR 또는 수동 입력 | 만료일 (String) |
| `nationality` | OCR 또는 수동 입력 | 국적 |
| `gender` | OCR 또는 수동 입력 | 성별 |

### 여권 정보 → Traveler 매칭 로직

**위치**: `app/api/partner/reservation/create/route.ts:150-276`

```typescript
// 1. Traveler 정보로 User 찾기 (여권번호 또는 이름+생년월일)
let travelerUser = null;

// 방법 1: 여권번호로 찾기
if (traveler.passportNo) {
  travelerUser = await tx.user.findFirst({
    where: { 
      // User 모델에는 passportNo 필드가 없으므로
      // Traveler를 통해 역참조
    },
  });
}

// 방법 2: 이름 + 생년월일로 찾기
if (!travelerUser && traveler.korName && traveler.birthDate) {
  // Reservation → Traveler → User 연결 확인
}

// 2. User를 찾지 못하면 새로 생성 (PROSPECT 역할)
if (!travelerUser) {
  travelerUser = await tx.user.create({
    data: {
      phone: traveler.phone || null,
      name: traveler.korName || traveler.name || null,
      role: 'PROSPECT', // 잠재고객
      customerStatus: 'PROSPECT',
    },
  });
}

// 3. Traveler 생성 (User와 연결)
await tx.traveler.create({
  data: {
    reservationId: reservation.id,
    userId: travelerUser.id, // ✅ User와 연결
    korName: traveler.korName,
    passportNo: traveler.passportNo,
    birthDate: traveler.birthDate,
    // ... 기타 필드
  },
});
```

---

## 5️⃣ APIS 생성 프로세스

### 📍 위치: `lib/google-sheets.ts` (syncApisSpreadsheet 함수)

### APIS 생성 소스값

#### 입력 소스
1. **Trip ID** (실제로는 UserTrip.id 사용해야 함 - 현재 Trip.id 사용 중)
2. **Reservation** 데이터
3. **Traveler** 데이터
4. **User** 데이터 (전화번호)

#### APIS 양식 컬럼 구조

```typescript
const APIS_COLUMNS = [
  '순번',           // 1. sequence (자동 증가)
  'RV',            // 2. reservation.id
  'CABIN',         // 3. traveler.roomNumber
  '카테고리',       // 4. reservation.cabinType
  '영문성',         // 5. traveler.engSurname
  '영문이름',       // 6. traveler.engGivenName
  '성명',          // 7. traveler.korName
  '주민번호',       // 8. traveler.residentNum
  '성별',          // 9. traveler.gender
  '생년월일',       // 10. traveler.birthDate
  '여권번호',       // 11. traveler.passportNo
  '발급일',        // 12. traveler.issueDate
  '만료일',        // 13. traveler.expiryDate
  '연락처',        // 14. user.phone
  '항공',          // 15. (비어있음)
  '결제일',        // 16. reservation.paymentDate
  '결제방법',       // 17. reservation.paymentMethod
  '결제금액',       // 18. reservation.paymentAmount
  '담당자',        // 19. reservation.agentName
  '비고',          // 20. reservation.remarks
  '비고2',         // 21. (비어있음)
  '여권링크',      // 22. reservation.passportGroupLink
];
```

### APIS 생성 플로우

```typescript
// 1. Trip 조회 (⚠️ 현재 Trip 모델 사용 - UserTrip으로 변경 필요)
const trip = await prisma.trip.findUnique({
  where: { id: tripId },
  select: { id: true, productCode: true },
});

// 2. CruiseProduct 조회 (여행명, 출발일, 도착일)
const product = await prisma.cruiseProduct.findUnique({
  where: { productCode: trip.productCode },
  select: { cruiseLine, shipName, packageName, startDate, endDate },
});

// 3. Reservation + Traveler 조회
const reservations = await prisma.reservation.findMany({
  where: { tripId: trip.id },
  include: {
    Traveler: { orderBy: [{ roomNumber: 'asc' }, { id: 'asc' }] },
    User: { select: { phone: true } },
  },
});

// 4. APIS 데이터 변환
for (const reservation of reservations) {
  for (const traveler of reservation.Traveler) {
    apisRows.push(
      formatTravelerToApisRow(
        traveler,           // Traveler 데이터
        sequence++,         // 순번
        reservation,        // Reservation 데이터
        reservation.User?.phone  // User 전화번호
      )
    );
  }
}

// 5. 구글 시트 생성/업데이트
await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: 'APIS!A1',
  valueInputOption: 'RAW',
  requestBody: { values: worksheetData },
});
```

### 소스값 매칭 체인 (APIS)

```
UserTrip.id (또는 Trip.id)
    ↓
Reservation.tripId
    ↓
Reservation.id → APIS 'RV' 컬럼
    ↓
Traveler.reservationId
    ↓
Traveler 데이터 → APIS 컬럼 3-13
    ↓
User.phone → APIS '연락처' 컬럼
    ↓
Reservation 데이터 → APIS 컬럼 16-22
```

---

## 6️⃣ 수당 계산 및 보고서

### 📍 위치: `app/api/payment/webhook/route.ts`, `app/api/admin/affiliate/sales/route.ts`

### AffiliateSale 모델 소스값

| 필드 | 소스 | 설명 |
|------|------|------|
| `externalOrderCode` | Payment.orderId | 외부 주문번호 |
| `linkId` | AffiliateLink.id | 어필리에이트 링크 ID |
| `leadId` | AffiliateLead.id | 잠재고객 ID |
| `affiliateProductId` | AffiliateProduct.id | 어필리에이트 상품 ID |
| `managerId` | AffiliateProfile.id (BRANCH_MANAGER) | 대리점장 ID |
| `agentId` | AffiliateProfile.id (SALES_AGENT) | 판매원 ID |
| `productCode` | Payment.productCode | 상품 코드 |
| `saleAmount` | Payment.amount | 판매 금액 |
| `costAmount` | 계산 또는 입력 | 원가 |
| `netRevenue` | saleAmount - costAmount | 순수익 |
| `branchCommission` | 계산 | 대리점 수당 |
| `salesCommission` | 계산 | 판매원 수당 |
| `overrideCommission` | 계산 | 오버라이드 수당 |
| `withholdingAmount` | 계산 | 원천징수액 |

### 수당 계산 로직

**위치**: `app/api/payment/webhook/route.ts:162-178`

```typescript
// 1. AffiliateProduct 찾기 (productCode로)
const affiliateProduct = await prisma.affiliateProduct.findFirst({
  where: {
    productCode: productCode,
    OR: [
      { effectiveTo: null },
      { effectiveTo: { gte: new Date() } },
    ],
  },
  orderBy: { effectiveFrom: 'desc' },
  take: 1,
});

// 2. 수당 계산
const netRevenue = amount - (costAmount || 0);
const breakdown = generateLedgerEntries({
  saleId: 0,
  saleAmount: amount,
  costAmount: costAmount || 0,
  managerProfileId: managerId,
  agentProfileId: agentId,
  currency: 'KRW',
});

// 3. AffiliateSale 생성
const sale = await prisma.affiliateSale.create({
  data: {
    managerId,
    agentId,
    productCode,
    saleAmount: amount,
    costAmount,
    netRevenue,
    branchCommission: breakdown.breakdown.branchCommission,
    salesCommission: breakdown.breakdown.salesCommission,
    overrideCommission: breakdown.breakdown.overrideCommission,
    withholdingAmount: breakdown.breakdown.totalWithholding,
    status: 'CONFIRMED',
  },
});

// 4. CommissionLedger 엔트리 생성
await prisma.commissionLedger.createMany({
  data: breakdown.ledgerEntries.map(entry => ({
    ...entry,
    saleId: sale.id,
  })),
});
```

### 수당 보고서 생성

#### MonthlySettlement 모델

| 필드 | 소스 | 설명 |
|------|------|------|
| `periodStart` | 입력 | 정산 기간 시작일 |
| `periodEnd` | 입력 | 정산 기간 종료일 |
| `targetRole` | 입력 | 대상 역할 ('SALES_AGENT', 'BRANCH_MANAGER') |
| `status` | 자동 | 'DRAFT', 'APPROVED', 'PAID' |
| `summary` | 계산 | 정산 요약 (JSON) |

#### CommissionLedger 모델

| 필드 | 소스 | 설명 |
|------|------|------|
| `saleId` | AffiliateSale.id | 판매 ID |
| `settlementId` | MonthlySettlement.id | 정산 ID |
| `profileId` | AffiliateProfile.id | 어필리에이트 프로필 ID |
| `role` | AffiliateProfile.type | 역할 |
| `amount` | 계산 | 수당 금액 |
| `type` | 계산 | 수당 유형 |

### 수당 보고서 생성 플로우

```
AffiliateSale (판매 완료)
    ↓
CommissionLedger (수당 엔트리 생성)
    ↓
MonthlySettlement (월별 정산 생성)
    ↓
AffiliatePayslip (급여 명세서 생성)
```

---

## 🔗 전체 소스값 매칭 체인

### 시나리오: 어필리에이트 링크 → 구매 → APIS → 수당

```
[1단계: 고객 유입]
URL: /products/PROD-001?partner=user1&link=LINK-123
    ↓
AffiliateTracker: 쿠키 저장
    - affiliate_mall_user_id = 'user1'
    - affiliate_code = 'AFF-USER1-XX'
    ↓
[2단계: 회원가입]
POST /api/auth/login
    - name: '홍길동'
    - phone: '01012345678'
    - affiliateCode: 'AFF-USER1-XX' (쿠키에서)
    ↓
User 생성:
    - customerSource: 'affiliate-link'
    ↓
AffiliateLead 생성:
    - customerPhone: '01012345678'
    - source: 'affiliate-link'
    - agentId: (AffiliateProfile에서 조회)
    - managerId: (AffiliateRelation에서 조회)
    ↓
[3단계: 상품 구매]
POST /api/payment/webhook
    - orderId: 'ORDER-123'
    - productCode: 'PROD-001'
    - amount: 1000000
    - affiliateCode: 'AFF-USER1-XX' (쿠키에서)
    ↓
Payment 생성:
    - affiliateCode: 'AFF-USER1-XX'
    - affiliateMallUserId: 'user1'
    ↓
AffiliateSale 생성:
    - managerId: (AffiliateProfile에서 조회)
    - agentId: (AffiliateProfile에서 조회)
    - productCode: 'PROD-001'
    - saleAmount: 1000000
    - branchCommission: (계산)
    - salesCommission: (계산)
    ↓
[4단계: 예약 생성]
POST /api/partner/reservation/create
    - tripId: (CruiseProduct.id)
    - travelers: [{ korName, passportNo, ... }]
    ↓
Reservation 생성:
    - tripId: (UserTrip.id)
    - mainUserId: (User.id)
    ↓
Traveler 생성:
    - reservationId: (Reservation.id)
    - userId: (User.id - 자동 매칭)
    - korName, passportNo, birthDate, ...
    ↓
[5단계: 여권 제출]
POST /api/passport/[token]
    - PassportSubmission 생성
    - PassportSubmissionGuest 생성
    ↓
[6단계: APIS 생성]
POST /api/admin/apis/generate
    - tripId: (UserTrip.id)
    ↓
syncApisSpreadsheet(tripId):
    - Reservation 조회
    - Traveler 조회
    - User.phone 조회
    - APIS 시트 생성
    ↓
[7단계: 수당 보고서]
GET /api/admin/affiliate/settlements
    - AffiliateSale 조회 (managerId/agentId로)
    - CommissionLedger 집계
    - MonthlySettlement 생성
```

---

## 📊 소스값 매칭 테이블

### 고객 → 어필리에이트 매칭

| 고객 식별자 | 어필리에이트 식별자 | 매칭 방법 |
|-------------|---------------------|-----------|
| `User.phone` | `AffiliateLead.customerPhone` | 직접 매칭 |
| `User.id` | `AffiliateLead` (없을 수 있음) | `User.phone` → `AffiliateLead.customerPhone` |
| `User.customerSource` | `AffiliateLead.source` | 소스값 일치 확인 |

### 예약 → 어필리에이트 매칭

| 예약 식별자 | 어필리에이트 식별자 | 매칭 방법 |
|-------------|---------------------|-----------|
| `Reservation.mainUserId` | `AffiliateSale` (없을 수 있음) | `User.phone` → `Payment.buyerTel` → `AffiliateSale` |
| `Reservation.id` | `AffiliateSale` (직접 연결 없음) | `Payment.orderId` → `AffiliateSale.externalOrderCode` |

### 여권 → 예약 매칭

| 여권 식별자 | 예약 식별자 | 매칭 방법 |
|-------------|-------------|-----------|
| `PassportSubmission.tripId` | `UserTrip.id` | 직접 연결 |
| `PassportSubmission.userId` | `User.id` | 직접 연결 |
| `Traveler.userId` | `User.id` | 직접 연결 |
| `Traveler.passportNo` | `User` (직접 연결 없음) | `Traveler.userId` → `User.id` |

### APIS → 수당 매칭

| APIS 식별자 | 수당 식별자 | 매칭 방법 |
|-------------|-------------|-----------|
| `Reservation.id` | `AffiliateSale` (직접 연결 없음) | `Reservation.mainUserId` → `User.phone` → `Payment.buyerTel` → `AffiliateSale` |
| `Traveler.userId` | `AffiliateSale` (직접 연결 없음) | `User.phone` → `Payment.buyerTel` → `AffiliateSale` |

---

## ⚠️ 현재 발견된 문제점

### 1. Trip vs UserTrip 혼용
- **문제**: APIS 생성 시 `Trip` 모델 사용 (`lib/google-sheets.ts:139`)
- **영향**: `Trip` 모델에는 `userId`가 없어 고객별 조회 불가능
- **해결**: `UserTrip` 모델로 변경 필요

### 2. 예약 → 수당 직접 연결 없음
- **문제**: `Reservation`과 `AffiliateSale` 간 직접 관계 없음
- **영향**: 예약 정보로 수당을 직접 찾기 어려움
- **현재 매칭**: `Reservation.mainUserId` → `User.phone` → `Payment.buyerTel` → `AffiliateSale` (간접)

### 3. 여권 → 예약 매칭
- **현재**: `PassportSubmission.tripId` → `UserTrip.id` ✅ (정상)
- **주의**: `PassportSubmission`은 `UserTrip`과 연결되지만, `Reservation`과는 직접 연결 없음

---

## ✅ 정상 작동하는 매칭

### 1. 고객 → 어필리에이트
- `User.phone` → `AffiliateLead.customerPhone` ✅
- `User.customerSource` → `AffiliateLead.source` ✅

### 2. 결제 → 수당
- `Payment.orderId` → `AffiliateSale.externalOrderCode` ✅
- `Payment.saleId` → `AffiliateSale.id` ✅

### 3. 여권 → 여행
- `PassportSubmission.tripId` → `UserTrip.id` ✅
- `PassportSubmission.userId` → `User.id` ✅

### 4. 수당 계산
- `AffiliateSale.managerId` → `AffiliateProfile.id` (BRANCH_MANAGER) ✅
- `AffiliateSale.agentId` → `AffiliateProfile.id` (SALES_AGENT) ✅
- `CommissionLedger.saleId` → `AffiliateSale.id` ✅

---

## 📝 권장 사항

### 1. Reservation에 어필리에이트 정보 추가
```prisma
model Reservation {
  // ... 기존 필드
  affiliateSaleId Int?  // AffiliateSale과 직접 연결
  AffiliateSale   AffiliateSale? @relation(fields: [affiliateSaleId], references: [id])
}
```

### 2. APIS 생성 시 UserTrip 사용
```typescript
// lib/google-sheets.ts 수정 필요
const userTrip = await prisma.userTrip.findUnique({
  where: { id: tripId },
  include: {
    CruiseProduct: { select: { productCode: true } },
  },
});
```

### 3. 소스값 추적 강화
- 모든 단계에서 `customerSource` 일관성 유지
- `AffiliateLead` 생성 시 `linkId` 저장 확실히
- `Payment` 생성 시 `affiliateCode` 저장 확실히

---

**보고서 작성 완료일**: 2025-01-27

