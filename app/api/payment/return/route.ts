export const dynamic = 'force-dynamic';

// 결제 완료 Return URL v12.0
// 웰컴페이먼츠 PC Web 결제 - 2단계 결제 흐름 (인증 → 승인)
// [v12.0] PC 결제 승인 API 호출 로직 추가 (매뉴얼 Page 25-27)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPaymentSuccess, getWelcomePayConfig, generateApprovalSignature, getTimestamp } from '@/lib/welcomepay';
import { log, error } from '@/lib/logger-wrapper';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * PC 결제 승인 API 호출 (매뉴얼 Page 26-27)
 * authUrl로 HTTPS POST 요청을 보내 최종 승인 처리
 */
async function requestPaymentApproval(
  authUrl: string,
  mid: string,
  authToken: string,
  price: number,
  timestamp: string,
  signature: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    log('[Payment Approval] Requesting approval to:', authUrl);
    log('[Payment Approval] Params:', { mid, authToken: authToken.substring(0, 20) + '...', price, timestamp });

    // URL 인코딩된 form data 생성
    const params = new URLSearchParams();
    params.append('mid', mid);
    params.append('authToken', authToken);
    params.append('price', price.toString());
    params.append('timestamp', timestamp);
    params.append('signature', signature);
    params.append('charset', 'UTF-8');
    params.append('format', 'JSON'); // JSON 응답 요청

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const responseText = await response.text();
    log('[Payment Approval] Response status:', response.status);
    log('[Payment Approval] Response body:', responseText.substring(0, 500));

    // JSON 파싱 시도
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // JSON이 아닌 경우 URL encoded 응답으로 처리
      const urlParams = new URLSearchParams(responseText);
      data = Object.fromEntries(urlParams.entries());
    }

    log('[Payment Approval] Parsed data:', data);

    // 승인 결과 확인 (resultCode가 0000 또는 00이면 성공)
    const approvalResultCode = data.resultCode || data.P_STATUS;
    if (isPaymentSuccess(approvalResultCode)) {
      return { success: true, data };
    } else {
      return {
        success: false,
        data,
        error: data.resultMsg || data.P_RMESG1 || '승인 실패'
      };
    }
  } catch (err) {
    error('[Payment Approval] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : '승인 요청 중 오류 발생'
    };
  }
}

/**
 * POST: 결제 인증 결과 수신 (PC Web) v12.0
 *
 * PC 결제 2단계 흐름:
 * 1. 결제창에서 인증 완료 → returnUrl로 authToken, authUrl 전달
 * 2. authUrl로 승인 API 요청 → 최종 결제 결과 수신
 * 3. 결과 페이지로 리다이렉트
 *
 * [v12.0] authToken/authUrl 수신 시 승인 API 호출 추가
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // === PC 결제 인증 결과 파라미터 (매뉴얼 Page 25) ===
    const resultCode = formData.get('resultCode') as string;
    const resultMsg = formData.get('resultMsg') as string;
    const mid = formData.get('mid') as string;
    const orderNumber = formData.get('orderNumber') as string; // PC에서는 orderNumber
    const authToken = formData.get('authToken') as string;
    const authUrl = formData.get('authUrl') as string;
    const netCancelUrl = formData.get('netCancelUrl') as string;
    const charset = formData.get('charset') as string;
    const merchantData = formData.get('merchantData') as string || '';

    // 모바일 호환 파라미터 (fallback)
    const mobileResultCode = formData.get('P_STATUS') as string;
    const mobileResultMsg = formData.get('P_RMESG1') as string;
    const mobileTid = formData.get('P_TID') as string;
    const mobileOrderId = formData.get('P_OID') as string;
    const mobileAmount = formData.get('P_AMT') as string;

    // merchantData 파싱 (어필리에이트 추적용)
    const merchantParams = new URLSearchParams(merchantData);
    const merchantPartnerId = merchantParams.get('partnerId') || '';
    const merchantProductCode = merchantParams.get('productCode') || '';

    log('[Payment Return v12.0] 인증 결과 수신:', {
      // PC 파라미터
      resultCode,
      resultMsg,
      mid,
      orderNumber,
      authToken: authToken ? authToken.substring(0, 30) + '...' : 'N/A',
      authUrl: authUrl || 'N/A',
      netCancelUrl: netCancelUrl || 'N/A',
      charset,
      merchantData: merchantData || '(empty)',
      // 모바일 파라미터
      mobileResultCode,
      mobileOrderId,
    });

    // orderId 결정 (PC: orderNumber, Mobile: P_OID)
    const orderId = orderNumber || mobileOrderId;

    // === PC 결제: 2단계 승인 처리 (authToken이 있으면 PC 결제) ===
    if (authToken && authUrl) {
      log('[Payment Return v12.0] PC 결제 감지 - 승인 API 호출 시작');

      // 인증 성공 확인
      if (!isPaymentSuccess(resultCode)) {
        error('[Payment Return v12.0] PC 인증 실패:', resultCode, resultMsg);

        // DB 업데이트 - 실패
        if (orderId) {
          await prisma.payment.update({
            where: { orderId },
            data: {
              status: 'failed',
              failedAt: new Date(),
              failureReason: resultMsg || '인증 실패',
            },
          }).catch(e => error('[Payment Return] DB update error:', e));
        }

        return NextResponse.redirect(
          new URL(`/payment/failed?orderId=${orderId}&error=${encodeURIComponent(resultMsg || '결제 인증 실패')}`, BASE_URL),
          303
        );
      }

      // DB에서 결제 정보 조회 (price 확인용)
      let paymentAmount = 0;
      let payment = null;
      if (orderId) {
        payment = await prisma.payment.findUnique({
          where: { orderId },
        });
        if (payment) {
          paymentAmount = payment.amount;
          log('[Payment Return v12.0] DB payment found:', { orderId, amount: paymentAmount });
        }
      }

      if (!paymentAmount) {
        error('[Payment Return v12.0] 결제 정보를 찾을 수 없음:', orderId);
        return NextResponse.redirect(
          new URL(`/payment/failed?orderId=${orderId}&error=${encodeURIComponent('결제 정보를 찾을 수 없습니다.')}`, BASE_URL),
          303
        );
      }

      // 승인 API용 서명 생성 (매뉴얼 Page 26)
      // 중요: 승인요청 signature는 authToken + timestamp로 생성 (결제요청과 다름!)
      const config = getWelcomePayConfig();
      const approvalTimestamp = getTimestamp();
      const approvalSignature = generateApprovalSignature(authToken, approvalTimestamp);

      log('[Payment Return v12.0] 승인 API 서명 생성:', {
        authTokenPreview: authToken.substring(0, 30) + '...',
        timestamp: approvalTimestamp,
        signaturePreview: approvalSignature.substring(0, 20) + '...',
      });

      // 승인 API 호출
      const approvalResult = await requestPaymentApproval(
        authUrl,
        mid || config.mid,
        authToken,
        paymentAmount,
        approvalTimestamp,
        approvalSignature
      );

      if (approvalResult.success && approvalResult.data) {
        // 승인 성공
        const approvalData = approvalResult.data;
        const tid = approvalData.tid || approvalData.TID || approvalData.P_TID;
        const authCode = approvalData.authCode || approvalData.AuthCode || approvalData.P_AUTH_NO;
        const authDate = approvalData.authDate || approvalData.AuthDate || approvalData.P_AUTH_DT;
        const payMethod = approvalData.payMethod || approvalData.PayMethod || approvalData.P_TYPE;

        log('[Payment Return v12.0] PC 승인 성공:', { tid, authCode, authDate, payMethod });

        // DB 업데이트 - 성공
        if (payment) {
          await prisma.payment.update({
            where: { orderId },
            data: {
              status: 'completed',
              paidAt: new Date(),
              pgTransactionId: tid,
              metadata: {
                ...(payment.metadata as any || {}),
                resultCode: approvalData.resultCode || '0000',
                resultMsg: approvalData.resultMsg || '승인완료',
                authCode,
                authDate,
                payMethod,
              },
            },
          });

          // 병합된 파트너 정보
          const finalPartnerId = payment.affiliateMallUserId || merchantPartnerId || '';
          const finalProductCode = payment.productCode || merchantProductCode || '';

          log('[Payment Return v12.0] DB + merchantData 병합:', {
            orderId,
            db_affiliateMallUserId: payment.affiliateMallUserId || 'N/A',
            db_productCode: payment.productCode || 'N/A',
            merchant_partnerId: merchantPartnerId || 'N/A',
            merchant_productCode: merchantProductCode || 'N/A',
            final_partnerId: finalPartnerId || 'NONE',
            final_productCode: finalProductCode || 'NONE',
          });

          // 웹훅 호출
          try {
            await fetch(`${BASE_URL}/api/payment/webhook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-internal-webhook-secret': process.env.INTERNAL_WEBHOOK_SECRET || '' },
              body: JSON.stringify({
                imp_uid: tid,
                merchant_uid: orderId,
                status: 'paid',
                amount: paymentAmount,
                productCode: finalProductCode,
                customerName: payment.buyerName,
                customerPhone: payment.buyerTel,
                customerEmail: payment.buyerEmail || '',
                metadata: payment.metadata || {},
                affiliateCode: payment.affiliateCode,
                affiliateMallUserId: finalPartnerId,
              }),
            });
          } catch (webhookErr) {
            error('[Payment Return v12.0] Webhook 호출 실패:', webhookErr);
          }
        }

        return NextResponse.redirect(
          new URL(`/payment/success?orderId=${orderId}`, BASE_URL),
          303
        );
      } else {
        // 승인 실패
        error('[Payment Return v12.0] PC 승인 실패:', approvalResult.error);

        // DB 업데이트 - 실패
        if (payment) {
          await prisma.payment.update({
            where: { orderId },
            data: {
              status: 'failed',
              failedAt: new Date(),
              failureReason: approvalResult.error || '승인 실패',
            },
          });
        }

        // 망취소 호출 (매뉴얼 권장)
        // 망취소도 승인요청과 동일한 signature 사용 (authToken + timestamp)
        if (netCancelUrl) {
          try {
            log('[Payment Return v12.0] 망취소 요청:', netCancelUrl);
            await fetch(netCancelUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                mid: mid || config.mid,
                authToken,
                price: paymentAmount.toString(),
                timestamp: approvalTimestamp,
                signature: approvalSignature,
                charset: 'UTF-8',
              }).toString(),
            });
          } catch (cancelErr) {
            error('[Payment Return v12.0] 망취소 실패:', cancelErr);
          }
        }

        return NextResponse.redirect(
          new URL(`/payment/failed?orderId=${orderId}&error=${encodeURIComponent(approvalResult.error || '결제 승인 실패')}`, BASE_URL),
          303
        );
      }
    }

    // === 기존 로직: 모바일 또는 직접 결과 수신 (Legacy 호환) ===
    log('[Payment Return v12.0] Legacy/Mobile 결제 처리');

    // 결과 파라미터 (기존 방식 호환)
    const legacyResultCode = resultCode || mobileResultCode;
    const legacyResultMsg = resultMsg || mobileResultMsg;
    const tid = formData.get('tid') as string || mobileTid;
    const amount = formData.get('TotPrice') as string || mobileAmount;
    const authCode = formData.get('AuthCode') as string || formData.get('P_AUTH_NO') as string;
    const authDate = formData.get('AuthDate') as string || formData.get('P_AUTH_DT') as string;
    const payMethod = formData.get('PayMethod') as string || formData.get('P_TYPE') as string;

    // 결제 성공 여부 확인
    const isSuccess = isPaymentSuccess(legacyResultCode);

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
                resultCode: legacyResultCode,
                resultMsg: legacyResultMsg,
                authCode,
                authDate,
                payMethod,
              },
            },
          });

          // [v11.0] DB + merchantData 병합 (DB 우선, 없으면 merchantData 사용)
          const finalPartnerId = payment.affiliateMallUserId || merchantPartnerId || '';
          const finalProductCode = payment.productCode || merchantProductCode || '';

          log('[Payment Return v11.0] DB + merchantData 병합:', {
            orderId,
            db_affiliateMallUserId: payment.affiliateMallUserId || 'N/A',
            db_productCode: payment.productCode || 'N/A',
            merchant_partnerId: merchantPartnerId || 'N/A',
            merchant_productCode: merchantProductCode || 'N/A',
            final_partnerId: finalPartnerId || 'NONE',
            final_productCode: finalProductCode || 'NONE',
          });

          // 결제 완료 웹훅 호출
          try {
            await fetch(`${BASE_URL}/api/payment/webhook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-internal-webhook-secret': process.env.INTERNAL_WEBHOOK_SECRET || '' },
              body: JSON.stringify({
                imp_uid: tid,
                merchant_uid: orderId,
                status: 'paid',
                amount: parseInt(amount),
                // [v11.0] 병합된 정보 사용
                productCode: finalProductCode,
                customerName: payment.buyerName,
                customerPhone: payment.buyerTel,
                customerEmail: payment.buyerEmail || '',
                metadata: payment.metadata || {},
                affiliateCode: payment.affiliateCode,
                affiliateMallUserId: finalPartnerId,
              }),
            });
          } catch (webhookErr) {
            error('[Payment Return v11.0] Webhook 호출 실패:', webhookErr);
          }
        } else {
          await prisma.payment.update({
            where: { orderId },
            data: {
              status: 'failed',
              failedAt: new Date(),
              failureReason: legacyResultMsg || '결제 실패',
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
        new URL(`/payment/failed?orderId=${orderId}&error=${encodeURIComponent(legacyResultMsg || '결제 실패')}`, BASE_URL),
        303
      );
    }
  } catch (err) {
    error('[Payment Return v12.0] Error:', err);
    return NextResponse.redirect(
      new URL(`/payment/failed?error=${encodeURIComponent('결제 처리 중 오류가 발생했습니다.')}`, BASE_URL),
      303
    );
  }
}

/**
 * GET: 결제 완료 결과 수신 (일부 PG는 GET으로 전달) v11.0
 * [v11.0] merchantData 파싱 추가
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const resultCode = searchParams.get('resultCode') || searchParams.get('P_STATUS');
  const resultMsg = searchParams.get('resultMsg') || searchParams.get('P_RMESG1');
  const tid = searchParams.get('tid') || searchParams.get('P_TID');
  const orderId = searchParams.get('MOID') || searchParams.get('P_OID');
  const amount = searchParams.get('TotPrice') || searchParams.get('P_AMT');

  // [v11.0] merchantData 파싱
  const merchantData = searchParams.get('merchantData') || '';
  const merchantParams = new URLSearchParams(merchantData);
  const merchantPartnerId = merchantParams.get('partnerId') || '';
  const merchantProductCode = merchantParams.get('productCode') || '';

  log('[Payment Return GET v11.0]:', {
    resultCode,
    resultMsg,
    tid,
    orderId,
    merchantData: merchantData || '(empty)',
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

        // [v11.0] DB + merchantData 병합
        const finalPartnerId = payment.affiliateMallUserId || merchantPartnerId || '';
        const finalProductCode = payment.productCode || merchantProductCode || '';

        // 웹훅 호출
        try {
          await fetch(`${BASE_URL}/api/payment/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-webhook-secret': process.env.INTERNAL_WEBHOOK_SECRET || '' },
            body: JSON.stringify({
              imp_uid: tid,
              merchant_uid: orderId,
              status: 'paid',
              amount: parseInt(amount || '0'),
              // [v11.0] 병합된 정보 사용
              productCode: finalProductCode,
              customerName: payment.buyerName,
              customerPhone: payment.buyerTel,
              customerEmail: payment.buyerEmail || '',
              metadata: payment.metadata || {},
              affiliateCode: payment.affiliateCode,
              affiliateMallUserId: finalPartnerId,
            }),
          });
        } catch (webhookErr) {
          error('[Payment Return GET v11.0] Webhook error:', webhookErr);
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
