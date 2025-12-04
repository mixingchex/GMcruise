export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPaymentSuccess } from '@/lib/welcomepay';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.cruisedot.co.kr';

/**
 * 결제 콜백 API (모바일 결제용)
 *
 * 모바일 결제 흐름:
 * 1. PG사에서 인증 결과를 이 API로 전송 (P_STATUS, P_TID, P_REQ_URL)
 * 2. 인증 성공 시, P_REQ_URL로 승인 요청
 * 3. 승인 성공 시, DB 업데이트 + Webhook 호출 (자동화 처리)
 * 4. 성공/실패 페이지로 리다이렉트
 */
export async function POST(request: NextRequest) {
  try {
    // 1. PG사로부터 전달된 데이터 파싱
    const formData = await request.formData();
    const P_STATUS = formData.get('P_STATUS')?.toString() || '';
    const P_TID = formData.get('P_TID')?.toString() || '';
    const P_REQ_URL = formData.get('P_REQ_URL')?.toString() || '';
    const P_RMESG1 = formData.get('P_RMESG1')?.toString() || '';
    const P_OID = formData.get('P_OID')?.toString() || '';
    const P_AMT = formData.get('P_AMT')?.toString() || '';
    const P_TYPE = formData.get('P_TYPE')?.toString() || '';

    console.log('[Payment Callback] Received:', {
      P_STATUS,
      P_TID,
      P_OID,
      P_AMT,
      P_TYPE,
      P_REQ_URL: P_REQ_URL ? 'exists' : 'missing'
    });

    // 2. 인증 실패 시 바로 실패 페이지로 이동
    if (P_STATUS !== '00') {
      console.log('[Payment Callback] Auth failed:', P_RMESG1);
      return NextResponse.redirect(
        new URL(`/payment/failed?message=AuthFailed&reason=${encodeURIComponent(P_RMESG1)}`, request.url),
        303
      );
    }

    // 3. [핵심] 인증 성공 시, PG사로 "승인 요청" 보내기 (Server-to-Server)
    if (!P_REQ_URL || !P_TID) {
      console.error('[Payment Callback] Missing P_REQ_URL or P_TID');
      return NextResponse.redirect(
        new URL('/payment/failed?message=InvalidRequest', request.url),
        303
      );
    }

    const approvalData = new URLSearchParams();
    approvalData.append('P_TID', P_TID);
    approvalData.append('P_MID', 'wpcrdot200'); // 운영 상점ID

    console.log('[Payment Callback] Sending approval request to:', P_REQ_URL);

    const approvalRes = await fetch(P_REQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=EUC-KR',
      },
      body: approvalData,
    });

    const approvalText = await approvalRes.text();
    console.log('[Payment Callback] Approval response:', approvalText.substring(0, 500));

    // 4. 승인 결과 파싱
    const approvalParams = new URLSearchParams(approvalText);
    const finalStatus = approvalParams.get('P_STATUS') || '';
    const finalOid = approvalParams.get('P_OID') || P_OID;
    const finalTid = approvalParams.get('P_TID') || P_TID;
    const finalAmt = approvalParams.get('P_AMT') || P_AMT;
    const finalType = approvalParams.get('P_TYPE') || P_TYPE;
    const P_AUTH_NO = approvalParams.get('P_AUTH_NO') || '';
    const P_AUTH_DT = approvalParams.get('P_AUTH_DT') || '';
    const finalMsg = approvalParams.get('P_RMESG1') || '';

    // 5. 승인 실패 처리
    if (!isPaymentSuccess(finalStatus)) {
      console.log('[Payment Callback] Approval failed:', finalMsg);

      // DB 실패 상태 업데이트
      if (finalOid) {
        await prisma.payment.updateMany({
          where: { orderId: finalOid },
          data: {
            status: 'failed',
            failedAt: new Date(),
            failureReason: finalMsg || 'Approval Failed',
            pgTransactionId: finalTid || undefined,
          },
        });
      }

      return NextResponse.redirect(
        new URL(`/payment/failed?message=ApprovalFailed&reason=${encodeURIComponent(finalMsg)}`, request.url),
        303
      );
    }

    // 6. 승인 성공! DB 업데이트 및 Webhook 호출
    console.log('[Payment Callback] Approval success:', { finalOid, finalTid, finalAmt });

    // ⚠️ [핵심] DB에서 원본 주문 정보 조회 - 여기서 affiliateCode를 가져와야 실적이 잡힘!
    const payment = await prisma.payment.findUnique({
      where: { orderId: finalOid },
    });

    // 🔍 [검증 로그] DB에서 찾은 파트너 정보 확인
    console.log('[Payment Callback] DB Lookup Result:', {
      orderId: finalOid,
      found: !!payment,
      affiliateCode: payment?.affiliateCode || 'N/A',
      affiliateMallUserId: payment?.affiliateMallUserId || 'N/A',
      productCode: payment?.productCode || 'N/A',
    });

    if (!payment) {
      console.error('[Payment Callback] ⚠️ Payment not found in DB:', finalOid);
      // 결제 정보가 없어도 성공 페이지로 이동 (PG 승인은 됐으므로)
      return NextResponse.redirect(
        new URL(`/payment/success?orderId=${finalOid}&tid=${finalTid}`, request.url),
        303
      );
    }

    // 이미 완료된 결제는 스킵 (중복 처리 방지)
    if (payment.status === 'completed') {
      console.log('[Payment Callback] Already completed:', finalOid);
      return NextResponse.redirect(
        new URL(`/payment/success?orderId=${finalOid}&tid=${finalTid}`, request.url),
        303
      );
    }

    // DB 업데이트
    await prisma.payment.update({
      where: { orderId: finalOid },
      data: {
        status: 'completed',
        paidAt: new Date(),
        pgTransactionId: finalTid,
        metadata: {
          ...(payment.metadata as any || {}),
          P_STATUS: finalStatus,
          P_RMESG1: finalMsg,
          P_TYPE: finalType,
          P_AUTH_NO,
          P_AUTH_DT,
          callbackReceivedAt: new Date().toISOString(),
        },
      },
    });

    // 7. Webhook 호출 (어필리에이트 처리, 이메일, Google Drive 자동화)
    // ⚠️ [핵심] DB에서 조회한 affiliateCode를 반드시 전달해야 실적이 잡힘!
    const webhookPayload = {
      imp_uid: finalTid,
      merchant_uid: finalOid,
      status: 'paid',
      amount: parseInt(finalAmt) || payment.amount,
      productCode: payment.productCode,
      customerName: payment.buyerName,
      customerPhone: payment.buyerTel,
      customerEmail: payment.buyerEmail || '',
      metadata: payment.metadata || {},
      // ⚠️ [중요] DB에서 조회한 파트너 정보 - 이게 있어야 실적이 잡힘!
      affiliateCode: payment.affiliateCode,
      affiliateMallUserId: payment.affiliateMallUserId,
    };

    // 🔍 [검증 로그] Webhook에 전달할 파트너 정보
    console.log('[Payment Callback] Webhook payload - Partner Info:', {
      affiliateCode: webhookPayload.affiliateCode || 'NONE',
      affiliateMallUserId: webhookPayload.affiliateMallUserId || 'NONE',
      orderId: finalOid,
    });

    try {
      const webhookResponse = await fetch(`${BASE_URL}/api/payment/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      const webhookResult = await webhookResponse.json();

      // 🔍 [검증 로그] Webhook 결과 - AffiliateSale, CommissionLedger 생성 여부 확인
      console.log('[Payment Callback] Webhook result:', {
        ok: webhookResult.ok,
        affiliateSaleCreated: webhookResult.affiliateSaleCreated || false,
        commissionCreated: webhookResult.commissionCreated || false,
        error: webhookResult.error || null,
      });
    } catch (webhookError) {
      // Webhook 실패해도 결제는 성공으로 처리 (나중에 수동 처리 가능)
      console.error('[Payment Callback] ⚠️ Webhook error:', webhookError);
    }

    console.log('[Payment Callback] Payment completed successfully:', finalOid);

    // 8. 성공 페이지로 리다이렉트
    return NextResponse.redirect(
      new URL(`/payment/success?orderId=${finalOid}&tid=${finalTid}`, request.url),
      303
    );

  } catch (error) {
    console.error('[Payment Callback Error]', error);
    return NextResponse.redirect(
      new URL('/payment/failed?message=ServerError', request.url),
      303
    );
  }
}

/**
 * GET 요청도 처리 (일부 PG사는 GET으로 콜백을 보내는 경우가 있음)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // URL 파라미터를 FormData처럼 변환
  const P_STATUS = searchParams.get('P_STATUS') || '';
  const P_TID = searchParams.get('P_TID') || '';
  const P_OID = searchParams.get('P_OID') || '';

  console.log('[Payment Callback GET] Received:', { P_STATUS, P_TID, P_OID });

  if (P_STATUS === '00' && P_OID) {
    return NextResponse.redirect(
      new URL(`/payment/success?orderId=${P_OID}&tid=${P_TID}`, request.url),
      303
    );
  }

  return NextResponse.redirect(
    new URL('/payment/failed?message=InvalidRequest', request.url),
    303
  );
}
