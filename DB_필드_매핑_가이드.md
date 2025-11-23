# 🗄️ DB 필드 매핑 가이드

> 관리자 패널에서 상품 등록/편집 시 저장되는 모든 필드와 크루즈몰 구매 시 저장되는 모든 필드의 상세 매핑

---

## 📦 1. 상품 등록/편집 시 저장되는 모든 필드

### 1.1 CruiseProduct 테이블

**테이블명**: `CruiseProduct`  
**접근**: `prisma.cruiseProduct`

| 관리자 패널 입력 항목 | DB 필드명 | 타입 | 설명 |
|-------------------|---------|------|------|
| 상품 코드 | `productCode` | `String @unique` | 상품 고유 코드 (예: MAN-SG-0001) |
| 크루즈 라인 | `cruiseLine` | `String` | 크루즈 회사명 (예: MSC 크루즈) |
| 선박명 | `shipName` | `String` | 선박명 (예: MSC 벨리시마) |
| 제목 (패키지명) | `packageName` | `String` | 상품 패키지명 |
| 여행기간 (박수) | `nights` | `Int` | 박수 |
| 여행기간 (일수) | `days` | `Int` | 일수 |
| 시작가 | `basePrice` | `Int?` | 기본 가격 (원), nullable |
| 상품 설명 | `description` | `String?` | 상품 설명, nullable |
| 로고 선택 | `source` | `String?` | 'cruisedot', 'wcruise', 'manual' |
| 카테고리 | `category` | `String?` | '주말크루즈', '동남아', '홍콩' 등 |
| 후킹 태그 | `tags` | `Json?` | 태그 배열 (최대 3개) |
| 인기 크루즈 | `isPopular` | `Boolean` | 기본값: false |
| 추천 크루즈 | `isRecommended` | `Boolean` | 기본값: false |
| 프리미엄 크루즈 | `isPremium` | `Boolean` | 기본값: false |
| 지니패키지 크루즈 | `isGeniePack` | `Boolean` | 기본값: false |
| 국내출발 크루즈 | `isDomestic` | `Boolean` | 기본값: false |
| 일본 크루즈 | `isJapan` | `Boolean` | 기본값: false |
| 알뜰 크루즈 | `isBudget` | `Boolean` | 기본값: false |
| 긴급 크루즈 | `isUrgent` | `Boolean` | 기본값: false |
| 메인 상품 | `isMainProduct` | `Boolean` | 기본값: false |
| 판매 상태 | `saleStatus` | `String` | 기본값: '판매중' |
| 출발 날짜 | `startDate` | `DateTime?` | 여행 시작일, nullable |
| 종료 날짜 | `endDate` | `DateTime?` | 여행 종료일, nullable |
| 방문 국가 | `itineraryPattern.destination` | `Json (배열)` | 국가 코드 배열 (예: ['SG', 'MY']) |
| 여행 일정 패턴 | `itineraryPattern` | `Json` | 일정 패턴 (각 Day별 정보) |

**추천 키워드 저장 위치**: `MallProductContent.layout.recommendedKeywords` (아래 참조)

---

### 1.2 MallProductContent 테이블

**테이블명**: `MallProductContent`  
**접근**: `prisma.mallProductContent`  
**관계**: `CruiseProduct`와 1:1 관계 (`productCode`로 연결)

#### 1.2.1 기본 필드

| 관리자 패널 입력 항목 | DB 필드명 | 타입 | 설명 |
|-------------------|---------|------|------|
| 썸네일 | `thumbnail` | `String?` | 썸네일 이미지 URL |
| 이미지 목록 | `images` | `Json?` | 이미지 URL 배열 |
| 동영상 목록 | `videos` | `Json?` | 동영상 URL 배열 |
| 폰트 설정 | `fonts` | `Json?` | 폰트 설정 JSON |
| 활성화 여부 | `isActive` | `Boolean` | 기본값: true |

#### 1.2.2 layout 필드 (Json 타입)

**전체 경로**: `MallProductContent.layout`  
**타입**: `Json` (객체)

| 관리자 패널 입력 항목 | DB 경로 | 타입 | 설명 |
|-------------------|--------|------|------|
| 상세페이지 블록 | `layout.blocks` | `Json (배열)` | 이미지/동영상/텍스트 블록 배열 |
| 포함 사항 | `layout.included` | `Json (배열)` | 포함 사항 문자열 배열 |
| 불포함 사항 | `layout.excluded` | `Json (배열)` | 불포함 사항 문자열 배열 |
| 여행일정 | `layout.itinerary` | `Json (배열)` | Day별 일정 정보 배열 |
| **요금표** | `layout.pricing` | `Json (배열)` | **요금표 정보 배열 (PricingRow[])** |
| 출발일 (요금표용) | `layout.departureDate` | `String` | 요금표의 출발일 |
| 환불/취소 규정 | `layout.refundPolicy` | `String` | 환불 규정 텍스트 |
| 추천 키워드 | `layout.recommendedKeywords` | `Json (배열)` | 추천 키워드 배열 (최대 5개) |
| 항공 정보 | `layout.flightInfo` | `Json (객체)` | 출국/귀국 항공편 정보 |
| 별점 | `layout.rating` | `Number` | 평균 별점 (0.0 ~ 5.0) |
| 리뷰 개수 | `layout.reviewCount` | `Number` | 리뷰 개수 |
| 인솔자 있음 | `layout.hasEscort` | `Boolean` | 인솔자 서비스 여부 |
| 현지가이드 있음 | `layout.hasLocalGuide` | `Boolean` | 현지가이드 서비스 여부 |
| 크루즈닷 전용 스탭 있음 | `layout.hasCruisedotStaff` | `Boolean` | 크루즈닷 전용 스탭 여부 |
| 여행자보험 있음 | `layout.hasTravelInsurance` | `Boolean` | 여행자보험 포함 여부 |

#### 1.2.3 요금표 (pricing) 상세 구조

**경로**: `MallProductContent.layout.pricing`  
**타입**: `Json` 배열  
**각 요소 (PricingRow) 구조**:

```typescript
interface PricingRow {
  cabinType: string;           // 객실 타입 (예: "인테리어", "오션뷰", "발코니")
  fareCategory: string;        // 요금 카테고리 (예: "어드밴티지", "베스트", "어드밴티지어드밴티지")
  fareLabel: string;           // 요금 라벨
  adultPrice: number;          // 성인 가격 (원)
  childPrice?: number;         // 만2-11세 가격 (원)
  infantPrice?: number;        // 만2세미만 가격 (원)
  minOccupancy: number;        // 최소 인원
  maxOccupancy: number;        // 최대 인원
  pricingRowId?: string;       // 요금표 행 ID (선택)
}
```

**저장 예시**:
```json
{
  "layout": {
    "pricing": [
      {
        "cabinType": "인테리어",
        "fareCategory": "어드밴티지",
        "fareLabel": "어드밴티지",
        "adultPrice": 1500000,
        "childPrice": 750000,
        "infantPrice": 0,
        "minOccupancy": 2,
        "maxOccupancy": 4
      }
    ],
    "departureDate": "2025-06-01"
  }
}
```

---

## 🛒 2. 크루즈몰 구매 시 저장되는 모든 필드

### 2.1 Payment 테이블 (결제 정보)

**테이블명**: `Payment`  
**접근**: `prisma.payment`  
**관계**: `AffiliateSale`와 1:1 관계 (`saleId`로 연결)

| 구매 시 입력 항목 | DB 필드명 | 타입 | 설명 |
|----------------|---------|------|------|
| 주문번호 | `orderId` | `String @unique` | 자동 생성 (예: ORDER_1234567890_ABC) |
| 상품 코드 | `productCode` | `String?` | 구매한 상품 코드 |
| 상품명 | `productName` | `String?` | 상품 패키지명 |
| 결제 금액 | `amount` | `Int` | 결제 금액 (원) |
| 통화 | `currency` | `String` | 기본값: 'KRW' |
| 구매자 이름 | `buyerName` | `String` | 구매자 이름 |
| 구매자 이메일 | `buyerEmail` | `String?` | 구매자 이메일, nullable |
| 구매자 전화번호 | `buyerTel` | `String` | 구매자 전화번호 |
| 결제 상태 | `status` | `String` | 'pending', 'processing', 'completed', 'failed', 'cancelled' |
| PG사 | `pgProvider` | `String?` | 예: 'welcomepayments', 'tosspayments' |
| PG 거래번호 | `pgTransactionId` | `String?` | PG사에서 발급한 거래번호 |
| PG 가맹점 ID | `pgMid` | `String?` | PG사 가맹점 ID |
| 제휴 코드 | `affiliateCode` | `String?` | 어필리에이트 코드 |
| 제휴 판매몰 사용자 ID | `affiliateMallUserId` | `String?` | 제휴 판매몰 사용자 ID |
| 결제 완료 시각 | `paidAt` | `DateTime?` | 결제 완료 시간 |
| 결제 실패 시각 | `failedAt` | `DateTime?` | 결제 실패 시간 |
| 결제 취소 시각 | `cancelledAt` | `DateTime?` | 결제 취소 시간 |
| 실패 사유 | `failureReason` | `String?` | 결제 실패 사유 |
| **추가 정보** | `metadata` | `Json?` | **방 선택 정보, 채팅 세션 ID 등** |
| 판매 ID (연결) | `saleId` | `Int? @unique` | AffiliateSale과 연결 |

#### 2.1.1 Payment.metadata 상세 구조

**경로**: `Payment.metadata`  
**타입**: `Json` 객체

```typescript
interface PaymentMetadata {
  productCode: string;           // 상품 코드
  roomSelections: RoomSelection[]; // 방 선택 정보 배열
  totalGuests: number;           // 총 인원수
  chatSessionId?: string;        // 채팅 세션 ID (선택)
  affiliateCode?: string;        // 제휴 코드 (선택)
  partnerId?: string;            // 파트너 ID (선택)
}

interface RoomSelection {
  cabinType: string;             // 객실 타입
  fareCategory: string;          // 요금 카테고리
  adult: number;                 // 성인 인원
  adult3rd?: number;             // 3인실 성인 인원 (선택)
  child2to11?: number;           // 만2-11세 인원 (선택)
  infantUnder2?: number;         // 만2세미만 인원 (선택)
}
```

**저장 예시**:
```json
{
  "metadata": {
    "productCode": "MAN-SG-0001",
    "roomSelections": [
      {
        "cabinType": "인테리어",
        "fareCategory": "어드밴티지",
        "adult": 2,
        "child2to11": 1,
        "infantUnder2": 0
      }
    ],
    "totalGuests": 3,
    "chatSessionId": "chat_123456",
    "affiliateCode": "AFF001",
    "partnerId": "partner_123"
  }
}
```

---

### 2.2 AffiliateSale 테이블 (판매 정보)

**테이블명**: `AffiliateSale`  
**접근**: `prisma.affiliateSale`  
**관계**: `Payment`와 1:1 관계 (`saleId`로 연결)

| 항목 | DB 필드명 | 타입 | 설명 |
|------|---------|------|------|
| 외부 주문 코드 | `externalOrderCode` | `String? @unique` | 외부 주문 코드 |
| 어필리에이트 링크 ID | `linkId` | `Int?` | AffiliateLink ID |
| 리드 ID | `leadId` | `Int?` | AffiliateLead ID |
| 어필리에이트 상품 ID | `affiliateProductId` | `Int?` | AffiliateProduct ID |
| 대리점장 ID | `managerId` | `Int?` | 대리점장 프로필 ID |
| 판매원 ID | `agentId` | `Int?` | 판매원 프로필 ID |
| 상품 코드 | `productCode` | `String?` | 상품 코드 |
| **객실 타입** | `cabinType` | `String?` | **구매한 객실 타입** |
| **요금 카테고리** | `fareCategory` | `String?` | **구매한 요금 카테고리** |
| **인원수** | `headcount` | `Int?` | **총 인원수** |
| 판매 금액 | `saleAmount` | `Int` | 판매 금액 (원) |
| 원가 | `costAmount` | `Int?` | 원가, nullable |
| 순수익 | `netRevenue` | `Int?` | 순수익, nullable |
| 지점 수수료 | `branchCommission` | `Int?` | 지점 수수료 |
| 판매 수수료 | `salesCommission` | `Int?` | 판매 수수료 |
| 관리자 수수료 | `overrideCommission` | `Int?` | 관리자 수수료 |
| 원천징수 금액 | `withholdingAmount` | `Int?` | 원천징수 금액 |
| 상태 | `status` | `String` | 기본값: 'PENDING' |
| 판매일 | `saleDate` | `DateTime?` | 판매 일자 |
| 확정 시각 | `confirmedAt` | `DateTime?` | 판매 확정 시간 |
| 환불 시각 | `refundedAt` | `DateTime?` | 환불 시간 |
| 취소 사유 | `cancellationReason` | `String?` | 취소 사유 |
| **추가 정보** | `metadata` | `Json?` | **추가 판매 정보** |

**판매 확정 프로세스 필드**:
- `audioFileGoogleDriveId`: Google Drive 파일 ID
- `audioFileGoogleDriveUrl`: Google Drive 공유 링크
- `audioFileName`: 원본 파일명
- `audioFileType`: 녹음 파일 타입 ('FIRST_CALL', 'PASSPORT_GUIDE')
- `submittedById`: 요청 제출자 ID
- `submittedAt`: 요청 제출 시간
- `approvedById`: 승인한 관리자 ID
- `approvedAt`: 승인 시간
- `rejectedById`: 거부한 관리자 ID
- `rejectedAt`: 거부 시간
- `rejectionReason`: 거부 사유

---

### 2.3 Trip 테이블 (여행 정보)

**테이블명**: `Trip`  
**접근**: `prisma.trip`  
**관계**: `User`, `CruiseProduct`와 연결

| 항목 | DB 필드명 | 타입 | 설명 |
|------|---------|------|------|
| 사용자 ID | `userId` | `Int` | 구매자 User ID |
| 상품 ID | `productId` | `Int?` | CruiseProduct ID |
| 상품 코드 | `productCode` | `String?` | 상품 코드 (APIS용) |
| 예약 번호 | `reservationCode` | `String?` | 예약 번호 (자동 생성) |
| 크루즈명 | `cruiseName` | `String?` | 크루즈명 |
| 선박명 | `shipName` | `String?` | 선박명 (APIS용) |
| 출발일 | `departureDate` | `DateTime?` | 출발일 (APIS용) |
| 구글 드라이브 폴더 ID | `googleFolderId` | `String?` | 구글 드라이브 폴더 ID (APIS용) |
| 구글 시트 ID | `spreadsheetId` | `String?` | 구글 시트 ID (APIS용) |
| 동반자 유형 | `companionType` | `String?` | 동반자 유형 (예: '가족') |
| 목적지 | `destination` | `Json?` | 목적지 배열 |
| 시작일 | `startDate` | `DateTime?` | 여행 시작일 |
| 종료일 | `endDate` | `DateTime?` | 여행 종료일 |
| 박수 | `nights` | `Int` | 기본값: 0 |
| 일수 | `days` | `Int` | 기본값: 0 |
| 방문 횟수 | `visitCount` | `Int` | 기본값: 0 |
| 상태 | `status` | `String` | 기본값: 'Upcoming' |

---

### 2.4 Reservation 테이블 (예약 정보 - APIS용)

**테이블명**: `Reservation`  
**접근**: `prisma.reservation`  
**관계**: `Trip`, `User`와 연결

| 항목 | DB 필드명 | 타입 | 설명 |
|------|---------|------|------|
| 여행 ID | `tripId` | `Int` | Trip ID (FK) |
| 사용자 ID | `userId` | `Int` | User ID (FK) |
| PNR 상태 | `pnrStatus` | `String?` | PNR 상태 |
| **총 인원수** | `totalPeople` | `Int` | **총 인원수**, 기본값: 1 |
| **객실 타입** | `cabinType` | `String?` | **객실 타입** |

---

### 2.5 Traveler 테이블 (여행객 정보 - APIS용)

**테이블명**: `Traveler`  
**접근**: `prisma.traveler`  
**관계**: `Reservation`와 연결 (1:N)

| 항목 | DB 필드명 | 타입 | 설명 |
|------|---------|------|------|
| 예약 ID | `reservationId` | `Int` | Reservation ID (FK) |
| **방 번호** | `roomNumber` | `Int?` | **방 배정 그룹핑** |
| 한국 이름 | `korName` | `String` | 한국 이름 |
| 영문 성 | `engSurname` | `String?` | 영문 성 |
| 영문 이름 | `engGivenName` | `String?` | 영문 이름 |
| 여권 번호 | `passportNo` | `String?` | 여권 번호 |
| 주민번호 | `residentNum` | `String?` | 주민번호 (수동 입력) |
| 국적 | `nationality` | `String?` | 국적 |
| 생년월일 | `dateOfBirth` | `DateTime?` | 생년월일 |
| 여권 만료일 | `passportExpiryDate` | `DateTime?` | 여권 만료일 |
| OCR 원본 데이터 | `ocrRawData` | `Json?` | OCR 원본 데이터 |

---

## 📊 3. 구매 정보 저장 흐름

```
1. 결제 요청 (POST /api/payment/request)
   └─> Payment 테이블 생성 (status: 'pending')
       └─> metadata에 roomSelections, totalGuests 등 저장

2. 결제 완료 (PG 콜백)
   └─> Payment 업데이트 (status: 'completed', paidAt 설정)
       └─> AffiliateSale 생성
           └─> cabinType, fareCategory, headcount 저장
           └─> Payment와 1:1 연결 (saleId)

3. (선택적) APIS 연동
   └─> Trip 생성
       └─> Reservation 생성 (totalPeople, cabinType)
           └─> Traveler 생성 (korName, passportNo 등)
```

---

## 🔑 4. 핵심 요약

### 상품 등록/편집
- **기본 정보**: `CruiseProduct` 테이블
- **상세 콘텐츠**: `MallProductContent.layout` (Json)
- **요금표**: `MallProductContent.layout.pricing` (Json 배열)

### 구매 정보
- **결제 정보**: `Payment` 테이블
  - 방 선택 정보: `Payment.metadata.roomSelections`
- **판매 정보**: `AffiliateSale` 테이블
  - 객실 타입: `AffiliateSale.cabinType`
  - 요금 카테고리: `AffiliateSale.fareCategory`
  - 인원수: `AffiliateSale.headcount`
- **예약 정보**: `Reservation` 테이블 (APIS용)
  - 총 인원수: `Reservation.totalPeople`
  - 객실 타입: `Reservation.cabinType`
- **여행객 정보**: `Traveler` 테이블 (APIS용)
  - 이름, 여권번호, 생년월일 등

---

## 📝 5. 실제 저장 예시

### 상품 등록 시 저장 예시

```javascript
// 1. CruiseProduct 테이블
{
  productCode: "MAN-SG-0001",
  cruiseLine: "MSC 크루즈",
  shipName: "MSC 벨리시마",
  packageName: "싱가포르 3박 4일 크루즈",
  nights: 3,
  days: 4,
  basePrice: 1500000,
  category: "동남아",
  tags: ["인기", "프리미엄"],
  isPopular: true,
  startDate: "2025-06-01T00:00:00Z",
  endDate: "2025-06-04T23:59:59Z",
  itineraryPattern: {
    destination: ["SG", "MY"],
    days: [...]
  }
}

// 2. MallProductContent 테이블
{
  productCode: "MAN-SG-0001",
  thumbnail: "https://...",
  layout: {
    blocks: [...],
    included: ["항공권", "크루즈 티켓"],
    excluded: ["현지 경비"],
    itinerary: [...],
    pricing: [
      {
        cabinType: "인테리어",
        fareCategory: "어드밴티지",
        adultPrice: 1500000,
        childPrice: 750000,
        minOccupancy: 2,
        maxOccupancy: 4
      }
    ],
    departureDate: "2025-06-01",
    refundPolicy: "...",
    recommendedKeywords: ["신혼여행", "가족여행"],
    flightInfo: {...},
    rating: 4.4,
    reviewCount: 127
  }
}
```

### 구매 시 저장 예시

```javascript
// 1. Payment 테이블
{
  orderId: "ORDER_1234567890_ABC",
  productCode: "MAN-SG-0001",
  productName: "싱가포르 3박 4일 크루즈",
  amount: 3750000,
  currency: "KRW",
  buyerName: "홍길동",
  buyerEmail: "hong@example.com",
  buyerTel: "010-1234-5678",
  status: "completed",
  pgProvider: "welcomepayments",
  affiliateCode: "AFF001",
  metadata: {
    productCode: "MAN-SG-0001",
    roomSelections: [
      {
        cabinType: "인테리어",
        fareCategory: "어드밴티지",
        adult: 2,
        child2to11: 1
      }
    ],
    totalGuests: 3
  }
}

// 2. AffiliateSale 테이블
{
  externalOrderCode: "ORDER_1234567890_ABC",
  productCode: "MAN-SG-0001",
  cabinType: "인테리어",        // 구매한 객실 타입
  fareCategory: "어드밴티지",    // 구매한 요금 카테고리
  headcount: 3,                 // 총 인원수
  saleAmount: 3750000,
  status: "PENDING"
}

// 3. Reservation 테이블 (APIS용)
{
  tripId: 1,
  userId: 123,
  totalPeople: 3,              // 총 인원수
  cabinType: "인테리어"         // 객실 타입
}

// 4. Traveler 테이블 (APIS용)
[
  {
    reservationId: 1,
    roomNumber: 1,
    korName: "홍길동",
    engSurname: "Hong",
    engGivenName: "Gildong",
    passportNo: "M12345678"
  },
  {
    reservationId: 1,
    roomNumber: 1,
    korName: "홍길순",
    engSurname: "Hong",
    engGivenName: "Gilsun",
    passportNo: "M87654321"
  },
  {
    reservationId: 1,
    roomNumber: 1,
    korName: "홍아이",
    passportNo: null
  }
]
```

---

## 🎯 6. 주요 조회 쿼리 예시

### 상품의 요금표 조회
```typescript
const product = await prisma.mallProductContent.findUnique({
  where: { productCode: 'MAN-SG-0001' },
  select: { layout: true }
});

const pricing = product?.layout?.pricing || [];
```

### 구매한 객실 타입 및 인원수 조회
```typescript
const sale = await prisma.affiliateSale.findUnique({
  where: { id: saleId },
  select: {
    cabinType: true,      // 구매한 객실 타입
    fareCategory: true,   // 구매한 요금 카테고리
    headcount: true       // 총 인원수
  }
});
```

### 결제 시 선택한 방 정보 조회
```typescript
const payment = await prisma.payment.findUnique({
  where: { orderId: 'ORDER_1234567890_ABC' },
  select: { metadata: true }
});

const roomSelections = payment?.metadata?.roomSelections || [];
```

---

**작성일**: 2025-01-XX  
**최종 업데이트**: 2025-01-XX






