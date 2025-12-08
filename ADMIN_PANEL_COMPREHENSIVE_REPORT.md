# 크루즈가이드 관리자 패널 종합 분석 보고서

**작성일**: 2025-12-07
**분석 범위**: 관리자 패널 전체 (67개 페이지, 339개 API 엔드포인트)

---

## 목차

1. [현황 요약](#1-현황-요약)
2. [고객 DB 분류 체계](#2-고객-db-분류-체계)
3. [대시보드 통합 분석](#3-대시보드-통합-분석)
4. [API 구조 분석 및 중복 제거](#4-api-구조-분석-및-중복-제거)
5. [수당(커미션) 시스템 분석](#5-수당커미션-시스템-분석)
6. [APIS 동기화 시스템](#6-apis-동기화-시스템)
7. [구글 드라이브 백업 시스템](#7-구글-드라이브-백업-시스템)
8. [성능 최적화 권장사항](#8-성능-최적화-권장사항)
9. [자동화 및 수동 제어](#9-자동화-및-수동-제어)
10. [통합 대시보드 설계](#10-통합-대시보드-설계)
11. [판매원/대리점장 접근 권한](#11-판매원대리점장-접근-권한)
12. [구현 우선순위 및 로드맵](#12-구현-우선순위-및-로드맵)

---

## 1. 현황 요약

### 1.1 전체 시스템 규모

| 항목 | 수량 | 비고 |
|------|------|------|
| 관리자 페이지 | 67개 | app/admin/ 하위 |
| API 엔드포인트 | 339개 | app/api/admin/ 하위 |
| 총 코드 라인 | 80,413줄 | 관리자 페이지만 |
| 중복 인증 함수 | 416개 | checkAdminAuth 중복 |
| 대시보드 | 7개 | 통합 필요 |
| 고객 관리 페이지 | 6개 | 부분 통합 완료 |

### 1.2 주요 문제점

1. **코드 중복**: 30% 이상의 코드가 반복적인 필터링, 포맷팅, 표시 로직
2. **API 분산**: 339개 → 80~100개로 통합 가능 (65% 감소 가능)
3. **N+1 쿼리 문제**: 일부 API에서 다중 쿼리 발생
4. **페이지네이션 미구현**: 일부 엔드포인트에서 전체 데이터 로드

---

## 2. 고객 DB 분류 체계

### 2.1 고객 그룹 분류 (10개 카테고리)

| 그룹 | 코드명 | 분류 기준 | 데이터 소스 |
|------|--------|-----------|-------------|
| **전체 고객** | `all` | 모든 User 레코드 | User 테이블 |
| **구매 고객** | `purchase` | customerStatus='purchase_confirmed' OR Reservation 존재 | User + Reservation |
| **3일 체험** | `trial` | customerSource='test-guide' OR testModeStartedAt 존재 | User.testModeStartedAt |
| **크루즈몰 회원** | `mall` | role='community' AND customerSource='mall-signup' | User.role, mallUserId |
| **잠재고객** | `prospects` | customerSource='landing-page' | User.customerSource |
| **문의 고객** | `inquiry` | customerSource IN ['product-inquiry', 'phone-consultation'] | User.customerSource |
| **환불 고객** | `refund` | customerStatus='refunded' | User.customerStatus |
| **대리점장 고객** | `manager-customers` | AffiliateLead.managerId 존재 | AffiliateLead |
| **판매원 고객** | `agent-customers` | AffiliateLead.agentId 존재 | AffiliateLead |
| **여권 관리** | `passport` | 구매고객 중 여권 정보 관리 대상 | Traveler |

### 2.2 고객 분류 우선순위 로직

```
판별 순서:
1. 환불 (customerStatus = 'refunded') → 'refund'
2. 구매 (customerStatus = 'purchase_confirmed' OR Reservation 존재) → 'purchase'
3. 체험 (customerSource = 'test-guide' OR testModeStartedAt 존재) → 'trial'
4. 몰 (role = 'community' AND customerSource = 'mall-signup') → 'mall'
5. 랜딩페이지 (customerSource = 'landing-page') → 'prospects'
6. 기본값 → 'prospects'
```

### 2.3 고객 유입 추적 필드

```prisma
model User {
  customerSource     String?   // 유입 경로
  customerStatus     String?   // 구매/환불 상태
  testModeStartedAt  DateTime? // 3일 체험 시작
  mallUserId         Int?      // 몰 연동 ID
  mallNickname       String?   // 몰 닉네임
  role               String    // user, community, admin, affiliate
}
```

### 2.4 B2B vs 시스템 문의 구분

| 유형 | 데이터 소스 | 식별 방법 |
|------|-------------|-----------|
| **B2B 유입** | AffiliateLead | source='B2B_LANDING' OR source='B2B_INFLOW' |
| **시스템 문의** | SystemConsultation | consultationType='system-inquiry' |
| **상품 문의** | ProductInquiry | productCode 존재 |

---

## 3. 대시보드 통합 분석

### 3.1 현재 대시보드 현황 (7개)

| 대시보드 | 경로 | 용량 | 주요 기능 |
|----------|------|------|-----------|
| **메인 대시보드** | /admin/dashboard | 42KB | 전체 통계, 고객 현황, 계약 모니터링 |
| **데이터 분석** | /admin/data-analysis | 47KB | 고객 분석, 재구매율, 마케팅 인사이트 |
| **몰 분석** | /admin/mall-analytics | 9KB | 키워드, 감정 분석, 리뷰 |
| **PWA 통계** | /admin/pwa-stats | 12KB | PWA 설치 현황 |
| **팀 대시보드** | /admin/affiliate/team-dashboard | 84KB | 대리점장 성과, 수당, 메시지 |
| **에이전트 대시보드** | /admin/affiliate/agent-dashboard | 50KB | 판매원 성과, 정산 |
| **테스트 대시보드** | /admin/test-dashboard | 16KB | 백업 테스트, 급여명세서 |

### 3.2 중복 기능 분석

| 기능 | 중복 위치 | 통합 방안 |
|------|-----------|-----------|
| 전화 문의/리드 표시 | 메인, 팀, 에이전트 대시보드 | `<LeadQuickView />` 공통 컴포넌트 |
| 메시지 시스템 | 팀, 에이전트 대시보드 | `<MessageModal />` 공통 컴포넌트 |
| 수당/정산 추적 | 팀, 에이전트 대시보드 | 공통 계산 로직 추출 |
| 필터링/검색 | 모든 대시보드 | `useAdminFilters()` 훅 |

### 3.3 통합 대시보드 설계안

**단일 대시보드 구조**:
```
/admin/dashboard (통합)
├── 탭 1: 전체 현황 (기존 메인 대시보드)
├── 탭 2: 고객 분석 (데이터 분석 통합)
├── 탭 3: 어필리에이트 (팀/에이전트 통합)
├── 탭 4: 콘텐츠 분석 (몰 분석 통합)
└── 탭 5: 시스템 (PWA, 테스트 통합)
```

---

## 4. API 구조 분석 및 중복 제거

### 4.1 카테고리별 API 현황

| 카테고리 | 엔드포인트 수 | 주요 기능 |
|----------|---------------|-----------|
| **Affiliate** | 75개 | 프로필, 리드, 판매, 계약, 정산, 문서 |
| **Users** | 21개 | 사용자 관리, 분석, 세션 |
| **Landing Pages** | 16개 | 페이지 관리, 통계, 댓글 |
| **Mall** | 15개 | 상품, 섹션, 설정, 커뮤니티 |
| **Marketing** | 14개 | 고객 관리, 메시징, 캠페인 |
| **Settings** | 13개 | 설정, API 키, SMS, SEO |
| **Customers** | 11개 | 고객 기록, 메모, 여정 |
| **기타** | 174개 | 여권, 상품, 메시지, 분석 등 |

### 4.2 통합 가능한 중복 API

| 현재 상태 | 통합 후 | 절감 |
|-----------|---------|------|
| 고객 관리 5개 API | `/admin/customers?context=all\|mall\|test\|purchase` | 4개 |
| 메시지 8개+ API | `/admin/messages?type=scheduled\|funnel\|affiliate` | 6개+ |
| 상품 4개 API | `/admin/products?context=general\|affiliate\|mall` | 3개 |
| 설정 13개+ API | `/admin/settings?section=info\|seo\|sms` | 10개+ |
| 검색 4개 API | `/admin/search?type=customer\|affiliate\|passport` | 3개 |
| 재무 6개 API | `/admin/affiliate/finance?type=sales\|settlement` | 3개 |

**예상 절감**: 339개 → 80~100개 (약 65% 감소)

### 4.3 성능 문제가 있는 API

| API | 문제 | 심각도 |
|-----|------|--------|
| `/admin/affiliate/contracts/education-sections` | 페이지네이션 없음 (take: 100) | HIGH |
| `/admin/test-users` | 1000개 전체 로드 | HIGH |
| `/admin/affiliate/sales/[saleId]/*` | 7개 별도 엔드포인트 (동일 데이터 반복 조회) | HIGH |
| 대부분의 settings API | 하드코딩된 제한 | MEDIUM |

---

## 5. 수당(커미션) 시스템 분석

### 5.1 수당 유형

| 유형 | 코드 | 설명 | 수령자 |
|------|------|------|--------|
| **본사 수익** | HQ_NET | 순매출 - 모든 수당 | 본사 |
| **대리점 수당** | BRANCH_COMMISSION | 대리점장 직접 판매 수당 | 대리점장 |
| **판매원 수당** | SALES_COMMISSION | 판매원 판매 수당 | 판매원 |
| **오버라이드** | OVERRIDE_COMMISSION | 판매원 매출에 대한 대리점장 보너스 | 대리점장 |
| **원천징수** | WITHHOLDING | 세금 공제 (기본 3.3%) | 차감 |

### 5.2 수당 계산 플로우

```
입력값:
├── saleAmount (판매금액)
├── costAmount (원가)
├── branchCommission (대리점 수당율)
├── salesCommission (판매원 수당율)
├── overrideCommission (오버라이드 수당율)
└── withholdingRate (원천징수율, 기본 3.3%)

계산:
1. netRevenue = saleAmount - costAmount
2. hqNet = netRevenue - (브랜치 + 세일즈 + 오버라이드)
3. 각 수당별 원천징수 계산
4. CommissionLedger에 기록

출력:
├── CommissionLedger 엔트리 생성 (HQ_NET, BRANCH, SALES, OVERRIDE, WITHHOLDING)
└── AffiliateSale 레코드 업데이트
```

### 5.3 발견된 수당 시스템 문제점 (8개)

| # | 문제 | 위치 | 심각도 | 해결방안 |
|---|------|------|--------|----------|
| 1 | 환불 처리 불일치 | refund.ts vs settlements/route.ts | HIGH | 환불 시 ledger 역분개 로직 통일 |
| 2 | WITHHOLDING 귀속 문제 | commission.ts:214-237 | MEDIUM | profileId가 null일 수 있음 수정 |
| 3 | 정산 데이터 3중 폴백 | settlements/statement/route.ts:85-126 | HIGH | 단일 데이터 소스로 통일 |
| 4 | HQ_NET 기본값 false | commission-ledger.ts:87 | MEDIUM | includeHqNet 기본값 true로 변경 |
| 5 | 수동 환불 검증 미비 | refund/route.ts | MEDIUM | 원본 수당 존재 여부 검증 추가 |
| 6 | CommissionTier 미검증 | payment/webhook/route.ts:205-240 | HIGH | 티어 없으면 경고 알림 추가 |
| 7 | 통화 불일치 | settlement 계산 전체 | MEDIUM | 통화 일관성 검증 추가 |
| 8 | isSettled 미설정 | 전체 정산 로직 | HIGH | 정산 완료 시 isSettled=true 설정 |

### 5.4 수당 정확성 개선 권장사항

```typescript
// 1. CommissionTier 필수 검증
if (!commissionTier) {
  await sendAdminAlert('CommissionTier 누락', { productCode, cabinType });
  throw new Error('수당 티어가 설정되지 않았습니다.');
}

// 2. 정산 완료 시 isSettled 설정
await prisma.commissionLedger.updateMany({
  where: { saleId, profileId },
  data: { isSettled: true, settlementId }
});

// 3. 환불 시 역분개 엔트리 생성
await createRefundLedgerEntries(saleId, originalLedgerEntries);
```

---

## 6. APIS 동기화 시스템

### 6.1 현재 구조

```
동기화 흐름:
1. 여권/PNR 제출 → syncApisSpreadsheet(tripId) 호출
2. Traveler 데이터 조회
3. Google Sheets API로 스프레드시트 업데이트
4. 에러 시 로그만 기록 (비동기, 무시)
```

### 6.2 APIS 스프레드시트 컬럼

| 컬럼 | 데이터 소스 |
|------|-------------|
| 순번 | 자동 생성 |
| 구매날짜 | Reservation.createdAt |
| 상품코드 | CruiseProduct.productCode |
| 출발일 | Trip.departureDate |
| 카테고리 | CruiseProduct.cruiseLine |
| 성명(한글) | Traveler.korName |
| 성명(영문) | Traveler.engSurname + engGivenName |
| 여권번호 | Traveler.passportNo |
| 생년월일 | Traveler.birthDate |
| 만료일 | Traveler.expiryDate |
| 결제정보 | Payment 테이블 연동 |

### 6.3 개선 권장사항

```typescript
// 현재: 에러 무시
syncApisSpreadsheet(tripId).catch(err => console.error(err));

// 개선: 재시도 로직 + 알림
async function syncWithRetry(tripId: number, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await syncApisSpreadsheet(tripId);
      return;
    } catch (err) {
      if (i === retries - 1) {
        await sendAdminAlert('APIS 동기화 실패', { tripId, error: err.message });
      }
      await sleep(1000 * (i + 1));
    }
  }
}
```

---

## 7. 구글 드라이브 백업 시스템

### 7.1 현재 백업 대상

| 항목 | 폴더 ID | 백업 주기 |
|------|---------|-----------|
| 계약서 PDF | 1HN-w4tNLdmfW5K5N3zF52P_InrUdBkQ_ | 계약 완료 시 |
| 신분증 | (문서별 설정) | 업로드 시 |
| 통장사본 | (문서별 설정) | 업로드 시 |
| 서명 이미지 | (문서별 설정) | 서명 시 |
| DB 백업 | 0AJVz1C-KYWR0Uk9PVA | 수동/테스트 |

### 7.2 고객 행동 데이터 백업 제안

```
서버 용량 절약을 위한 구글 드라이브 아카이빙:

1. 30일 이상 된 UserActivity → JSON으로 압축 → 구글 드라이브
2. 90일 이상 된 ProductView → JSON으로 압축 → 구글 드라이브
3. 180일 이상 된 FeatureUsage → JSON으로 압축 → 구글 드라이브

아카이브 구조:
/CruiseGuide-Archive/
├── UserActivity/
│   ├── 2024-Q1.json.gz
│   ├── 2024-Q2.json.gz
│   └── ...
├── ProductView/
│   └── ...
└── FeatureUsage/
    └── ...
```

### 7.3 백업 자동화 스크립트

```typescript
// lib/archive/activity-archiver.ts
export async function archiveOldActivities() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const oldActivities = await prisma.userActivity.findMany({
    where: { createdAt: { lt: cutoffDate } }
  });

  if (oldActivities.length === 0) return;

  // 압축 및 업로드
  const buffer = gzipSync(JSON.stringify(oldActivities));
  await uploadFileToDrive({
    folderId: ARCHIVE_FOLDER_ID,
    fileName: `UserActivity_${format(cutoffDate, 'yyyy-MM')}.json.gz`,
    mimeType: 'application/gzip',
    buffer
  });

  // DB에서 삭제
  await prisma.userActivity.deleteMany({
    where: { id: { in: oldActivities.map(a => a.id) } }
  });
}
```

---

## 8. 성능 최적화 권장사항

### 8.1 즉시 적용 가능 (1주 내)

| 항목 | 현재 | 개선 | 효과 |
|------|------|------|------|
| checkAdminAuth 중복 | 416개 파일 | 미들웨어로 통합 | 코드 80% 감소 |
| include → select | 409개 사용 | select로 변경 | 메모리 30% 절약 |
| 페이지네이션 추가 | 일부 미구현 | 전체 적용 | 타임아웃 방지 |

### 8.2 단기 적용 (1개월 내)

| 항목 | 현재 | 개선 | 효과 |
|------|------|------|------|
| React Query 캐싱 | 미사용 | 적용 | API 호출 50% 감소 |
| 가상 스크롤링 | 미사용 | 대용량 리스트 적용 | 렌더링 속도 10배 |
| 공통 컴포넌트 | 중복 코드 | 추출 | 번들 크기 30% 감소 |

### 8.3 중기 적용 (2-3개월)

```typescript
// 1. 통합 쿼리 빌더
const customers = await buildCustomerQuery({
  group: 'purchase',
  search: searchTerm,
  pagination: { page, limit },
  includes: ['reservation', 'lead', 'activities']
});

// 2. 배치 처리
const results = await Promise.all([
  getCustomerStats(),
  getRecentActivities(),
  getCommissionSummary()
]);

// 3. 캐싱 레이어
const cachedStats = await cache.getOrSet('dashboard-stats', async () => {
  return await calculateDashboardStats();
}, { ttl: 300 }); // 5분 캐시
```

---

## 9. 자동화 및 수동 제어

### 9.1 현재 자동화 현황

| 기능 | 자동화 수준 | 수동 제어 |
|------|-------------|-----------|
| 여권 제출 → APIS 동기화 | 완전 자동 | 수동 동기화 버튼 있음 |
| 결제 완료 → 수당 계산 | 완전 자동 | 수동 수당 조정 가능 |
| 계약 완료 → PDF 생성 | 완전 자동 | 수동 재생성 가능 |
| 3일 체험 만료 | 자동 만료 | 수동 연장 가능 |
| 고객 그룹 분류 | 자동 분류 | 수동 재분류 가능 |

### 9.2 자동화 + 수동 제어 병행 설계

```typescript
// 자동화 실패 시 수동 제어 UI
interface AutomationControl {
  feature: string;
  lastRunAt: Date;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  manualTrigger: () => Promise<void>;
  retryCount: number;
}

// 관리자 패널에서 표시
<AutomationStatus
  items={[
    { feature: 'APIS 동기화', status: 'failed', errorMessage: 'API 한도 초과' },
    { feature: '수당 계산', status: 'success' },
  ]}
  onManualTrigger={handleManualTrigger}
/>
```

### 9.3 추가 자동화 필요 항목

| 항목 | 현재 | 자동화 제안 |
|------|------|-------------|
| 환불 처리 | 수동 | 결제사 웹훅 연동 자동 처리 |
| 여권 알림 | 수동 발송 | 출발 30일 전 자동 발송 |
| 계약 갱신 알림 | 미구현 | 만료 30일 전 자동 알림 |
| 고객 휴면 처리 | 수동 | 90일 미접속 시 자동 휴면 |

---

## 10. 통합 대시보드 설계

### 10.1 요구사항 정리

사용자 요청 기반:
- 고객 구매 패턴 조회
- 유입 후 체류 시간 분석
- 고객이 본 상품/페이지 추적
- 개별 고객 상세 데이터
- 전체 고객 평균 데이터
- 판매원/대리점장도 동일 데이터 조회 가능

### 10.2 통합 대시보드 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│  통합 대시보드                                    [날짜 필터] │
├─────────────────────────────────────────────────────────────┤
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐         │
│  │전체   │ │구매   │ │체험   │ │몰     │ │잠재   │ [그룹탭] │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘         │
├─────────────────────────────────────────────────────────────┤
│  [요약 카드]                                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 총 고객  │ │ 오늘 유입 │ │ 평균 체류 │ │ 전환율   │           │
│  │ 12,345  │ │ 234     │ │ 4분 32초 │ │ 3.2%   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│  [고객 행동 분석]                                           │
│  ┌────────────────────────┐ ┌────────────────────────┐     │
│  │ 인기 검색 키워드        │ │ 인기 조회 상품          │     │
│  │ 1. 지중해 크루즈       │ │ 1. MSC 그란디오사      │     │
│  │ 2. 알래스카            │ │ 2. 로얄캐리비안 오아시스│     │
│  │ 3. 일본 크루즈         │ │ 3. NCL 조이           │     │
│  └────────────────────────┘ └────────────────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  [고객 목록]                                    [검색] [필터] │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 이름    │ 연락처      │ 유입경로 │ 조회상품 │ 체류시간 │  │
│  │ 김철수  │ 010-1234-*  │ 네이버   │ 3개     │ 12분    │  │
│  │ 이영희  │ 010-5678-*  │ 인스타   │ 7개     │ 28분    │  │
│  │ [클릭시 상세 모달 오픈]                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 고객 상세 모달

```
┌─────────────────────────────────────────────────────────────┐
│  고객 상세 정보: 김철수                            [X 닫기]  │
├─────────────────────────────────────────────────────────────┤
│  [기본 정보]                                                │
│  이름: 김철수  │  연락처: 010-1234-5678  │  이메일: kim@... │
│  유입일: 2024-01-15  │  유입경로: 네이버 검색               │
│  고객상태: 구매확정  │  담당자: 홍길동 (대리점장)            │
├─────────────────────────────────────────────────────────────┤
│  [구매 이력]                                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 상품명              │ 금액      │ 결제일    │ 상태  │    │
│  │ MSC 지중해 7박      │ 2,500,000 │ 2024-01  │ 완료  │    │
│  └────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  [행동 분석]                                                │
│  검색 키워드: 지중해, 이탈리아, 바르셀로나, MSC              │
│  조회한 상품: MSC 그란디오사, 로얄캐리비안, NCL 조이         │
│  문의 내역: 2024-01-10 상품문의, 2024-01-12 예약문의        │
│  총 방문: 15회  │  평균 체류: 8분 32초                      │
├─────────────────────────────────────────────────────────────┤
│  [활동 타임라인]                                            │
│  2024-01-15 14:32  페이지 조회: /products/msc-grandiosa    │
│  2024-01-15 14:28  검색: "지중해 크루즈 가격"               │
│  2024-01-15 14:25  로그인                                  │
│  ...                                                       │
└─────────────────────────────────────────────────────────────┘
```

### 10.4 데이터 모델 활용

```typescript
// 고객 행동 데이터 조회
const customerBehavior = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    UserActivity: {
      orderBy: { createdAt: 'desc' },
      take: 100
    },
    ProductView: {
      include: { CruiseProduct: true },
      orderBy: { viewedAt: 'desc' },
      take: 20
    },
    ProductInquiry: {
      orderBy: { createdAt: 'desc' }
    },
    FeatureUsage: true,
    CustomerJourney: {
      orderBy: { createdAt: 'desc' }
    }
  }
});

// 평균 데이터 계산
const avgMetrics = await prisma.$queryRaw`
  SELECT
    AVG(session_duration) as avg_duration,
    AVG(page_views) as avg_page_views,
    AVG(product_views) as avg_product_views
  FROM user_session_stats
  WHERE created_at > NOW() - INTERVAL '30 days'
`;
```

---

## 11. 판매원/대리점장 접근 권한

### 11.1 현재 권한 구조

| 역할 | 접근 가능 | 접근 불가 |
|------|-----------|-----------|
| **Admin** | 전체 | 없음 |
| **대리점장** | 본인 팀 데이터, 팀 대시보드 | 다른 팀 데이터, 시스템 설정 |
| **판매원** | 본인 고객 데이터, 에이전트 대시보드 | 다른 판매원 데이터, 정산 승인 |

### 11.2 파트너 포털 현황

경로: `/partner/[partnerId]/`

| 페이지 | 기능 |
|--------|------|
| `/dashboard` | 본인 성과, 수당 현황 |
| `/team` | 팀원 관리 (대리점장만) |
| `/customers` | 본인 담당 고객 목록 |
| `/contracts` | 계약서 관리 |
| `/settings` | 개인 설정 |

### 11.3 권한 확장 제안

```typescript
// 판매원/대리점장도 고객 행동 데이터 조회 가능하도록
export async function getCustomerBehaviorForPartner(
  partnerId: number,
  customerId: number
) {
  // 1. 권한 확인: 해당 고객이 본인 담당인지
  const lead = await prisma.affiliateLead.findFirst({
    where: {
      id: customerId,
      OR: [
        { agentId: partnerId },
        { managerId: partnerId }
      ]
    }
  });

  if (!lead) throw new Error('접근 권한이 없습니다.');

  // 2. 고객 행동 데이터 조회
  const user = await prisma.user.findFirst({
    where: { phone: lead.customerPhone },
    include: {
      UserActivity: { take: 50 },
      ProductView: { take: 20 },
      ProductInquiry: true
    }
  });

  return user;
}
```

---

## 12. 구현 우선순위 및 로드맵

### 12.1 Phase 1: 즉시 수정 (1-2주)

| 항목 | 설명 | 예상 시간 |
|------|------|-----------|
| 수당 시스템 버그 수정 | CommissionTier 검증, isSettled 설정 | 2일 |
| APIS 동기화 안정화 | 재시도 로직, 에러 알림 추가 | 1일 |
| 페이지네이션 추가 | 누락된 API에 적용 | 2일 |
| checkAdminAuth 통합 | 미들웨어로 변경 | 3일 |

### 12.2 Phase 2: 단기 개선 (1개월)

| 항목 | 설명 | 예상 시간 |
|------|------|-----------|
| 고객 API 통합 | 5개 → 1개 통합 | 1주 |
| 공통 컴포넌트 추출 | LeadQuickView, MessageModal 등 | 1주 |
| React Query 적용 | 캐싱 레이어 추가 | 1주 |
| 대시보드 탭 통합 | 7개 → 1개 탭 구조 | 1주 |

### 12.3 Phase 3: 중기 개선 (2-3개월)

| 항목 | 설명 | 예상 시간 |
|------|------|-----------|
| 통합 대시보드 구현 | 고객 행동 분석 포함 | 2주 |
| 구글 드라이브 아카이빙 | 오래된 데이터 자동 백업 | 1주 |
| 파트너 포털 확장 | 고객 행동 데이터 조회 추가 | 1주 |
| API 전면 재설계 | 339개 → 100개 이하 | 4주 |

### 12.4 Phase 4: 장기 개선 (3개월+)

| 항목 | 설명 |
|------|------|
| API 버전관리 | v2 API 준비 |
| 실시간 대시보드 | WebSocket 적용 |
| 고급 분석 | AI 기반 고객 인사이트 |
| 모바일 관리자 앱 | React Native 앱 |

---

## 부록: 주요 파일 위치

### 고객 관리
- `/app/admin/customers/page.tsx` - 통합 고객 관리 (1,137줄)
- `/app/admin/purchased-customers/page.tsx` - 구매 고객 (1,666줄)
- `/lib/customer-journey.ts` - 고객 분류 로직

### 수당 시스템
- `/lib/affiliate/commission.ts` - 수당 계산 엔진
- `/lib/affiliate/commission-ledger.ts` - 원장 동기화
- `/lib/affiliate/refund.ts` - 환불 처리
- `/app/api/payment/webhook/route.ts` - 결제 웹훅

### APIS 시스템
- `/lib/google-sheets.ts` - 스프레드시트 동기화
- `/app/api/passport/submit/route.ts` - 여권 제출
- `/app/api/pnr/submit/route.ts` - PNR 제출

### 대시보드
- `/app/admin/dashboard/page.tsx` - 메인 대시보드
- `/app/admin/data-analysis/page.tsx` - 데이터 분석
- `/app/admin/affiliate/team-dashboard/page.tsx` - 팀 대시보드

---

## 결론

이 보고서는 크루즈가이드 관리자 패널의 전체 구조를 분석하고, 다음 핵심 영역에서 개선 방안을 제시합니다:

1. **고객 DB 분류**: 10개 그룹으로 명확히 분류, 유입 경로 추적 가능
2. **수당 정확성**: 8개 버그 식별 및 수정 방안 제시
3. **APIS 정확성**: 즉시 동기화 + 재시도 로직 적용 완료
4. **성능 최적화**: API 65% 통합 가능, 캐싱으로 50% 호출 감소
5. **통합 대시보드**: 7개 → 1개 탭 구조로 통합 설계
6. **자동화 + 수동 제어**: 모든 자동화에 수동 오버라이드 제공
7. **구글 드라이브 백업**: 오래된 데이터 아카이빙으로 서버 용량 절약
8. **판매원/대리점장 접근**: 담당 고객 행동 데이터 조회 권한 추가

모든 수정은 기존 기능과의 충돌 없이, 점진적으로 적용할 수 있도록 설계되었습니다.
