# 판매 확정 프로세스 단계별 테스트 가이드

> 작성일: 2025-01-28  
> 목적: 판매 확정 프로세스를 하나씩 차근차근 테스트하는 방법

---

## 📋 테스트 전 준비

### 1. 테스트 데이터 생성

터미널에서 다음 명령어 실행:

```bash
cd /home/userhyeseon28/projects/cruise-guide
npx tsx scripts/create-sales-confirmation-test-data.ts
```

**예상 출력:**
```
🧪 판매 확정 프로세스 테스트 데이터 생성 시작...

1️⃣ 관리자 계정 확인 중...
   ✅ 관리자: 관리자이름 (ID: 1)

2️⃣ 판매원 계정 확인 중...
   ✅ 판매원: 판매원이름 (ID: 2)
   ✅ 프로필 ID: 3
   ✅ 어필리에이트 코드: AGENT001

3️⃣ 대리점장 계정 확인 중...
   ℹ️  대리점장 계정이 없습니다. (선택사항)

4️⃣ 어필리에이트 상품 확인 중...
   ✅ 상품: 테스트 크루즈 상품 (TEST-PRODUCT-001)

5️⃣ 테스트 판매 데이터 생성 중...
   ✅ 판매 #1: PENDING 상태 (확정 요청 가능)
   ✅ 판매 #2: PENDING_APPROVAL 상태 (승인 대기)
   ✅ 판매 #3: APPROVED 상태 (이미 승인됨)
   ✅ 판매 #4: REJECTED 상태 (거부됨, 재요청 가능)

✨ 테스트 데이터 생성 완료!
```

**만약 에러가 발생하면:**
- 관리자 계정이 없으면: `npx tsx scripts/create-admin.ts` 실행
- 판매원 계정이 없으면: 어필리에이트 계약서를 통해 생성하거나 `scripts/create-affiliate-test-data.ts` 실행

---

## 🧪 단계별 테스트

### 단계 1: 판매원 대시보드 접속 및 판매 목록 확인

**목적**: 판매원이 자신의 판매 목록을 볼 수 있는지 확인

**테스트 방법:**
1. 판매원 계정으로 로그인
2. 브라우저에서 `/partner/[mallUserId]/dashboard` 접속
   - `[mallUserId]`는 판매원의 `mallUserId` 또는 `phone`
3. 페이지가 정상적으로 로드되는지 확인
4. "내 판매 목록" 섹션 찾기
5. 판매 목록이 표시되는지 확인

**확인 사항:**
- [ ] 페이지가 정상적으로 로드되는가?
- [ ] "내 판매 목록" 섹션이 보이는가?
- [ ] 판매 목록이 표시되는가?
- [ ] 각 판매의 상태가 올바르게 표시되는가?
  - PENDING → "대기 중" (회색)
  - PENDING_APPROVAL → "승인 대기" (노란색)
  - APPROVED → "승인됨" (초록색)
  - REJECTED → "거부됨" (빨간색)

**예상 결과:**
- 4개의 판매가 표시되어야 함
- 각 판매의 상태가 올바르게 표시되어야 함

---

### 단계 2: 판매 확정 요청 제출 (PENDING → PENDING_APPROVAL)

**목적**: 판매원이 판매 확정 요청을 제출할 수 있는지 확인

**테스트 방법:**
1. 판매 목록에서 **PENDING 상태**인 판매 찾기 (판매 #1)
2. "확정 요청" 버튼 클릭
3. 판매 확정 모달이 열리는지 확인
4. 모달에서 다음 정보 확인:
   - 상품 코드
   - 판매 금액
   - 판매일
   - 상태: "대기 중"
5. 녹음 파일 선택
   - MP3, WAV, M4A 형식
   - 50MB 이하
6. "요청 제출" 버튼 클릭

**확인 사항:**
- [ ] 모달이 정상적으로 열리는가?
- [ ] 판매 정보가 올바르게 표시되는가?
- [ ] 파일 선택이 가능한가?
- [ ] 파일 크기 제한이 작동하는가? (50MB 초과 시 에러)
- [ ] 파일 형식 제한이 작동하는가? (지원하지 않는 형식 시 에러)
- [ ] "요청 제출" 버튼이 작동하는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 모달이 닫히는가?
- [ ] 판매 목록이 새로고침되는가?
- [ ] 상태가 "승인 대기"로 변경되는가?

**예상 결과:**
- 파일 업로드 성공
- Google Drive에 파일 저장
- 판매 상태: `PENDING` → `PENDING_APPROVAL`
- 성공 메시지 표시

**데이터베이스 확인:**
```sql
SELECT 
  id, 
  status, 
  "audioFileGoogleDriveUrl",
  "submittedAt",
  "submittedById"
FROM "AffiliateSale"
WHERE id = 1;  -- 판매 #1 ID
```

**예상 결과:**
- `status`: `PENDING_APPROVAL`
- `audioFileGoogleDriveUrl`: Google Drive 링크
- `submittedAt`: 현재 시간
- `submittedById`: 판매원 ID

---

### 단계 3: 관리자 승인 대기 목록 확인

**목적**: 관리자가 승인 대기 목록을 볼 수 있는지 확인

**테스트 방법:**
1. 관리자 계정으로 로그인
2. 브라우저에서 `/admin/affiliate/sales-confirmation/pending` 접속
3. 페이지가 정상적으로 로드되는지 확인
4. 승인 대기 목록 확인

**확인 사항:**
- [ ] 페이지가 정상적으로 로드되는가?
- [ ] 승인 대기 목록이 표시되는가?
- [ ] 판매 정보가 올바르게 표시되는가?
  - 상품 코드
  - 판매 금액
  - 판매일
  - 담당자 정보 (판매원/대리점장)
- [ ] "녹음 파일 확인" 링크가 보이는가?

**예상 결과:**
- 최소 1개 이상의 승인 대기 판매가 표시되어야 함
- 판매 #2 (PENDING_APPROVAL 상태)가 표시되어야 함

---

### 단계 4: 녹음 파일 확인

**목적**: 관리자가 Google Drive에서 녹음 파일을 확인할 수 있는지 확인

**테스트 방법:**
1. 승인 대기 목록에서 판매 선택
2. "녹음 파일 확인" 링크 클릭
3. 새 탭에서 Google Drive 페이지가 열리는지 확인
4. 파일을 다운로드하거나 재생할 수 있는지 확인

**확인 사항:**
- [ ] 링크가 정상적으로 작동하는가?
- [ ] Google Drive 페이지가 열리는가?
- [ ] 파일에 접근할 수 있는가?
- [ ] 파일을 다운로드할 수 있는가?
- [ ] 파일을 재생할 수 있는가?

**예상 결과:**
- Google Drive 링크가 정상 작동
- 파일에 접근 가능

---

### 단계 5: 판매 승인 (PENDING_APPROVAL → APPROVED)

**목적**: 관리자가 판매를 승인하고 수당이 자동 계산되는지 확인

**테스트 방법:**
1. 승인 대기 목록에서 판매 선택
2. "승인" 버튼 클릭
3. 확인 메시지에서 "확인" 클릭
4. 로딩 상태 확인
5. 성공 메시지 확인

**확인 사항:**
- [ ] "승인" 버튼이 작동하는가?
- [ ] 확인 메시지가 표시되는가?
- [ ] 로딩 상태가 표시되는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 목록에서 해당 판매가 사라지는가? (승인 대기 목록에서 제거)
- [ ] 판매원에게 알림이 전송되었는가?

**데이터베이스 확인:**
```sql
-- 1. 판매 상태 확인
SELECT 
  id, 
  status, 
  "approvedAt",
  "approvedById"
FROM "AffiliateSale"
WHERE id = 2;  -- 판매 #2 ID

-- 2. 수당 레저 확인
SELECT 
  id,
  "saleId",
  amount,
  "withholdingAmount",
  "isSettled"
FROM "CommissionLedger"
WHERE "saleId" = 2;  -- 판매 #2 ID
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `APPROVED`
- `approvedAt`: 현재 시간
- `approvedById`: 관리자 ID
- `CommissionLedger` 레코드 생성됨

---

### 단계 6: 판매 거부 (PENDING_APPROVAL → REJECTED)

**목적**: 관리자가 판매를 거부하고 재요청이 가능한지 확인

**테스트 방법:**
1. 승인 대기 목록에서 다른 판매 선택 (또는 단계 2에서 새로 생성한 판매)
2. "거부" 버튼 클릭
3. 거부 사유 입력 모달 확인
4. 거부 사유 입력 (예: "녹음 파일이 불명확합니다")
5. "거부" 버튼 클릭
6. 성공 메시지 확인

**확인 사항:**
- [ ] "거부" 버튼이 작동하는가?
- [ ] 거부 사유 입력 모달이 열리는가?
- [ ] 거부 사유 없이 제출할 수 없는가?
- [ ] 거부 사유를 입력할 수 있는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 목록에서 해당 판매가 사라지는가?
- [ ] 판매원에게 알림이 전송되었는가?

**데이터베이스 확인:**
```sql
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
- `rejectedAt`: 현재 시간
- `rejectedById`: 관리자 ID
- `rejectionReason`: 입력한 거부 사유
- `submittedAt`과 `submittedById`: NULL (재요청 가능)

---

### 단계 7: 재요청 (REJECTED → PENDING_APPROVAL)

**목적**: 거부된 판매를 다시 요청할 수 있는지 확인

**테스트 방법:**
1. 판매원 대시보드로 돌아가기
2. 판매 목록에서 **REJECTED 상태**인 판매 찾기 (판매 #4)
3. 상태가 "거부됨"으로 표시되는지 확인
4. "확정 요청" 버튼이 다시 활성화되어 있는지 확인
5. "확정 요청" 버튼 클릭
6. 새로운 녹음 파일 선택
7. "요청 제출" 버튼 클릭

**확인 사항:**
- [ ] 상태가 "거부됨"으로 표시되는가?
- [ ] "확정 요청" 버튼이 보이는가?
- [ ] 모달에서 거부 사유가 표시되는가?
- [ ] 새로운 파일을 업로드할 수 있는가?
- [ ] 요청 제출이 정상 작동하는가?
- [ ] 상태가 다시 "승인 대기"로 변경되는가?

**예상 결과:**
- 재요청 성공
- 판매 상태: `REJECTED` → `PENDING_APPROVAL`
- 새로운 파일이 업로드됨

---

### 단계 8: 요청 취소 (PENDING_APPROVAL → PENDING)

**목적**: 판매원이 승인 대기 중인 요청을 취소할 수 있는지 확인

**테스트 방법:**
1. 판매 목록에서 **PENDING_APPROVAL 상태**인 판매 찾기
2. "상세 보기" 버튼 클릭
3. 판매 확정 모달에서 "요청 취소" 버튼 확인
4. "요청 취소" 버튼 클릭
5. 확인 메시지에서 "확인" 클릭
6. 성공 메시지 확인

**확인 사항:**
- [ ] "요청 취소" 버튼이 보이는가?
- [ ] 확인 메시지가 표시되는가?
- [ ] 취소가 정상 작동하는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 상태가 "대기 중"으로 변경되는가?

**데이터베이스 확인:**
```sql
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
- `submittedAt`과 `submittedById`: NULL

---

## 🐛 문제 해결

### 문제 1: 판매 목록이 표시되지 않음

**원인:**
- 판매원 계정에 연결된 AffiliateProfile이 없음
- 판매 데이터가 없음

**해결:**
1. 데이터베이스 확인:
```sql
SELECT * FROM "AffiliateProfile" WHERE "userId" = [판매원ID];
SELECT * FROM "AffiliateSale" WHERE "agentId" = [프로필ID];
```

2. 테스트 데이터 재생성:
```bash
npx tsx scripts/create-sales-confirmation-test-data.ts
```

### 문제 2: 파일 업로드 실패

**원인:**
- Google Drive 환경 변수 미설정
- 파일 크기 초과
- 파일 형식 오류

**해결:**
1. 환경 변수 확인:
```bash
echo $GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
echo $GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
echo $GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID
```

2. 파일 크기 확인 (50MB 이하)
3. 파일 형식 확인 (MP3, WAV, M4A)

### 문제 3: 승인 대기 목록이 비어있음

**원인:**
- PENDING_APPROVAL 상태인 판매가 없음

**해결:**
1. 데이터베이스 확인:
```sql
SELECT * FROM "AffiliateSale" WHERE status = 'PENDING_APPROVAL';
```

2. 단계 2를 다시 실행하여 판매 확정 요청 제출

### 문제 4: 수당이 자동 계산되지 않음

**원인:**
- `syncSaleCommissionLedgers` 함수 오류
- 상품 정보 부족

**해결:**
1. 서버 로그 확인
2. 데이터베이스에서 CommissionLedger 확인:
```sql
SELECT * FROM "CommissionLedger" WHERE "saleId" = [판매ID];
```

---

## ✅ 최종 체크리스트

### 기본 기능
- [ ] 판매원: 판매 목록 조회
- [ ] 판매원: 판매 확정 요청 제출
- [ ] 판매원: 요청 취소
- [ ] 관리자: 승인 대기 목록 조회
- [ ] 관리자: 녹음 파일 확인
- [ ] 관리자: 판매 승인
- [ ] 관리자: 판매 거부

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

---

## 🎉 테스트 완료!

모든 단계를 완료했다면, 판매 확정 프로세스가 정상적으로 작동하는 것입니다!

**다음 단계:**
- 실제 데이터로 테스트
- 성능 최적화
- 사용자 피드백 수집


> 작성일: 2025-01-28  
> 목적: 판매 확정 프로세스를 하나씩 차근차근 테스트하는 방법

---

## 📋 테스트 전 준비

### 1. 테스트 데이터 생성

터미널에서 다음 명령어 실행:

```bash
cd /home/userhyeseon28/projects/cruise-guide
npx tsx scripts/create-sales-confirmation-test-data.ts
```

**예상 출력:**
```
🧪 판매 확정 프로세스 테스트 데이터 생성 시작...

1️⃣ 관리자 계정 확인 중...
   ✅ 관리자: 관리자이름 (ID: 1)

2️⃣ 판매원 계정 확인 중...
   ✅ 판매원: 판매원이름 (ID: 2)
   ✅ 프로필 ID: 3
   ✅ 어필리에이트 코드: AGENT001

3️⃣ 대리점장 계정 확인 중...
   ℹ️  대리점장 계정이 없습니다. (선택사항)

4️⃣ 어필리에이트 상품 확인 중...
   ✅ 상품: 테스트 크루즈 상품 (TEST-PRODUCT-001)

5️⃣ 테스트 판매 데이터 생성 중...
   ✅ 판매 #1: PENDING 상태 (확정 요청 가능)
   ✅ 판매 #2: PENDING_APPROVAL 상태 (승인 대기)
   ✅ 판매 #3: APPROVED 상태 (이미 승인됨)
   ✅ 판매 #4: REJECTED 상태 (거부됨, 재요청 가능)

✨ 테스트 데이터 생성 완료!
```

**만약 에러가 발생하면:**
- 관리자 계정이 없으면: `npx tsx scripts/create-admin.ts` 실행
- 판매원 계정이 없으면: 어필리에이트 계약서를 통해 생성하거나 `scripts/create-affiliate-test-data.ts` 실행

---

## 🧪 단계별 테스트

### 단계 1: 판매원 대시보드 접속 및 판매 목록 확인

**목적**: 판매원이 자신의 판매 목록을 볼 수 있는지 확인

**테스트 방법:**
1. 판매원 계정으로 로그인
2. 브라우저에서 `/partner/[mallUserId]/dashboard` 접속
   - `[mallUserId]`는 판매원의 `mallUserId` 또는 `phone`
3. 페이지가 정상적으로 로드되는지 확인
4. "내 판매 목록" 섹션 찾기
5. 판매 목록이 표시되는지 확인

**확인 사항:**
- [ ] 페이지가 정상적으로 로드되는가?
- [ ] "내 판매 목록" 섹션이 보이는가?
- [ ] 판매 목록이 표시되는가?
- [ ] 각 판매의 상태가 올바르게 표시되는가?
  - PENDING → "대기 중" (회색)
  - PENDING_APPROVAL → "승인 대기" (노란색)
  - APPROVED → "승인됨" (초록색)
  - REJECTED → "거부됨" (빨간색)

**예상 결과:**
- 4개의 판매가 표시되어야 함
- 각 판매의 상태가 올바르게 표시되어야 함

---

### 단계 2: 판매 확정 요청 제출 (PENDING → PENDING_APPROVAL)

**목적**: 판매원이 판매 확정 요청을 제출할 수 있는지 확인

**테스트 방법:**
1. 판매 목록에서 **PENDING 상태**인 판매 찾기 (판매 #1)
2. "확정 요청" 버튼 클릭
3. 판매 확정 모달이 열리는지 확인
4. 모달에서 다음 정보 확인:
   - 상품 코드
   - 판매 금액
   - 판매일
   - 상태: "대기 중"
5. 녹음 파일 선택
   - MP3, WAV, M4A 형식
   - 50MB 이하
6. "요청 제출" 버튼 클릭

**확인 사항:**
- [ ] 모달이 정상적으로 열리는가?
- [ ] 판매 정보가 올바르게 표시되는가?
- [ ] 파일 선택이 가능한가?
- [ ] 파일 크기 제한이 작동하는가? (50MB 초과 시 에러)
- [ ] 파일 형식 제한이 작동하는가? (지원하지 않는 형식 시 에러)
- [ ] "요청 제출" 버튼이 작동하는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 모달이 닫히는가?
- [ ] 판매 목록이 새로고침되는가?
- [ ] 상태가 "승인 대기"로 변경되는가?

**예상 결과:**
- 파일 업로드 성공
- Google Drive에 파일 저장
- 판매 상태: `PENDING` → `PENDING_APPROVAL`
- 성공 메시지 표시

**데이터베이스 확인:**
```sql
SELECT 
  id, 
  status, 
  "audioFileGoogleDriveUrl",
  "submittedAt",
  "submittedById"
FROM "AffiliateSale"
WHERE id = 1;  -- 판매 #1 ID
```

**예상 결과:**
- `status`: `PENDING_APPROVAL`
- `audioFileGoogleDriveUrl`: Google Drive 링크
- `submittedAt`: 현재 시간
- `submittedById`: 판매원 ID

---

### 단계 3: 관리자 승인 대기 목록 확인

**목적**: 관리자가 승인 대기 목록을 볼 수 있는지 확인

**테스트 방법:**
1. 관리자 계정으로 로그인
2. 브라우저에서 `/admin/affiliate/sales-confirmation/pending` 접속
3. 페이지가 정상적으로 로드되는지 확인
4. 승인 대기 목록 확인

**확인 사항:**
- [ ] 페이지가 정상적으로 로드되는가?
- [ ] 승인 대기 목록이 표시되는가?
- [ ] 판매 정보가 올바르게 표시되는가?
  - 상품 코드
  - 판매 금액
  - 판매일
  - 담당자 정보 (판매원/대리점장)
- [ ] "녹음 파일 확인" 링크가 보이는가?

**예상 결과:**
- 최소 1개 이상의 승인 대기 판매가 표시되어야 함
- 판매 #2 (PENDING_APPROVAL 상태)가 표시되어야 함

---

### 단계 4: 녹음 파일 확인

**목적**: 관리자가 Google Drive에서 녹음 파일을 확인할 수 있는지 확인

**테스트 방법:**
1. 승인 대기 목록에서 판매 선택
2. "녹음 파일 확인" 링크 클릭
3. 새 탭에서 Google Drive 페이지가 열리는지 확인
4. 파일을 다운로드하거나 재생할 수 있는지 확인

**확인 사항:**
- [ ] 링크가 정상적으로 작동하는가?
- [ ] Google Drive 페이지가 열리는가?
- [ ] 파일에 접근할 수 있는가?
- [ ] 파일을 다운로드할 수 있는가?
- [ ] 파일을 재생할 수 있는가?

**예상 결과:**
- Google Drive 링크가 정상 작동
- 파일에 접근 가능

---

### 단계 5: 판매 승인 (PENDING_APPROVAL → APPROVED)

**목적**: 관리자가 판매를 승인하고 수당이 자동 계산되는지 확인

**테스트 방법:**
1. 승인 대기 목록에서 판매 선택
2. "승인" 버튼 클릭
3. 확인 메시지에서 "확인" 클릭
4. 로딩 상태 확인
5. 성공 메시지 확인

**확인 사항:**
- [ ] "승인" 버튼이 작동하는가?
- [ ] 확인 메시지가 표시되는가?
- [ ] 로딩 상태가 표시되는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 목록에서 해당 판매가 사라지는가? (승인 대기 목록에서 제거)
- [ ] 판매원에게 알림이 전송되었는가?

**데이터베이스 확인:**
```sql
-- 1. 판매 상태 확인
SELECT 
  id, 
  status, 
  "approvedAt",
  "approvedById"
FROM "AffiliateSale"
WHERE id = 2;  -- 판매 #2 ID

-- 2. 수당 레저 확인
SELECT 
  id,
  "saleId",
  amount,
  "withholdingAmount",
  "isSettled"
FROM "CommissionLedger"
WHERE "saleId" = 2;  -- 판매 #2 ID
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `APPROVED`
- `approvedAt`: 현재 시간
- `approvedById`: 관리자 ID
- `CommissionLedger` 레코드 생성됨

---

### 단계 6: 판매 거부 (PENDING_APPROVAL → REJECTED)

**목적**: 관리자가 판매를 거부하고 재요청이 가능한지 확인

**테스트 방법:**
1. 승인 대기 목록에서 다른 판매 선택 (또는 단계 2에서 새로 생성한 판매)
2. "거부" 버튼 클릭
3. 거부 사유 입력 모달 확인
4. 거부 사유 입력 (예: "녹음 파일이 불명확합니다")
5. "거부" 버튼 클릭
6. 성공 메시지 확인

**확인 사항:**
- [ ] "거부" 버튼이 작동하는가?
- [ ] 거부 사유 입력 모달이 열리는가?
- [ ] 거부 사유 없이 제출할 수 없는가?
- [ ] 거부 사유를 입력할 수 있는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 목록에서 해당 판매가 사라지는가?
- [ ] 판매원에게 알림이 전송되었는가?

**데이터베이스 확인:**
```sql
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
- `rejectedAt`: 현재 시간
- `rejectedById`: 관리자 ID
- `rejectionReason`: 입력한 거부 사유
- `submittedAt`과 `submittedById`: NULL (재요청 가능)

---

### 단계 7: 재요청 (REJECTED → PENDING_APPROVAL)

**목적**: 거부된 판매를 다시 요청할 수 있는지 확인

**테스트 방법:**
1. 판매원 대시보드로 돌아가기
2. 판매 목록에서 **REJECTED 상태**인 판매 찾기 (판매 #4)
3. 상태가 "거부됨"으로 표시되는지 확인
4. "확정 요청" 버튼이 다시 활성화되어 있는지 확인
5. "확정 요청" 버튼 클릭
6. 새로운 녹음 파일 선택
7. "요청 제출" 버튼 클릭

**확인 사항:**
- [ ] 상태가 "거부됨"으로 표시되는가?
- [ ] "확정 요청" 버튼이 보이는가?
- [ ] 모달에서 거부 사유가 표시되는가?
- [ ] 새로운 파일을 업로드할 수 있는가?
- [ ] 요청 제출이 정상 작동하는가?
- [ ] 상태가 다시 "승인 대기"로 변경되는가?

**예상 결과:**
- 재요청 성공
- 판매 상태: `REJECTED` → `PENDING_APPROVAL`
- 새로운 파일이 업로드됨

---

### 단계 8: 요청 취소 (PENDING_APPROVAL → PENDING)

**목적**: 판매원이 승인 대기 중인 요청을 취소할 수 있는지 확인

**테스트 방법:**
1. 판매 목록에서 **PENDING_APPROVAL 상태**인 판매 찾기
2. "상세 보기" 버튼 클릭
3. 판매 확정 모달에서 "요청 취소" 버튼 확인
4. "요청 취소" 버튼 클릭
5. 확인 메시지에서 "확인" 클릭
6. 성공 메시지 확인

**확인 사항:**
- [ ] "요청 취소" 버튼이 보이는가?
- [ ] 확인 메시지가 표시되는가?
- [ ] 취소가 정상 작동하는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 상태가 "대기 중"으로 변경되는가?

**데이터베이스 확인:**
```sql
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
- `submittedAt`과 `submittedById`: NULL

---

## 🐛 문제 해결

### 문제 1: 판매 목록이 표시되지 않음

**원인:**
- 판매원 계정에 연결된 AffiliateProfile이 없음
- 판매 데이터가 없음

**해결:**
1. 데이터베이스 확인:
```sql
SELECT * FROM "AffiliateProfile" WHERE "userId" = [판매원ID];
SELECT * FROM "AffiliateSale" WHERE "agentId" = [프로필ID];
```

2. 테스트 데이터 재생성:
```bash
npx tsx scripts/create-sales-confirmation-test-data.ts
```

### 문제 2: 파일 업로드 실패

**원인:**
- Google Drive 환경 변수 미설정
- 파일 크기 초과
- 파일 형식 오류

**해결:**
1. 환경 변수 확인:
```bash
echo $GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
echo $GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
echo $GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID
```

2. 파일 크기 확인 (50MB 이하)
3. 파일 형식 확인 (MP3, WAV, M4A)

### 문제 3: 승인 대기 목록이 비어있음

**원인:**
- PENDING_APPROVAL 상태인 판매가 없음

**해결:**
1. 데이터베이스 확인:
```sql
SELECT * FROM "AffiliateSale" WHERE status = 'PENDING_APPROVAL';
```

2. 단계 2를 다시 실행하여 판매 확정 요청 제출

### 문제 4: 수당이 자동 계산되지 않음

**원인:**
- `syncSaleCommissionLedgers` 함수 오류
- 상품 정보 부족

**해결:**
1. 서버 로그 확인
2. 데이터베이스에서 CommissionLedger 확인:
```sql
SELECT * FROM "CommissionLedger" WHERE "saleId" = [판매ID];
```

---

## ✅ 최종 체크리스트

### 기본 기능
- [ ] 판매원: 판매 목록 조회
- [ ] 판매원: 판매 확정 요청 제출
- [ ] 판매원: 요청 취소
- [ ] 관리자: 승인 대기 목록 조회
- [ ] 관리자: 녹음 파일 확인
- [ ] 관리자: 판매 승인
- [ ] 관리자: 판매 거부

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

---

## 🎉 테스트 완료!

모든 단계를 완료했다면, 판매 확정 프로세스가 정상적으로 작동하는 것입니다!

**다음 단계:**
- 실제 데이터로 테스트
- 성능 최적화
- 사용자 피드백 수집


> 작성일: 2025-01-28  
> 목적: 판매 확정 프로세스를 하나씩 차근차근 테스트하는 방법

---

## 📋 테스트 전 준비

### 1. 테스트 데이터 생성

터미널에서 다음 명령어 실행:

```bash
cd /home/userhyeseon28/projects/cruise-guide
npx tsx scripts/create-sales-confirmation-test-data.ts
```

**예상 출력:**
```
🧪 판매 확정 프로세스 테스트 데이터 생성 시작...

1️⃣ 관리자 계정 확인 중...
   ✅ 관리자: 관리자이름 (ID: 1)

2️⃣ 판매원 계정 확인 중...
   ✅ 판매원: 판매원이름 (ID: 2)
   ✅ 프로필 ID: 3
   ✅ 어필리에이트 코드: AGENT001

3️⃣ 대리점장 계정 확인 중...
   ℹ️  대리점장 계정이 없습니다. (선택사항)

4️⃣ 어필리에이트 상품 확인 중...
   ✅ 상품: 테스트 크루즈 상품 (TEST-PRODUCT-001)

5️⃣ 테스트 판매 데이터 생성 중...
   ✅ 판매 #1: PENDING 상태 (확정 요청 가능)
   ✅ 판매 #2: PENDING_APPROVAL 상태 (승인 대기)
   ✅ 판매 #3: APPROVED 상태 (이미 승인됨)
   ✅ 판매 #4: REJECTED 상태 (거부됨, 재요청 가능)

✨ 테스트 데이터 생성 완료!
```

**만약 에러가 발생하면:**
- 관리자 계정이 없으면: `npx tsx scripts/create-admin.ts` 실행
- 판매원 계정이 없으면: 어필리에이트 계약서를 통해 생성하거나 `scripts/create-affiliate-test-data.ts` 실행

---

## 🧪 단계별 테스트

### 단계 1: 판매원 대시보드 접속 및 판매 목록 확인

**목적**: 판매원이 자신의 판매 목록을 볼 수 있는지 확인

**테스트 방법:**
1. 판매원 계정으로 로그인
2. 브라우저에서 `/partner/[mallUserId]/dashboard` 접속
   - `[mallUserId]`는 판매원의 `mallUserId` 또는 `phone`
3. 페이지가 정상적으로 로드되는지 확인
4. "내 판매 목록" 섹션 찾기
5. 판매 목록이 표시되는지 확인

**확인 사항:**
- [ ] 페이지가 정상적으로 로드되는가?
- [ ] "내 판매 목록" 섹션이 보이는가?
- [ ] 판매 목록이 표시되는가?
- [ ] 각 판매의 상태가 올바르게 표시되는가?
  - PENDING → "대기 중" (회색)
  - PENDING_APPROVAL → "승인 대기" (노란색)
  - APPROVED → "승인됨" (초록색)
  - REJECTED → "거부됨" (빨간색)

**예상 결과:**
- 4개의 판매가 표시되어야 함
- 각 판매의 상태가 올바르게 표시되어야 함

---

### 단계 2: 판매 확정 요청 제출 (PENDING → PENDING_APPROVAL)

**목적**: 판매원이 판매 확정 요청을 제출할 수 있는지 확인

**테스트 방법:**
1. 판매 목록에서 **PENDING 상태**인 판매 찾기 (판매 #1)
2. "확정 요청" 버튼 클릭
3. 판매 확정 모달이 열리는지 확인
4. 모달에서 다음 정보 확인:
   - 상품 코드
   - 판매 금액
   - 판매일
   - 상태: "대기 중"
5. 녹음 파일 선택
   - MP3, WAV, M4A 형식
   - 50MB 이하
6. "요청 제출" 버튼 클릭

**확인 사항:**
- [ ] 모달이 정상적으로 열리는가?
- [ ] 판매 정보가 올바르게 표시되는가?
- [ ] 파일 선택이 가능한가?
- [ ] 파일 크기 제한이 작동하는가? (50MB 초과 시 에러)
- [ ] 파일 형식 제한이 작동하는가? (지원하지 않는 형식 시 에러)
- [ ] "요청 제출" 버튼이 작동하는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 모달이 닫히는가?
- [ ] 판매 목록이 새로고침되는가?
- [ ] 상태가 "승인 대기"로 변경되는가?

**예상 결과:**
- 파일 업로드 성공
- Google Drive에 파일 저장
- 판매 상태: `PENDING` → `PENDING_APPROVAL`
- 성공 메시지 표시

**데이터베이스 확인:**
```sql
SELECT 
  id, 
  status, 
  "audioFileGoogleDriveUrl",
  "submittedAt",
  "submittedById"
FROM "AffiliateSale"
WHERE id = 1;  -- 판매 #1 ID
```

**예상 결과:**
- `status`: `PENDING_APPROVAL`
- `audioFileGoogleDriveUrl`: Google Drive 링크
- `submittedAt`: 현재 시간
- `submittedById`: 판매원 ID

---

### 단계 3: 관리자 승인 대기 목록 확인

**목적**: 관리자가 승인 대기 목록을 볼 수 있는지 확인

**테스트 방법:**
1. 관리자 계정으로 로그인
2. 브라우저에서 `/admin/affiliate/sales-confirmation/pending` 접속
3. 페이지가 정상적으로 로드되는지 확인
4. 승인 대기 목록 확인

**확인 사항:**
- [ ] 페이지가 정상적으로 로드되는가?
- [ ] 승인 대기 목록이 표시되는가?
- [ ] 판매 정보가 올바르게 표시되는가?
  - 상품 코드
  - 판매 금액
  - 판매일
  - 담당자 정보 (판매원/대리점장)
- [ ] "녹음 파일 확인" 링크가 보이는가?

**예상 결과:**
- 최소 1개 이상의 승인 대기 판매가 표시되어야 함
- 판매 #2 (PENDING_APPROVAL 상태)가 표시되어야 함

---

### 단계 4: 녹음 파일 확인

**목적**: 관리자가 Google Drive에서 녹음 파일을 확인할 수 있는지 확인

**테스트 방법:**
1. 승인 대기 목록에서 판매 선택
2. "녹음 파일 확인" 링크 클릭
3. 새 탭에서 Google Drive 페이지가 열리는지 확인
4. 파일을 다운로드하거나 재생할 수 있는지 확인

**확인 사항:**
- [ ] 링크가 정상적으로 작동하는가?
- [ ] Google Drive 페이지가 열리는가?
- [ ] 파일에 접근할 수 있는가?
- [ ] 파일을 다운로드할 수 있는가?
- [ ] 파일을 재생할 수 있는가?

**예상 결과:**
- Google Drive 링크가 정상 작동
- 파일에 접근 가능

---

### 단계 5: 판매 승인 (PENDING_APPROVAL → APPROVED)

**목적**: 관리자가 판매를 승인하고 수당이 자동 계산되는지 확인

**테스트 방법:**
1. 승인 대기 목록에서 판매 선택
2. "승인" 버튼 클릭
3. 확인 메시지에서 "확인" 클릭
4. 로딩 상태 확인
5. 성공 메시지 확인

**확인 사항:**
- [ ] "승인" 버튼이 작동하는가?
- [ ] 확인 메시지가 표시되는가?
- [ ] 로딩 상태가 표시되는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 목록에서 해당 판매가 사라지는가? (승인 대기 목록에서 제거)
- [ ] 판매원에게 알림이 전송되었는가?

**데이터베이스 확인:**
```sql
-- 1. 판매 상태 확인
SELECT 
  id, 
  status, 
  "approvedAt",
  "approvedById"
FROM "AffiliateSale"
WHERE id = 2;  -- 판매 #2 ID

-- 2. 수당 레저 확인
SELECT 
  id,
  "saleId",
  amount,
  "withholdingAmount",
  "isSettled"
FROM "CommissionLedger"
WHERE "saleId" = 2;  -- 판매 #2 ID
```

**예상 결과:**
- 판매 상태: `PENDING_APPROVAL` → `APPROVED`
- `approvedAt`: 현재 시간
- `approvedById`: 관리자 ID
- `CommissionLedger` 레코드 생성됨

---

### 단계 6: 판매 거부 (PENDING_APPROVAL → REJECTED)

**목적**: 관리자가 판매를 거부하고 재요청이 가능한지 확인

**테스트 방법:**
1. 승인 대기 목록에서 다른 판매 선택 (또는 단계 2에서 새로 생성한 판매)
2. "거부" 버튼 클릭
3. 거부 사유 입력 모달 확인
4. 거부 사유 입력 (예: "녹음 파일이 불명확합니다")
5. "거부" 버튼 클릭
6. 성공 메시지 확인

**확인 사항:**
- [ ] "거부" 버튼이 작동하는가?
- [ ] 거부 사유 입력 모달이 열리는가?
- [ ] 거부 사유 없이 제출할 수 없는가?
- [ ] 거부 사유를 입력할 수 있는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 목록에서 해당 판매가 사라지는가?
- [ ] 판매원에게 알림이 전송되었는가?

**데이터베이스 확인:**
```sql
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
- `rejectedAt`: 현재 시간
- `rejectedById`: 관리자 ID
- `rejectionReason`: 입력한 거부 사유
- `submittedAt`과 `submittedById`: NULL (재요청 가능)

---

### 단계 7: 재요청 (REJECTED → PENDING_APPROVAL)

**목적**: 거부된 판매를 다시 요청할 수 있는지 확인

**테스트 방법:**
1. 판매원 대시보드로 돌아가기
2. 판매 목록에서 **REJECTED 상태**인 판매 찾기 (판매 #4)
3. 상태가 "거부됨"으로 표시되는지 확인
4. "확정 요청" 버튼이 다시 활성화되어 있는지 확인
5. "확정 요청" 버튼 클릭
6. 새로운 녹음 파일 선택
7. "요청 제출" 버튼 클릭

**확인 사항:**
- [ ] 상태가 "거부됨"으로 표시되는가?
- [ ] "확정 요청" 버튼이 보이는가?
- [ ] 모달에서 거부 사유가 표시되는가?
- [ ] 새로운 파일을 업로드할 수 있는가?
- [ ] 요청 제출이 정상 작동하는가?
- [ ] 상태가 다시 "승인 대기"로 변경되는가?

**예상 결과:**
- 재요청 성공
- 판매 상태: `REJECTED` → `PENDING_APPROVAL`
- 새로운 파일이 업로드됨

---

### 단계 8: 요청 취소 (PENDING_APPROVAL → PENDING)

**목적**: 판매원이 승인 대기 중인 요청을 취소할 수 있는지 확인

**테스트 방법:**
1. 판매 목록에서 **PENDING_APPROVAL 상태**인 판매 찾기
2. "상세 보기" 버튼 클릭
3. 판매 확정 모달에서 "요청 취소" 버튼 확인
4. "요청 취소" 버튼 클릭
5. 확인 메시지에서 "확인" 클릭
6. 성공 메시지 확인

**확인 사항:**
- [ ] "요청 취소" 버튼이 보이는가?
- [ ] 확인 메시지가 표시되는가?
- [ ] 취소가 정상 작동하는가?
- [ ] 성공 메시지가 표시되는가?
- [ ] 상태가 "대기 중"으로 변경되는가?

**데이터베이스 확인:**
```sql
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
- `submittedAt`과 `submittedById`: NULL

---

## 🐛 문제 해결

### 문제 1: 판매 목록이 표시되지 않음

**원인:**
- 판매원 계정에 연결된 AffiliateProfile이 없음
- 판매 데이터가 없음

**해결:**
1. 데이터베이스 확인:
```sql
SELECT * FROM "AffiliateProfile" WHERE "userId" = [판매원ID];
SELECT * FROM "AffiliateSale" WHERE "agentId" = [프로필ID];
```

2. 테스트 데이터 재생성:
```bash
npx tsx scripts/create-sales-confirmation-test-data.ts
```

### 문제 2: 파일 업로드 실패

**원인:**
- Google Drive 환경 변수 미설정
- 파일 크기 초과
- 파일 형식 오류

**해결:**
1. 환경 변수 확인:
```bash
echo $GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
echo $GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
echo $GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID
```

2. 파일 크기 확인 (50MB 이하)
3. 파일 형식 확인 (MP3, WAV, M4A)

### 문제 3: 승인 대기 목록이 비어있음

**원인:**
- PENDING_APPROVAL 상태인 판매가 없음

**해결:**
1. 데이터베이스 확인:
```sql
SELECT * FROM "AffiliateSale" WHERE status = 'PENDING_APPROVAL';
```

2. 단계 2를 다시 실행하여 판매 확정 요청 제출

### 문제 4: 수당이 자동 계산되지 않음

**원인:**
- `syncSaleCommissionLedgers` 함수 오류
- 상품 정보 부족

**해결:**
1. 서버 로그 확인
2. 데이터베이스에서 CommissionLedger 확인:
```sql
SELECT * FROM "CommissionLedger" WHERE "saleId" = [판매ID];
```

---

## ✅ 최종 체크리스트

### 기본 기능
- [ ] 판매원: 판매 목록 조회
- [ ] 판매원: 판매 확정 요청 제출
- [ ] 판매원: 요청 취소
- [ ] 관리자: 승인 대기 목록 조회
- [ ] 관리자: 녹음 파일 확인
- [ ] 관리자: 판매 승인
- [ ] 관리자: 판매 거부

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

---

## 🎉 테스트 완료!

모든 단계를 완료했다면, 판매 확정 프로세스가 정상적으로 작동하는 것입니다!

**다음 단계:**
- 실제 데이터로 테스트
- 성능 최적화
- 사용자 피드백 수집










