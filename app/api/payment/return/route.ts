export const dynamic = 'force-dynamic';

// 결제 완료 Return URL
// 웰컴페이먼츠 PC/Mobile 결제 완료 후 리다이렉트

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPaymentSuccess } from '@/lib/welcomepay';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * POST: 결제 완료 결과 수신 (PC Web)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // 결제 결과 파라미터
    const resultCode = formData.get('resultCode') as string || formData.get('P_STATUS') as string;
    const resultMsg = formData.get('resultMsg') as string || formData.get('P_RMESG1') as string;
    const tid = formData.get('tid') as string || formData.get('P_TID') as string;
    const orderId = formData.get('MOID') as string || formData.get('P_OID') as string;
    const amount = formData.get('TotPrice') as string || formData.get('P_AMT') as string;
    const authCode = formData.get('AuthCode') as string || formData.get('P_AUTH_NO') as string;
    const authDate = formData.get('AuthDate') as string || formData.get('P_AUTH_DT') as string;
    const payMethod = formData.get('PayMethod') as string || formData.get('P_TYPE') as string;

    console.log('[Payment Return] 결과 수신:', {
      resultCode,
      resultMsg,
      tid,
      orderId,
      amount,
      payMethod,
    });

    // 결제 성공 여부 확인
    const isSuccess = isPaymentSuccess(resultCode);

    // DB 업데이트
    if (orderId) {
      const payment = await prisma.payment.findUnique({
        where: { orderId },
      });

      if (payment) {
        if (isSuccess) {
          await prisma.payment.update({
            where: { orderId },
            data: {
              status: 'completed',
              paidAt: new Date(),
              pgTransactionId: tid,
              metadata: {
                ...(payment.metadata as any || {}),
                resultCode,
                resultMsg,
                authCode,
                authDate,
                payMethod,
              },
            },
          });

          // 결제 완료 웹훅 호출
          try {
            await fetch(`${BASE_URL}/api/payment/webhook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imp_uid: tid,
                merchant_uid: orderId,
                status: 'paid',
                amount: parseInt(amount),
                productCode: payment.productCode,
                customerName: payment.buyerName,
                customerPhone: payment.buyerTel,
                customerEmail: payment.buyerEmail || '',
                metadata: payment.metadata || {},
                affiliateCode: payment.affiliateCode,
                affiliateMallUserId: payment.affiliateMallUserId,
              }),
            });
          } catch (webhookError) {
            console.error('[Payment Return] Webhook 호출 실패:', webhookError);
          }
        } else {
          await prisma.payment.update({
            where: { orderId },
            data: {
              status: 'failed',
              failedAt: new Date(),
              failureReason: resultMsg || '결제 실패',
              pgTransactionId: tid,
            },
          });
        }
      }
    }

    // 결과 페이지로 리다이렉트
    if (isSuccess) {
      return NextResponse.redirect(
        new URL(`/payment/success?orderId=${orderId}`, BASE_URL),
        303
      );
    } else {
      return NextResponse.redirect(
        new URL(`/payment/failed?orderId=${orderId}&error=${encodeURIComponent(resultMsg || '결제 실패')}`, BASE_URL),
        303
      );
    }
  } catch (error) {
    console.error('[Payment Return] Error:', error);
    return NextResponse.redirect(
      new URL(`/payment/failed?error=${encodeURIComponent('결제 처리 중 오류가 발생했습니다.')}`, BASE_URL),
      303
    );
  }
}

/**
 * GET: 결제 완료 결과 수신 (일부 PG는 GET으로 전달)
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const resultCode = searchParams.get('resultCode') || searchParams.get('P_STATUS');
  const resultMsg = searchParams.get('resultMsg') || searchParams.get('P_RMESG1');
  const tid = searchParams.get('tid') || searchParams.get('P_TID');
  const orderId = searchParams.get('MOID') || searchParams.get('P_OID');
  const amount = searchParams.get('TotPrice') || searchParams.get('P_AMT');

  console.log('[Payment Return GET]:', {
    resultCode,
    resultMsg,
    tid,
    orderId,
  });

  const isSuccess = isPaymentSuccess(resultCode || '');

  // DB 업데이트
  if (orderId) {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (payment) {
      if (isSuccess) {
        await prisma.payment.update({
          where: { orderId },
          data: {
            status: 'completed',
            paidAt: new Date(),
            pgTransactionId: tid || undefined,
          },
        });

        // 웹훅 호출
        try {
          await fetch(`${BASE_URL}/api/payment/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imp_uid: tid,
              merchant_uid: orderId,
              status: 'paid',
              amount: parseInt(amount || '0'),
              productCode: payment.productCode,
              customerName: payment.buyerName,
              customerPhone: payment.buyerTel,
              customerEmail: payment.buyerEmail || '',
              metadata: payment.metadata || {},
              affiliateCode: payment.affiliateCode,
              affiliateMallUserId: payment.affiliateMallUserId,
            }),
          });
        } catch (webhookError) {
          console.error('[Payment Return GET] Webhook error:', webhookError);
        }
      } else {
        await prisma.payment.update({
          where: { orderId },
          data: {
            status: 'failed',
            failedAt: new Date(),
            failureReason: resultMsg || '결제 실패',
          },
        });
      }
    }
  }

  // 리다이렉트
  if (isSuccess) {
    return NextResponse.redirect(
      new URL(`/payment/success?orderId=${orderId}`, BASE_URL)
    );
  } else {
    return NextResponse.redirect(
      new URL(`/payment/failed?orderId=${orderId}&error=${encodeURIComponent(resultMsg || '결제 실패')}`, BASE_URL)
    );
  }
}
