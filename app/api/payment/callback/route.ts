export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPaymentSuccess } from '@/lib/welcomepay';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.cruisedot.co.kr';

/**
 * 결제 콜백 API v12.0 - 데이터 복구 및 자동화 완성
 *
 * [핵심 로직] 파트너 정보 '3중 확인' (Data Recovery)
 * 1. PC: merchantData 필드 파싱
 * 2. Mobile: P_NOTI 필드 파싱
 * 3. DB 조회 (Fail-Safe): 위 두 가지 실패 시 orderId로 Payment 테이블 조회
 */
export async function POST(request: NextRequest) {
  try {
    // ============================================
    // [Step 1] PG사로부터 전달된 데이터 파싱
    // ============================================
    const formData = await request.formData();
    const P_STATUS = formData.get('P_STATUS')?.toString() || '';
    const P_TID = formData.get('P_TID')?.toString() || '';
    const P_REQ_URL = formData.get('P_REQ_URL')?.toString() || '';
    const P_RMESG1 = formData.get('P_RMESG1')?.toString() || '';
    const P_OID = formData.get('P_OID')?.toString() || '';
    const P_AMT = formData.get('P_AMT')?.toString() || '';
    const P_TYPE = formData.get('P_TYPE')?.toString() || '';

    // ============================================
    // [Step 2] 파트너 정보 추출 - 3중 확인 시작
    // ============================================

    // 2-1. PC용: merchantData 파싱
    const merchantData = formData.get('merchantData')?.toString() || '';
    const merchantParams = new URLSearchParams(merchantData);
    const merchantPartnerId = merchantParams.get('partnerId') || '';
    const merchantProductCode = merchantParams.get('productCode') || '';

    // 2-2. Mobile용: P_NOTI 파싱
    const P_NOTI = formData.get('P_NOTI')?.toString() || '';
    const notiParams = new URLSearchParams(P_NOTI);
    const notiPartnerId = notiParams.get('partnerId') || '';
    const notiProductCode = notiParams.get('productCode') || '';

    console.log('[Callback v12.0] ===== 데이터 수신 =====');
    console.log('[Callback v12.0] 기본:', { P_STATUS, P_TID, P_OID, P_AMT, P_TYPE });
    console.log('[Callback v12.0] PC(merchantData):', { raw: merchantData || '(empty)', partnerId: merchantPartnerId });
    console.log('[Callback v12.0] Mobile(P_NOTI):', { raw: P_NOTI || '(empty)', partnerId: notiPartnerId });

    // ============================================
    // [Step 3] 인증 실패 시 바로 실패 페이지로
    // ============================================
    if (P_STATUS !== '00') {
      console.log('[Callback v12.0] 인증 실패:', P_RMESG1);
      return NextResponse.redirect(
        new URL(`/payment/failed?message=${encodeURIComponent(P_RMESG1 || 'AuthFailed')}`, request.url),
        303
      );
    }

    // ============================================
    // [Step 4] 인증 성공 → PG사로 승인 요청 (Server-to-Server)
    // ============================================
    if (!P_REQ_URL || !P_TID) {
      console.error('[Callback v12.0] Missing P_REQ_URL or P_TID');
      return NextResponse.redirect(new URL('/payment/failed?message=InvalidRequest', request.url), 303);
    }

    const approvalData = new URLSearchParams();
    approvalData.append('P_TID', P_TID);
    approvalData.append('P_MID', 'wpcrdot200');

    console.log('[Callback v12.0] 승인 요청 전송:', P_REQ_URL);

    const approvalRes = await fetch(P_REQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=EUC-KR' },
      body: approvalData,
    });

    const approvalText = await approvalRes.text();
    console.log('[Callback v12.0] 승인 응답:', approvalText.substring(0, 500));

    // 승인 결과 파싱
    const approvalParams = new URLSearchParams(approvalText);
    const finalStatus = approvalParams.get('P_STATUS') || '';
    const finalOid = approvalParams.get('P_OID') || P_OID;
    const finalTid = approvalParams.get('P_TID') || P_TID;
    const finalAmt = approvalParams.get('P_AMT') || P_AMT;
    const finalType = approvalParams.get('P_TYPE') || P_TYPE;
    const P_AUTH_NO = approvalParams.get('P_AUTH_NO') || '';
    const P_AUTH_DT = approvalParams.get('P_AUTH_DT') || '';
    const finalMsg = approvalParams.get('P_RMESG1') || '';

    // ============================================
    // [Step 5] 승인 실패 처리
    // ============================================
    if (!isPaymentSuccess(finalStatus)) {
      console.log('[Callback v12.0] 승인 실패:', finalMsg);

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
        new URL(`/payment/failed?message=${encodeURIComponent(finalMsg || 'ApprovalFailed')}`, request.url),
        303
      );
    }

    // ============================================
    // [Step 6] 승인 성공! 3중 파트너 정보 복구
    // ============================================
    console.log('[Callback v12.0] ===== 승인 성공, 파트너 복구 시작 =====');

    // 6-1. DB에서 원본 주문 정보 조회 (3순위 비상 복구용)
    const payment = await prisma.payment.findUnique({
      where: { orderId: finalOid },
    });

    // 6-2. 파트너 정보 우선순위 병합
    // 우선순위: 1. merchantData(PC) → 2. P_NOTI(모바일) → 3. DB(비상복구)
    let finalPartnerId = merchantPartnerId || notiPartnerId;
    let finalProductCode = merchantProductCode || notiProductCode;
    let partnerSource = merchantPartnerId ? 'merchantData(PC)' : (notiPartnerId ? 'P_NOTI(Mobile)' : 'none');

    // 3순위: DB 비상 복구 (둘 다 없으면 DB에서 조회)
    if (!finalPartnerId && payment?.affiliateMallUserId) {
      finalPartnerId = payment.affiliateMallUserId;
      partnerSource = 'DB(비상복구)';
      console.log('[Callback v12.0] 파트너 정보 유실 → DB 복구 성공:', finalPartnerId);
    }
    if (!finalProductCode && payment?.productCode) {
      finalProductCode = payment.productCode;
    }

    console.log('[Callback v12.0] ===== 파트너 정보 최종 결과 =====');
    console.log('[Callback v12.0] 최종:', {
      partnerId: finalPartnerId || 'NONE ⚠️',
      productCode: finalProductCode || 'NONE',
      source: partnerSource,
    });

    // ============================================
    // [Step 7] Payment DB 상태 업데이트
    // ============================================
    if (!payment) {
      console.error('[Callback v12.0] ⚠️ Payment not found in DB:', finalOid);
      // 결제 정보 없어도 PG 승인은 됐으므로 성공 페이지로
      return NextResponse.redirect(
        new URL(`/payment/success?orderId=${finalOid}&tid=${finalTid}`, request.url),
        303
      );
    }

    // 이미 완료된 결제는 스킵 (중복 처리 방지)
    if (payment.status === 'completed') {
      console.log('[Callback v12.0] Already completed:', finalOid);
      return NextResponse.redirect(
        new URL(`/payment/success?orderId=${finalOid}&tid=${finalTid}`, request.url),
        303
      );
    }

    // Payment 상태 완료로 변경
    await prisma.payment.update({
      where: { orderId: finalOid },
      data: {
        status: 'completed',
        paidAt: new Date(),
        pgTransactionId: finalTid,
        metadata: {
          ...(payment.metadata as object || {}),
          P_STATUS: finalStatus,
          P_RMESG1: finalMsg,
          P_TYPE: finalType,
          P_AUTH_NO,
          P_AUTH_DT,
          callbackReceivedAt: new Date().toISOString(),
        },
      },
    });

    console.log('[Callback v12.0] ✅ Payment 상태 업데이트 완료');

    // ============================================
    // [Step 8] Webhook 호출 (어필리에이트 실적 + 자동화)
    // ============================================
    console.log('[Callback v12.0] ===== Webhook 호출 =====');

    const webhookPayload = {
      imp_uid: finalTid,
      merchant_uid: finalOid,
      status: 'paid',
      amount: parseInt(finalAmt) || payment.amount,
      productCode: finalProductCode || payment.productCode,
      customerName: payment.buyerName,
      customerPhone: payment.buyerTel,
      customerEmail: payment.buyerEmail || '',
      metadata: payment.metadata || {},
      // [v12.0 핵심] 3중 확인으로 복구된 파트너 정보
      affiliateCode: payment.affiliateCode || '',
      affiliateMallUserId: finalPartnerId,
      _partnerSource: partnerSource,
    };

    console.log('[Callback v12.0] Webhook payload:', {
      orderId: finalOid,
      amount: webhookPayload.amount,
      affiliateMallUserId: webhookPayload.affiliateMallUserId || 'NONE ⚠️',
      productCode: webhookPayload.productCode || 'NONE',
      partnerSource,
    });

    try {
      const webhookResponse = await fetch(`${BASE_URL}/api/payment/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      const webhookResult = await webhookResponse.json();

      console.log('[Callback v12.0] Webhook 결과:', {
        ok: webhookResult.ok,
        affiliateSaleCreated: webhookResult.affiliateSaleCreated || false,
        commissionCreated: webhookResult.commissionCreated || false,
        saleId: webhookResult.saleId || null,
        error: webhookResult.error || null,
      });

      if (webhookResult.affiliateSaleCreated) {
        console.log(`[Callback v12.0] ✅ 어필리에이트 실적 저장 완료! 파트너: ${finalPartnerId}`);
      } else if (finalPartnerId) {
        console.log(`[Callback v12.0] ⚠️ 파트너(${finalPartnerId}) 있으나 실적 저장 실패`);
      }

    } catch (webhookError) {
      // Webhook 실패해도 결제는 성공으로 처리 (나중에 수동 처리 가능)
      console.error('[Callback v12.0] ⚠️ Webhook 호출 실패:', webhookError);
    }

    // ============================================
    // [Step 9] 성공 페이지로 리다이렉트
    // ============================================
    console.log('[Callback v12.0] ===== 결제 완료 =====');
    console.log(`[Callback v12.0] 주문: ${finalOid}, 파트너: ${finalPartnerId || 'NONE'}, 출처: ${partnerSource}`);

    return NextResponse.redirect(
      new URL(`/payment/success?orderId=${finalOid}&tid=${finalTid}`, request.url),
      303
    );

  } catch (error) {
    console.error('[Callback v12.0 Error]', error);
    return NextResponse.redirect(
      new URL('/payment/failed?message=Server_Error', request.url),
      303
    );
  }
}

/**
 * GET 요청 처리 (일부 PG사는 GET으로 콜백을 보내는 경우가 있음)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const P_STATUS = searchParams.get('P_STATUS') || '';
  const P_TID = searchParams.get('P_TID') || '';
  const P_OID = searchParams.get('P_OID') || '';

  console.log('[Callback v12.0 GET] Received:', { P_STATUS, P_TID, P_OID });

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
