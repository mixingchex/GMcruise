export const dynamic = 'force-dynamic';

/**
 * 모바일 결제 콜백 API
 * PG사(웰컴페이먼츠)가 결제 완료 후 POST로 결과를 전송하는 엔드포인트
 *
 * P_NEXT_URL로 설정되어야 함
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.cruisedot.co.kr';

/**
 * POST: 모바일 결제 결과 수신
 * PG사에서 form-data로 결제 결과를 전송함
 */
export async function POST(req: NextRequest) {
  console.log('='.repeat(60));
  console.log('[Callback POST] 모바일 결제 콜백 수신');
  console.log('[Callback POST] Timestamp:', new Date().toISOString());

  try {
    const formData = await req.formData();

    // PG사에서 전달하는 주요 파라미터
    const P_STATUS = formData.get('P_STATUS') as string;
    const P_TID = formData.get('P_TID') as string;
    const P_MID = formData.get('P_MID') as string;
    const P_OID = formData.get('P_OID') as string;
    const P_AMT = formData.get('P_AMT') as string;
    const P_RMESG1 = formData.get('P_RMESG1') as string;
    const P_AUTH_NO = formData.get('P_AUTH_NO') as string;
    const P_AUTH_DT = formData.get('P_AUTH_DT') as string;
    const P_REQ_URL = formData.get('P_REQ_URL') as string;
    const P_TYPE = formData.get('P_TYPE') as string;
    const P_NOTI = formData.get('P_NOTI') as string;

    // 전체 파라미터 로깅
    console.log('[Callback POST] === 수신 파라미터 ===');
    console.log('[Callback POST] P_STATUS:', P_STATUS);
    console.log('[Callback POST] P_TID:', P_TID);
    console.log('[Callback POST] P_MID:', P_MID);
    console.log('[Callback POST] P_OID:', P_OID);
    console.log('[Callback POST] P_AMT:', P_AMT);
    console.log('[Callback POST] P_RMESG1:', P_RMESG1);
    console.log('[Callback POST] P_AUTH_NO:', P_AUTH_NO);
    console.log('[Callback POST] P_AUTH_DT:', P_AUTH_DT);
    console.log('[Callback POST] P_REQ_URL:', P_REQ_URL);
    console.log('[Callback POST] P_TYPE:', P_TYPE);
    console.log('[Callback POST] P_NOTI:', P_NOTI);
    console.log('='.repeat(60));

    // 결제 성공 여부 확인 (웰컴페이먼츠: '00' = 성공)
    const isSuccess = P_STATUS === '00';

    if (!isSuccess) {
      // 결제 실패
      console.log('[Callback POST] 결제 실패:', P_RMESG1);

      // DB 업데이트 (실패)
      if (P_OID) {
        try {
          await prisma.payment.updateMany({
            where: { orderId: P_OID },
            data: {
              status: 'failed',
              failedAt: new Date(),
              failureReason: P_RMESG1 || '결제 실패',
              pgTransactionId: P_TID || null,
            },
          });
        } catch (dbError) {
          console.error('[Callback POST] DB 업데이트 실패:', dbError);
        }
      }

      // 실패 페이지로 리다이렉트
      const failUrl = new URL('/payment/failed', BASE_URL);
      failUrl.searchParams.set('orderId', P_OID || '');
      failUrl.searchParams.set('error', P_RMESG1 || '결제 실패');

      console.log('[Callback POST] 실패 리다이렉트:', failUrl.toString());
      return NextResponse.redirect(failUrl);
    }

    // 결제 인증 성공 - 승인 요청 필요
    console.log('[Callback POST] 인증 성공, 승인 요청 시작');

    // 승인 요청 (P_REQ_URL이 있는 경우)
    if (P_REQ_URL) {
      console.log('[Callback POST] 승인 요청 URL:', P_REQ_URL);

      const approvalParams = new URLSearchParams();
      approvalParams.append('P_MID', P_MID);
      approvalParams.append('P_TID', P_TID);

      try {
        const approvalResponse = await fetch(P_REQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: approvalParams.toString(),
        });

        const responseText = await approvalResponse.text();
        console.log('[Callback POST] 승인 응답:', responseText);

        // 응답 파싱
        const resultParams = new URLSearchParams(responseText);
        const resultStatus = resultParams.get('P_STATUS');
        const resultMsg = resultParams.get('P_RMESG1');
        const resultTid = resultParams.get('P_TID') || P_TID;
        const resultAuthNo = resultParams.get('P_AUTH_NO');

        // 승인 실패
        if (resultStatus !== '00') {
          console.log('[Callback POST] 승인 실패:', resultMsg);

          if (P_OID) {
            await prisma.payment.updateMany({
              where: { orderId: P_OID },
              data: {
                status: 'failed',
                failedAt: new Date(),
                failureReason: resultMsg || '승인 실패',
                pgTransactionId: resultTid,
              },
            });
          }

          const failUrl = new URL('/payment/failed', BASE_URL);
          failUrl.searchParams.set('orderId', P_OID || '');
          failUrl.searchParams.set('error', resultMsg || '승인 실패');
          return NextResponse.redirect(failUrl);
        }

        // 승인 성공 - DB 업데이트
        console.log('[Callback POST] 승인 성공!');

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
                pgTransactionId: resultTid,
                metadata: {
                  ...(payment.metadata as any || {}),
                  P_TYPE,
                  P_AUTH_DT,
                  P_AUTH_NO: resultAuthNo,
                  P_RMESG1: resultMsg,
                  approvalResponse: responseText,
                },
              },
            });

            // 웹훅 호출 (어필리에이트 처리 등)
            try {
              await fetch(`${BASE_URL}/api/payment/webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  imp_uid: resultTid,
                  merchant_uid: P_OID,
                  status: 'paid',
                  amount: parseInt(P_AMT),
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
              console.error('[Callback POST] Webhook 호출 실패:', webhookError);
            }
          }
        }
      } catch (approvalError) {
        console.error('[Callback POST] 승인 요청 실패:', approvalError);

        const failUrl = new URL('/payment/failed', BASE_URL);
        failUrl.searchParams.set('orderId', P_OID || '');
        failUrl.searchParams.set('error', '승인 요청 중 오류 발생');
        return NextResponse.redirect(failUrl);
      }
    } else {
      // P_REQ_URL이 없는 경우 (직접 승인 완료)
      console.log('[Callback POST] P_REQ_URL 없음 - 직접 승인 처리');

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
              pgTransactionId: P_TID,
              metadata: {
                ...(payment.metadata as any || {}),
                P_TYPE,
                P_AUTH_DT,
                P_AUTH_NO,
                P_RMESG1,
              },
            },
          });
        }
      }
    }

    // 성공 페이지로 리다이렉트
    const successUrl = new URL('/payment/success', BASE_URL);
    successUrl.searchParams.set('orderId', P_OID || '');

    console.log('[Callback POST] 성공 리다이렉트:', successUrl.toString());
    return NextResponse.redirect(successUrl);

  } catch (error) {
    console.error('[Callback POST] Error:', error);

    const failUrl = new URL('/payment/failed', BASE_URL);
    failUrl.searchParams.set('error', '결제 처리 중 오류가 발생했습니다.');
    return NextResponse.redirect(failUrl);
  }
}

/**
 * GET: 브라우저 직접 접근 시 처리
 */
export async function GET(req: NextRequest) {
  console.log('[Callback GET] 직접 접근 - 쿼리 파라미터 확인');

  const searchParams = req.nextUrl.searchParams;
  const P_STATUS = searchParams.get('P_STATUS');
  const P_OID = searchParams.get('P_OID');
  const P_RMESG1 = searchParams.get('P_RMESG1');

  console.log('[Callback GET] P_STATUS:', P_STATUS);
  console.log('[Callback GET] P_OID:', P_OID);
  console.log('[Callback GET] P_RMESG1:', P_RMESG1);

  // GET으로 온 경우에도 결과에 따라 리다이렉트
  const isSuccess = P_STATUS === '00';

  if (isSuccess) {
    const successUrl = new URL('/payment/success', BASE_URL);
    successUrl.searchParams.set('orderId', P_OID || '');
    return NextResponse.redirect(successUrl);
  } else {
    const failUrl = new URL('/payment/failed', BASE_URL);
    failUrl.searchParams.set('orderId', P_OID || '');
    failUrl.searchParams.set('error', P_RMESG1 || '결제 실패');
    return NextResponse.redirect(failUrl);
  }
}
