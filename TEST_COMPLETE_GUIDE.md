# 판매 확정 프로세스 테스트 완전 가이드

> 작성일: 2025-01-28  
> 목적: 판매 확정 프로세스를 완전히 테스트하는 종합 가이드

---

## 📚 문서 목록

1. **TEST_QUICK_START.md** - 빠른 시작 (3단계)
2. **TEST_STEP_BY_STEP.md** - 단계별 상세 테스트
3. **TEST_GUIDE_DETAILED.md** - 전체 테스트 시나리오
4. **이 문서** - 완전 가이드 (모든 내용 통합)

---

## 🚀 시작하기

### 1. 테스트 데이터 생성

```bash
cd /home/userhyeseon28/projects/cruise-guide
npx tsx scripts/create-sales-confirmation-test-data.ts
```

**생성되는 데이터:**
- 판매 #1: PENDING 상태 (확정 요청 가능)
- 판매 #2: PENDING_APPROVAL 상태 (승인 대기)
- 판매 #3: APPROVED 상태 (이미 승인됨)
- 판매 #4: REJECTED 상태 (거부됨, 재요청 가능)

---

## 🧪 테스트 시나리오

### 시나리오 1: 판매 확정 요청 제출

**목적**: 판매원이 판매 확정 요청을 제출할 수 있는지 확인

**단계:**
1. 판매원 대시보드 접속
2. "내 판매 목록" 섹션에서 PENDING 상태인 판매 찾기
3. "확정 요청" 버튼 클릭
4. 녹음 파일 선택 (MP3, WAV, M4A, 50MB 이하)
5. "요청 제출" 클릭

**확인 사항:**
- [ ] 파일 업로드 성공
- [ ] 상태가 "승인 대기"로 변경
- [ ] Google Drive 링크 생성

**데이터베이스 확인:**
```sql
SELECT id, status, "audioFileGoogleDriveUrl", "submittedAt"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

---

### 시나리오 2: 관리자 승인

**목적**: 관리자가 판매를 승인하고 수당이 자동 계산되는지 확인

**단계:**
1. 관리자 계정으로 로그인
2. `/admin/affiliate/sales-confirmation/pending` 접속
3. 승인 대기 목록 확인
4. "녹음 파일 확인" 링크 클릭하여 파일 확인
5. "승인" 버튼 클릭

**확인 사항:**
- [ ] 승인 성공
- [ ] 상태가 "승인됨"으로 변경
- [ ] 수당 자동 계산 (CommissionLedger 생성)
- [ ] 알림 전송

**데이터베이스 확인:**
```sql
-- 판매 상태 확인
SELECT id, status, "approvedAt", "approvedById"
FROM "AffiliateSale"
WHERE id = [판매ID];

-- 수당 레저 확인
SELECT * FROM "CommissionLedger"
WHERE "saleId" = [판매ID];
```

---

### 시나리오 3: 관리자 거부

**목적**: 관리자가 판매를 거부하고 재요청이 가능한지 확인

**단계:**
1. 관리자 승인 대기 페이지 접속
2. "거부" 버튼 클릭
3. 거부 사유 입력
4. "거부" 버튼 클릭

**확인 사항:**
- [ ] 거부 성공
- [ ] 상태가 "거부됨"으로 변경
- [ ] 거부 사유 저장
- [ ] 재요청 가능 (submittedAt, submittedById 초기화)

**데이터베이스 확인:**
```sql
SELECT id, status, "rejectedAt", "rejectionReason", "submittedAt"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

---

### 시나리오 4: 재요청

**목적**: 거부된 판매를 다시 요청할 수 있는지 확인

**단계:**
1. 판매원 대시보드 접속
2. REJECTED 상태인 판매 찾기
3. "확정 요청" 버튼 클릭
4. 새로운 녹음 파일 선택
5. "요청 제출" 클릭

**확인 사항:**
- [ ] 재요청 성공
- [ ] 상태가 "승인 대기"로 변경
- [ ] 새로운 파일 업로드

---

### 시나리오 5: 요청 취소

**목적**: 판매원이 승인 대기 중인 요청을 취소할 수 있는지 확인

**단계:**
1. 판매원 대시보드 접속
2. PENDING_APPROVAL 상태인 판매 찾기
3. "상세 보기" 버튼 클릭
4. "요청 취소" 버튼 클릭
5. 확인 메시지에서 "확인" 클릭

**확인 사항:**
- [ ] 취소 성공
- [ ] 상태가 "대기 중"으로 변경
- [ ] submittedAt, submittedById 초기화

---

## 🐛 문제 해결

### 문제 1: 판매 목록이 표시되지 않음

**원인:**
- 판매원 계정에 AffiliateProfile이 없음
- 판매 데이터가 없음

**해결:**
```bash
# 테스트 데이터 재생성
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
1. 판매원 대시보드에서 판매 확정 요청 제출
2. 또는 데이터베이스에서 직접 상태 변경:
```sql
UPDATE "AffiliateSale"
SET status = 'PENDING_APPROVAL'
WHERE id = [판매ID];
```

### 문제 4: 수당이 자동 계산되지 않음

**원인:**
- `syncSaleCommissionLedgers` 함수 오류
- 상품 정보 부족

**해결:**
1. 서버 로그 확인
2. 데이터베이스에서 CommissionLedger 확인:
```sql
SELECT * FROM "CommissionLedger"
WHERE "saleId" = [판매ID];
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

모든 테스트를 완료했다면, 판매 확정 프로세스가 정상적으로 작동하는 것입니다!

**다음 단계:**
- 실제 데이터로 테스트
- 성능 최적화
- 사용자 피드백 수집

---

## 📞 도움이 필요하신가요?

문제가 발생하면 다음을 확인하세요:
1. 서버 로그 확인
2. 데이터베이스 상태 확인
3. 환경 변수 설정 확인
4. 브라우저 콘솔 확인


> 작성일: 2025-01-28  
> 목적: 판매 확정 프로세스를 완전히 테스트하는 종합 가이드

---

## 📚 문서 목록

1. **TEST_QUICK_START.md** - 빠른 시작 (3단계)
2. **TEST_STEP_BY_STEP.md** - 단계별 상세 테스트
3. **TEST_GUIDE_DETAILED.md** - 전체 테스트 시나리오
4. **이 문서** - 완전 가이드 (모든 내용 통합)

---

## 🚀 시작하기

### 1. 테스트 데이터 생성

```bash
cd /home/userhyeseon28/projects/cruise-guide
npx tsx scripts/create-sales-confirmation-test-data.ts
```

**생성되는 데이터:**
- 판매 #1: PENDING 상태 (확정 요청 가능)
- 판매 #2: PENDING_APPROVAL 상태 (승인 대기)
- 판매 #3: APPROVED 상태 (이미 승인됨)
- 판매 #4: REJECTED 상태 (거부됨, 재요청 가능)

---

## 🧪 테스트 시나리오

### 시나리오 1: 판매 확정 요청 제출

**목적**: 판매원이 판매 확정 요청을 제출할 수 있는지 확인

**단계:**
1. 판매원 대시보드 접속
2. "내 판매 목록" 섹션에서 PENDING 상태인 판매 찾기
3. "확정 요청" 버튼 클릭
4. 녹음 파일 선택 (MP3, WAV, M4A, 50MB 이하)
5. "요청 제출" 클릭

**확인 사항:**
- [ ] 파일 업로드 성공
- [ ] 상태가 "승인 대기"로 변경
- [ ] Google Drive 링크 생성

**데이터베이스 확인:**
```sql
SELECT id, status, "audioFileGoogleDriveUrl", "submittedAt"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

---

### 시나리오 2: 관리자 승인

**목적**: 관리자가 판매를 승인하고 수당이 자동 계산되는지 확인

**단계:**
1. 관리자 계정으로 로그인
2. `/admin/affiliate/sales-confirmation/pending` 접속
3. 승인 대기 목록 확인
4. "녹음 파일 확인" 링크 클릭하여 파일 확인
5. "승인" 버튼 클릭

**확인 사항:**
- [ ] 승인 성공
- [ ] 상태가 "승인됨"으로 변경
- [ ] 수당 자동 계산 (CommissionLedger 생성)
- [ ] 알림 전송

**데이터베이스 확인:**
```sql
-- 판매 상태 확인
SELECT id, status, "approvedAt", "approvedById"
FROM "AffiliateSale"
WHERE id = [판매ID];

-- 수당 레저 확인
SELECT * FROM "CommissionLedger"
WHERE "saleId" = [판매ID];
```

---

### 시나리오 3: 관리자 거부

**목적**: 관리자가 판매를 거부하고 재요청이 가능한지 확인

**단계:**
1. 관리자 승인 대기 페이지 접속
2. "거부" 버튼 클릭
3. 거부 사유 입력
4. "거부" 버튼 클릭

**확인 사항:**
- [ ] 거부 성공
- [ ] 상태가 "거부됨"으로 변경
- [ ] 거부 사유 저장
- [ ] 재요청 가능 (submittedAt, submittedById 초기화)

**데이터베이스 확인:**
```sql
SELECT id, status, "rejectedAt", "rejectionReason", "submittedAt"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

---

### 시나리오 4: 재요청

**목적**: 거부된 판매를 다시 요청할 수 있는지 확인

**단계:**
1. 판매원 대시보드 접속
2. REJECTED 상태인 판매 찾기
3. "확정 요청" 버튼 클릭
4. 새로운 녹음 파일 선택
5. "요청 제출" 클릭

**확인 사항:**
- [ ] 재요청 성공
- [ ] 상태가 "승인 대기"로 변경
- [ ] 새로운 파일 업로드

---

### 시나리오 5: 요청 취소

**목적**: 판매원이 승인 대기 중인 요청을 취소할 수 있는지 확인

**단계:**
1. 판매원 대시보드 접속
2. PENDING_APPROVAL 상태인 판매 찾기
3. "상세 보기" 버튼 클릭
4. "요청 취소" 버튼 클릭
5. 확인 메시지에서 "확인" 클릭

**확인 사항:**
- [ ] 취소 성공
- [ ] 상태가 "대기 중"으로 변경
- [ ] submittedAt, submittedById 초기화

---

## 🐛 문제 해결

### 문제 1: 판매 목록이 표시되지 않음

**원인:**
- 판매원 계정에 AffiliateProfile이 없음
- 판매 데이터가 없음

**해결:**
```bash
# 테스트 데이터 재생성
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
1. 판매원 대시보드에서 판매 확정 요청 제출
2. 또는 데이터베이스에서 직접 상태 변경:
```sql
UPDATE "AffiliateSale"
SET status = 'PENDING_APPROVAL'
WHERE id = [판매ID];
```

### 문제 4: 수당이 자동 계산되지 않음

**원인:**
- `syncSaleCommissionLedgers` 함수 오류
- 상품 정보 부족

**해결:**
1. 서버 로그 확인
2. 데이터베이스에서 CommissionLedger 확인:
```sql
SELECT * FROM "CommissionLedger"
WHERE "saleId" = [판매ID];
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

모든 테스트를 완료했다면, 판매 확정 프로세스가 정상적으로 작동하는 것입니다!

**다음 단계:**
- 실제 데이터로 테스트
- 성능 최적화
- 사용자 피드백 수집

---

## 📞 도움이 필요하신가요?

문제가 발생하면 다음을 확인하세요:
1. 서버 로그 확인
2. 데이터베이스 상태 확인
3. 환경 변수 설정 확인
4. 브라우저 콘솔 확인


> 작성일: 2025-01-28  
> 목적: 판매 확정 프로세스를 완전히 테스트하는 종합 가이드

---

## 📚 문서 목록

1. **TEST_QUICK_START.md** - 빠른 시작 (3단계)
2. **TEST_STEP_BY_STEP.md** - 단계별 상세 테스트
3. **TEST_GUIDE_DETAILED.md** - 전체 테스트 시나리오
4. **이 문서** - 완전 가이드 (모든 내용 통합)

---

## 🚀 시작하기

### 1. 테스트 데이터 생성

```bash
cd /home/userhyeseon28/projects/cruise-guide
npx tsx scripts/create-sales-confirmation-test-data.ts
```

**생성되는 데이터:**
- 판매 #1: PENDING 상태 (확정 요청 가능)
- 판매 #2: PENDING_APPROVAL 상태 (승인 대기)
- 판매 #3: APPROVED 상태 (이미 승인됨)
- 판매 #4: REJECTED 상태 (거부됨, 재요청 가능)

---

## 🧪 테스트 시나리오

### 시나리오 1: 판매 확정 요청 제출

**목적**: 판매원이 판매 확정 요청을 제출할 수 있는지 확인

**단계:**
1. 판매원 대시보드 접속
2. "내 판매 목록" 섹션에서 PENDING 상태인 판매 찾기
3. "확정 요청" 버튼 클릭
4. 녹음 파일 선택 (MP3, WAV, M4A, 50MB 이하)
5. "요청 제출" 클릭

**확인 사항:**
- [ ] 파일 업로드 성공
- [ ] 상태가 "승인 대기"로 변경
- [ ] Google Drive 링크 생성

**데이터베이스 확인:**
```sql
SELECT id, status, "audioFileGoogleDriveUrl", "submittedAt"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

---

### 시나리오 2: 관리자 승인

**목적**: 관리자가 판매를 승인하고 수당이 자동 계산되는지 확인

**단계:**
1. 관리자 계정으로 로그인
2. `/admin/affiliate/sales-confirmation/pending` 접속
3. 승인 대기 목록 확인
4. "녹음 파일 확인" 링크 클릭하여 파일 확인
5. "승인" 버튼 클릭

**확인 사항:**
- [ ] 승인 성공
- [ ] 상태가 "승인됨"으로 변경
- [ ] 수당 자동 계산 (CommissionLedger 생성)
- [ ] 알림 전송

**데이터베이스 확인:**
```sql
-- 판매 상태 확인
SELECT id, status, "approvedAt", "approvedById"
FROM "AffiliateSale"
WHERE id = [판매ID];

-- 수당 레저 확인
SELECT * FROM "CommissionLedger"
WHERE "saleId" = [판매ID];
```

---

### 시나리오 3: 관리자 거부

**목적**: 관리자가 판매를 거부하고 재요청이 가능한지 확인

**단계:**
1. 관리자 승인 대기 페이지 접속
2. "거부" 버튼 클릭
3. 거부 사유 입력
4. "거부" 버튼 클릭

**확인 사항:**
- [ ] 거부 성공
- [ ] 상태가 "거부됨"으로 변경
- [ ] 거부 사유 저장
- [ ] 재요청 가능 (submittedAt, submittedById 초기화)

**데이터베이스 확인:**
```sql
SELECT id, status, "rejectedAt", "rejectionReason", "submittedAt"
FROM "AffiliateSale"
WHERE id = [판매ID];
```

---

### 시나리오 4: 재요청

**목적**: 거부된 판매를 다시 요청할 수 있는지 확인

**단계:**
1. 판매원 대시보드 접속
2. REJECTED 상태인 판매 찾기
3. "확정 요청" 버튼 클릭
4. 새로운 녹음 파일 선택
5. "요청 제출" 클릭

**확인 사항:**
- [ ] 재요청 성공
- [ ] 상태가 "승인 대기"로 변경
- [ ] 새로운 파일 업로드

---

### 시나리오 5: 요청 취소

**목적**: 판매원이 승인 대기 중인 요청을 취소할 수 있는지 확인

**단계:**
1. 판매원 대시보드 접속
2. PENDING_APPROVAL 상태인 판매 찾기
3. "상세 보기" 버튼 클릭
4. "요청 취소" 버튼 클릭
5. 확인 메시지에서 "확인" 클릭

**확인 사항:**
- [ ] 취소 성공
- [ ] 상태가 "대기 중"으로 변경
- [ ] submittedAt, submittedById 초기화

---

## 🐛 문제 해결

### 문제 1: 판매 목록이 표시되지 않음

**원인:**
- 판매원 계정에 AffiliateProfile이 없음
- 판매 데이터가 없음

**해결:**
```bash
# 테스트 데이터 재생성
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
1. 판매원 대시보드에서 판매 확정 요청 제출
2. 또는 데이터베이스에서 직접 상태 변경:
```sql
UPDATE "AffiliateSale"
SET status = 'PENDING_APPROVAL'
WHERE id = [판매ID];
```

### 문제 4: 수당이 자동 계산되지 않음

**원인:**
- `syncSaleCommissionLedgers` 함수 오류
- 상품 정보 부족

**해결:**
1. 서버 로그 확인
2. 데이터베이스에서 CommissionLedger 확인:
```sql
SELECT * FROM "CommissionLedger"
WHERE "saleId" = [판매ID];
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

모든 테스트를 완료했다면, 판매 확정 프로세스가 정상적으로 작동하는 것입니다!

**다음 단계:**
- 실제 데이터로 테스트
- 성능 최적화
- 사용자 피드백 수집

---

## 📞 도움이 필요하신가요?

문제가 발생하면 다음을 확인하세요:
1. 서버 로그 확인
2. 데이터베이스 상태 확인
3. 환경 변수 설정 확인
4. 브라우저 콘솔 확인










