export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.cruisedot.co.kr';

export async function POST(request: NextRequest) {
  try {
    // 1. PG사로부터 전달된 데이터 파싱 (x-www-form-urlencoded)
    const formData = await request.formData();
    const P_STATUS = formData.get('P_STATUS')?.toString();
    const P_TID = formData.get('P_TID')?.toString();
    const P_REQ_URL = formData.get('P_REQ_URL')?.toString();
    const P_MID = formData.get('P_MID')?.toString();
    const P_OID = formData.get('P_OID')?.toString();
    const P_AMT = formData.get('P_AMT')?.toString();
    const P_RMESG1 = formData.get('P_RMESG1')?.toString();

    console.log('[Payment Callback] Received:', { P_STATUS, P_TID, P_REQ_URL, P_OID, P_AMT });

    // 2. 인증 실패 시 바로 실패 페이지로 이동
    if (P_STATUS !== '00') {
      const errorMsg = P_RMESG1 || '결제 인증 실패';

      // DB 업데이트 (실패)
      if (P_OID) {
        await prisma.payment.updateMany({
          where: { orderId: P_OID },
          data: {
            status: 'failed',
            failedAt: new Date(),
            failureReason: errorMsg,
          },
        });
      }

      return NextResponse.redirect(
        new URL(`/payment/failed?orderId=${P_OID || ''}&message=${encodeURIComponent(errorMsg)}`, BASE_URL),
        303
      );
    }

    // 3. [핵심] 인증 성공 시, PG사로 "승인 요청" 보내기 (Server-to-Server)
    if (P_REQ_URL && P_TID) {
      console.log('[Payment Callback] 승인 요청 시작:', P_REQ_URL);

      const approvalData = new URLSearchParams();
      approvalData.append('P_TID', P_TID);
      approvalData.append('P_MID', 'wpcrdot200'); // 운영 상점ID 강제 적용

      const approvalRes = await fetch(P_REQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: approvalData.toString(),
      });

      const approvalText = await approvalRes.text();
      console.log('[Payment Approval] Response:', approvalText);

      // 4. 승인 결과 확인 (P_STATUS=00 확인)
      const approvalParams = new URLSearchParams(approvalText);
      const finalStatus = approvalParams.get('P_STATUS');
      const finalTid = approvalParams.get('P_TID') || P_TID;
      const finalMsg = approvalParams.get('P_RMESG1');

      if (finalStatus === '00') {
        // 결제 성공! - DB 업데이트
        console.log('[Payment Callback] 승인 성공!');

        if (P_OID) {
          const payment = await prisma.payment.findUnique({
            where: { orderId: P_OID },
          });

          if (payment) {
            await prisma.payment.update({
              where: { orderId: P_OID },
              data: {
                status: 'completed',
                paidAt: new Date(),
                pgTransactionId: finalTid,
                metadata: {
                  ...(payment.metadata as any || {}),
                  approvalResponse: approvalText,
                },
              },
            });

            // 웹훅 호출 (어필리에이트 처리)
            try {
              await fetch(`${BASE_URL}/api/payment/webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  imp_uid: finalTid,
                  merchant_uid: P_OID,
                  status: 'paid',
                  amount: parseInt(P_AMT || '0'),
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
              console.error('[Payment Callback] Webhook 호출 실패:', webhookError);
            }
          }
        }

        return NextResponse.redirect(
          new URL(`/payment/success?orderId=${P_OID || ''}`, BASE_URL),
          303
        );
      } else {
        // 승인 실패
        const failMsg = finalMsg || '승인 거절됨';
        console.log('[Payment Callback] 승인 실패:', failMsg);

        if (P_OID) {
          await prisma.payment.updateMany({
            where: { orderId: P_OID },
            data: {
              status: 'failed',
              failedAt: new Date(),
              failureReason: failMsg,
              pgTransactionId: finalTid,
            },
          });
        }

        return NextResponse.redirect(
          new URL(`/payment/failed?orderId=${P_OID || ''}&message=${encodeURIComponent(failMsg)}`, BASE_URL),
          303
        );
      }
    }

    // P_REQ_URL 없는 경우
    console.error('[Payment Callback] P_REQ_URL 없음');
    return NextResponse.redirect(
      new URL(`/payment/failed?orderId=${P_OID || ''}&message=InvalidRequest`, BASE_URL),
      303
    );

  } catch (error) {
    console.error('[Payment Callback Error]', error);
    return NextResponse.redirect(
      new URL('/payment/failed?message=ServerCallbackError', BASE_URL),
      303
    );
  }
}
