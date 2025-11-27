# 1개월 결제 구독형 시스템 분석 보고서

## 📋 요구사항 요약

- **목표**: 판매원 대시보드와 개인몰을 복제하여 1개월짜리 결제 구독형 서비스 구축
- **예상 규모**: 월 100명 정도의 구독자
- **결제 모델**: 월 단위 결제, 결제 시 활성화, 미결제 시 삭제/비활성화
- **링크 관리**: 결제 상태에 따라 링크 활성화/비활성화

---

## 🔍 현재 시스템 구조 분석

### 1. 판매원 대시보드
- **경로**: `app/[mallUserId]/dashboard/page.tsx`
- **컴포넌트**: `PartnerDashboard` (`app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`)
- **기능**: 
  - 판매 통계, 리드 관리, 판매 관리
  - 링크 생성 및 관리
  - 팀 관리
  - 계약서 초대

### 2. 개인몰
- **경로**: `app/[mallUserId]/shop/page.tsx`
- **기능**:
  - 개인 판매몰 페이지
  - 상품 목록 표시
  - 어필리에이트 링크 기반 상품 노출

### 3. 데이터베이스 구조
- **User 모델**: `mallUserId` 필드로 개인몰 식별
- **AffiliateProfile 모델**: 판매원 프로필 정보
- **AffiliateContract 모델**: 계약서 정보 (현재는 제출/승인용)
- **Payment 모델**: 결제 정보 저장
- **AffiliateLink 모델**: 판매 링크 관리

---

## ✅ 구현 가능성: **가능**

현재 시스템 구조상 구독형 모델 구현이 가능합니다. 다만 몇 가지 추가 개발이 필요합니다.

---

## 🏗️ 구현 방안

### 방안 1: 기존 구조 활용 (권장)

#### 1.1 데이터베이스 스키마 확장

**새로운 모델 추가: `Subscription`**

```prisma
model Subscription {
  id                Int       @id @default(autoincrement())
  userId            Int       @unique
  mallUserId        String    @unique
  status            String    // 'active', 'expired', 'cancelled', 'pending'
  planType          String    @default("MONTHLY") // 'MONTHLY', 'YEARLY' 등
  startDate         DateTime
  endDate           DateTime
  nextBillingDate   DateTime
  lastPaymentId     Int?
  autoRenew         Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  User              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  Payment           Payment?  @relation(fields: [lastPaymentId], references: [id])
  
  @@index([status, endDate])
  @@index([mallUserId])
  @@index([nextBillingDate])
}
```

**Payment 모델 확장**
```prisma
model Payment {
  // ... 기존 필드 ...
  subscriptionId    Int?
  subscription      Subscription? @relation(fields: [subscriptionId], references: [id])
  isSubscription    Boolean   @default(false)
  
  // ... 기존 인덱스 ...
  @@index([subscriptionId])
}
```

**User 모델 확장**
```prisma
model User {
  // ... 기존 필드 ...
  Subscription      Subscription?
  subscriptionStatus String?  // 'active', 'expired', 'none'
}
```

#### 1.2 링크 활성화/비활성화 로직

**AffiliateLink 모델 활용**
- 기존 `status` 필드 활용: `'ACTIVE'`, `'INACTIVE'`, `'SUSPENDED'`
- 구독 만료 시 자동으로 `status = 'SUSPENDED'`로 변경
- 결제 완료 시 `status = 'ACTIVE'`로 복구

**미들웨어/API 레벨에서 필터링**
```typescript
// app/[mallUserId]/shop/page.tsx 수정
const activeLinks = await prisma.affiliateLink.findMany({
  where: {
    AND: [
      { status: 'ACTIVE' },
      // 구독 상태 확인
      { 
        OR: [
          { managerId: null, agentId: null }, // 공통 링크
          { agentId: profileId }, // 개인 링크
        ]
      }
    ]
  }
});
```

#### 1.3 결제 웹훅 처리

**새로운 API 엔드포인트**: `app/api/payment/subscription/route.ts`

```typescript
// 결제 완료 시
- Subscription 생성/갱신
- endDate = 현재일 + 30일
- nextBillingDate = 현재일 + 30일
- status = 'active'
- AffiliateLink.status = 'ACTIVE'로 변경
```

**결제 실패/미결제 시**
- Cron Job으로 매일 실행
- `nextBillingDate`가 지난 구독 확인
- `status = 'expired'`로 변경
- 관련 `AffiliateLink.status = 'SUSPENDED'`로 변경
- `mallUserId` 기반 페이지 접근 제한

---

## 📊 예상 시나리오별 동작

### 시나리오 1: 신규 구독자 가입
1. 사용자가 결제 페이지에서 결제 완료
2. `Subscription` 레코드 생성
   - `status = 'active'`
   - `startDate = 오늘`
   - `endDate = 오늘 + 30일`
   - `nextBillingDate = 오늘 + 30일`
3. `User.mallUserId` 할당 (또는 기존 사용)
4. `AffiliateProfile` 생성/활성화
5. `/[mallUserId]/dashboard` 접근 가능
6. `/[mallUserId]/shop` 접근 가능
7. 링크 생성 및 활성화 가능

### 시나리오 2: 정기 결제 성공 (다음 달)
1. 결제일 도래 (nextBillingDate)
2. 결제 PG사에서 자동 결제 실행
3. 결제 성공 웹훅 수신
4. `Subscription` 갱신
   - `startDate = 오늘`
   - `endDate = 오늘 + 30일`
   - `nextBillingDate = 오늘 + 30일`
   - `status = 'active'` 유지
5. 모든 기능 정상 작동

### 시나리오 3: 결제 실패/미결제
1. 결제일 도래
2. 결제 실패 또는 미결제
3. Cron Job 실행 (매일 새벽)
4. `Subscription.status = 'expired'`로 변경
5. 관련 `AffiliateLink.status = 'SUSPENDED'`로 변경
6. `/[mallUserId]/dashboard` 접근 시 만료 안내 페이지 표시
7. `/[mallUserId]/shop` 접근 시 "서비스가 만료되었습니다" 메시지
8. 기존 링크는 작동하지 않음 (404 또는 만료 안내)

### 시나리오 4: 재결제 (만료 후)
1. 사용자가 결제 페이지에서 재결제
2. 결제 완료 웹훅 수신
3. 기존 `Subscription` 레코드 갱신
   - `status = 'active'`
   - `startDate = 오늘`
   - `endDate = 오늘 + 30일`
4. `AffiliateLink.status = 'ACTIVE'`로 복구
5. 모든 기능 정상 작동

---

## ⚠️ 주의사항 및 고려사항

### 1. 데이터 삭제 vs 비활성화
**권장: 비활성화 방식**
- ✅ 장점:
  - 데이터 보존 (재가입 시 복구 용이)
  - 통계 데이터 유지
  - 감사 추적 가능
- ❌ 삭제 방식의 문제:
  - 재가입 시 모든 데이터 재구성 필요
  - 통계 데이터 손실
  - 링크 무효화로 인한 SEO 문제

**구현 방안**:
```typescript
// 삭제 대신 비활성화
await prisma.subscription.update({
  where: { userId },
  data: { 
    status: 'expired',
    // User는 유지하되, 접근만 제한
  }
});

// 링크는 SUSPENDED로 변경 (삭제하지 않음)
await prisma.affiliateLink.updateMany({
  where: { agentId: profileId },
  data: { status: 'SUSPENDED' }
});
```

### 2. 링크 관리 전략

**문제**: 만료된 구독자의 링크가 외부에 공유되어 있을 수 있음

**해결 방안**:
1. **링크 접근 시 구독 상태 확인**
   ```typescript
   // app/[mallUserId]/shop/page.tsx
   const subscription = await prisma.subscription.findUnique({
     where: { mallUserId }
   });
   
   if (!subscription || subscription.status !== 'active') {
     return <ExpiredSubscriptionPage />;
   }
   ```

2. **리다이렉트 페이지 제공**
   - 만료된 링크 접근 시 → "서비스가 만료되었습니다. 재결제 후 이용 가능합니다" 안내
   - 재결제 링크 제공

3. **Grace Period (유예 기간)**
   - 결제일로부터 7일간은 읽기 전용으로 접근 허용
   - 7일 후 완전 차단

### 3. 성능 고려사항

**월 100명 규모**:
- ✅ 현재 시스템으로 충분히 처리 가능
- ✅ 인덱스 추가로 쿼리 성능 최적화 필요

**필요한 인덱스**:
```prisma
@@index([status, endDate])  // 만료 구독 조회
@@index([mallUserId])        // 링크 접근 시 빠른 조회
@@index([nextBillingDate])   // 결제일 기반 조회
```

### 4. 결제 시스템 통합

**필요한 기능**:
1. **정기 결제 (Recurring Payment)**
   - PG사 API 연동 (토스페이먼츠, 이니시스 등)
   - 자동 결제 설정
   - 결제 실패 처리

2. **웹훅 처리**
   - 결제 성공/실패 웹훅 수신
   - 재시도 로직
   - 보안 검증 (서명 확인)

3. **결제 알림**
   - 결제 성공 시 이메일/SMS
   - 결제 실패 시 알림
   - 만료 예정 알림 (D-7, D-3, D-1)

### 5. 관리자 대시보드

**필요한 기능**:
- 구독자 목록 조회
- 결제 상태 모니터링
- 만료 예정 구독자 알림
- 수동 갱신/연장 기능
- 통계 (월별 구독자 수, 이탈률 등)

---

## 🔧 구현 단계

### Phase 1: 데이터베이스 스키마 확장 (1-2일)
1. `Subscription` 모델 추가
2. `Payment` 모델 확장
3. 마이그레이션 실행

### Phase 2: 결제 시스템 통합 (3-5일)
1. PG사 API 연동
2. 웹훅 엔드포인트 구현
3. 결제 성공/실패 처리 로직

### Phase 3: 구독 상태 관리 (2-3일)
1. Cron Job 구현 (매일 실행)
2. 만료 구독자 처리
3. 링크 활성화/비활성화 로직

### Phase 4: 접근 제어 (2-3일)
1. 미들웨어에서 구독 상태 확인
2. 만료 페이지 구현
3. 대시보드/개인몰 접근 제한

### Phase 5: 관리자 기능 (2-3일)
1. 구독자 관리 페이지
2. 통계 대시보드
3. 수동 연장 기능

### Phase 6: 테스트 및 최적화 (2-3일)
1. 통합 테스트
2. 성능 테스트
3. 에러 처리 개선

**총 예상 기간: 12-19일**

---

## 💰 비용 및 리소스

### 개발 비용
- 개발 시간: 약 2-3주
- 테스트 시간: 1주

### 운영 비용
- PG사 수수료: 결제 금액의 약 2.5% (페이앱 연동)
- 서버 리소스: 현재 규모로는 추가 비용 없음
- 스토리지: **추가 비용 없음** (데이터베이스에 저장되므로 기존 인프라 활용)

### 예상 월 운영 비용 (100명 기준)
- PG사 수수료: 구독료 × 100 × 2.5% = 구독료의 2.5% (페이앱)
- 서버: 기존 인프라 활용 (추가 비용 없음)
- 스토리지: **추가 비용 없음**
  - 구독 정보는 PostgreSQL 데이터베이스에 저장 (텍스트 데이터, 매우 작음)
  - 100명 규모면 데이터베이스 용량 증가는 미미함 (약 수 KB 수준)
  - 기존 데이터베이스 인프라로 충분히 처리 가능
  - Google Drive는 이미 사용 중이므로 기존 비용에 포함

---

## 🎯 권장 사항

### 1. 단계적 롤아웃
- 베타 테스트: 10-20명으로 시작
- 점진적 확대: 문제 없으면 전체 오픈

### 2. 모니터링
- 구독 상태 대시보드 구축
- 결제 실패율 모니터링
- 사용자 피드백 수집

### 3. 고객 지원
- 결제 실패 시 자동 알림
- 재결제 가이드 제공
- 고객 지원 채널 운영

### 4. 데이터 백업
- 만료된 구독자 데이터도 백업
- 재가입 시 빠른 복구 가능하도록

---

## 📝 결론

**구현 가능성: ✅ 매우 가능**

현재 시스템 구조상 구독형 모델을 구현하는 것이 가능하며, 기존 인프라를 최대한 활용할 수 있습니다. 

**핵심 포인트**:
1. 데이터 삭제보다 비활성화 방식 권장
2. 링크는 유지하되 접근 시 구독 상태 확인
3. Cron Job으로 자동 만료 처리
4. PG사 정기 결제 API 연동 필수

**예상 개발 기간**: 2-3주
**예상 운영 비용**: 구독료의 2.5% (PG 수수료, 페이앱) + 서버/스토리지 추가 비용 없음

이 방안으로 진행하시겠습니까? 구체적인 구현을 시작할까요?

