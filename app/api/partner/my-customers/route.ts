export const dynamic = 'force-dynamic';

/**
 * GET /api/partner/my-customers
 * 판매원 전용 고객 목록 API
 *
 * 표시 범위: 구매 고객 + 3일 체험 고객만
 * 개인정보보호법 준수: 실명/전화번호 원본 미포함, 마스킹 처리
 *
 * [수정] AffiliateLead에 User 관계 없음 → 경로 교정
 *   - 여권 확인: AffiliateSale → Reservation → Traveler
 *   - testModeStartedAt: customerPhone → User 배치 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext } from '@/lib/partner-auth';
import { logger } from '@/lib/logger';
import { maskName, formatPaymentMethod, type SalesDashboardCustomer } from '@/lib/privacy/masking';

const TRIAL_HOURS = 72;

export async function GET(req: NextRequest) {
  try {
    const { profile } = await requirePartnerContext();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // 판매원/대리점장 조건 분기
    const agentCondition =
      profile.type === 'BRANCH_MANAGER'
        ? { OR: [{ agentId: profile.id }, { managerId: profile.id }] }
        : { agentId: profile.id };

    // ── 구매 고객 ────────────────────────────────────────────────────────────
    // 여권 확인: AffiliateSale → Reservation → Traveler (passportNo not null)
    const [purchaseLeads, purchaseTotal] = await Promise.all([
      prisma.affiliateLead.findMany({
        where: {
          ...agentCondition,
          AffiliateSale: { some: { status: { in: ['CONFIRMED', 'PENDING'] } } },
        },
        select: {
          id: true,
          customerName: true,
          AffiliateSale: {
            where: { status: { in: ['CONFIRMED', 'PENDING'] } },
            orderBy: { saleDate: 'desc' },
            take: 1,
            select: {
              saleDate: true,
              cabinType: true,
              salesCommission: true,
              overrideCommission: true,
              Payment: {
                select: {
                  productName: true,
                  pgProvider: true,
                  paidAt: true,
                },
              },
              // 여권 확인 경로: AffiliateSale → Reservation → Traveler
              Reservation: {
                where: { status: { not: 'CANCELLED' } },
                take: 1,
                select: {
                  Traveler: {
                    where: { passportNo: { not: null } },
                    take: 1,
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.affiliateLead.count({
        where: {
          ...agentCondition,
          AffiliateSale: { some: { status: { in: ['CONFIRMED', 'PENDING'] } } },
        },
      }),
    ]);

    // ── 3일 체험 고객 ─────────────────────────────────────────────────────────
    // WO-REM-06: trialTotal 정확도 개선
    // Step 1: 해당 에이전트의 미구매 리드 전체 phone 조회 (페이지네이션 없이)
    const allTrialPhoneRows = await prisma.affiliateLead.findMany({
      where: {
        ...agentCondition,
        AffiliateSale: { none: {} },
        customerPhone: { not: null },
      },
      select: { customerPhone: true },
    });
    const allTrialPhones = [
      ...new Set(
        allTrialPhoneRows.map((l) => l.customerPhone).filter(Boolean) as string[]
      ),
    ];

    // Step 2: 해당 phone들 중 testModeStartedAt이 있는 User만 조회 (IN 쿼리 최대 1000개)
    const limitedTrialPhones = allTrialPhones.slice(0, 1000);
    const trialUsersAll =
      limitedTrialPhones.length > 0
        ? await prisma.user.findMany({
            where: { phone: { in: limitedTrialPhones }, testModeStartedAt: { not: null } },
            select: { phone: true, testModeStartedAt: true },
          })
        : [];

    // phone/testModeStartedAt 모두 non-null인 경우만 Map에 포함
    const trialUserByPhone = new Map<string, Date>(
      trialUsersAll
        .filter((u): u is { phone: string; testModeStartedAt: Date } =>
          u.phone !== null && u.testModeStartedAt !== null
        )
        .map((u): [string, Date] => [u.phone, u.testModeStartedAt])
    );

    // ── 구매 고객 변환 ─────────────────────────────────────────────────────────
    const now = new Date();

    const purchaseCustomers: SalesDashboardCustomer[] = purchaseLeads.map((lead) => {
      const sale = lead.AffiliateSale[0];
      const hasPassport = (sale?.Reservation?.[0]?.Traveler?.length ?? 0) > 0;
      return {
        leadId: lead.id,
        maskedName: maskName(lead.customerName) ?? '고객',
        customerType: 'PURCHASE' as const,
        productName: sale?.Payment?.productName ?? null,
        cabinType: sale?.cabinType ?? null,
        paymentMethod: formatPaymentMethod(sale?.Payment?.pgProvider ?? null),
        hasPassport,
        purchaseDate: sale?.Payment?.paidAt
          ? new Date(sale.Payment.paidAt).toISOString().slice(0, 10)
          : sale?.saleDate
          ? new Date(sale.saleDate).toISOString().slice(0, 10)
          : null,
        commissionAmount: (sale?.salesCommission ?? 0) + (sale?.overrideCommission ?? 0),
      };
    });

    // Step 3: testModeStartedAt 있는 phone으로만 리드 조회 + 정확한 total count
    const qualifiedPhones = [...trialUserByPhone.keys()];

    // 체험 고객이 없으면 DB 쿼리 불필요
    if (qualifiedPhones.length === 0) {
      return NextResponse.json({
        ok: true,
        customers: purchaseCustomers,
        trialTotal: 0,
        purchaseTotal,
        currentPage: page,
        totalPages: Math.ceil(purchaseTotal / limit),
      });
    }

    const trialBaseWhere = {
      ...agentCondition,
      AffiliateSale: { none: {} },
      customerPhone: { in: qualifiedPhones },
    };
    const [trialCandidates, trialTotal] = await Promise.all([
      prisma.affiliateLead.findMany({
        where: trialBaseWhere,
        select: { id: true, customerName: true, customerPhone: true, createdAt: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.affiliateLead.count({ where: trialBaseWhere }),
    ]);

    // ── 3일 체험 고객 변환 ─────────────────────────────────────────────────────
    // trialCandidates는 이미 qualifiedPhones 기준으로 필터링됨 → filter 불필요
    const trialCustomers: SalesDashboardCustomer[] = trialCandidates.map((lead) => {
        // qualifiedPhones로 필터됐으므로 phone이 Map에 반드시 존재
        const startedAt = trialUserByPhone.get(lead.customerPhone!)!;
        const hoursElapsed = (now.getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60);
        const isActive = hoursElapsed < TRIAL_HOURS;
        return {
          leadId: lead.id,
          maskedName: maskName(lead.customerName) ?? '고객',
          customerType: isActive ? ('TRIAL_ACTIVE' as const) : ('TRIAL_ENDED' as const),
          productName: null,
          cabinType: null,
          paymentMethod: null,
          hasPassport: false,
          purchaseDate: new Date(startedAt).toISOString().slice(0, 10),
          commissionAmount: 0,
        };
      });

    // ── 매출 합계 (본인 확정 수당) ──────────────────────────────────────────────
    const salesAgg = await prisma.affiliateSale.aggregate({
      where: {
        ...(profile.type === 'BRANCH_MANAGER'
          ? { OR: [{ agentId: profile.id }, { managerId: profile.id }] }
          : { agentId: profile.id }),
        status: 'CONFIRMED',
      },
      _sum: {
        salesCommission: true,
        overrideCommission: true,
        saleAmount: true,
      },
      _count: { id: true },
    });

    const totalCommission =
      (salesAgg._sum.salesCommission ?? 0) + (salesAgg._sum.overrideCommission ?? 0);

    return NextResponse.json({
      ok: true,
      customers: [...purchaseCustomers, ...trialCustomers],
      summary: {
        totalSaleAmount: salesAgg._sum.saleAmount ?? 0,
        totalCommission,
        purchaseCount: purchaseTotal,
        trialCount: trialTotal, // 전체 체험 고객 수 (페이지 기준 length 오류 수정)
      },
      pagination: {
        page,
        limit,
        purchaseTotal,
        trialTotal,
      },
    });
  } catch (error: unknown) {
    logger.error('[Partner My-Customers] Error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: '고객 목록 조회 실패' }, { status: 500 });
  }
}
