export const dynamic = 'force-dynamic';

// 파트너가 고객의 결제 정보 조회
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext } from '@/lib/partner-auth';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const { profile } = await requirePartnerContext();
    const leadId = parseInt(params.leadId);

    if (isNaN(leadId) || leadId <= 0) {
      return NextResponse.json(
        { ok: false, error: '잘못된 고객 ID입니다.' },
        { status: 400 }
      );
    }

    // C-1: 소유권 검증 — 이 리드가 현재 파트너(또는 산하 판매원)의 고객인지 확인
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

    if (!lead) {
      return NextResponse.json(
        { ok: false, error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 소유권 확인 후 AffiliateSale 통해 결제 정보 조회
    const sales = await prisma.affiliateSale.findMany({
      where: {
        leadId,
        OR: [
          { managerId: profile.id },
          { agentId: profile.id },
        ],
      },
      select: {
        id: true,
        saleDate: true,
        saleAmount: true,
        cabinType: true,
        status: true,
        Payment: {
          select: {
            id: true,
            productCode: true,
            productName: true,
            amount: true,
            status: true,
            paidAt: true,
            pgProvider: true,
            // buyerName, buyerTel, buyerEmail 제외 (PII 최소화)
          },
        },
      },
      orderBy: { saleDate: 'desc' },
      take: 10,
    });

    const payments = sales
      .filter(s => s.Payment)
      .map(s => ({
        id: s.Payment!.id,
        productCode: s.Payment!.productCode,
        productName: s.Payment!.productName,
        amount: s.Payment!.amount,
        status: s.Payment!.status,
        paidAt: s.Payment!.paidAt,
        pgProvider: s.Payment!.pgProvider,
        cabinType: s.cabinType,
        saleStatus: s.status,
      }));

    return NextResponse.json({ ok: true, payments });
  } catch (error: unknown) {
    logger.error('[Partner Customer Payments] Error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: '결제 정보 조회 실패' },
      { status: 500 }
    );
  }
}
