# 랜딩페이지 워크플로우 가이드

## 개요

상품과 랜딩페이지는 별도로 관리되며, 어필리에이트 링크를 통해 연결됩니다.

## 워크플로우

### 1단계: 어필리에이트 상품(수당 카테고리) 등록

어필리에이트 상품을 등록하면 **기본 어필리에이트 링크가 자동으로 생성**됩니다.

**API: `POST /api/admin/affiliate/products`**

```json
{
  "productCode": "CRUISE-001",
  "title": "크루즈 상품명",
  "effectiveFrom": "2024-01-01",
  "currency": "KRW",
  "defaultSaleAmount": 1000000,
  "tiers": [...]
}
```

**자동 생성되는 것:**
- 기본 어필리에이트 링크 (공통 링크, managerId/agentId 없음)
- 링크 코드: `LINK-{timestamp}-{random}`

**주의:**
- 랜딩페이지는 자동 생성되지 않습니다.
- 자동 생성된 링크는 나중에 수정하여 특정 파트너에 할당하거나 랜딩페이지와 연결할 수 있습니다.

### 2단계: 랜딩페이지 생성 (선택사항)

랜딩페이지가 필요한 경우 별도로 생성합니다.

**관리자용:**
- API: `POST /api/admin/landing-pages`
- UI: `/app/admin/landing-pages/new`

**파트너용:**
- API: `POST /api/partner/landing-pages`
- UI: `/app/partner/[partnerId]/landing-pages/new`

랜딩페이지 생성 시 `slug`가 생성됩니다.

### 3단계: 어필리에이트 링크 수정 및 랜딩페이지 연결 (선택사항)

자동 생성된 링크를 수정하여 랜딩페이지와 연결하거나, 새로운 링크를 생성할 수 있습니다.

**API: `POST /api/admin/affiliate/links`**

```json
{
  "title": "링크 제목",
  "productCode": "PRODUCT_CODE",  // 선택사항
  "landingPageId": 123,  // 필수: 1단계에서 생성한 랜딩페이지 ID
  "managerId": 1,  // 대리점장 ID (선택)
  "agentId": 2,  // 판매원 ID (선택)
  "campaignName": "캠페인명",
  "description": "설명"
}
```

### 4단계: 접근 경로

링크 코드가 포함된 URL로 접근하면 자동으로 랜딩페이지로 리다이렉트됩니다.

**본사 구매몰:**
```
/products/[productCode]?link=[linkCode]
→ /landing/[slug]?product=[productCode]&link=[linkCode]
```

**파트너 구매몰 (affiliateCode가 있는 경우):**
```
/products/[productCode]?link=[linkCode]
→ /store/[affiliateCode]/[slug]?product=[productCode]&link=[linkCode]
```

## 중요 사항

1. **어필리에이트 상품 등록**: 상품 등록 시 기본 어필리에이트 링크가 자동으로 생성됩니다.
2. **랜딩페이지**: 랜딩페이지는 별도로 생성해야 하며, 자동 생성되지 않습니다.
3. **링크 수정**: 자동 생성된 링크는 나중에 수정하여 랜딩페이지와 연결하거나 특정 파트너에 할당할 수 있습니다.
4. **연결**: 어필리에이트 링크의 `metadata.landingPageId`로 랜딩페이지와 연결됩니다.

## 데이터 흐름

```
어필리에이트 상품 등록
    ↓
AffiliateProduct 테이블에 저장
    ↓
기본 AffiliateLink 자동 생성 (productCode 연결)
    ↓
[선택] 랜딩페이지 생성
    ↓
LandingPage 테이블에 저장 (id, slug 생성)
    ↓
[선택] 어필리에이트 링크 수정 시 landingPageId 지정
    ↓
AffiliateLink.metadata.landingPageId에 저장
    ↓
상품 페이지에서 링크 코드로 접근
    ↓
metadata.landingPageId 확인
    ↓
랜딩페이지로 리다이렉트 (landingPageId가 있는 경우)
    - affiliateCode 있음 → /store/[affiliateCode]/[slug]
    - affiliateCode 없음 → /landing/[slug]
```

## 예시

### 1. 어필리에이트 상품 등록 (기본 링크 자동 생성)

```bash
POST /api/admin/affiliate/products
{
  "productCode": "CRUISE-001",
  "title": "2024 크루즈 특가",
  "effectiveFrom": "2024-01-01",
  "currency": "KRW",
  "defaultSaleAmount": 1000000
}

# 응답: { "ok": true, "product": { "id": 1, "productCode": "CRUISE-001" } }
# 자동 생성: 기본 AffiliateLink (code: "LINK-ABC123")
```

### 2. 랜딩페이지 생성 (선택사항)

```bash
POST /api/admin/landing-pages
{
  "title": "2024 크루즈 특가",
  "slug": "cruise-2024-special",
  "htmlContent": "<h1>특가 상품</h1>",
  "isActive": true,
  "isPublic": true
}

# 응답: { "ok": true, "landingPage": { "id": 123, "slug": "cruise-2024-special" } }
```

### 3. 어필리에이트 링크 수정하여 랜딩페이지 연결 (선택사항)

```bash
PUT /api/admin/affiliate/links/[linkId]
{
  "landingPageId": 123,  # 위에서 생성한 랜딩페이지 ID
  "managerId": 1  # 특정 파트너에 할당 (선택)
}

# 또는 새로운 링크 생성
POST /api/admin/affiliate/links
{
  "title": "크루즈 특가 링크",
  "productCode": "CRUISE-001",
  "landingPageId": 123,
  "managerId": 1
}
```

### 4. 접근

```
https://cruisedot.co.kr/products/CRUISE-001?link=LINK-ABC123
→ https://cruisedot.co.kr/store/AFF001/cruise-2024-special?product=CRUISE-001&link=LINK-ABC123
```

## 관련 파일

- 상품 등록: `app/api/admin/products/route.ts`
- 랜딩페이지 생성: `app/api/admin/landing-pages/route.ts`
- 어필리에이트 링크 생성: `app/api/admin/affiliate/links/route.ts`
- 상품 상세 페이지: `app/products/[productCode]/page.tsx`
- 랜딩페이지 표시: `app/landing/[slug]/page.tsx`

