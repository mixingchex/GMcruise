# 정액제 결제 연장 로직 가이드

## 📋 개요

정액제 결제 시 구독 기간이 자동으로 연장되는 로직입니다.

## 🔄 결제 시나리오별 동작

### 시나리오 1: 무료 체험 중에 결제

**상황**: 무료 체험 7일 중에 미리 결제

**동작**:
1. 무료 체험 7일을 모두 사용
2. 무료 체험 종료일(`trialEndDate`)부터 1개월 구독 시작
3. `contractEndDate` = `trialEndDate` + 1개월

**예시**:
- 무료 체험 시작: 2024-01-01
- 무료 체험 종료: 2024-01-08 (7일 후)
- 결제일: 2024-01-05 (무료 체험 중)
- 구독 시작: 2024-01-08 (무료 체험 종료일)
- 구독 종료: 2024-02-08 (구독 시작일 + 1개월)

### 시나리오 2: 정식 구독 중에 미리 결제

**상황**: 정식 구독 1개월 중에 미리 결제

**동작**:
1. 현재 구독 기간을 모두 사용
2. 현재 구독 종료일(`contractEndDate`)부터 1개월 연장
3. 새로운 `contractEndDate` = 기존 `contractEndDate` + 1개월

**예시**:
- 구독 시작: 2024-01-08
- 구독 종료: 2024-02-08
- 결제일: 2024-01-20 (구독 중)
- 연장된 구독 종료: 2024-03-08 (기존 종료일 + 1개월)

### 시나리오 3: 만료된 구독 재결제

**상황**: 구독이 만료된 후 재결제

**동작**:
1. 결제일부터 1개월 구독 시작
2. `contractEndDate` = 결제일 + 1개월

**예시**:
- 기존 구독 종료: 2024-02-08
- 결제일: 2024-02-15 (만료 후)
- 새로운 구독 종료: 2024-03-15 (결제일 + 1개월)

## 💻 구현 로직

### PayApp 피드백 API (`app/api/payapp/feedback/route.ts`)

```typescript
if (var2 === 'SUBSCRIPTION_AGENT') {
  const now = new Date();
  const metadata = contract.metadata as any || {};
  const isCurrentlyTrial = metadata.isTrial === true;
  const currentTrialEndDate = metadata.trialEndDate ? new Date(metadata.trialEndDate) : null;
  const currentContractEndDate = contract.contractEndDate ? new Date(contract.contractEndDate) : null;
  
  let newContractEndDate: Date;
  
  if (isCurrentlyTrial && currentTrialEndDate) {
    // 무료 체험 중에 결제: 무료 체험 종료일 + 1개월
    newContractEndDate = new Date(currentTrialEndDate);
    newContractEndDate.setMonth(newContractEndDate.getMonth() + 1);
  } else if (currentContractEndDate && now < currentContractEndDate) {
    // 정식 구독 중에 미리 결제: 현재 구독 종료일 + 1개월
    newContractEndDate = new Date(currentContractEndDate);
    newContractEndDate.setMonth(newContractEndDate.getMonth() + 1);
  } else {
    // 만료된 구독 재결제: 지금부터 + 1개월
    newContractEndDate = new Date(now);
    newContractEndDate.setMonth(newContractEndDate.getMonth() + 1);
  }
  
  // 계약서 업데이트
  await prisma.affiliateContract.update({
    where: { id: contractId },
    data: {
      status: 'completed',
      metadata: {
        ...metadata,
        isTrial: false, // 무료 체험 종료
        trialEndDate: null,
        lastPaymentDate: pay_date || now.toISOString(),
        nextBillingDate: newContractEndDate.toISOString(),
      },
      contractEndDate: newContractEndDate,
      updatedAt: now,
    },
  });
}
```

## ✅ 테스트 시나리오

### 테스트 1: 무료 체험 중 결제

1. **준비**
   - gest1 계정 로그인
   - 무료 체험 중인 상태 확인
   - `trialEndDate` 확인 (예: 2024-01-08)

2. **테스트**
   - 결제 진행
   - PayApp 피드백 API 호출 확인

3. **예상 결과**
   - ✅ `isTrial: false`
   - ✅ `trialEndDate: null`
   - ✅ `contractEndDate: 2024-02-08` (무료 체험 종료일 + 1개월)
   - ✅ 무료 체험 기간은 그대로 사용 가능
   - ✅ 무료 체험 종료 후 구독 시작

### 테스트 2: 정식 구독 중 미리 결제

1. **준비**
   - gest1 계정 로그인
   - 정식 구독 중인 상태 확인
   - `contractEndDate` 확인 (예: 2024-02-08)

2. **테스트**
   - 결제 진행 (예: 2024-01-20)
   - PayApp 피드백 API 호출 확인

3. **예상 결과**
   - ✅ 기존 구독 기간 유지 (2024-01-08 ~ 2024-02-08)
   - ✅ `contractEndDate: 2024-03-08` (기존 종료일 + 1개월)
   - ✅ 현재 구독 기간 끝까지 사용 가능
   - ✅ 구독 기간 자동 연장

### 테스트 3: 만료된 구독 재결제

1. **준비**
   - gest1 계정 로그인
   - 구독 만료된 상태 확인
   - `contractEndDate` 확인 (과거 날짜)

2. **테스트**
   - 결제 진행
   - PayApp 피드백 API 호출 확인

3. **예상 결과**
   - ✅ `contractEndDate: 결제일 + 1개월`
   - ✅ 즉시 구독 시작

## 🔍 확인 포인트

### 데이터베이스 확인

```sql
-- 계약서 정보 확인
SELECT 
  id,
  "contractEndDate",
  metadata->>'isTrial' as is_trial,
  metadata->>'trialEndDate' as trial_end_date,
  metadata->>'lastPaymentDate' as last_payment_date,
  metadata->>'nextBillingDate' as next_billing_date,
  status
FROM "AffiliateContract"
WHERE metadata->>'contractType' = 'SUBSCRIPTION_AGENT'
ORDER BY "createdAt" DESC;
```

### 로그 확인

PayApp 피드백 API 로그에서 다음 메시지 확인:
- `[PayApp Feedback] 무료 체험 중 결제 - 무료 체험 종료 후 구독 시작`
- `[PayApp Feedback] 정식 구독 중 미리 결제 - 구독 기간 연장`
- `[PayApp Feedback] 만료된 구독 재결제 - 지금부터 1개월`

## 📝 주의사항

1. **무료 체험 중 결제**
   - 무료 체험 기간은 그대로 사용 가능
   - 무료 체험 종료 후 구독 시작
   - 무료 체험 기간이 손실되지 않음

2. **정식 구독 중 미리 결제**
   - 현재 구독 기간은 그대로 사용 가능
   - 구독 종료일부터 연장 시작
   - 현재 구독 기간이 손실되지 않음

3. **만료된 구독 재결제**
   - 결제일부터 즉시 구독 시작
   - 만료 기간은 복구되지 않음

## 🎯 요약

- **무료 체험 중 결제**: 무료 체험 7일 다 쓰고 → 그 다음부터 1개월 시작
- **정식 구독 중 미리 결제**: 현재 구독 기간 끝까지 다 쓰고 → 그 다음부터 1개월 연장
- **만료된 구독 재결제**: 결제일부터 1개월 시작

모든 경우에 구독 기간이 손실되지 않도록 자동으로 계산됩니다.

