# 계약 해지 및 DB 회수 통합 테스트 시나리오

> **작성일**: 2025-01-28  
> **목적**: 계약 해지, DB 회수, 수당 중지 시스템의 통합 테스트 가이드  
> **대상**: 개발자, QA 팀, 관리자

---

## 📋 목차

1. [테스트 환경 설정](#테스트-환경-설정)
2. [시나리오 1: 판매원 계약 해지 플로우](#시나리오-1-판매원-계약-해지-플로우)
3. [시나리오 2: 대리점장 계약 해지 플로우](#시나리오-2-대리점장-계약-해지-플로우)
4. [시나리오 3: 계약 갱신 승인 플로우](#시나리오-3-계약-갱신-승인-플로우)
5. [시나리오 4: 계약 갱신 거부 플로우](#시나리오-4-계약-갱신-거부-플로우)
6. [시나리오 5: 에러 복구 메커니즘 테스트](#시나리오-5-에러-복구-메커니즘-테스트)
7. [시나리오 6: 수당 중복 지급 방지 테스트](#시나리오-6-수당-중복-지급-방지-테스트)
8. [시나리오 7: 배치 처리 성능 테스트](#시나리오-7-배치-처리-성능-테스트)
9. [시나리오 8: 모니터링 및 알림 테스트](#시나리오-8-모니터링-및-알림-테스트)

---

## 테스트 환경 설정

### 사전 준비

1. **테스트 데이터 생성**
   ```sql
   -- 판매원 계약 생성
   -- 대리점장 계약 생성
   -- 고객 DB 생성 (AffiliateLead, AffiliateSale, AffiliateLink)
   -- 판매 기록 생성
   ```

2. **관리자 계정 준비**
   - 관리자 로그인 정보 확인
   - 푸시 알림 구독 확인

3. **HQ 프로필 확인**
   - HQ 프로필 존재 여부 확인
   - 없으면 자동 생성되는지 확인

---

## 시나리오 1: 판매원 계약 해지 플로우

### 목적
판매원 계약 해지 시 DB 회수 및 수당 중지가 정상적으로 동작하는지 확인

### 전제 조건
- 판매원 계약이 `approved` 상태
- 판매원에게 고객 DB가 있음 (AffiliateLead, AffiliateSale, AffiliateLink)
- 판매원이 대리점장과 연결되어 있음 (AffiliateRelation)

### 테스트 단계

#### 1.1 계약 해지 실행
```
POST /api/admin/affiliate/contracts/{contractId}/terminate
{
  "reason": "테스트 계약 해지"
}
```

**예상 결과:**
- ✅ 계약 상태가 `terminated`로 변경
- ✅ `metadata.terminatedAt` 기록
- ✅ `metadata.terminatedBy` 기록
- ✅ `metadata.dbRecovered: false` 초기화
- ✅ AdminActionLog 기록
- ✅ AffiliateAuditLog 기록 (TERMINATION)
- ✅ 관리자에게 알림 전송

#### 1.2 1일 후 DB 회수 확인
```
스케줄러 실행: recoverDbFromTerminatedContracts()
```

**예상 결과:**
- ✅ 해지일로부터 1일 이상 경과한 계약만 처리
- ✅ 판매원의 AffiliateLead가 대리점장으로 이전
  - `agentId: null`
  - `managerId: [대리점장 ID]`
- ✅ 판매원의 AffiliateSale이 대리점장으로 이전
  - `agentId: null`
  - `managerId: [대리점장 ID]`
  - `salesCommission: null` (수당 제거)
- ✅ 판매원의 AffiliateLink가 대리점장으로 이전
  - `agentId: null`
  - `managerId: [대리점장 ID]`
- ✅ `metadata.dbRecovered: true` 업데이트
- ✅ `metadata.dbRecoveredAt` 기록
- ✅ `metadata.recoveredToManager` 기록
- ✅ AffiliateAuditLog 기록 (DB_RECOVERY)
- ✅ 배치 처리로 100개씩 처리됨

#### 1.3 수당 중지 확인
```
POST /api/partner/customers/{leadId}/interactions
{
  "interactionType": "PURCHASE",
  "status": "PURCHASED",
  "note": "테스트 구매"
}
```

**예상 결과:**
- ✅ 해지일 + 7일 이내: 판매원에게 수당 지급 (grace period)
- ✅ 해지일 + 7일 이후: 대리점장에게 수당 지급
- ✅ `commissionProcessed: true` 플래그 설정
- ✅ CommissionLedger에 기록
- ✅ AffiliateAuditLog 기록 (COMMISSION)

#### 1.4 DB 삭제 방지 확인
```
DELETE /api/partner/customers/{leadId}
```

**예상 결과:**
- ✅ 403 Forbidden 또는 에러 메시지 반환
- ✅ "계약이 해지되어 DB를 삭제할 수 없습니다" 메시지

### 검증 체크리스트

- [ ] 계약 상태가 `terminated`로 변경됨
- [ ] 1일 후 DB가 대리점장으로 회수됨
- [ ] 모든 관련 데이터가 정확히 이전됨
- [ ] 수당이 정확히 계산되고 중지됨
- [ ] DB 삭제가 방지됨
- [ ] 감사 로그가 정확히 기록됨
- [ ] 알림이 전송됨

---

## 시나리오 2: 대리점장 계약 해지 플로우

### 목적
대리점장 계약 해지 시 즉시 DB 회수 및 판매원 소속 변경이 정상적으로 동작하는지 확인

### 전제 조건
- 대리점장 계약이 `approved` 상태
- 대리점장에게 고객 DB가 있음
- 대리점장에게 연결된 판매원이 있음

### 테스트 단계

#### 2.1 계약 해지 실행
```
POST /api/admin/affiliate/contracts/{contractId}/terminate
{
  "reason": "테스트 대리점장 계약 해지"
}
```

**예상 결과:**
- ✅ 계약 상태가 `terminated`로 변경
- ✅ 즉시 DB 회수 시작 (1일 대기 없음)
- ✅ 대리점장의 AffiliateLead가 본사(HQ)로 이전
- ✅ 대리점장의 AffiliateSale이 본사로 이전
- ✅ 대리점장의 AffiliateLink가 본사로 이전
- ✅ 연결된 판매원들의 AffiliateRelation이 본사로 변경
- ✅ 판매원들의 AffiliateLead가 본사로 이전
- ✅ 판매원들의 AffiliateSale이 본사로 이전 (판매원 수당 유지)
- ✅ 판매원들의 AffiliateLink가 본사로 이전
- ✅ HQ 프로필이 없으면 자동 생성됨
- ✅ 감사 로그 기록
- ✅ 알림 전송

#### 2.2 판매원 계약 상태 확인

**예상 결과:**
- ✅ 판매원 계약은 `approved` 상태 유지
- ✅ 판매원 소속만 본사로 변경됨
- ✅ 판매원은 계속 활동 가능

### 검증 체크리스트

- [ ] 계약 상태가 `terminated`로 변경됨
- [ ] 즉시 DB가 본사로 회수됨 (1일 대기 없음)
- [ ] 대리점장의 모든 데이터가 본사로 이전됨
- [ ] 판매원들의 소속이 본사로 변경됨
- [ ] 판매원 계약은 유지됨
- [ ] HQ 프로필이 자동 생성됨 (없는 경우)
- [ ] 감사 로그가 정확히 기록됨
- [ ] 알림이 전송됨

---

## 시나리오 3: 계약 갱신 승인 플로우

### 목적
계약 갱신 요청 승인이 정상적으로 동작하는지 확인

### 전제 조건
- 계약이 `approved` 상태
- `metadata.renewalRequestStatus: 'PENDING'`

### 테스트 단계

#### 3.1 갱신 요청 생성
```
POST /api/partner/contracts/{contractId}/renewal-request
```

**예상 결과:**
- ✅ `metadata.renewalRequestStatus: 'PENDING'` 설정

#### 3.2 갱신 승인
```
POST /api/admin/affiliate/contracts/{contractId}/renewal
{
  "action": "approve"
}
```

**예상 결과:**
- ✅ `metadata.renewalRequestStatus: 'APPROVED'` 설정
- ✅ `metadata.renewalDate`가 1년 연장됨
- ✅ `metadata.renewalApprovedAt` 기록
- ✅ `metadata.renewalApprovedBy` 기록
- ✅ AffiliateAuditLog 기록 (RENEWAL)
- ✅ 관리자에게 알림 전송

#### 3.3 갱신일 확인

**예상 결과:**
- ✅ 갱신일이 정확히 1년 연장됨
- ✅ D-day 계산이 정확함

### 검증 체크리스트

- [ ] 갱신 요청이 정상적으로 생성됨
- [ ] 갱신 승인이 정상적으로 처리됨
- [ ] 갱신일이 정확히 연장됨
- [ ] 감사 로그가 기록됨
- [ ] 알림이 전송됨

---

## 시나리오 4: 계약 갱신 거부 플로우

### 목적
계약 갱신 거부 시 계약 해지 및 DB 회수가 정상적으로 동작하는지 확인

### 전제 조건
- 계약이 `approved` 상태
- `metadata.renewalRequestStatus: 'PENDING'`

### 테스트 단계

#### 4.1 갱신 거부
```
POST /api/admin/affiliate/contracts/{contractId}/renewal
{
  "action": "reject"
}
```

**예상 결과:**
- ✅ 계약 상태가 `terminated`로 변경
- ✅ `metadata.renewalRequestStatus: 'REJECTED'` 설정
- ✅ `metadata.terminationReason: '재계약 거부'` 설정
- ✅ 대리점장인 경우 즉시 DB 회수
- ✅ 판매원인 경우 1일 후 DB 회수 예약
- ✅ AffiliateAuditLog 기록 (RENEWAL, TERMINATION)
- ✅ 관리자에게 알림 전송

#### 4.2 DB 회수 확인
- 대리점장: 즉시 회수 확인
- 판매원: 1일 후 회수 확인

### 검증 체크리스트

- [ ] 갱신 거부가 정상적으로 처리됨
- [ ] 계약이 해지됨
- [ ] DB 회수가 정확한 시점에 실행됨
- [ ] 감사 로그가 기록됨
- [ ] 알림이 전송됨

---

## 시나리오 5: 에러 복구 메커니즘 테스트

### 목적
DB 회수 실패 시 자동 재시도 및 수동 재시도가 정상적으로 동작하는지 확인

### 전제 조건
- 해지된 계약이 있음
- DB 회수가 실패할 수 있는 상황 (의도적 오류 또는 실제 오류)

### 테스트 단계

#### 5.1 자동 재시도 확인
```
스케줄러 실행: recoverDbFromTerminatedContracts()
```

**예상 결과:**
- ✅ 실패 시 `metadata.retryCount` 증가
- ✅ `metadata.lastRetryAt` 기록
- ✅ `metadata.retryErrors`에 오류 기록
- ✅ 지수 백오프로 재시도 (최대 3회)
- ✅ 3회 실패 시 관리자에게 알림 전송

#### 5.2 수동 재시도 확인
```
POST /api/admin/affiliate/contracts/{contractId}/retry-recovery
```

**예상 결과:**
- ✅ 관리자 권한 확인
- ✅ DB 회수 재시도 실행
- ✅ 성공 시 `metadata.retryCount` 리셋
- ✅ 실패 시 `metadata.retryCount` 증가
- ✅ AdminActionLog 기록
- ✅ AffiliateAuditLog 기록 (DB_RECOVERY, RETRY)

#### 5.3 재시도 로그 확인

**예상 결과:**
- ✅ 모든 재시도 시도가 `metadata.retryErrors`에 기록됨
- ✅ 각 시도마다 타임스탬프와 오류 메시지 기록
- ✅ 관리자 대시보드에서 확인 가능

### 검증 체크리스트

- [ ] 자동 재시도가 정상적으로 동작함
- [ ] 최대 재시도 횟수 제한이 작동함
- [ ] 수동 재시도가 정상적으로 동작함
- [ ] 재시도 로그가 정확히 기록됨
- [ ] 관리자 알림이 전송됨

---

## 시나리오 6: 수당 중복 지급 방지 테스트

### 목적
동일 판매에 대한 수당이 중복 지급되지 않는지 확인

### 전제 조건
- 판매가 생성됨
- 수당 계산이 실행됨

### 테스트 단계

#### 6.1 첫 번째 수당 계산
```
POST /api/partner/customers/{leadId}/interactions
{
  "status": "PURCHASED"
}
```

**예상 결과:**
- ✅ AffiliateSale 생성
- ✅ `metadata.commissionProcessed: false` 초기화
- ✅ CommissionLedger에 수당 기록
- ✅ `metadata.commissionProcessed: true` 업데이트
- ✅ AffiliateAuditLog 기록 (COMMISSION, CALCULATED)

#### 6.2 동시 요청 시뮬레이션
```
동시에 여러 요청 전송 (같은 leadId)
```

**예상 결과:**
- ✅ 트랜잭션 내에서 `commissionProcessed` 재확인
- ✅ 이미 처리된 경우 스킵
- ✅ 중복 수당 지급 없음
- ✅ CommissionLedger에 중복 기록 없음

#### 6.3 수동 수당 계산 시도
```
POST /api/admin/affiliate/sales/{saleId}/approve-commission
```

**예상 결과:**
- ✅ `commissionProcessed` 플래그 확인
- ✅ 이미 처리된 경우 스킵
- ✅ 중복 수당 지급 없음

### 검증 체크리스트

- [ ] 첫 번째 수당 계산이 정상적으로 처리됨
- [ ] 동시 요청 시 중복 지급이 방지됨
- [ ] 수동 수당 계산 시도 시 중복 지급이 방지됨
- [ ] CommissionLedger에 중복 기록이 없음
- [ ] 감사 로그가 정확히 기록됨

---

## 시나리오 7: 배치 처리 성능 테스트

### 목적
대량 데이터 처리 시 배치 처리가 정상적으로 동작하는지 확인

### 전제 조건
- 해지된 계약이 있음
- 대량의 고객 DB가 있음 (100개 이상)

### 테스트 단계

#### 7.1 대량 데이터 생성
```
1000개의 AffiliateLead 생성
1000개의 AffiliateSale 생성
1000개의 AffiliateLink 생성
```

#### 7.2 DB 회수 실행
```
스케줄러 실행: recoverDbFromTerminatedContracts()
```

**예상 결과:**
- ✅ 100개씩 배치로 처리됨
- ✅ 트랜잭션 타임아웃 없음
- ✅ 메모리 사용량이 적정 수준
- ✅ 처리 시간이 합리적
- ✅ 모든 데이터가 정확히 이전됨

#### 7.3 성능 모니터링

**확인 사항:**
- 처리 시간
- 메모리 사용량
- 데이터베이스 쿼리 수
- 트랜잭션 타임아웃 발생 여부

### 검증 체크리스트

- [ ] 배치 처리가 정상적으로 동작함
- [ ] 대량 데이터 처리 시 성능 문제 없음
- [ ] 트랜잭션 타임아웃이 발생하지 않음
- [ ] 메모리 사용량이 적정 수준
- [ ] 모든 데이터가 정확히 처리됨

---

## 시나리오 8: 모니터링 및 알림 테스트

### 목적
모니터링 시스템과 알림 시스템이 정상적으로 동작하는지 확인

### 전제 조건
- 관리자 계정이 있음
- 관리자가 푸시 알림을 구독함

### 테스트 단계

#### 8.1 계약 해지 알림 확인
```
POST /api/admin/affiliate/contracts/{contractId}/terminate
```

**예상 결과:**
- ✅ 관리자에게 푸시 알림 전송
- ✅ AdminMessage에 기록
- ✅ 관리자 대시보드에 표시

#### 8.2 DB 회수 실패 알림 확인
```
의도적으로 DB 회수 실패 유도 (3회 이상)
```

**예상 결과:**
- ✅ 3회 실패 시 관리자에게 critical 알림 전송
- ✅ 관리자 대시보드에 "주의 필요" 표시
- ✅ AdminMessage에 기록

#### 8.3 모니터링 대시보드 확인
```
GET /api/admin/affiliate/monitoring
```

**예상 결과:**
- ✅ 계약 통계 정확히 표시
- ✅ DB 회수 이슈 목록 정확히 표시
- ✅ 수당 계산 오류 목록 정확히 표시
- ✅ 최근 해지 목록 정확히 표시

#### 8.4 관리자 대시보드 확인
```
/admin/dashboard 페이지 확인
```

**예상 결과:**
- ✅ 계약 모니터링 섹션 표시
- ✅ DB 회수 이슈 카드 표시
- ✅ 수당 계산 오류 카드 표시
- ✅ 주의 필요 항목 강조 표시

### 검증 체크리스트

- [ ] 계약 해지 시 알림이 전송됨
- [ ] DB 회수 실패 시 알림이 전송됨
- [ ] 수당 계산 실패 시 알림이 전송됨
- [ ] 모니터링 API가 정확한 데이터를 반환함
- [ ] 관리자 대시보드가 정확히 표시됨
- [ ] 주의 필요 항목이 강조 표시됨

---

## 테스트 실행 체크리스트

### 사전 준비
- [ ] 테스트 데이터 생성
- [ ] 관리자 계정 준비
- [ ] 푸시 알림 구독 확인
- [ ] HQ 프로필 확인

### 테스트 실행
- [ ] 시나리오 1: 판매원 계약 해지 플로우
- [ ] 시나리오 2: 대리점장 계약 해지 플로우
- [ ] 시나리오 3: 계약 갱신 승인 플로우
- [ ] 시나리오 4: 계약 갱신 거부 플로우
- [ ] 시나리오 5: 에러 복구 메커니즘 테스트
- [ ] 시나리오 6: 수당 중복 지급 방지 테스트
- [ ] 시나리오 7: 배치 처리 성능 테스트
- [ ] 시나리오 8: 모니터링 및 알림 테스트

### 결과 검증
- [ ] 모든 시나리오 통과
- [ ] 예상 결과와 일치
- [ ] 에러 없음
- [ ] 성능 문제 없음

---

## 문제 해결 가이드

### 일반적인 문제

1. **DB 회수가 실행되지 않음**
   - 스케줄러가 실행 중인지 확인
   - `metadata.terminatedAt`이 정확히 기록되었는지 확인
   - 해지일로부터 1일 이상 경과했는지 확인

2. **수당이 중복 지급됨**
   - `metadata.commissionProcessed` 플래그 확인
   - CommissionLedger에 중복 기록 확인
   - 트랜잭션 로그 확인

3. **알림이 전송되지 않음**
   - 관리자 계정 확인
   - 푸시 알림 구독 확인
   - VAPID 키 설정 확인

4. **HQ 프로필이 생성되지 않음**
   - 관리자 계정 존재 확인
   - `createHqProfileAndUserIfNotExist` 함수 확인

---

## 참고 자료

- [계약 해지 API 문서](./app/api/admin/affiliate/contracts/[contractId]/terminate/route.ts)
- [DB 회수 스케줄러](./lib/scheduler/contractTerminationHandler.ts)
- [수당 계산 로직](./lib/affiliate/commission-ledger.ts)
- [감사 로그 시스템](./lib/affiliate/audit-log.ts)
- [알림 시스템](./lib/affiliate/admin-notifications.ts)

---

**작성자**: AI Assistant  
**최종 수정일**: 2025-01-28


