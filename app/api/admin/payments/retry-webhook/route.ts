export const dynamic = 'force-dynamic';

// 결제 웹훅 재처리 — webhookFailed: true 인 Payment를 재처리
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * POST /api/admin/payments/retry-webhook
 * webhookFailed: true 인 완료 결제를 조회하여 webhook 재처리
 * 어드민 전용
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ ok: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    // 특정 orderId를 지정하면 해당 건만, 없으면 최근 100건 중 미처리 건
    const targetOrderId: string | undefined = body.orderId;

    // webhookFailed: true 인 완료 결제 조회
    const payments = await prisma.payment.findMany({
      where: {
        status: 'completed',
        ...(targetOrderId ? { orderId: targetOrderId } : {}),
      },
      select: {
        id: true,
        orderId: true,
        amount: true,
        productCode: true,
        buyerName: true,
        buyerTel: true,
        buyerEmail: true,
        affiliateCode: true,
        affiliateMallUserId: true,
        pgTransactionId: true,
        metadata: true,
      },
      orderBy: { paidAt: 'desc' },
      take: 100,
    });

    // metadata.webhookFailed: true 인 건만 필터
    const failedPayments = payments.filter((p) => {
      const meta = p.metadata as any;
      return meta?.webhookFailed === true;
    });

    if (failedPayments.length === 0) {
      return NextResponse.json({ ok: true, message: '재처리할 결제가 없습니다.', retried: 0 });
    }

    const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ ok: false, error: 'INTERNAL_WEBHOOK_SECRET 환경변수가 설정되지 않았습니다.' }, { status: 500 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const payment of failedPayments) {
      try {
        const resp = await fetch(`${BASE_URL}/api/payment/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-webhook-secret': webhookSecret,
          },
          body: JSON.stringify({
            imp_uid: payment.pgTransactionId || payment.orderId,
            merchant_uid: payment.orderId,
            status: 'paid',
            amount: payment.amount,
            productCode: payment.productCode,
            customerName: payment.buyerName,
            customerPhone: payment.buyerTel,
            customerEmail: payment.buyerEmail || '',
            metadata: payment.metadata || {},
            affiliateCode: payment.affiliateCode,
            affiliateMallUserId: payment.affiliateMallUserId,
          }),
        });

        const result = await resp.json().catch(() => ({}));

        if (resp.ok && result.ok) {
          // 성공 시 webhookFailed 플래그 제거
          const meta = payment.metadata as any;
          const { webhookFailed, webhookFailedAt, ...restMeta } = meta || {};
          await prisma.payment.update({
            where: { id: payment.id },
            data: { metadata: { ...restMeta, webhookRetriedAt: new Date().toISOString() } },
          });
          successCount++;
          logger.log('[Retry Webhook] 성공:', { orderId: payment.orderId });
        } else {
          failCount++;
          logger.error('[Retry Webhook] 실패:', { orderId: payment.orderId, result });
        }
      } catch (err) {
        failCount++;
        logger.error('[Retry Webhook] 요청 오류:', { orderId: payment.orderId, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return NextResponse.json({
      ok: true,
      total: failedPayments.length,
      retried: successCount,
      failed: failCount,
    });
  } catch (error: unknown) {
    logger.error('[Retry Webhook] Error:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: '재처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * GET /api/admin/payments/retry-webhook
 * webhookFailed 결제 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ ok: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const payments = await prisma.payment.findMany({
      where: { status: 'completed' },
      select: {
        orderId: true,
        amount: true,
        productCode: true,
        paidAt: true,
        metadata: true,
      },
      orderBy: { paidAt: 'desc' },
      take: 200,
    });

    const failedPayments = payments
      .filter((p) => (p.metadata as any)?.webhookFailed === true)
      .map((p) => ({
        orderId: p.orderId,
        amount: p.amount,
        productCode: p.productCode,
        paidAt: p.paidAt,
        webhookFailedAt: (p.metadata as any)?.webhookFailedAt ?? null,
      }));

    return NextResponse.json({ ok: true, count: failedPayments.length, payments: failedPayments });
  } catch (error: unknown) {
    logger.error('[Retry Webhook GET] Error:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
