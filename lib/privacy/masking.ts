/**
 * lib/privacy/masking.ts
 * 판매원 대시보드 전용 PII 마스킹 유틸
 * 개인정보보호법 제17조 제3자 제공 최소화 원칙 적용
 */

/** 이름 마스킹: 2자 이하 → null, 3자 → "홍*동", 4자+ → "홍**이" */
export function maskName(name: string | null | undefined): string | null {
  if (!name) return null;
  const t = name.trim();
  if (t.length <= 2) return null; // 식별 위험 — 비공개
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

/** 결제 방법 한국어 표시: pgProvider → "PG결제" / "계좌이체" */
export function formatPaymentMethod(pgProvider: string | null | undefined): string {
  if (!pgProvider) return '결제';
  if (pgProvider === 'bank_transfer' || pgProvider === 'vbank') return '계좌이체';
  if (pgProvider === 'welcomepay') return 'PG결제';
  if (pgProvider === 'payapp') return '페이앱';
  return 'PG결제';
}

/**
 * 판매원 대시보드용 고객 항목
 * - 구매 고객 / 3일 체험 고객만 표시
 * - 실명/전화번호 원본 절대 미포함
 */
export interface SalesDashboardCustomer {
  leadId: number;
  maskedName: string | null;       // "김*히 님" 형태
  customerType: 'PURCHASE' | 'TRIAL_ACTIVE' | 'TRIAL_ENDED';
  productName: string | null;      // 상품명
  cabinType: string | null;        // 룸 타입
  paymentMethod: string | null;    // "PG결제" / "계좌이체"
  hasPassport: boolean;            // 여권 제출 O/X
  purchaseDate: string | null;     // YYYY-MM-DD
  commissionAmount: number;        // 본인 수당
}

export function toSalesDashboardCustomer(data: {
  leadId: number;
  customerName: string | null;
  customerType: 'PURCHASE' | 'TRIAL_ACTIVE' | 'TRIAL_ENDED';
  productName: string | null;
  cabinType: string | null;
  pgProvider: string | null;
  hasPassport: boolean;
  purchaseDate: Date | string | null;
  commissionAmount: number;
}): SalesDashboardCustomer {
  return {
    leadId: data.leadId,
    maskedName: data.customerName ? maskName(data.customerName) : null,
    customerType: data.customerType,
    productName: data.productName,
    cabinType: data.cabinType,
    paymentMethod: formatPaymentMethod(data.pgProvider),
    hasPassport: data.hasPassport,
    purchaseDate: data.purchaseDate
      ? new Date(data.purchaseDate).toISOString().slice(0, 10)
      : null,
    commissionAmount: data.commissionAmount,
  };
}
