# 어필리에이트 상품 상태 및 404 에러 조건

## 404 에러가 발생하는 경우

`/api/public/products/[productCode]` API에서 404 에러가 발생하는 경우는 다음과 같습니다:

### 1. AffiliateProduct가 존재하지 않는 경우
- **조건**: 해당 `productCode`에 대한 `AffiliateProduct` 레코드가 데이터베이스에 없음
- **예시**: 상품을 등록했지만 어필리에이트 수당 설정을 하지 않은 경우

### 2. AffiliateProduct가 있지만 status가 'active'가 아닌 경우
- **조건**: `AffiliateProduct.status !== 'active'`
- **예시**: `status`가 `'inactive'`, `'pending'`, `'suspended'` 등인 경우

### 3. AffiliateProduct가 있지만 isPublished가 false인 경우
- **조건**: `AffiliateProduct.isPublished !== true`
- **예시**: 어필리에이트 수당을 설정했지만 아직 게시하지 않은 경우

### 4. effectiveFrom이 현재 시간보다 미래인 경우
- **조건**: `AffiliateProduct.effectiveFrom > now`
- **예시**: 어필리에이트 수당 적용 시작일이 아직 오지 않은 경우

### 5. effectiveTo가 현재 시간보다 과거인 경우 (만료됨)
- **조건**: `AffiliateProduct.effectiveTo !== null && AffiliateProduct.effectiveTo < now`
- **예시**: 어필리에이트 수당 적용 종료일이 지난 경우

### 6. CruiseProduct 자체가 존재하지 않는 경우
- **조건**: `CruiseProduct` 레코드가 데이터베이스에 없음
- **예시**: 상품이 삭제되었거나 잘못된 `productCode`로 접근한 경우

## 유효한 어필리에이트 상품 조건

구매몰에 표시되려면 다음 **모든 조건**을 만족해야 합니다:

1. ✅ `AffiliateProduct` 레코드가 존재
2. ✅ `status === 'active'`
3. ✅ `isPublished === true`
4. ✅ `effectiveFrom <= now` (적용 시작일이 현재보다 이전)
5. ✅ `effectiveTo IS NULL OR effectiveTo >= now` (적용 종료일이 없거나 현재보다 이후)
6. ✅ `CruiseProduct` 레코드가 존재

## 어필리에이트 상품 확인 방법

### 관리자 패널에서 확인
1. **크루즈 상품 관리** (`/admin/products`)
   - 어필리에이트 뱃지 확인:
     - ✅ **어필리에이트** (분홍색 뱃지): 유효한 어필리에이트 상품
     - ⚠️ **어필리에이트 미승인** (회색 뱃지): AffiliateProduct가 있지만 유효하지 않음
     - 뱃지 없음: AffiliateProduct가 등록되지 않음

2. **APIS 확인하기** (`/admin/apis`)
   - 어필리에이트가 등록된 상품만 표시됨

### API로 확인
```bash
# 어필리에이트 상품 목록 조회
GET /api/admin/affiliate/products

# 특정 상품의 어필리에이트 상태 확인
GET /api/admin/affiliate/products?productCode=PRODUCT-CODE
```

## 어필리에이트 상품 목록 및 상세페이지 링크

어필리에이트가 등록된 상품의 상세페이지는 다음 형식으로 접근할 수 있습니다:

```
https://your-domain.com/products/{productCode}
```

예시:
- `https://your-domain.com/products/MAN-SG-0001`
- `https://your-domain.com/products/POP-JP-0001`

## 문제 해결

### 404 에러가 발생하는 경우
1. **AffiliateProduct 등록 확인**
   - `/admin/affiliate/products`에서 해당 상품의 어필리에이트 수당 설정 확인
   - `status`가 `'active'`인지 확인
   - `isPublished`가 `true`인지 확인

2. **적용 기간 확인**
   - `effectiveFrom`이 현재보다 이전인지 확인
   - `effectiveTo`가 현재보다 이후이거나 `null`인지 확인

3. **CruiseProduct 존재 확인**
   - `/admin/products`에서 해당 상품이 존재하는지 확인
   - 상품이 삭제되지 않았는지 확인

### 어필리에이트 뱃지가 표시되지 않는 경우
- AffiliateProduct가 등록되지 않았거나
- AffiliateProduct가 있지만 유효하지 않은 상태일 수 있습니다
- 페이지를 새로고침하거나 상품 목록을 다시 로드해보세요










