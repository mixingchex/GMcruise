# 판매 확정 녹음 파일 타입 체크 기능 분석

> **작성일**: 2025-01-28  
> **목적**: 기존 기능과의 충돌 확인 및 업그레이드 계획

---

## 📋 현재 상태 분석

### ✅ 기존 구현된 기능

1. **판매 확정 요청 API** (`/api/affiliate/sales/[saleId]/submit-confirmation`)
   - 녹음 파일 업로드: ✅ 구현됨
   - 파일 형식 검증: ✅ MP3, WAV, M4A 지원
   - 파일 크기 제한: ✅ 최대 50MB
   - 서버 저장: ✅ `public/uploads/sales-audio`

2. **판매 확정 승인 API** (`/api/admin/affiliate/sales/[saleId]/approve`)
   - 관리자 승인: ✅ 구현됨
   - 수당 자동 계산: ✅ `syncSaleCommissionLedgers` 호출
   - 알림 전송: ✅ 구현됨

3. **UI 컴포넌트** (`SalesConfirmationModal`)
   - 파일 선택: ✅ 구현됨
   - 상태 표시: ✅ 구현됨
   - 재요청 기능: ✅ 구현됨

### ❌ 누락된 기능

1. **녹음 파일 타입 구분**
   - 현재: 아무 녹음 파일이나 업로드 가능
   - 필요: 첫 콜 / 여권 안내 콜 구분

2. **정산 완료 조건 체크**
   - 현재: 녹음 파일 존재 여부만 확인
   - 필요: 첫 콜 또는 여권 안내 콜 녹음 필수 체크

---

## 🔍 스키마 확인 결과

### AffiliateSale 모델 현재 필드
```prisma
audioFileGoogleDriveId  String? // Google Drive 파일 ID
audioFileGoogleDriveUrl String? // Google Drive 공유 링크
audioFileName           String? // 원본 파일명
```

### 추가 필요 필드
- `audioFileType`: `String?` // 'FIRST_CALL' | 'PASSPORT_GUIDE' | null

---

## ⚠️ 호환성 고려사항

1. **기존 데이터 호환성**
   - 기존에 업로드된 녹음 파일은 `audioFileType`이 `null`일 수 있음
   - 기존 데이터는 그대로 유지하고, 새 업로드부터 타입 필수

2. **정산 로직 호환성**
   - 현재 정산은 `status`만 확인 (`CONFIRMED`, `PAID`, `PAYOUT_SCHEDULED`)
   - 녹음 파일 타입 체크는 추가 조건으로 구현 (기존 로직과 충돌 없음)

3. **API 호환성**
   - 기존 API는 그대로 유지
   - 새로운 필드(`audioFileType`)는 선택적(optional)으로 추가

---

## 📝 구현 계획

### 1단계: 스키마 수정
- `AffiliateSale` 모델에 `audioFileType` 필드 추가 (nullable)

### 2단계: API 수정
- `submit-confirmation` API에 `audioFileType` 파라미터 추가
- `approve` API에서 녹음 파일 타입 확인 (선택사항)

### 3단계: UI 수정
- `SalesConfirmationModal`에 타입 선택 UI 추가
- 라디오 버튼 또는 드롭다운으로 선택

### 4단계: 정산 완료 조건 추가
- 정산 로직에 녹음 파일 타입 체크 추가
- 첫 콜 또는 여권 안내 콜 중 하나 이상 필수

---

## ✅ 충돌 없음 확인

1. **기존 API**: 모두 정상 작동 (새 필드 추가만)
2. **기존 UI**: 정상 작동 (타입 선택 추가만)
3. **기존 데이터**: 호환성 유지 (null 허용)
4. **정산 로직**: 추가 조건만 추가 (기존 로직 유지)

---

**결론**: 기존 기능과 충돌 없이 안전하게 업그레이드 가능합니다.


> **작성일**: 2025-01-28  
> **목적**: 기존 기능과의 충돌 확인 및 업그레이드 계획

---

## 📋 현재 상태 분석

### ✅ 기존 구현된 기능

1. **판매 확정 요청 API** (`/api/affiliate/sales/[saleId]/submit-confirmation`)
   - 녹음 파일 업로드: ✅ 구현됨
   - 파일 형식 검증: ✅ MP3, WAV, M4A 지원
   - 파일 크기 제한: ✅ 최대 50MB
   - 서버 저장: ✅ `public/uploads/sales-audio`

2. **판매 확정 승인 API** (`/api/admin/affiliate/sales/[saleId]/approve`)
   - 관리자 승인: ✅ 구현됨
   - 수당 자동 계산: ✅ `syncSaleCommissionLedgers` 호출
   - 알림 전송: ✅ 구현됨

3. **UI 컴포넌트** (`SalesConfirmationModal`)
   - 파일 선택: ✅ 구현됨
   - 상태 표시: ✅ 구현됨
   - 재요청 기능: ✅ 구현됨

### ❌ 누락된 기능

1. **녹음 파일 타입 구분**
   - 현재: 아무 녹음 파일이나 업로드 가능
   - 필요: 첫 콜 / 여권 안내 콜 구분

2. **정산 완료 조건 체크**
   - 현재: 녹음 파일 존재 여부만 확인
   - 필요: 첫 콜 또는 여권 안내 콜 녹음 필수 체크

---

## 🔍 스키마 확인 결과

### AffiliateSale 모델 현재 필드
```prisma
audioFileGoogleDriveId  String? // Google Drive 파일 ID
audioFileGoogleDriveUrl String? // Google Drive 공유 링크
audioFileName           String? // 원본 파일명
```

### 추가 필요 필드
- `audioFileType`: `String?` // 'FIRST_CALL' | 'PASSPORT_GUIDE' | null

---

## ⚠️ 호환성 고려사항

1. **기존 데이터 호환성**
   - 기존에 업로드된 녹음 파일은 `audioFileType`이 `null`일 수 있음
   - 기존 데이터는 그대로 유지하고, 새 업로드부터 타입 필수

2. **정산 로직 호환성**
   - 현재 정산은 `status`만 확인 (`CONFIRMED`, `PAID`, `PAYOUT_SCHEDULED`)
   - 녹음 파일 타입 체크는 추가 조건으로 구현 (기존 로직과 충돌 없음)

3. **API 호환성**
   - 기존 API는 그대로 유지
   - 새로운 필드(`audioFileType`)는 선택적(optional)으로 추가

---

## 📝 구현 계획

### 1단계: 스키마 수정
- `AffiliateSale` 모델에 `audioFileType` 필드 추가 (nullable)

### 2단계: API 수정
- `submit-confirmation` API에 `audioFileType` 파라미터 추가
- `approve` API에서 녹음 파일 타입 확인 (선택사항)

### 3단계: UI 수정
- `SalesConfirmationModal`에 타입 선택 UI 추가
- 라디오 버튼 또는 드롭다운으로 선택

### 4단계: 정산 완료 조건 추가
- 정산 로직에 녹음 파일 타입 체크 추가
- 첫 콜 또는 여권 안내 콜 중 하나 이상 필수

---

## ✅ 충돌 없음 확인

1. **기존 API**: 모두 정상 작동 (새 필드 추가만)
2. **기존 UI**: 정상 작동 (타입 선택 추가만)
3. **기존 데이터**: 호환성 유지 (null 허용)
4. **정산 로직**: 추가 조건만 추가 (기존 로직 유지)

---

**결론**: 기존 기능과 충돌 없이 안전하게 업그레이드 가능합니다.


> **작성일**: 2025-01-28  
> **목적**: 기존 기능과의 충돌 확인 및 업그레이드 계획

---

## 📋 현재 상태 분석

### ✅ 기존 구현된 기능

1. **판매 확정 요청 API** (`/api/affiliate/sales/[saleId]/submit-confirmation`)
   - 녹음 파일 업로드: ✅ 구현됨
   - 파일 형식 검증: ✅ MP3, WAV, M4A 지원
   - 파일 크기 제한: ✅ 최대 50MB
   - 서버 저장: ✅ `public/uploads/sales-audio`

2. **판매 확정 승인 API** (`/api/admin/affiliate/sales/[saleId]/approve`)
   - 관리자 승인: ✅ 구현됨
   - 수당 자동 계산: ✅ `syncSaleCommissionLedgers` 호출
   - 알림 전송: ✅ 구현됨

3. **UI 컴포넌트** (`SalesConfirmationModal`)
   - 파일 선택: ✅ 구현됨
   - 상태 표시: ✅ 구현됨
   - 재요청 기능: ✅ 구현됨

### ❌ 누락된 기능

1. **녹음 파일 타입 구분**
   - 현재: 아무 녹음 파일이나 업로드 가능
   - 필요: 첫 콜 / 여권 안내 콜 구분

2. **정산 완료 조건 체크**
   - 현재: 녹음 파일 존재 여부만 확인
   - 필요: 첫 콜 또는 여권 안내 콜 녹음 필수 체크

---

## 🔍 스키마 확인 결과

### AffiliateSale 모델 현재 필드
```prisma
audioFileGoogleDriveId  String? // Google Drive 파일 ID
audioFileGoogleDriveUrl String? // Google Drive 공유 링크
audioFileName           String? // 원본 파일명
```

### 추가 필요 필드
- `audioFileType`: `String?` // 'FIRST_CALL' | 'PASSPORT_GUIDE' | null

---

## ⚠️ 호환성 고려사항

1. **기존 데이터 호환성**
   - 기존에 업로드된 녹음 파일은 `audioFileType`이 `null`일 수 있음
   - 기존 데이터는 그대로 유지하고, 새 업로드부터 타입 필수

2. **정산 로직 호환성**
   - 현재 정산은 `status`만 확인 (`CONFIRMED`, `PAID`, `PAYOUT_SCHEDULED`)
   - 녹음 파일 타입 체크는 추가 조건으로 구현 (기존 로직과 충돌 없음)

3. **API 호환성**
   - 기존 API는 그대로 유지
   - 새로운 필드(`audioFileType`)는 선택적(optional)으로 추가

---

## 📝 구현 계획

### 1단계: 스키마 수정
- `AffiliateSale` 모델에 `audioFileType` 필드 추가 (nullable)

### 2단계: API 수정
- `submit-confirmation` API에 `audioFileType` 파라미터 추가
- `approve` API에서 녹음 파일 타입 확인 (선택사항)

### 3단계: UI 수정
- `SalesConfirmationModal`에 타입 선택 UI 추가
- 라디오 버튼 또는 드롭다운으로 선택

### 4단계: 정산 완료 조건 추가
- 정산 로직에 녹음 파일 타입 체크 추가
- 첫 콜 또는 여권 안내 콜 중 하나 이상 필수

---

## ✅ 충돌 없음 확인

1. **기존 API**: 모두 정상 작동 (새 필드 추가만)
2. **기존 UI**: 정상 작동 (타입 선택 추가만)
3. **기존 데이터**: 호환성 유지 (null 허용)
4. **정산 로직**: 추가 조건만 추가 (기존 로직 유지)

---

**결론**: 기존 기능과 충돌 없이 안전하게 업그레이드 가능합니다.










