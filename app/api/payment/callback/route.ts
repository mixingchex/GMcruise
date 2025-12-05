export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPaymentSuccess } from '@/lib/welcomepay';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.cruisedot.co.kr';

/**
 * 결제 콜백 API v11.0 - 정밀 파트너 추적
 *
 * 결제 흐름:
 * 1. PG사에서 인증 결과를 이 API로 전송
 * 2. 인증 성공 시, P_REQ_URL로 승인 요청
 * 3. 승인 성공 시, DB 업데이트 + 실적 저장 + 자동화 실행
 * 4. 성공/실패 페이지로 리다이렉트
 *
 * [v11.0 Part 1] 데이터 파싱 및 '실종된 파트너' 찾기:
 * - 모바일: P_NOTI 필드에서 partnerId 추출
 * - PC: merchantData 필드에서 partnerId 추출
 * - 비상 복구: 둘 다 없으면 DB에서 최초 주문 기록 조회
 */
export async function POST(request: NextRequest) {
  try {
    // ============================================
    // [Part 1-1] PG사로부터 전달된 데이터 파싱
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
    // [Part 1-2] 모바일용: P_NOTI 파싱
    // 형식: "partnerId=xxx&productCode=yyy&affiliateCode=zzz"
    // ============================================
    const P_NOTI = formData.get('P_NOTI')?.toString() || '';
    const notiParams = new URLSearchParams(P_NOTI);
    const notiPartnerId = notiParams.get('partnerId') || '';
    const notiProductCode = notiParams.get('productCode') || '';
    const notiAffiliateCode = notiParams.get('affiliateCode') || '';

    // ============================================
    // [Part 1-3] PC용: merchantData 파싱
    // 형식: "partnerId=xxx&productCode=yyy"
    // ============================================
    const merchantData = formData.get('merchantData')?.toString() || '';
    const merchantParams = new URLSearchParams(merchantData);
    const merchantPartnerId = merchantParams.get('partnerId') || '';
    const merchantProductCode = merchantParams.get('productCode') || '';

    console.log('[Payment Callback v11.0] ===== Part 1: 데이터 수신 =====');
    console.log('[Payment Callback v11.0] 기본 데이터:', {
      P_STATUS,
      P_TID,
      P_OID,
      P_AMT,
      P_TYPE,
      P_REQ_URL: P_REQ_URL ? 'exists' : 'missing',
    });
    console.log('[Payment Callback v11.0] 모바일(P_NOTI):', {
      raw: P_NOTI || '(empty)',
      partnerId: notiPartnerId || '(empty)',
      productCode: notiProductCode || '(empty)',
      affiliateCode: notiAffiliateCode || '(empty)',
    });
    console.log('[Payment Callback v11.0] PC(merchantData):', {
      raw: merchantData || '(empty)',
      partnerId: merchantPartnerId || '(empty)',
      productCode: merchantProductCode || '(empty)',
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

    // ============================================
    // [Part 1-4] 승인 성공! 파트너 정보 비상 복구
    // ============================================
    console.log('[Payment Callback v11.0] ===== Part 1-4: 승인 성공, 파트너 복구 시작 =====');
    console.log('[Payment Callback v11.0] 승인 결과:', { finalOid, finalTid, finalAmt });

    // ⚠️ [핵심] DB에서 원본 주문 정보 조회 - 비상 복구용
    const payment = await prisma.payment.findUnique({
      where: { orderId: finalOid },
    });

    // ============================================
    // [Part 1-5] 파트너 정보 우선순위 병합
    // 우선순위: 1. P_NOTI(모바일) → 2. merchantData(PC) → 3. DB(비상복구)
    // ============================================

    // 1순위: P_NOTI (모바일 결제에서 전달)
    let finalPartnerId = notiPartnerId;
    let finalProductCode = notiProductCode;
    let finalAffiliateCode = notiAffiliateCode;
    let partnerSource = 'P_NOTI';

    // 2순위: merchantData (PC 결제에서 전달)
    if (!finalPartnerId && merchantPartnerId) {
      finalPartnerId = merchantPartnerId;
      partnerSource = 'merchantData';
    }
    if (!finalProductCode && merchantProductCode) {
      finalProductCode = merchantProductCode;
    }

    // 3순위: DB 비상 복구 (둘 다 없으면 DB에서 조회)
    if (!finalPartnerId && payment?.affiliateMallUserId) {
      finalPartnerId = payment.affiliateMallUserId;
      partnerSource = 'DB(비상복구)';
    }
    if (!finalAffiliateCode && payment?.affiliateCode) {
      finalAffiliateCode = payment.affiliateCode;
    }
    if (!finalProductCode && payment?.productCode) {
      finalProductCode = payment.productCode;
    }

    // 🔍 [검증 로그] 최종 파트너 정보
    console.log('[Payment Callback v11.0] ===== 파트너 정보 최종 결과 =====');
    console.log('[Payment Callback v11.0] 소스별 값:', {
      'P_NOTI': { partnerId: notiPartnerId || 'X', productCode: notiProductCode || 'X', affiliateCode: notiAffiliateCode || 'X' },
      'merchantData': { partnerId: merchantPartnerId || 'X', productCode: merchantProductCode || 'X' },
      'DB': { partnerId: payment?.affiliateMallUserId || 'X', productCode: payment?.productCode || 'X', affiliateCode: payment?.affiliateCode || 'X' },
    });
    console.log('[Payment Callback v11.0] 최종 선택:', {
      finalPartnerId: finalPartnerId || 'NONE ⚠️',
      finalProductCode: finalProductCode || 'NONE',
      finalAffiliateCode: finalAffiliateCode || 'NONE',
      partnerSource,
    });

    // 파트너 ID 검증 (boss1 등이 정확히 나오는지)
    if (finalPartnerId) {
      console.log(`[Payment Callback v11.0] ✅ 파트너 확인: "${finalPartnerId}" (출처: ${partnerSource})`);
    } else {
      console.log('[Payment Callback v11.0] ⚠️ 파트너 정보 없음! 실적 처리 불가');
    }

    if (!payment) {
      console.error('[Payment Callback v11.0] ⚠️ Payment not found in DB:', finalOid);
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

    // ============================================
    // [Part 3] Webhook 호출 (어필리에이트 처리, 이메일, Google Drive 자동화)
    // ============================================
    console.log('[Payment Callback v11.0] ===== Part 3: Webhook 호출 =====');

    const webhookPayload = {
      imp_uid: finalTid,
      merchant_uid: finalOid,
      status: 'paid',
      amount: parseInt(finalAmt) || payment.amount,
      // [v11.0] 병합된 정보 사용
      productCode: finalProductCode || payment.productCode,
      customerName: payment.buyerName,
      customerPhone: payment.buyerTel,
      customerEmail: payment.buyerEmail || '',
      metadata: payment.metadata || {},
      // [v11.0 핵심] 우선순위에 따라 병합된 파트너 정보
      affiliateCode: finalAffiliateCode,
      affiliateMallUserId: finalPartnerId,
      // 추가 디버그 정보
      _partnerSource: partnerSource,
    };

    // 🔍 [검증 로그] Webhook에 전달할 파트너 정보
    console.log('[Payment Callback v11.0] Webhook payload:', {
      orderId: finalOid,
      amount: webhookPayload.amount,
      affiliateMallUserId: webhookPayload.affiliateMallUserId || 'NONE ⚠️',
      affiliateCode: webhookPayload.affiliateCode || 'NONE',
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

      // 🔍 [검증 로그] Webhook 결과 - AffiliateSale, CommissionLedger 생성 여부 확인
      console.log('[Payment Callback v11.0] Webhook 결과:', {
        ok: webhookResult.ok,
        affiliateSaleCreated: webhookResult.affiliateSaleCreated || false,
        commissionCreated: webhookResult.commissionCreated || false,
        error: webhookResult.error || null,
      });

      if (webhookResult.affiliateSaleCreated) {
        console.log(`[Payment Callback v11.0] ✅ 실적 저장 성공! 파트너: ${finalPartnerId}`);
      } else if (finalPartnerId) {
        console.log(`[Payment Callback v11.0] ⚠️ 파트너(${finalPartnerId}) 있으나 실적 저장 실패`);
      }
    } catch (webhookError) {
      // Webhook 실패해도 결제는 성공으로 처리 (나중에 수동 처리 가능)
      console.error('[Payment Callback v11.0] ⚠️ Webhook 호출 실패:', webhookError);
    }

    console.log('[Payment Callback v11.0] ===== 결제 완료 =====');
    console.log(`[Payment Callback v11.0] 주문번호: ${finalOid}, 파트너: ${finalPartnerId || 'NONE'}, 출처: ${partnerSource}`);

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
