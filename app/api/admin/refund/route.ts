export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sha256Hash, getWelcomePayConfig, getTimestamp } from '@/lib/welcomepay';

// 관리자 권한 확인
async function verifyAdmin() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, role: true },
  });

  if (!user || !['admin', 'superadmin'].includes(user.role || '')) {
    return null;
  }

  return user;
}

// WelcomePayments PAYAPI 취소/환불 URL
const WELCOMEPAY_CANCEL_URL = 'https://payapi.paywelcome.co.kr/cancel/cancel';

/**
 * 웰컴페이먼츠 취소 API Signature 생성
 * 형식: SHA256(mid + mkey + timestamp)
 * mkey = SHA256(signKey)
 */
function generateCancelSignature(mid: string, signKey: string, timestamp: string): { signature: string; mkey: string } {
  const mkey = sha256Hash(signKey);
  const signString = mid + mkey + timestamp;
  const signature = sha256Hash(signString);
  return { signature, mkey };
}

/**
 * 환불 처리 API
 * POST /api/admin/refund
 *
 * Body:
 * - paymentId: Payment ID (DB의 Payment 테이블 ID)
 * - reason: 환불 사유 (선택)
 */
export async function POST(req: NextRequest) {
  try {
    // 관리자 인증 확인
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { paymentId, reason } = body;

    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: '결제 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Payment 정보 조회
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        AffiliateSale: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: '결제 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 취소된 결제인지 확인
    if (payment.status === 'cancelled' || payment.cancelledAt) {
      return NextResponse.json(
        { ok: false, error: '이미 취소된 결제입니다.' },
        { status: 400 }
      );
    }

    // 결제 완료 상태가 아니면 취소 불가 (paid 또는 completed)
    if (payment.status !== 'paid' && payment.status !== 'completed') {
      return NextResponse.json(
        { ok: false, error: `결제 상태가 '${payment.status}'이므로 취소할 수 없습니다.` },
        { status: 400 }
      );
    }

    // PG TID가 없으면 취소 불가
    if (!payment.pgTransactionId) {
      return NextResponse.json(
        { ok: false, error: 'PG 거래번호(TID)가 없어 취소할 수 없습니다.' },
        { status: 400 }
      );
    }

    // WelcomePayments 설정
    const config = getWelcomePayConfig();
    const timestamp = getTimestamp();
    const { signature, mkey } = generateCancelSignature(config.mid, config.signKey, timestamp);

    // 취소 요청 파라미터
    const cancelParams = new URLSearchParams({
      payType: 'card', // 결제수단 (card, bank, vbank, mobile)
      mid: config.mid,
      tid: payment.pgTransactionId,
      price: payment.amount.toString(),
      currency: 'WON',
      timestamp,
      signature,
      mkey,
    });

    console.log('[Refund API] 취소 요청:', {
      paymentId,
      orderId: payment.orderId,
      tid: payment.pgTransactionId,
      amount: payment.amount,
      reason,
    });

    // WelcomePayments 취소 API 호출
    const cancelResponse = await fetch(WELCOMEPAY_CANCEL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: cancelParams.toString(),
    });

    const cancelResult = await cancelResponse.json();
    console.log('[Refund API] 취소 응답:', cancelResult);

    // 취소 성공 여부 확인
    // WelcomePayments 응답: resultCode가 00 또는 0000이면 성공
    const isSuccess = cancelResult.resultCode === '00' || cancelResult.resultCode === '0000';

    if (!isSuccess) {
      return NextResponse.json({
        ok: false,
        error: `환불 실패: ${cancelResult.resultMsg || cancelResult.resultMessage || '알 수 없는 오류'}`,
        pgResponse: cancelResult,
      });
    }

    // DB 업데이트: Payment 상태 변경
    const now = new Date();
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'cancelled',
        cancelledAt: now,
        metadata: {
          ...(payment.metadata as object || {}),
          cancelReason: reason || '관리자 환불 처리',
          cancelledBy: admin.id,
          cancelledByName: admin.name,
          cancelResponse: cancelResult,
        },
      },
    });

    // User의 customerStatus를 'refunded'로 변경 (saleId 유무와 관계없이)
    // buyerEmail 또는 buyerTel로 User 찾기
    if (payment.buyerEmail || payment.buyerTel) {
      const userWhereCondition: any = { OR: [] };
      if (payment.buyerEmail) {
        userWhereCondition.OR.push({ email: payment.buyerEmail });
      }
      if (payment.buyerTel) {
        userWhereCondition.OR.push({ phone: payment.buyerTel });
      }

      const user = await prisma.user.findFirst({
        where: userWhereCondition,
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            customerStatus: 'refunded',
          },
        });
        console.log('[Refund API] User customerStatus updated to refunded:', user.id);
      }
    }

    // DB 업데이트: AffiliateSale 상태 변경 (있는 경우)
    if (payment.saleId) {
      await prisma.affiliateSale.update({
        where: { id: payment.saleId },
        data: {
          status: 'REFUNDED',
          refundedAt: now,
          cancellationReason: reason || '관리자 환불 처리',
          metadata: {
            ...(payment.AffiliateSale?.metadata as object || {}),
            refundedBy: admin.id,
            refundedByName: admin.name,
            refundAmount: payment.amount,
            refundDate: now.toISOString(),
          },
        },
      });

      // CommissionLedger에 환불 내역 추가 (마이너스 금액)
      // 먼저 해당 sale에 대한 기존 ledger 조회
      const existingLedgers = await prisma.commissionLedger.findMany({
        where: { saleId: payment.saleId },
      });

      // 각 ledger에 대해 환불 항목 생성 (마이너스 금액)
      for (const ledger of existingLedgers) {
        // 고유 제약 조건 때문에 동일 saleId + profileId + entryType 조합이 있으면 upsert 사용
        const refundEntryType = `REFUND_${ledger.entryType}`;
        await prisma.commissionLedger.upsert({
          where: {
            saleId_profileId_entryType: {
              saleId: payment.saleId,
              profileId: ledger.profileId!,
              entryType: refundEntryType,
            },
          },
          update: {
            amount: -ledger.amount,
            notes: `환불 처리: ${reason || '관리자 환불'}`,
            metadata: {
              originalLedgerId: ledger.id,
              originalAmount: ledger.amount,
              refundedAt: now.toISOString(),
              refundedBy: admin.id,
            },
          },
          create: {
            saleId: payment.saleId,
            profileId: ledger.profileId,
            entryType: refundEntryType,
            amount: -ledger.amount, // 마이너스 금액
            notes: `환불 처리: ${reason || '관리자 환불'}`,
            metadata: {
              originalLedgerId: ledger.id,
              originalAmount: ledger.amount,
              refundedAt: now.toISOString(),
              refundedBy: admin.id,
            },
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: '환불이 성공적으로 처리되었습니다.',
      refundedAt: now.toISOString(),
      amount: payment.amount,
      pgResponse: cancelResult,
    });

  } catch (error) {
    console.error('[Refund API] Error:', error);
    return NextResponse.json(
      { ok: false, error: '환불 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 환불 가능 여부 조회
 * GET /api/admin/refund?paymentId=123
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: '결제 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(paymentId) },
      include: {
        AffiliateSale: {
          include: {
            AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
              select: { displayName: true },
            },
            AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile: {
              select: { displayName: true },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: '결제 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // paid 또는 completed 상태에서 환불 가능
    const canRefund = (payment.status === 'paid' || payment.status === 'completed') && !payment.cancelledAt && !!payment.pgTransactionId;

    // 상태 한글 변환
    const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
        'paid': '결제완료',
        'completed': '결제완료',
        'pending': '대기중',
        'cancelled': '환불완료',
        'failed': '결제실패',
      };
      return labels[status] || status;
    };

    return NextResponse.json({
      ok: true,
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
        statusLabel: getStatusLabel(payment.status),
        buyerName: payment.buyerName,
        buyerTel: payment.buyerTel,
        productName: payment.productName,
        paidAt: payment.paidAt,
        cancelledAt: payment.cancelledAt,
        pgTransactionId: payment.pgTransactionId,
      },
      sale: payment.AffiliateSale ? {
        id: payment.AffiliateSale.id,
        status: payment.AffiliateSale.status,
        saleAmount: payment.AffiliateSale.saleAmount,
        refundedAt: payment.AffiliateSale.refundedAt,
        agentName: payment.AffiliateSale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.displayName,
        managerName: payment.AffiliateSale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile?.displayName,
      } : null,
      canRefund,
      refundDisabledReason: !canRefund
        ? payment.cancelledAt
          ? '이미 환불된 결제입니다.'
          : (payment.status !== 'paid' && payment.status !== 'completed')
            ? `결제 상태가 '${getStatusLabel(payment.status)}'입니다.`
            : 'PG 거래번호가 없습니다.'
        : null,
    });

  } catch (error) {
    console.error('[Refund API] GET Error:', error);
    return NextResponse.json(
      { ok: false, error: '환불 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
