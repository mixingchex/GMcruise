# 판매 확정 프로세스 테스트 가이드 (상세)

> 작성일: 2025-01-28  
> 목적: 판매 확정 프로세스를 단계별로 테스트하는 방법

---

## 📋 테스트 전 준비사항

### 1. 환경 확인
- [ ] 데이터베이스 연결 확인
- [ ] Google Drive 환경 변수 설정 확인
- [ ] 세션 쿠키 확인 (`cg.sid.v2`)

### 2. 필요한 계정
- [ ] 관리자 계정 (role: 'admin')
- [ ] 판매원 계정 (AffiliateProfile type: 'SALES_AGENT')
- [ ] 대리점장 계정 (AffiliateProfile type: 'BRANCH_MANAGER')

### 3. 테스트 파일 준비
- [ ] 녹음 파일 (MP3, WAV, M4A 형식, 50MB 이하)

---

## 🧪 테스트 시나리오

### 시나리오 1: 판매원이 판매 확정 요청하기

**목적**: 판매원이 판매 확정 요청을 제출하는 과정 테스트

**단계별 테스트:**

#### 1-1. 판매 데이터 준비

**필요한 데이터:**
- 판매원의 AffiliateProfile ID
- 판매 정보 (상품 코드, 판매 금액 등)

**테스트 방법:**
1. 데이터베이스에 테스트 판매 데이터 생성
2. 판매 상태를 `PENDING`으로 설정

**SQL 쿼리 (예시):**
```sql
-- 1. 판매원 프로필 찾기
SELECT id, userId, type, affiliateCode 
FROM "AffiliateProfile" 
WHERE type = 'SALES_AGENT' 
LIMIT 1;

-- 2. 테스트 판매 생성 (위에서 찾은 agentId 사용)
INSERT INTO "AffiliateSale" (
  "agentId",
  "productCode",
  "saleAmount",
  "status",
  "saleDate",
  "createdAt",
  "updatedAt"
) VALUES (
  1,  -- 위에서 찾은 판매원 프로필 ID
  'TEST-PRODUCT-001',
  1000000,  -- 100만원
  'PENDING',
  NOW(),
  NOW(),
  NOW()
) RETURNING id;
```

#### 1-2. 판매원 대시보드 접속

**테스트 방법:**
1. 판매원 계정으로 로그인
2. `/partner/[mallUserId]/dashboard` 접속
3. "내 판매 목록" 섹션 확인

**확인 사항:**
- [ ] 판매 목록이 표시되는지
- [ ] 상태가 "대기 중"으로 표시되는지
- [ ] "확정 요청" 버튼이 보이는지

#### 1-3. 판매 확정 요청 제출

**테스트 방법:**
1. "확정 요청" 버튼 클릭
2. 판매 확정 모달 열림 확인
3. 녹음 파일 선택 (MP3, WAV, M4A)
4. "요청 제출" 버튼 클릭

**확인 사항:**
- [ ] 파일 업로드가 정상 작동하는지
- [ ] 로딩 상태가 표시되는지
- [ ] 성공 메시지가 표시되는지
- [ ] 상태가 "승인 대기"로 변경되는지

**예상 결과:**
- 판매 상태: `PENDING` → `PENDING_APPROVAL`
- `audioFileGoogleDriveUrl`에 Google Drive 링크 저장
- `submittedAt`에 제출 시간 저장

---

### 시나리오 2: 관리자가 승인 대기 목록 확인하기

**목적**: 관리자가 승인 대기 목록을 확인하는 과정 테스트

**단계별 테스트:**

#### 2-1. 관리자 패널 접속

**테스트 방법:**
1. 관리자 계정으로 로그인
2. `/admin/affiliate/sales-confirmation/pending` 접속

**확인 사항:**
- [ ] 페이지가 정상적으로 로드되는지
- [ ] 승인 대기 목록이 표시되는지
- [ ] 판매 정보가 올바르게 표시되는지

#### 2-2. 판매 정보 확인

**확인 사항:**
- [ ] 상품 코드가 표시되는지
- [ ] 판매 금액이 표시되는지
- [ ] 판매일이 표시되는지
- [ ] 담당자 정보 (판매원/대리점장)가 표시되는지
- [ ] 고객 정보가 표시되는지 (있는 경우)

#### 2-3. 녹음 파일 확인

**테스트 방법:**
1. "녹음 파일 확인" 링크 클릭
2. Google Drive 페이지가 열리는지 확인
3. 녹음 파일을 재생할 수 있는지 확인

**확인 사항:**
- [ ] Google Drive 링크가 정상 작동하는지
- [ ] 파일을 다운로드할 수 있는지
- [ ] 파일을 재생할 수 있는지

---

### 시나리오 3: 관리자가 판매 승인하기

**목적**: 관리자가 판매를 승인하고 수당이 자동 계산되는지 테스트

**단계별 테스트:**

#### 3-1. 승인 버튼 클릭

**테스트 방법:**
1. 승인 대기 목록에서 "승인" 버튼 클릭
2. 확인 메시지에서 "확인" 클릭

**확인 사항:**
- [ ] 확인 메시지가 표시되는지
- [ ] 로딩 상태가 표시되는지
- [ ] 성공 메시지가 표시되는지

#### 3-2. 데이터베이스 확인

**확인할 데이터:**
- 판매 상태가 `APPROVED`로 변경되었는지
- `approvedAt`에 승인 시간이 저장되었는지
- `approvedById`에 관리자 ID가 저장되었는지
- `CommissionLedger`가 생성되었는지

**SQL 쿼리:**
```sql
-- 1. 판매 상태 확인
SELECT id, status, "approvedAt", "approvedById"
FROM "AffiliateSale"
WHERE id = [판매ID];

-- 2. CommissionLedger 확인
SELECT id, "saleId", amount, "withholdingAmount", "isSettled"
FROM "CommissionLedger"
WHERE "saleId" = [판매ID];
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `APPROVED`
- `approvedAt`에 현재 시간 저장
- `approvedById`에 관리자 ID 저장
- `CommissionLedger`에 수당 레저 생성됨

#### 3-3. 알림 확인

**확인 사항:**
- [ ] 판매원/대리점장에게 알림이 전송되었는지
- [ ] 알림 내용이 올바른지

**확인 방법:**
- 데이터베이스에서 `NotificationLog` 확인
- 또는 프론트엔드에서 알림 확인

---

### 시나리오 4: 관리자가 판매 거부하기

**목적**: 관리자가 판매를 거부하고 재요청이 가능한지 테스트

**단계별 테스트:**

#### 4-1. 거부 버튼 클릭

**테스트 방법:**
1. 승인 대기 목록에서 "거부" 버튼 클릭
2. 거부 사유 입력 모달 열림 확인
3. 거부 사유 입력 (예: "녹음 파일이 불명확합니다")
4. "거부" 버튼 클릭

**확인 사항:**
- [ ] 거부 사유 입력 모달이 열리는지
- [ ] 거부 사유를 입력할 수 있는지
- [ ] 거부 사유 없이 제출할 수 없는지
- [ ] 성공 메시지가 표시되는지

#### 4-2. 데이터베이스 확인

**확인할 데이터:**
- 판매 상태가 `REJECTED`로 변경되었는지
- `rejectedAt`에 거부 시간이 저장되었는지
- `rejectedById`에 관리자 ID가 저장되었는지
- `rejectionReason`에 거부 사유가 저장되었는지
- `submittedAt`과 `submittedById`가 초기화되었는지

**SQL 쿼리:**
```sql
-- 판매 상태 확인
SELECT 
  id, 
  status, 
  "rejectedAt", 
  "rejectedById", 
  "rejectionReason",
  "submittedAt",
  "submittedById"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `REJECTED`
- `rejectedAt`에 현재 시간 저장
- `rejectedById`에 관리자 ID 저장
- `rejectionReason`에 거부 사유 저장
- `submittedAt`과 `submittedById`가 NULL로 초기화 (재요청 가능)

#### 4-3. 재요청 가능 여부 확인

**테스트 방법:**
1. 판매원 대시보드에서 해당 판매 확인
2. 상태가 "거부됨"으로 표시되는지 확인
3. "확정 요청" 버튼이 다시 활성화되는지 확인

**확인 사항:**
- [ ] 상태가 "거부됨"으로 표시되는지
- [ ] "확정 요청" 버튼이 다시 보이는지
- [ ] 재요청이 가능한지

---

### 시나리오 5: 판매원이 요청 취소하기

**목적**: 판매원이 승인 대기 중인 요청을 취소할 수 있는지 테스트

**단계별 테스트:**

#### 5-1. 요청 취소 버튼 클릭

**테스트 방법:**
1. 판매원 대시보드에서 "승인 대기" 상태인 판매 확인
2. "상세 보기" 버튼 클릭
3. 판매 확정 모달에서 "요청 취소" 버튼 클릭
4. 확인 메시지에서 "확인" 클릭

**확인 사항:**
- [ ] "요청 취소" 버튼이 보이는지
- [ ] 확인 메시지가 표시되는지
- [ ] 취소 후 상태가 변경되는지

#### 5-2. 데이터베이스 확인

**확인할 데이터:**
- 판매 상태가 `PENDING`으로 변경되었는지
- `submittedAt`과 `submittedById`가 초기화되었는지

**SQL 쿼리:**
```sql
-- 판매 상태 확인
SELECT 
  id, 
  status, 
  "submittedAt", 
  "submittedById"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `PENDING`
- `submittedAt`과 `submittedById`가 NULL로 초기화

---

## 🗄️ 테스트 데이터 생성 스크립트

### 스크립트 1: 테스트 판매 데이터 생성

**파일**: `scripts/create-test-sale.ts`

이 스크립트를 만들어서 테스트 데이터를 쉽게 생성할 수 있습니다.

---

## 📝 체크리스트

### 기본 기능 테스트
- [ ] 판매원: 판매 확정 요청 제출
- [ ] 관리자: 승인 대기 목록 조회
- [ ] 관리자: 녹음 파일 확인
- [ ] 관리자: 판매 승인
- [ ] 관리자: 판매 거부
- [ ] 판매원: 요청 취소

### 데이터 검증
- [ ] 판매 상태 변경 확인
- [ ] Google Drive 파일 업로드 확인
- [ ] 수당 자동 계산 확인
- [ ] CommissionLedger 생성 확인
- [ ] 알림 전송 확인

### 에러 처리
- [ ] 파일 크기 초과 시 에러 처리
- [ ] 잘못된 파일 형식 시 에러 처리
- [ ] 권한 없는 사용자 접근 시 에러 처리
- [ ] 이미 승인된 판매 재승인 시 에러 처리

---

## 🚀 다음 단계

1. 테스트 데이터 생성 스크립트 작성
2. 단계별 테스트 실행
3. 문제 발견 시 수정
4. 최종 확인


> 작성일: 2025-01-28  
> 목적: 판매 확정 프로세스를 단계별로 테스트하는 방법

---

## 📋 테스트 전 준비사항

### 1. 환경 확인
- [ ] 데이터베이스 연결 확인
- [ ] Google Drive 환경 변수 설정 확인
- [ ] 세션 쿠키 확인 (`cg.sid.v2`)

### 2. 필요한 계정
- [ ] 관리자 계정 (role: 'admin')
- [ ] 판매원 계정 (AffiliateProfile type: 'SALES_AGENT')
- [ ] 대리점장 계정 (AffiliateProfile type: 'BRANCH_MANAGER')

### 3. 테스트 파일 준비
- [ ] 녹음 파일 (MP3, WAV, M4A 형식, 50MB 이하)

---

## 🧪 테스트 시나리오

### 시나리오 1: 판매원이 판매 확정 요청하기

**목적**: 판매원이 판매 확정 요청을 제출하는 과정 테스트

**단계별 테스트:**

#### 1-1. 판매 데이터 준비

**필요한 데이터:**
- 판매원의 AffiliateProfile ID
- 판매 정보 (상품 코드, 판매 금액 등)

**테스트 방법:**
1. 데이터베이스에 테스트 판매 데이터 생성
2. 판매 상태를 `PENDING`으로 설정

**SQL 쿼리 (예시):**
```sql
-- 1. 판매원 프로필 찾기
SELECT id, userId, type, affiliateCode 
FROM "AffiliateProfile" 
WHERE type = 'SALES_AGENT' 
LIMIT 1;

-- 2. 테스트 판매 생성 (위에서 찾은 agentId 사용)
INSERT INTO "AffiliateSale" (
  "agentId",
  "productCode",
  "saleAmount",
  "status",
  "saleDate",
  "createdAt",
  "updatedAt"
) VALUES (
  1,  -- 위에서 찾은 판매원 프로필 ID
  'TEST-PRODUCT-001',
  1000000,  -- 100만원
  'PENDING',
  NOW(),
  NOW(),
  NOW()
) RETURNING id;
```

#### 1-2. 판매원 대시보드 접속

**테스트 방법:**
1. 판매원 계정으로 로그인
2. `/partner/[mallUserId]/dashboard` 접속
3. "내 판매 목록" 섹션 확인

**확인 사항:**
- [ ] 판매 목록이 표시되는지
- [ ] 상태가 "대기 중"으로 표시되는지
- [ ] "확정 요청" 버튼이 보이는지

#### 1-3. 판매 확정 요청 제출

**테스트 방법:**
1. "확정 요청" 버튼 클릭
2. 판매 확정 모달 열림 확인
3. 녹음 파일 선택 (MP3, WAV, M4A)
4. "요청 제출" 버튼 클릭

**확인 사항:**
- [ ] 파일 업로드가 정상 작동하는지
- [ ] 로딩 상태가 표시되는지
- [ ] 성공 메시지가 표시되는지
- [ ] 상태가 "승인 대기"로 변경되는지

**예상 결과:**
- 판매 상태: `PENDING` → `PENDING_APPROVAL`
- `audioFileGoogleDriveUrl`에 Google Drive 링크 저장
- `submittedAt`에 제출 시간 저장

---

### 시나리오 2: 관리자가 승인 대기 목록 확인하기

**목적**: 관리자가 승인 대기 목록을 확인하는 과정 테스트

**단계별 테스트:**

#### 2-1. 관리자 패널 접속

**테스트 방법:**
1. 관리자 계정으로 로그인
2. `/admin/affiliate/sales-confirmation/pending` 접속

**확인 사항:**
- [ ] 페이지가 정상적으로 로드되는지
- [ ] 승인 대기 목록이 표시되는지
- [ ] 판매 정보가 올바르게 표시되는지

#### 2-2. 판매 정보 확인

**확인 사항:**
- [ ] 상품 코드가 표시되는지
- [ ] 판매 금액이 표시되는지
- [ ] 판매일이 표시되는지
- [ ] 담당자 정보 (판매원/대리점장)가 표시되는지
- [ ] 고객 정보가 표시되는지 (있는 경우)

#### 2-3. 녹음 파일 확인

**테스트 방법:**
1. "녹음 파일 확인" 링크 클릭
2. Google Drive 페이지가 열리는지 확인
3. 녹음 파일을 재생할 수 있는지 확인

**확인 사항:**
- [ ] Google Drive 링크가 정상 작동하는지
- [ ] 파일을 다운로드할 수 있는지
- [ ] 파일을 재생할 수 있는지

---

### 시나리오 3: 관리자가 판매 승인하기

**목적**: 관리자가 판매를 승인하고 수당이 자동 계산되는지 테스트

**단계별 테스트:**

#### 3-1. 승인 버튼 클릭

**테스트 방법:**
1. 승인 대기 목록에서 "승인" 버튼 클릭
2. 확인 메시지에서 "확인" 클릭

**확인 사항:**
- [ ] 확인 메시지가 표시되는지
- [ ] 로딩 상태가 표시되는지
- [ ] 성공 메시지가 표시되는지

#### 3-2. 데이터베이스 확인

**확인할 데이터:**
- 판매 상태가 `APPROVED`로 변경되었는지
- `approvedAt`에 승인 시간이 저장되었는지
- `approvedById`에 관리자 ID가 저장되었는지
- `CommissionLedger`가 생성되었는지

**SQL 쿼리:**
```sql
-- 1. 판매 상태 확인
SELECT id, status, "approvedAt", "approvedById"
FROM "AffiliateSale"
WHERE id = [판매ID];

-- 2. CommissionLedger 확인
SELECT id, "saleId", amount, "withholdingAmount", "isSettled"
FROM "CommissionLedger"
WHERE "saleId" = [판매ID];
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `APPROVED`
- `approvedAt`에 현재 시간 저장
- `approvedById`에 관리자 ID 저장
- `CommissionLedger`에 수당 레저 생성됨

#### 3-3. 알림 확인

**확인 사항:**
- [ ] 판매원/대리점장에게 알림이 전송되었는지
- [ ] 알림 내용이 올바른지

**확인 방법:**
- 데이터베이스에서 `NotificationLog` 확인
- 또는 프론트엔드에서 알림 확인

---

### 시나리오 4: 관리자가 판매 거부하기

**목적**: 관리자가 판매를 거부하고 재요청이 가능한지 테스트

**단계별 테스트:**

#### 4-1. 거부 버튼 클릭

**테스트 방법:**
1. 승인 대기 목록에서 "거부" 버튼 클릭
2. 거부 사유 입력 모달 열림 확인
3. 거부 사유 입력 (예: "녹음 파일이 불명확합니다")
4. "거부" 버튼 클릭

**확인 사항:**
- [ ] 거부 사유 입력 모달이 열리는지
- [ ] 거부 사유를 입력할 수 있는지
- [ ] 거부 사유 없이 제출할 수 없는지
- [ ] 성공 메시지가 표시되는지

#### 4-2. 데이터베이스 확인

**확인할 데이터:**
- 판매 상태가 `REJECTED`로 변경되었는지
- `rejectedAt`에 거부 시간이 저장되었는지
- `rejectedById`에 관리자 ID가 저장되었는지
- `rejectionReason`에 거부 사유가 저장되었는지
- `submittedAt`과 `submittedById`가 초기화되었는지

**SQL 쿼리:**
```sql
-- 판매 상태 확인
SELECT 
  id, 
  status, 
  "rejectedAt", 
  "rejectedById", 
  "rejectionReason",
  "submittedAt",
  "submittedById"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `REJECTED`
- `rejectedAt`에 현재 시간 저장
- `rejectedById`에 관리자 ID 저장
- `rejectionReason`에 거부 사유 저장
- `submittedAt`과 `submittedById`가 NULL로 초기화 (재요청 가능)

#### 4-3. 재요청 가능 여부 확인

**테스트 방법:**
1. 판매원 대시보드에서 해당 판매 확인
2. 상태가 "거부됨"으로 표시되는지 확인
3. "확정 요청" 버튼이 다시 활성화되는지 확인

**확인 사항:**
- [ ] 상태가 "거부됨"으로 표시되는지
- [ ] "확정 요청" 버튼이 다시 보이는지
- [ ] 재요청이 가능한지

---

### 시나리오 5: 판매원이 요청 취소하기

**목적**: 판매원이 승인 대기 중인 요청을 취소할 수 있는지 테스트

**단계별 테스트:**

#### 5-1. 요청 취소 버튼 클릭

**테스트 방법:**
1. 판매원 대시보드에서 "승인 대기" 상태인 판매 확인
2. "상세 보기" 버튼 클릭
3. 판매 확정 모달에서 "요청 취소" 버튼 클릭
4. 확인 메시지에서 "확인" 클릭

**확인 사항:**
- [ ] "요청 취소" 버튼이 보이는지
- [ ] 확인 메시지가 표시되는지
- [ ] 취소 후 상태가 변경되는지

#### 5-2. 데이터베이스 확인

**확인할 데이터:**
- 판매 상태가 `PENDING`으로 변경되었는지
- `submittedAt`과 `submittedById`가 초기화되었는지

**SQL 쿼리:**
```sql
-- 판매 상태 확인
SELECT 
  id, 
  status, 
  "submittedAt", 
  "submittedById"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `PENDING`
- `submittedAt`과 `submittedById`가 NULL로 초기화

---

## 🗄️ 테스트 데이터 생성 스크립트

### 스크립트 1: 테스트 판매 데이터 생성

**파일**: `scripts/create-test-sale.ts`

이 스크립트를 만들어서 테스트 데이터를 쉽게 생성할 수 있습니다.

---

## 📝 체크리스트

### 기본 기능 테스트
- [ ] 판매원: 판매 확정 요청 제출
- [ ] 관리자: 승인 대기 목록 조회
- [ ] 관리자: 녹음 파일 확인
- [ ] 관리자: 판매 승인
- [ ] 관리자: 판매 거부
- [ ] 판매원: 요청 취소

### 데이터 검증
- [ ] 판매 상태 변경 확인
- [ ] Google Drive 파일 업로드 확인
- [ ] 수당 자동 계산 확인
- [ ] CommissionLedger 생성 확인
- [ ] 알림 전송 확인

### 에러 처리
- [ ] 파일 크기 초과 시 에러 처리
- [ ] 잘못된 파일 형식 시 에러 처리
- [ ] 권한 없는 사용자 접근 시 에러 처리
- [ ] 이미 승인된 판매 재승인 시 에러 처리

---

## 🚀 다음 단계

1. 테스트 데이터 생성 스크립트 작성
2. 단계별 테스트 실행
3. 문제 발견 시 수정
4. 최종 확인


> 작성일: 2025-01-28  
> 목적: 판매 확정 프로세스를 단계별로 테스트하는 방법

---

## 📋 테스트 전 준비사항

### 1. 환경 확인
- [ ] 데이터베이스 연결 확인
- [ ] Google Drive 환경 변수 설정 확인
- [ ] 세션 쿠키 확인 (`cg.sid.v2`)

### 2. 필요한 계정
- [ ] 관리자 계정 (role: 'admin')
- [ ] 판매원 계정 (AffiliateProfile type: 'SALES_AGENT')
- [ ] 대리점장 계정 (AffiliateProfile type: 'BRANCH_MANAGER')

### 3. 테스트 파일 준비
- [ ] 녹음 파일 (MP3, WAV, M4A 형식, 50MB 이하)

---

## 🧪 테스트 시나리오

### 시나리오 1: 판매원이 판매 확정 요청하기

**목적**: 판매원이 판매 확정 요청을 제출하는 과정 테스트

**단계별 테스트:**

#### 1-1. 판매 데이터 준비

**필요한 데이터:**
- 판매원의 AffiliateProfile ID
- 판매 정보 (상품 코드, 판매 금액 등)

**테스트 방법:**
1. 데이터베이스에 테스트 판매 데이터 생성
2. 판매 상태를 `PENDING`으로 설정

**SQL 쿼리 (예시):**
```sql
-- 1. 판매원 프로필 찾기
SELECT id, userId, type, affiliateCode 
FROM "AffiliateProfile" 
WHERE type = 'SALES_AGENT' 
LIMIT 1;

-- 2. 테스트 판매 생성 (위에서 찾은 agentId 사용)
INSERT INTO "AffiliateSale" (
  "agentId",
  "productCode",
  "saleAmount",
  "status",
  "saleDate",
  "createdAt",
  "updatedAt"
) VALUES (
  1,  -- 위에서 찾은 판매원 프로필 ID
  'TEST-PRODUCT-001',
  1000000,  -- 100만원
  'PENDING',
  NOW(),
  NOW(),
  NOW()
) RETURNING id;
```

#### 1-2. 판매원 대시보드 접속

**테스트 방법:**
1. 판매원 계정으로 로그인
2. `/partner/[mallUserId]/dashboard` 접속
3. "내 판매 목록" 섹션 확인

**확인 사항:**
- [ ] 판매 목록이 표시되는지
- [ ] 상태가 "대기 중"으로 표시되는지
- [ ] "확정 요청" 버튼이 보이는지

#### 1-3. 판매 확정 요청 제출

**테스트 방법:**
1. "확정 요청" 버튼 클릭
2. 판매 확정 모달 열림 확인
3. 녹음 파일 선택 (MP3, WAV, M4A)
4. "요청 제출" 버튼 클릭

**확인 사항:**
- [ ] 파일 업로드가 정상 작동하는지
- [ ] 로딩 상태가 표시되는지
- [ ] 성공 메시지가 표시되는지
- [ ] 상태가 "승인 대기"로 변경되는지

**예상 결과:**
- 판매 상태: `PENDING` → `PENDING_APPROVAL`
- `audioFileGoogleDriveUrl`에 Google Drive 링크 저장
- `submittedAt`에 제출 시간 저장

---

### 시나리오 2: 관리자가 승인 대기 목록 확인하기

**목적**: 관리자가 승인 대기 목록을 확인하는 과정 테스트

**단계별 테스트:**

#### 2-1. 관리자 패널 접속

**테스트 방법:**
1. 관리자 계정으로 로그인
2. `/admin/affiliate/sales-confirmation/pending` 접속

**확인 사항:**
- [ ] 페이지가 정상적으로 로드되는지
- [ ] 승인 대기 목록이 표시되는지
- [ ] 판매 정보가 올바르게 표시되는지

#### 2-2. 판매 정보 확인

**확인 사항:**
- [ ] 상품 코드가 표시되는지
- [ ] 판매 금액이 표시되는지
- [ ] 판매일이 표시되는지
- [ ] 담당자 정보 (판매원/대리점장)가 표시되는지
- [ ] 고객 정보가 표시되는지 (있는 경우)

#### 2-3. 녹음 파일 확인

**테스트 방법:**
1. "녹음 파일 확인" 링크 클릭
2. Google Drive 페이지가 열리는지 확인
3. 녹음 파일을 재생할 수 있는지 확인

**확인 사항:**
- [ ] Google Drive 링크가 정상 작동하는지
- [ ] 파일을 다운로드할 수 있는지
- [ ] 파일을 재생할 수 있는지

---

### 시나리오 3: 관리자가 판매 승인하기

**목적**: 관리자가 판매를 승인하고 수당이 자동 계산되는지 테스트

**단계별 테스트:**

#### 3-1. 승인 버튼 클릭

**테스트 방법:**
1. 승인 대기 목록에서 "승인" 버튼 클릭
2. 확인 메시지에서 "확인" 클릭

**확인 사항:**
- [ ] 확인 메시지가 표시되는지
- [ ] 로딩 상태가 표시되는지
- [ ] 성공 메시지가 표시되는지

#### 3-2. 데이터베이스 확인

**확인할 데이터:**
- 판매 상태가 `APPROVED`로 변경되었는지
- `approvedAt`에 승인 시간이 저장되었는지
- `approvedById`에 관리자 ID가 저장되었는지
- `CommissionLedger`가 생성되었는지

**SQL 쿼리:**
```sql
-- 1. 판매 상태 확인
SELECT id, status, "approvedAt", "approvedById"
FROM "AffiliateSale"
WHERE id = [판매ID];

-- 2. CommissionLedger 확인
SELECT id, "saleId", amount, "withholdingAmount", "isSettled"
FROM "CommissionLedger"
WHERE "saleId" = [판매ID];
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `APPROVED`
- `approvedAt`에 현재 시간 저장
- `approvedById`에 관리자 ID 저장
- `CommissionLedger`에 수당 레저 생성됨

#### 3-3. 알림 확인

**확인 사항:**
- [ ] 판매원/대리점장에게 알림이 전송되었는지
- [ ] 알림 내용이 올바른지

**확인 방법:**
- 데이터베이스에서 `NotificationLog` 확인
- 또는 프론트엔드에서 알림 확인

---

### 시나리오 4: 관리자가 판매 거부하기

**목적**: 관리자가 판매를 거부하고 재요청이 가능한지 테스트

**단계별 테스트:**

#### 4-1. 거부 버튼 클릭

**테스트 방법:**
1. 승인 대기 목록에서 "거부" 버튼 클릭
2. 거부 사유 입력 모달 열림 확인
3. 거부 사유 입력 (예: "녹음 파일이 불명확합니다")
4. "거부" 버튼 클릭

**확인 사항:**
- [ ] 거부 사유 입력 모달이 열리는지
- [ ] 거부 사유를 입력할 수 있는지
- [ ] 거부 사유 없이 제출할 수 없는지
- [ ] 성공 메시지가 표시되는지

#### 4-2. 데이터베이스 확인

**확인할 데이터:**
- 판매 상태가 `REJECTED`로 변경되었는지
- `rejectedAt`에 거부 시간이 저장되었는지
- `rejectedById`에 관리자 ID가 저장되었는지
- `rejectionReason`에 거부 사유가 저장되었는지
- `submittedAt`과 `submittedById`가 초기화되었는지

**SQL 쿼리:**
```sql
-- 판매 상태 확인
SELECT 
  id, 
  status, 
  "rejectedAt", 
  "rejectedById", 
  "rejectionReason",
  "submittedAt",
  "submittedById"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `REJECTED`
- `rejectedAt`에 현재 시간 저장
- `rejectedById`에 관리자 ID 저장
- `rejectionReason`에 거부 사유 저장
- `submittedAt`과 `submittedById`가 NULL로 초기화 (재요청 가능)

#### 4-3. 재요청 가능 여부 확인

**테스트 방법:**
1. 판매원 대시보드에서 해당 판매 확인
2. 상태가 "거부됨"으로 표시되는지 확인
3. "확정 요청" 버튼이 다시 활성화되는지 확인

**확인 사항:**
- [ ] 상태가 "거부됨"으로 표시되는지
- [ ] "확정 요청" 버튼이 다시 보이는지
- [ ] 재요청이 가능한지

---

### 시나리오 5: 판매원이 요청 취소하기

**목적**: 판매원이 승인 대기 중인 요청을 취소할 수 있는지 테스트

**단계별 테스트:**

#### 5-1. 요청 취소 버튼 클릭

**테스트 방법:**
1. 판매원 대시보드에서 "승인 대기" 상태인 판매 확인
2. "상세 보기" 버튼 클릭
3. 판매 확정 모달에서 "요청 취소" 버튼 클릭
4. 확인 메시지에서 "확인" 클릭

**확인 사항:**
- [ ] "요청 취소" 버튼이 보이는지
- [ ] 확인 메시지가 표시되는지
- [ ] 취소 후 상태가 변경되는지

#### 5-2. 데이터베이스 확인

**확인할 데이터:**
- 판매 상태가 `PENDING`으로 변경되었는지
- `submittedAt`과 `submittedById`가 초기화되었는지

**SQL 쿼리:**
```sql
-- 판매 상태 확인
SELECT 
  id, 
  status, 
  "submittedAt", 
  "submittedById"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `PENDING`
- `submittedAt`과 `submittedById`가 NULL로 초기화

---

## 🗄️ 테스트 데이터 생성 스크립트

### 스크립트 1: 테스트 판매 데이터 생성

**파일**: `scripts/create-test-sale.ts`

이 스크립트를 만들어서 테스트 데이터를 쉽게 생성할 수 있습니다.

---

## 📝 체크리스트

### 기본 기능 테스트
- [ ] 판매원: 판매 확정 요청 제출
- [ ] 관리자: 승인 대기 목록 조회
- [ ] 관리자: 녹음 파일 확인
- [ ] 관리자: 판매 승인
- [ ] 관리자: 판매 거부
- [ ] 판매원: 요청 취소

### 데이터 검증
- [ ] 판매 상태 변경 확인
- [ ] Google Drive 파일 업로드 확인
- [ ] 수당 자동 계산 확인
- [ ] CommissionLedger 생성 확인
- [ ] 알림 전송 확인

### 에러 처리
- [ ] 파일 크기 초과 시 에러 처리
- [ ] 잘못된 파일 형식 시 에러 처리
- [ ] 권한 없는 사용자 접근 시 에러 처리
- [ ] 이미 승인된 판매 재승인 시 에러 처리

---

## 🚀 다음 단계

1. 테스트 데이터 생성 스크립트 작성
2. 단계별 테스트 실행
3. 문제 발견 시 수정
4. 최종 확인










