# 작업지시서: 경량 어필리에이트 시스템 + 전체 구매여정 버그 수정
> 작성일: 2026-03-07
> 작성 근거: 6개 전문 서브에이전트 병렬 심층 분석 (구조/법적/보안/버그/UX/리서치)
> 우선순위: P0(즉시) → P1(이번 주) → P2(다음 주) → P3(2~4주)

---

## 배경 및 목표

### 현재 상태 진단
- 어필리에이트 시스템 복잡도: **9/10** (관련 모델 25개+, API 엔드포인트 180개+, lib 파일 25개)
- 개인몰 기능(랜딩페이지/테마/갤러리/유튜브/댓글)이 단순 추적 목적을 훨씬 초과
- **Critical 보안 취약점 3건** (비밀번호 응답 노출, IDOR, 인증 우회)
- **개인정보보호법 위반 가능성** (판매원에게 고객 실명+전화번호 원본 노출)
- 전체 구매여정 시뮬레이션에서 3가지 버그 발견

### 목표
1. Critical 보안 취약점 즉시 수정
2. 구매여정 시뮬레이션 버그 수정
3. 어필리에이트를 **가벼운 추적 시스템**으로 재설계
4. 대리점장↔판매원 계층 구조 명확화
5. 판매원 대시보드: 개인정보보호법 준수 + 모바일 UX 개선

---

## PHASE 0: 즉시 수정 (오늘, 1시간)

### 0-1. [P0-Critical] 비밀번호 해시 API 응답 + HTML 렌더링 노출

**발견 에이전트**: 보안(C-2) + UX(문제 3) 독립 확인
**심각도**: Critical — bcrypt 해시가 API JSON과 HTML DOM에 노출

**수정 파일 1**: `app/api/partner/agents/route.ts`
```typescript
// 제거할 코드 (라인 55):
User: {
  select: {
    ...
    password: true,  // ← 삭제
  },
},

// 제거할 코드 (라인 194):
user: {
  ...
  password: base.User?.password ?? null,  // ← 삭제
},
```

**수정 파일 2**: `app/partner/[partnerId]/team/PartnerTeamClient.tsx`
```typescript
// 제거할 코드 (라인 597~601):
{agent.user.password && (
  <span className="text-xs font-mono font-semibold text-purple-700">
    비밀번호: {agent.user.password}
  </span>
)}
// ← 전체 블록 삭제
```

---

### 0-2. [P0-Critical] 개발환경 인증 우회 헤더 삭제

**발견 에이전트**: 보안(C-3)
**심각도**: Critical — NODE_ENV 오설정 시 프로덕션에서 임의 사용자 전환 가능

**수정 파일**: `app/api/partner/messages/route.ts`
```typescript
// 제거할 코드 (라인 13~35):
if (process.env.NODE_ENV === 'development') {
    const testUserId = headersList.get('X-Test-User-Id');
    if (testUserId) {
        // 임의 userId로 인증 우회 ...
    }
}
// ← 전체 블록 삭제
```

---

### 0-3. [P0-Critical] 결제 정보 IDOR 취약점

**발견 에이전트**: 보안(C-1)
**파일**: `app/api/partner/customers/[leadId]/payments/route.ts`
**문제**: leadId 소유권 검증 없이 Payment 조회 → 타인 결제 정보 열람 가능

```typescript
// 수정 전 (현재):
const payments = await prisma.payment.findMany({
  where: { status: 'paid', OR: [{ userId: leadId }] },
  select: { buyerName: true, buyerTel: true, ... }
});

// 수정 후:
// 1. 소유권 검증 먼저
const lead = await prisma.affiliateLead.findFirst({
  where: {
    id: leadId,
    OR: [
      { managerId: profile.id },
      { agentId: profile.id },
    ],
  },
  select: { id: true },
});
if (!lead) return NextResponse.json({ ok: false, error: '접근 권한이 없습니다.' }, { status: 403 });

// 2. 이후 Payment 조회 (buyerTel, buyerEmail 제거)
const payments = await prisma.payment.findMany({
  where: { /* affiliateCode 또는 affiliateMallUserId 기반 조회 */ },
  select: {
    amount: true,
    status: true,
    paidAt: true,
    productCode: true,
    // buyerName, buyerTel, buyerEmail 제거
  },
});
```

---

## PHASE 1: 이번 주 수정 (구매여정 버그 + 법적 준수)

### 1-1. [P0] INTERNAL_WEBHOOK_SECRET 환경변수 + 결제 체인 보강

**발견 에이전트**: 버그분석(Bug2)
**문제**: `INTERNAL_WEBHOOK_SECRET` 미설정 시 webhook 인증 실패 → Payment completed 상태이지만 AffiliateSale/Reservation 미생성 ("고아 결제")

**즉시 조치**: Vercel 환경변수 확인
```bash
# 없으면 반드시 추가:
INTERNAL_WEBHOOK_SECRET=<node -e "require('crypto').randomBytes(32).toString('hex')">
```

**코드 수정**: `app/api/payment/return/route.ts`
```typescript
// 현재: webhook 실패를 error 로그만 남기고 무시
} catch (webhookError) {
  logger.error('[Payment Return] webhook 호출 실패', { ... });
}

// 수정: 실패 시 Payment.metadata에 재시도 플래그 기록
} catch (webhookError) {
  logger.error('[Payment Return] webhook 호출 실패 — 재시도 필요', { orderId });
  // 결제는 completed이지만 후처리 실패 표시
  await prisma.payment.update({
    where: { orderId },
    data: {
      metadata: {
        ...existingMetadata,
        webhookFailed: true,
        webhookFailedAt: new Date().toISOString(),
      },
    },
  }).catch(() => {});
}
```

**신규 API**: `app/api/admin/payments/retry-webhook/route.ts`
`webhookFailed: true` 인 Payment를 조회하여 webhook 재처리하는 어드민 전용 API

---

### 1-2. [P1] cabinType 영문/한글 불일치 정규화

**발견 에이전트**: 버그분석(Bug1)
**문제**: MallProductContent.layout.pricing의 cabinType이 영문(INSIDE/BALCONY)이면 결제 웹훅에서 CommissionTier 조회 실패 → 수당 0원 처리

**수정 1**: `app/api/payment/webhook/route.ts`
```typescript
// 결제 완료 후 cabinType 정규화 함수 추가
const CABIN_TYPE_MAP: Record<string, string> = {
  'INSIDE': '인사이드',
  'OCEANVIEW': '오션뷰',
  'BALCONY': '발코니',
  'SUITE': '스위트',
  'inside': '인사이드',
  'oceanview': '오션뷰',
  'balcony': '발코니',
  'suite': '스위트',
};

function normalizeCabinType(raw: string | undefined): string | null {
  if (!raw) return null;
  return CABIN_TYPE_MAP[raw] ?? raw; // 매핑 없으면 원본 유지
}

// webhook 라인 255 근처:
const determinedCabinType = normalizeCabinType(roomSelections[0]?.roomType);
```

**수정 2**: `app/api/partner/reservation/create/route.ts`
```typescript
// pnrStatus와 동일한 패턴으로 cabinType 화이트리스트 추가
const VALID_CABIN_TYPES = ['발코니', '오션뷰', '인사이드', '스위트',
  '발코니 (싱글차지)', '오션뷰 (싱글차지)', '인사이드 (싱글차지)', '스위트 (싱글차지)', '기타'];
const validatedCabinType = cabinType
  ? (VALID_CABIN_TYPES.includes(cabinType) ? cabinType : normalizeCabinType(cabinType) ?? cabinType)
  : null;
```

**DB 마이그레이션**: 기존 영문 cabinType 정규화
```sql
UPDATE "Reservation" SET "cabinType" = '인사이드' WHERE "cabinType" = 'INSIDE';
UPDATE "Reservation" SET "cabinType" = '발코니' WHERE "cabinType" = 'BALCONY';
UPDATE "Reservation" SET "cabinType" = '오션뷰' WHERE "cabinType" = 'OCEANVIEW';
UPDATE "Reservation" SET "cabinType" = '스위트' WHERE "cabinType" = 'SUITE';
UPDATE "AffiliateSale" SET "cabinType" = '인사이드' WHERE "cabinType" = 'INSIDE';
UPDATE "AffiliateSale" SET "cabinType" = '발코니' WHERE "cabinType" = 'BALCONY';
UPDATE "AffiliateSale" SET "cabinType" = '오션뷰' WHERE "cabinType" = 'OCEANVIEW';
UPDATE "AffiliateSale" SET "cabinType" = '스위트' WHERE "cabinType" = 'SUITE';
```

---

### 1-3. [P1] 이메일 발송 패턴 통일 (SystemConfig 우선)

**발견 에이전트**: 버그분석(Bug3)
**파일**: `app/api/contracts/[token]/sign/route.ts`

```typescript
// 수정 전 (라인 216):
const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_SMTP_USER;

// 수정 후: 다른 이메일 발송과 동일한 3단계 fallback 패턴
const systemConfig = await prisma.systemConfig.findFirst({
  where: { key: 'admin_email' },
  select: { value: true },
}).catch(() => null);
const adminEmail = systemConfig?.value
  || process.env.ADMIN_EMAIL
  || process.env.EMAIL_SMTP_USER;
if (!adminEmail) {
  logger.warn('[ContractSign] 관리자 이메일 미설정 — ADMIN_EMAIL 환경변수를 추가하세요');
}
```

---

### 1-4. [P1-법적] 개인정보보호법 준수 — 마스킹 유틸 + API 수정

**발견 에이전트**: 법적준수
**위험**: `app/api/affiliate/customers/search/route.ts`에서 판매원에게 실명+전화번호 원본 반환 → 개인정보보호법 제17조 제3자 제공 위반 가능

**신규 파일**: `lib/privacy/masking.ts`
```typescript
// 판매원 대시보드 전용 — 개인정보보호법 제3자 제공 최소화 원칙

/** 이름 마스킹: 2자 이하 → null, 3자 → "홍*동", 4자+ → "홍**이" */
export function maskName(name: string | null | undefined): string | null {
  if (!name) return null;
  const t = name.trim();
  if (t.length <= 2) return null;
  if (t.length === 3) return t[0] + '*' + t[2];
  return t[0] + '*'.repeat(t.length - 2) + t[t.length - 1];
}

/** 전화번호 마스킹: "010-****-1234" */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-****-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 2)}-****-${d.slice(6)}`;
  return null;
}

/** 이메일 마스킹: "u***@gmail.com" */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return null;
  const masked = local.length <= 1 ? '*' : local[0] + '*'.repeat(Math.min(local.length - 1, 3));
  return `${masked}@${domain}`;
}

/** 판매원 대시보드용 리드 변환 — PII 최소화 */
export function toSalesDashboardLead(lead: {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail?: string | null;
  status: string;
  createdAt: Date;
  eventType?: string;
}) {
  return {
    leadId: lead.id,
    maskedName: maskName(lead.customerName),
    maskedPhone: maskPhone(lead.customerPhone),
    status: lead.status,
    eventType: lead.eventType ?? null,
    registeredAt: lead.createdAt.toISOString().slice(0, 10),
    // 절대 미포함: customerName, customerPhone, customerEmail 원본
  };
}
```

**수정 파일**: `app/api/affiliate/customers/search/route.ts`
응답에서 `name`, `phone`, `email` 원본 제거 → `maskName()`, `maskPhone()` 적용

**수정 파일**: `app/api/affiliate/customers/create-test/route.ts` 라인 206
응답 메시지에서 `customerName`, `normalizedPhone` 평문 제거

---

### 1-5. [P1] 보안 취약점 High 항목 수정

**H-5: status:'ACTIVE' 누락 API 일괄 수정**
대상: `customer-groups`, `funnel-messages`, `messages`, `landing-pages`, `search`에서 직접 `affiliateProfile.findFirst` 호출하는 코드
```typescript
// 현재:
const affiliateProfile = await prisma.affiliateProfile.findFirst({
  where: { userId: user.id },
});

// 수정:
const affiliateProfile = await prisma.affiliateProfile.findFirst({
  where: { userId: user.id, status: 'ACTIVE' },
});
```

**H-2: TOCTOU — customer update 원자적 처리**
`app/api/partner/customers/[leadId]/route.ts` 라인 176
```typescript
// 현재: findFirst 후 별도 update
await prisma.affiliateLead.update({ where: { id: leadId }, data });

// 수정: updateMany로 소유권 조건 포함
const updated = await prisma.affiliateLead.updateMany({
  where: {
    id: leadId,
    OR: [{ managerId: profile.id }, { agentId: profile.id }],
  },
  data,
});
if (updated.count === 0) return NextResponse.json({ ok: false, error: '수정 권한 없음' }, { status: 403 });
```

---

## PHASE 2: 경량 어필리에이트 시스템 재설계 (다음 주)

### 2-1. 설계 철학

**제거**: 개인 몰 시스템 (랜딩페이지, 테마, 갤러리, 댓글, SNS 프로필 편집)
**제거**: 내장 CRM/마케팅 (FunnelMessage, 드립 캠페인, 고객 그룹 중복)
**제거**: 이중 원장 (AffiliateLedger 삭제, CommissionLedger 단일화)
**제거**: 과도한 정산 파이프라인 (PayslipPDF, 스프레드시트 자동생성 → CSV export로 대체)
**보존**: 핵심 7단계 추적 체인

```
AffiliateLink (고유 코드)
  → AffiliateLinkEvent (클릭 로그)
  → AffiliateLead (고객 귀속: agentId/managerId)
  → AffiliateSale (판매 기록 + 수당)
  → CommissionLedger (분개: HQ/BRANCH/SALES/원천징수)
  → MonthlySettlement (월 정산)
  → Payment.saleId (결제 연동)
```

### 2-2. 새 AffiliateProfile 스키마 (슬림화)

**제거 대상 컬럼** (AffiliateProfile에서):
```
landingSlug, landingTheme, landingAnnouncement, welcomeMessage,
galleryImages, featuredImages, youtubeVideoUrl, littlyLinkSlug,
instagramHandle, youtubeChannel, threadLink, blogLink,
customLinks, externalLinks, coverImage
```
→ 총 15개 컬럼 제거 (개인몰 관련)

**보존 컬럼**:
```
userId, affiliateCode, type (SALES_AGENT/BRANCH_MANAGER/HQ),
status (ACTIVE/INACTIVE/SUSPENDED), displayName,
withholdingRate, bankName, bankAccount, bankAccountHolder,
contractStartDate, contractEndDate
```

### 2-3. 계층 구조 명확화

```
HQ (본사)
  └── BRANCH_MANAGER (대리점장) [1:N]
        └── SALES_AGENT (판매원) [1:N]
```

**AffiliateRelation 활용**:
```typescript
// 대리점장이 판매원 조회
const myAgents = await prisma.affiliateRelation.findMany({
  where: { managerId: branchProfile.id },
  include: { Agent: true },
});

// 판매원 실적 집계
const teamSales = await prisma.affiliateSale.groupBy({
  by: ['agentId'],
  where: {
    agentId: { in: myAgents.map(r => r.agentId) },
    status: 'CONFIRMED',
  },
  _sum: { salesCommission: true },
});
```

### 2-4. 제거/아카이브 대상 테이블

| 테이블 | 조치 | 이유 |
|--------|------|------|
| `AffiliateLedger` | 삭제 | CommissionLedger와 완전 중복 |
| `LandingPage` (파트너 소유) | 아카이브 | 개인몰 기능 — 불필요 |
| `SharedLandingPage` | 아카이브 | 개인몰 기능 |
| `LandingPageComment` | 삭제 | isAutoGenerated=true 가짜 댓글 |
| `LandingPageFunnel` | 삭제 | GA4로 대체 |
| `LandingPageView` | 삭제 | GA4로 대체 |
| `LandingPageRegistration` | 아카이브 | 별도 마이그레이션 |
| `FunnelMessage` + 자식 3개 | 아카이브 | 외부 마케팅 툴로 위임 |
| `PartnerCustomerGroup` | 통합 | CustomerGroup으로 통합 |
| `AffiliateSmsConfig` | 통합 | PartnerSmsConfig와 통합 |
| `AffiliateEmailConfig` | 통합 | PartnerEmailConfig와 통합 |
| `AffiliatePayslip` | 단순화 | CSV export로 대체 |

### 2-5. 자동 링크 생성기 제거

**현재 문제**: `lib/affiliate/auto-link-generator.ts` — 상품 등록 시 모든 파트너에게 자동으로 AffiliateLink 생성 → 파트너 수 × 상품 수만큼 폭증

**변경**: 판매원이 직접 링크 생성 (on-demand)
```
판매원 대시보드 → [이 상품 링크 만들기] 버튼 → POST /api/partner/links
```
파트너 수가 늘어도 실제 사용하는 링크만 생성됨.

### 2-6. 제거 대상 lib/affiliate 파일

```
lib/affiliate/auto-setup.ts          ← 자동 몰 생성
lib/affiliate/payslip-pdf.ts         ← PDF 급여명세서
lib/affiliate/statement-spreadsheet.ts
lib/affiliate/sales-spreadsheet.ts
lib/affiliate/excel-backup.ts
lib/affiliate/document-drive-sync.ts
lib/affiliate/contract-sections.ts   ← 어드민이 직접 관리로 전환
lib/affiliate/education-contract-sections.ts
```

---

## PHASE 3: 판매원/대리점장 대시보드 UI 재설계 (2~4주)

### 3-1. 역할별 컴포넌트 분리

**현재 문제**: `PartnerDashboard.tsx` — useState 60개+, 역할 구분 없이 모든 API 호출

**새 구조**:
```
app/partner/[partnerId]/dashboard/
  ├── page.tsx                    (역할 감지 후 라우팅)
  ├── SalesAgentDashboard.tsx     (판매원 전용)
  ├── BranchManagerDashboard.tsx  (대리점장 전용)
  └── components/
      ├── KpiCard.tsx
      ├── LinkCopyCard.tsx        ← 판매원 핵심 CTA
      ├── ConversionFeed.tsx      ← 마스킹된 전환 피드
      └── TeamPerformance.tsx     ← 대리점장 팀 현황
```

### 3-2. 판매원(SALES_AGENT) 모바일 최우선 UI

**핵심 CTA 복원**: `PartnerDashboard.tsx` 라인 1923
```tsx
// 현재 (잘못됨):
{!isBranchManager && !isSalesAgent && (
  <section>나의 개인 링크...</section>
)}

// 수정: 판매원에게도 링크 섹션 표시
{!isBranchManager && (
  <section>나의 개인 링크...</section>
)}
```

**대시보드 우선순위** (위→아래):
1. 내 링크 복사 카드 (최상단 고정)
2. 월별 KPI 4칸 그리드 (전환건수 / 예상수당 / 전체리드 / 누적정산)
3. 최근 전환 피드 (마스킹된 고객 목록)
4. 빠른 메뉴 (고객관리 / 판매내역 / 지급서)

**하단 탭 바** (판매원):
```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t pb-safe">
  <div className="flex">
    <TabItem href="." label="홈" icon={<Home />} />
    <TabItem href="./links" label="링크" icon={<Link />} />
    <TabItem href="./customers" label="고객" icon={<Users />} />
    <TabItem href="./sales" label="판매" icon={<TrendingUp />} />
    <TabItem href="./more" label="더보기" icon={<Menu />} />
  </div>
</nav>
```

### 3-3. 대리점장(BRANCH_MANAGER) 팀 현황 UI

**팀원별 실적 카드** (모바일 아코디언):
```tsx
// SalesClient.tsx — 테이블 → 카드 패턴
<div className="space-y-2">
  {agents.map(agent => (
    <AgentPerformanceCard
      key={agent.id}
      name={agent.displayName}
      conversions={agent.monthlyConversions}
      commission={agent.monthlyCommission}
      isActive={agent.monthlyConversions > 0}
    />
  ))}
</div>
```

### 3-4. 판매 목록 모바일 카드 전환

**현재**: 6컬럼 테이블 (모바일 가로 스크롤)
**수정**: `SalesClient.tsx`
```tsx
{/* 모바일: 카드 리스트 */}
<div className="sm:hidden space-y-3">
  {sales.map(sale => (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between">
        <span className="text-sm text-gray-500">{sale.saleDate}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{sale.status}</span>
      </div>
      <p className="font-medium mt-1">{sale.productName}</p>
      <div className="flex justify-between mt-2">
        <span className="text-sm text-gray-500">{sale.cabinType} · {sale.people}명</span>
        <span className="font-bold text-blue-600">{sale.commission.toLocaleString()}원</span>
      </div>
    </div>
  ))}
</div>

{/* PC: 기존 테이블 */}
<div className="hidden sm:block overflow-x-auto">
  <table>...</table>
</div>
```

### 3-5. 스켈레톤 로딩 추가

```tsx
// KPI 로딩 상태
{isLoading ? (
  <div className="grid grid-cols-2 gap-3">
    {[1,2,3,4].map(i => (
      <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />
    ))}
  </div>
) : (
  <KpiGrid data={kpiData} />
)}
```

---

## PHASE 4: 개인정보 처리방침 업데이트 (법적 필수)

### 4-1. 처리방침 추가 항목

**수정 파일**: `app/privacy/page.tsx` 또는 해당 MDX/CMS 콘텐츠

추가 내용:
```
■ 개인정보 제3자 제공 현황
  - 제공받는 자: 크루즈닷 어필리에이트 파트너 (판매원/대리점장)
  - 제공 목적: 판매 성과 확인 및 수당 정산
  - 제공 항목: 서비스 가입 여부, 상품 구매 여부, 구매 날짜
    ※ 성명, 연락처, 여권번호는 파트너에게 제공하지 않습니다
  - 보유 기간: 파트너 계약 종료 후 5년

■ 어필리에이트 링크를 통한 가입 안내
  - 특정 링크를 통해 가입하는 경우, 해당 링크를 발행한 파트너에게
    위 항목의 정보가 제공됩니다.
  - 이에 동의하지 않는 경우 직접 접속(cruisedot.co.kr)으로 가입하십시오.
```

### 4-2. 링크 유입 가입 시 안내 문구

**수정 파일**: `app/login/page.tsx` 또는 회원가입 페이지
```tsx
{referralCode && (
  <p className="text-xs text-gray-500 mt-2 p-3 bg-gray-50 rounded-lg">
    파트너 추천 링크를 통해 가입하시는 경우, 해당 파트너에게 구매 여부 정보가 공유됩니다.
  </p>
)}
```

---

## 환경변수 점검 체크리스트

| 변수명 | 필수 여부 | 현재 설정 | 조치 |
|--------|----------|-----------|------|
| `INTERNAL_WEBHOOK_SECRET` | P0 필수 | 확인 필요 | 없으면 즉시 추가 |
| `ADMIN_EMAIL` | P1 필수 | 확인 필요 | 없으면 추가 |
| `EMAIL_SMTP_HOST` | P1 | 확인 필요 | |
| `EMAIL_SMTP_PORT` | P1 | 확인 필요 | |
| `EMAIL_SMTP_USER` | P1 | 확인 필요 | |
| `EMAIL_SMTP_PASSWORD` | P1 | 확인 필요 | |

---

## 파일 수정 영향도 요약

### Phase 0 (즉시, 오늘)
| 파일 | 수정 내용 |
|------|----------|
| `app/api/partner/agents/route.ts` | password select/응답 제거 |
| `app/partner/[partnerId]/team/PartnerTeamClient.tsx` | password 렌더링 코드 삭제 |
| `app/api/partner/messages/route.ts` | X-Test-User-Id 블록 삭제 |
| `app/api/partner/customers/[leadId]/payments/route.ts` | 소유권 검증 + PII 필드 제거 |

### Phase 1 (이번 주)
| 파일 | 수정 내용 |
|------|----------|
| `app/api/payment/return/route.ts` | webhook 실패 시 metadata 기록 |
| `app/api/payment/webhook/route.ts` | normalizeCabinType 추가 |
| `app/api/partner/reservation/create/route.ts` | cabinType 화이트리스트 |
| `app/api/contracts/[token]/sign/route.ts` | SystemConfig 3단계 email fallback |
| `app/api/affiliate/customers/search/route.ts` | 마스킹 적용 |
| `app/api/affiliate/customers/create-test/route.ts` | PII 응답 제거 |
| `lib/privacy/masking.ts` | 신규 생성 |
| 다수 partner API | status:'ACTIVE' 조건 추가 |
| DB migration | cabinType 한글 정규화 SQL |

### Phase 2~3 (2~4주, 설계 후 진행)
어필리에이트 경량화 재설계는 **별도 브랜치**에서 진행하고, 스키마 변경 전 데이터 백업 필수.

---

## 검증 기준 (완료 조건)

- [ ] `/api/partner/agents` 응답 JSON에 `password` 필드 없음
- [ ] `PartnerTeamClient.tsx`에 비밀번호 텍스트 렌더링 없음
- [ ] 판매원이 자신의 리드가 아닌 Payment 조회 시 403 반환
- [ ] `messages` API에서 X-Test-User-Id 헤더 동작 안 함
- [ ] INTERNAL_WEBHOOK_SECRET 설정 후 결제 완료 시 AffiliateSale+Reservation 정상 생성
- [ ] 영문 cabinType(INSIDE 등) 입력 시 자동으로 한글로 변환되어 저장
- [ ] 판매원 대시보드에서 고객 실명/전화번호 원본 표시 없음 (마스킹만)
- [ ] 판매원 대시보드 최상단에 링크 복사 CTA 표시
- [ ] 모바일(390px)에서 판매 목록 가로 스크롤 없음

---

*이 작업지시서는 6개 전문 에이전트(어필리에이트 구조분석/한국법적준수/보안취약점/버그심층분석/UI-UX/경량패턴리서치)의 병렬 분석 결과를 종합하여 작성되었습니다.*
