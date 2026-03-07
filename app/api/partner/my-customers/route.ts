export const dynamic = 'force-dynamic';

/**
 * GET /api/partner/my-customers
 * 판매원 전용 고객 목록 API
 *
 * 표시 범위: 구매 고객 + 3일 체험 고객만
 * 개인정보보호법 준수: 실명/전화번호 원본 미포함, 마스킹 처리
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext } from '@/lib/partner-auth';
import { logger } from '@/lib/logger';
import { maskName, formatPaymentMethod, type SalesDashboardCustomer } from '@/lib/privacy/masking';

// 3일 체험: testModeStartedAt 기준 72시간
const TRIAL_HOURS = 72;

export async function GET(req: NextRequest) {
  try {
    const { profile } = await requirePartnerContext();

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // 본인(agentId) 또는 산하(managerId) 판매에 연결된 Lead 조회
    const agentCondition = profile.type === 'BRANCH_MANAGER'
      ? { OR: [{ agentId: profile.id }, { managerId: profile.id }] }
      : { agentId: profile.id };

    // ── 구매 고객: AffiliateSale이 있는 Lead ────────────────────────────
    const purchaseLeads = await prisma.affiliateLead.findMany({
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
          },
        },
        // 여권 제출 여부: Reservation → Traveler 확인
        User: {
          select: {
            id: true,
            Traveler: {
              where: { passportNo: { not: null } },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });

    // ── 3일 체험 고객: testModeStartedAt 있는 User 중 구매 안 한 Lead ──
    const now = new Date();
    const trialLeads = await prisma.affiliateLead.findMany({
      where: {
        ...agentCondition,
        AffiliateSale: { none: {} }, // 구매 없는 리드만
        User: {
          testModeStartedAt: { not: null },
        },
      },
      select: {
        id: true,
        customerName: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            testModeStartedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    // ── 구매 고객 변환 ──────────────────────────────────────────────────
    const purchaseCustomers: SalesDashboardCustomer[] = purchaseLeads.map(lead => {
      const sale = lead.AffiliateSale[0];
      const hasPassport = (lead.User?.Traveler?.length ?? 0) > 0;
      return {
        leadId: lead.id,
        maskedName: maskName(lead.customerName),
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

    // ── 3일 체험 고객 변환 ──────────────────────────────────────────────
    const trialCustomers: SalesDashboardCustomer[] = trialLeads
      .filter(lead => lead.User?.testModeStartedAt)
      .map(lead => {
        const startedAt = lead.User!.testModeStartedAt!;
        const hoursElapsed = (now.getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60);
        const isActive = hoursElapsed < TRIAL_HOURS;
        return {
          leadId: lead.id,
          maskedName: maskName(lead.customerName),
          customerType: isActive ? ('TRIAL_ACTIVE' as const) : ('TRIAL_ENDED' as const),
          productName: null,
          cabinType: null,
          paymentMethod: null,
          hasPassport: false,
          purchaseDate: new Date(startedAt).toISOString().slice(0, 10),
          commissionAmount: 0,
        };
      });

    // ── 매출 합계 (본인 수당) ───────────────────────────────────────────
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
      (salesAgg._sum.salesCommission ?? 0) +
      (salesAgg._sum.overrideCommission ?? 0);

    return NextResponse.json({
      ok: true,
      customers: [...purchaseCustomers, ...trialCustomers],
      summary: {
        totalSaleAmount: salesAgg._sum.saleAmount ?? 0,   // 매출 합계
        totalCommission,                                   // 본인 수당 합계
        purchaseCount: purchaseLeads.length,
        trialCount: trialCustomers.length,
      },
      pagination: { page, limit },
    });
  } catch (error: unknown) {
    logger.error('[Partner My-Customers] Error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: '고객 목록 조회 실패' },
      { status: 500 }
    );
  }
}
