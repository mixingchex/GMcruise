export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { processRefund } from '@/lib/affiliate/refund';

function requireAdmin(role?: string | null) {
  if (role !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 });
  }
  return null;
}

/**
 * POST: 판매 건 환불 처리
 * - Lead 상태도 'REFUNDED'로 업데이트하여 판매원/대리점장에게 표시
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const { saleId: saleIdStr } = await params;
    const saleId = Number(saleIdStr);
    if (!saleId || Number.isNaN(saleId)) {
      return NextResponse.json({ ok: false, message: 'Invalid sale ID' }, { status: 400 });
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { role: true } });
    const guard = requireAdmin(admin?.role);
    if (guard) return guard;

    const body = await req.json().catch(() => ({}));
    const reason = (body?.reason || '').trim();

    if (!reason) {
      return NextResponse.json({ ok: false, message: '환불 사유는 필수입니다.' }, { status: 400 });
    }

    // processRefund 함수 사용 (Lead 상태도 자동 업데이트됨)
    const result = await processRefund(saleId, reason, sessionUser.id);

    // WO-05: 환불 후 APIS 스프레드시트 자동 동기화 (환불 표시)
    // processRefund 완료 후 비동기로 실행 — 실패해도 환불 결과에 영향 없음
    try {
      const saleRecord = await prisma.affiliateSale.findUnique({
        where: { id: saleId },
        select: { productCode: true },
      });
      if (saleRecord?.productCode) {
        const relatedTrip = await prisma.trip.findFirst({
          where: { productCode: saleRecord.productCode },
          select: { id: true, departureDate: true },
        });
        // 출발 전 여행만 APIS 동기화 (출발 후는 제출 완료)
        if (relatedTrip?.id && relatedTrip.departureDate && relatedTrip.departureDate > new Date()) {
          const { syncApisInBackground } = await import('@/lib/google-sheets');
          syncApisInBackground(relatedTrip.id); // void 반환 — 내부에서 이미 catch 처리됨
        }
      }
    } catch {
      // APIS 동기화 실패는 환불 성공에 영향 없음
    }

    // 관리자 액션 로그 기록
    await prisma.adminActionLog.create({
      data: {
        adminId: sessionUser.id,
        targetUserId: null,
        action: 'affiliate.sale.refunded',
        details: {
          saleId: result.sale.id,
          reason: reason,
          saleAmount: result.sale.saleAmount,
          leadId: result.sale.leadId,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      sale: {
        ...result.sale,
        refundedAt: result.sale.refundedAt?.toISOString() || null,
        saleDate: result.sale.saleDate?.toISOString() || null,
        createdAt: result.sale.createdAt.toISOString(),
        updatedAt: result.sale.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    const { saleId: saleIdStr } = await params;
    console.error(`POST /api/admin/affiliate/sales/${saleIdStr}/refund error:`, error);
    return NextResponse.json(
      { ok: false, message: error.message || '환불 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
