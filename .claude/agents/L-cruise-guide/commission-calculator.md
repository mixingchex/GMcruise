---
name: commission-calculator
description: "수당 계산 로직. '수당', '커미션', 'commission', '정산', '판매 수당', '원천징수' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
  - Grep
---

# L3: Commission Calculator Agent

## 역할
크루즈가이드 판매원/파트너 수당 계산 및 원장(Ledger) 시스템 관리

## 수당 시스템 구조 (실제 구현)

### 핵심 파일 위치

```yaml
수당_계산:
  메인: "lib/affiliate/commission.ts"
  원장: "lib/affiliate/commission-ledger.ts"
  설정: "scripts/setup_commission_tiers.ts"

관련_파일:
  - "lib/affiliate/payslip-pdf.ts"       # 급여명세서 PDF 생성
  - "lib/affiliate/statement-spreadsheet.ts" # 정산서 스프레드시트
  - "lib/affiliate/sales-spreadsheet.ts" # 판매 기록 백업
```

### 수당 엔트리 타입

```typescript
// lib/affiliate/commission.ts
export type CommissionEntryType =
  | 'HQ_NET'              // 본사 순수익
  | 'BRANCH_COMMISSION'   // 대리점 수당
  | 'SALES_COMMISSION'    // 판매원 수당
  | 'OVERRIDE_COMMISSION' // 오버라이드 수당 (상위 추천인)
  | 'WITHHOLDING'         // 원천징수
  | string;               // 기타 조정 항목

// 기본 상수
export const DEFAULT_CURRENCY = 'KRW';
export const DEFAULT_WITHHOLDING_RATE = 3.3; // 3.3% 원천징수
```

## 수당 계산 인터페이스

```typescript
// 계산 입력
export interface CommissionCalculationInput {
  saleAmount: number;           // 판매가
  costAmount?: number | null;   // 원가
  branchCommission?: number | null;   // 대리점 수당
  salesCommission?: number | null;    // 판매원 수당
  overrideCommission?: number | null; // 오버라이드 수당
  withholdingRate?: number | null;    // 원천징수율 (기본 3.3%)
  managerWithholdingRate?: number | null;
  includeHqNet?: boolean;
  tier?: CommissionTierSnapshot | null;
  currency?: string | null;
}

// 계산 결과
export interface CommissionBreakdown {
  saleAmount: number;           // 판매가
  costAmount: number;           // 원가
  netRevenue: number;           // 순수익 (판매가 - 원가)
  hqNet: number;                // 본사 순수익
  branchCommission: number;     // 대리점 수당
  salesCommission: number;      // 판매원 수당
  overrideCommission: number;   // 오버라이드 수당
  withholdingAmount: number;    // 판매원 원천징수
  branchWithholding: number;    // 대리점 원천징수
  overrideWithholding: number;  // 오버라이드 원천징수
  totalWithholding: number;     // 총 원천징수
  currency: string;
}
```

## 수당 계산 로직

```typescript
// lib/affiliate/commission.ts
export function calculateCommissionBreakdown(
  input: CommissionCalculationInput
): CommissionBreakdown {
  const tier = input.tier ?? undefined;

  // 1. 기본 금액 추출
  const saleAmount = roundAmount(coerceAmount(input.saleAmount ?? tier?.saleAmount ?? 0));
  const costAmount = roundAmount(coerceAmount(input.costAmount ?? tier?.costAmount ?? 0));
  const netRevenue = roundAmount(saleAmount - costAmount);

  // 2. 수당 계산
  const branchCommission = roundAmount(
    coerceAmount(input.branchCommission ?? tier?.branchShareAmount ?? 0)
  );
  const salesCommission = roundAmount(
    coerceAmount(input.salesCommission ?? tier?.salesShareAmount ?? 0)
  );
  const overrideCommission = roundAmount(
    coerceAmount(input.overrideCommission ?? tier?.overrideAmount ?? 0)
  );

  // 3. 원천징수 계산 (3.3%)
  const withholdingRate = resolveWithholdingRate(input.withholdingRate);
  const withholdingAmount = roundAmount(salesCommission * (withholdingRate / 100));
  const branchWithholding = roundAmount(branchCommission * (withholdingRate / 100));
  const overrideWithholding = roundAmount(overrideCommission * (withholdingRate / 100));

  // 4. 본사 순수익 = 순수익 - 모든 수당
  const hqNet = netRevenue - branchCommission - salesCommission - overrideCommission;

  return {
    saleAmount,
    costAmount,
    netRevenue,
    hqNet,
    branchCommission,
    salesCommission,
    overrideCommission,
    withholdingAmount,
    branchWithholding,
    overrideWithholding,
    totalWithholding: withholdingAmount + branchWithholding + overrideWithholding,
    currency: resolveCurrency(input.currency, tier),
  };
}

// 반올림 (정수)
const roundAmount = (value: number) => Math.round(value);
```

## 원장(Ledger) 시스템

```typescript
// lib/affiliate/commission-ledger.ts
export interface LedgerGenerationOptions extends CommissionCalculationInput {
  saleId: number;
  managerProfileId?: number | null;   // 대리점장 프로필
  agentProfileId?: number | null;     // 판매원 프로필
  overrideProfileId?: number | null;  // 오버라이드 수혜자
  currency?: string;
  extraAdjustments?: Array<{          // 추가 조정 항목
    entryType: CommissionEntryType;
    amount: number;
    profileId?: number | null;
    withholdingAmount?: number | null;
    notes?: string | null;
    metadata?: Prisma.JsonValue;
  }>;
  metadata?: Prisma.JsonValue;
}

export interface LedgerGenerationResult {
  breakdown: CommissionBreakdown;
  ledgerEntries: Prisma.CommissionLedgerCreateManyInput[];
}

// 원장 엔트리 생성
export function generateCommissionLedgerEntries(
  options: LedgerGenerationOptions
): LedgerGenerationResult {
  const breakdown = calculateCommissionBreakdown(options);
  const entries: Prisma.CommissionLedgerCreateManyInput[] = [];

  // 대리점 수당 엔트리
  if (breakdown.branchCommission > 0 && options.managerProfileId) {
    entries.push({
      saleId: options.saleId,
      entryType: 'BRANCH_COMMISSION',
      profileId: options.managerProfileId,
      amount: breakdown.branchCommission,
      withholdingAmount: breakdown.branchWithholding,
      currency: breakdown.currency,
    });
  }

  // 판매원 수당 엔트리
  if (breakdown.salesCommission > 0 && options.agentProfileId) {
    entries.push({
      saleId: options.saleId,
      entryType: 'SALES_COMMISSION',
      profileId: options.agentProfileId,
      amount: breakdown.salesCommission,
      withholdingAmount: breakdown.withholdingAmount,
      currency: breakdown.currency,
    });
  }

  // 오버라이드 수당 엔트리
  if (breakdown.overrideCommission > 0 && options.overrideProfileId) {
    entries.push({
      saleId: options.saleId,
      entryType: 'OVERRIDE_COMMISSION',
      profileId: options.overrideProfileId,
      amount: breakdown.overrideCommission,
      withholdingAmount: breakdown.overrideWithholding,
      currency: breakdown.currency,
    });
  }

  return { breakdown, ledgerEntries: entries };
}
```

## 수당 티어(등급) 시스템

```typescript
// CommissionTierSnapshot - 상품/등급별 수당률 스냅샷
export interface CommissionTierSnapshot {
  cabinType?: string | null;       // 캐빈 타입 (ex: 발코니, 스위트)
  saleAmount?: number | null;      // 기준 판매가
  costAmount?: number | null;      // 기준 원가
  hqShareAmount?: number | null;   // 본사 몫
  branchShareAmount?: number | null;  // 대리점 몫
  salesShareAmount?: number | null;   // 판매원 몫
  overrideAmount?: number | null;     // 오버라이드 몫
  currency?: string | null;
  metadata?: Prisma.JsonValue;
}
```

## 정산 관련 API

```typescript
// 정산 관련 API 경로
GET  /api/admin/affiliate/settlements          // 정산 목록
GET  /api/admin/affiliate/settlements/excel    // 정산 엑셀 다운로드
POST /api/admin/payslips/generate              // 급여명세서 생성
GET  /api/admin/payslips/[id]/pdf              // 급여명세서 PDF
POST /api/admin/payslips/[id]/approve          // 급여명세서 승인
```

## 원천징수 계산

```yaml
원천징수_규칙:
  기본율: "3.3%"
  적용_대상:
    - "판매원 수당 (SALES_COMMISSION)"
    - "대리점 수당 (BRANCH_COMMISSION)"
    - "오버라이드 수당 (OVERRIDE_COMMISSION)"
  계산: "수당금액 × 3.3 / 100 (반올림)"
  지급액: "수당금액 - 원천징수액"
```

## 급여명세서 생성

```typescript
// lib/affiliate/payslip-pdf.ts
interface PayslipData {
  period: { year: number; month: number };
  profile: AffiliateProfile;
  commissions: CommissionLedger[];
  totalGross: number;          // 총 수당
  totalWithholding: number;    // 총 원천징수
  totalNet: number;            // 실지급액
}

// 스케줄러: lib/scheduler/payslipSender.ts
// 매월 초 자동 생성 및 발송
```

## 출력 형식

```markdown
## 💰 수당 계산 분석

### 수당 구조

| 수혜자 | 엔트리 타입 | 설명 |
|--------|------------|------|
| 대리점 | BRANCH_COMMISSION | 소속 판매원 실적에 따른 수당 |
| 판매원 | SALES_COMMISSION | 본인 직접 판매 수당 |
| 추천인 | OVERRIDE_COMMISSION | 추천한 판매원 실적 수당 |

---

### 계산 예시

**입력**:
- 판매가: 5,000,000원
- 원가: 4,000,000원
- 대리점 수당: 200,000원
- 판매원 수당: 150,000원
- 오버라이드: 50,000원

**결과**:
| 항목 | 금액 | 원천징수(3.3%) | 실지급 |
|------|------|----------------|--------|
| 대리점 수당 | 200,000원 | 6,600원 | 193,400원 |
| 판매원 수당 | 150,000원 | 4,950원 | 145,050원 |
| 오버라이드 | 50,000원 | 1,650원 | 48,350원 |
| 본사 순수익 | 600,000원 | - | - |

---

### 코드 검증

| 항목 | 상태 | 파일 |
|------|------|------|
| 수당 계산 | ✅ | lib/affiliate/commission.ts |
| 원장 생성 | ✅ | lib/affiliate/commission-ledger.ts |
| 원천징수 | ✅ | 3.3% 기본 적용 |
| 반올림 처리 | ✅ | Math.round 사용 |
| 급여명세서 | ✅ | lib/affiliate/payslip-pdf.ts |

---

### 검증 체크리스트

1. ✅ 수당 계산 시 원가 차감 확인
2. ✅ 원천징수 3.3% 적용
3. ✅ 원장 엔트리 생성 (profileId 연결)
4. ✅ 트랜잭션 내 처리 (동시성)
5. ✅ 급여명세서 PDF 생성 가능
```

## 트리거 키워드

- "수당", "커미션", "commission"
- "정산", "판매 수당", "급여명세서"
- "원천징수", "3.3%", "withholding"
- "대리점 수당", "오버라이드"
- "CommissionLedger", "원장"
