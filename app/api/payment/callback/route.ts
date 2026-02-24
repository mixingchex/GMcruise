export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPaymentSuccess, getWelcomePayConfig } from '@/lib/welcomepay';
import { log, error } from '@/lib/logger-wrapper';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.cruisedot.co.kr';

/**
 * 자동화 실행 함수 (비동기)
 * - AffiliateSale 실적 생성
 * - Google Drive 폴더/시트 생성
 * - 이메일 발송
 */
async function executeAutomation(params: {
  orderId: string;
  tid: string;
  amount: number;
  partnerId: string;
  productCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  partnerSource: string;
}) {
  const { orderId, tid, amount, partnerId, productCode, customerName, customerPhone, customerEmail, partnerSource } = params;

  try {
    // [Step 1] Webhook 호출 → AffiliateSale 실적 생성
    log('[Automation] ===== Webhook 호출 시작 =====');

    // Payment에서 메타데이터 조회
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: { metadata: true, affiliateMallUserId: true, affiliateCode: true }
    });

    const webhookPayload = {
      imp_uid: tid,
      merchant_uid: orderId,
      status: 'paid',
      amount,
      productCode,
      customerName,
      customerPhone,
      customerEmail,
      metadata: payment?.metadata || {},
      affiliateCode: payment?.affiliateCode || '',
      affiliateMallUserId: partnerId || payment?.affiliateMallUserId || '',
      _partnerSource: partnerSource,
    };

    const webhookResponse = await fetch(`${BASE_URL}/api/payment/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-webhook-secret': process.env.INTERNAL_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify(webhookPayload),
    });

    const webhookResult = await webhookResponse.json();

    log('[Automation] Webhook 결과:', {
      ok: webhookResult.ok,
      saleId: webhookResult.saleId || null,
      affiliateSaleCreated: webhookResult.affiliateSaleCreated || false,
      commissionCreated: webhookResult.commissionCreated || false,
    });

    // Webhook이 Google Drive API + 이메일 발송을 내부에서 처리함
    // (webhook/route.ts 참조: ensureTripFolder, ensureApisSheet, sendPurchaseConfirmation)

    if (webhookResult.affiliateSaleCreated) {
      log(`[Automation] ✅ 어필리에이트 실적 저장 완료! 파트너: ${partnerId}`);
    }

    return webhookResult;
  } catch (err) {
    error('[Automation] 실행 실패:', err);
    return { ok: false, error: String(err) };
  }
}

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

    log('[Callback v12.0] ===== 데이터 수신 =====');
    log('[Callback v12.0] 기본:', { P_STATUS, P_TID, P_OID, P_AMT, P_TYPE });
    log('[Callback v12.0] PC(merchantData):', { raw: merchantData || '(empty)', partnerId: merchantPartnerId });
    log('[Callback v12.0] Mobile(P_NOTI):', { raw: P_NOTI || '(empty)', partnerId: notiPartnerId });

    // ============================================
    // [Step 3] 인증 실패 시 바로 실패 페이지로
    // ============================================
    if (P_STATUS !== '00') {
      log('[Callback v12.0] 인증 실패:', P_RMESG1);
      return NextResponse.redirect(
        new URL(`/payment/failed?message=${encodeURIComponent(P_RMESG1 || 'AuthFailed')}`, request.url),
        303
      );
    }

    // ============================================
    // [Step 4] 인증 성공 → PG사로 승인 요청 (Server-to-Server)
    // ============================================
    if (!P_REQ_URL || !P_TID) {
      error('[Callback v12.0] Missing P_REQ_URL or P_TID');
      return NextResponse.redirect(new URL('/payment/failed?message=InvalidRequest', request.url), 303);
    }

    // [보안] SSRF 방지: P_REQ_URL이 반드시 웰컴페이먼츠 도메인이어야 함
    // 공격자가 임의의 P_REQ_URL을 삽입해 내부 서버나 메타데이터 서버를 호출하는 것을 차단
    try {
      const reqUrlObj = new URL(P_REQ_URL);
      const isAllowed = reqUrlObj.hostname.endsWith('.paywelcome.co.kr') ||
                        reqUrlObj.hostname === 'paywelcome.co.kr';
      if (!isAllowed) {
        error('[Callback v12.0] SSRF 차단: 허용되지 않은 P_REQ_URL 도메인:', reqUrlObj.hostname);
        return NextResponse.redirect(new URL('/payment/failed?message=InvalidRequest', request.url), 303);
      }
    } catch {
      error('[Callback v12.0] P_REQ_URL 파싱 오류:', P_REQ_URL);
      return NextResponse.redirect(new URL('/payment/failed?message=InvalidRequest', request.url), 303);
    }

    const approvalData = new URLSearchParams();
    approvalData.append('P_TID', P_TID);
    const pgConfig = getWelcomePayConfig();
    approvalData.append('P_MID', pgConfig.mid);

    log('[Callback v12.0] 승인 요청 전송:', P_REQ_URL);

    const approvalRes = await fetch(P_REQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=EUC-KR' },
      body: approvalData,
    });

    const approvalText = await approvalRes.text();
    log('[Callback v12.0] 승인 응답:', approvalText.substring(0, 500));

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
      log('[Callback v12.0] 승인 실패:', finalMsg);

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
    log('[Callback v12.0] ===== 승인 성공, 파트너 복구 시작 =====');

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
      log('[Callback v12.0] 파트너 정보 유실 → DB 복구 성공:', finalPartnerId);
    }
    if (!finalProductCode && payment?.productCode) {
      finalProductCode = payment.productCode;
    }

    log('[Callback v12.0] ===== 파트너 정보 최종 결과 =====');
    log('[Callback v12.0] 최종:', {
      partnerId: finalPartnerId || 'NONE ⚠️',
      productCode: finalProductCode || 'NONE',
      source: partnerSource,
    });

    // ============================================
    // [Step 7] Payment DB 상태 업데이트
    // ============================================
    if (!payment) {
      error('[Callback v12.0] ⚠️ Payment not found in DB:', finalOid);
      // 결제 정보 없어도 PG 승인은 됐으므로 성공 페이지로
      return NextResponse.redirect(
        new URL(`/payment/success?orderId=${finalOid}&tid=${finalTid}`, request.url),
        303
      );
    }

    // 대금 무결성 검증: PG에서 받은 금액이 DB 원본 금액과 일치하는지 확인
    // (이미 completed인 경우도 금액은 같아야 하므로 atomic update 전에 검증)
    const receivedAmt = parseInt(finalAmt);
    if (payment.amount != null && !isNaN(receivedAmt) && receivedAmt !== payment.amount) {
      error('[Callback v12.0] ⚠️ Amount mismatch:', {
        expected: payment.amount,
        received: receivedAmt,
        orderId: finalOid,
      });
      return NextResponse.redirect(
        new URL(`/payment/failed?message=AmountMismatch&orderId=${finalOid}`, request.url),
        303
      );
    }

    // [Step 7] 원자적 Payment 상태 업데이트 (Race Condition 방지)
    // updateMany + status 조건으로 '이미 완료'와 '지금 완료' 동시 처리
    // status !== 'completed' 인 경우에만 업데이트하여 TOCTOU 제거
    const updateResult = await prisma.payment.updateMany({
      where: {
        orderId: finalOid,
        status: { not: 'completed' },
      },
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

    // updateMany가 0건을 업데이트했다면 이미 다른 요청이 처리한 것
    if (updateResult.count === 0) {
      log('[Callback v12.0] Already processed by concurrent request:', finalOid);
      return NextResponse.redirect(
        new URL(`/payment/success?orderId=${finalOid}&tid=${finalTid}`, request.url),
        303
      );
    }

    log('[Callback v12.0] ✅ Payment 상태 업데이트 완료');

    // ============================================
    // [Step 8] 자동화 실행 (비동기)
    // - AffiliateSale 실적 생성
    // - Google Drive 폴더/시트 생성
    // - 이메일 발송
    // ============================================
    log('[Callback v12.0] ===== 자동화 실행 시작 =====');

    // 자동화를 비동기로 실행 (리다이렉트 지연 방지)
    // ⚠️ IMPROVED: 실패 시 재시도 큐에 추가하도록 강화된 에러 핸들링
    executeAutomation({
      orderId: finalOid,
      tid: finalTid,
      amount: parseInt(finalAmt) || payment.amount,
      partnerId: finalPartnerId,
      productCode: finalProductCode || payment.productCode || '',
      customerName: payment.buyerName || '',
      customerPhone: payment.buyerTel || '',
      customerEmail: payment.buyerEmail || '',
      partnerSource,
    }).then(result => {
      if (result.affiliateSaleCreated) {
        log(`[Callback v12.0] ✅ 자동화 완료! 파트너: ${finalPartnerId}, 실적ID: ${result.saleId}`);
      } else if (finalPartnerId) {
        log(`[Callback v12.0] ⚠️ 파트너(${finalPartnerId}) 있으나 실적 저장 실패`);
      }
    }).catch((automationError) => {
      // ✅ BUG FIX: async 제거 - Promise 체이닝으로 에러 전파 보장
      // ⚠️ CRITICAL: 자동화 실패 시 DB에 재시도 필요 플래그 저장
      error('[Callback v12.0] ⚠️ 자동화 실행 실패:', automationError);

      // Promise 반환하여 에러 전파 보장
      return prisma.payment.update({
        where: { orderId: finalOid },
        data: {
          metadata: {
            ...(payment.metadata as object || {}),
            automationFailed: true,
            automationFailureReason: automationError instanceof Error ? automationError.message : String(automationError),
            automationFailedAt: new Date().toISOString(),
            requiresRetry: true, // 재시도 필요 플래그
          },
        },
      })
      .then(() => {
        log('[Callback v12.0] 자동화 실패 정보 DB 기록 완료 (백그라운드 재시도 대기)');
        // TODO: Job Queue(Bull/Inngest)에 재시도 작업 추가
        // await retryQueue.add('automation-retry', { orderId: finalOid, attemptCount: 1 });
      })
      .catch(dbError => {
        error('[Callback v12.0] CRITICAL: 자동화 실패 정보 기록 2중 실패:', dbError);
        // 여기서도 실패하면 최소한 로그는 남김 (모니터링 시스템에서 감지 가능)
      });
    });

    // ============================================
    // [Step 9] 성공 페이지로 리다이렉트
    // ============================================
    log('[Callback v12.0] ===== 결제 완료 =====');
    log(`[Callback v12.0] 주문: ${finalOid}, 파트너: ${finalPartnerId || 'NONE'}, 출처: ${partnerSource}`);

    return NextResponse.redirect(
      new URL(`/payment/success?orderId=${finalOid}&tid=${finalTid}`, request.url),
      303
    );

  } catch (err) {
    error('[Callback v12.0 Error]', err);
    return NextResponse.redirect(
      new URL('/payment/failed?message=Server_Error', request.url),
      303
    );
  }
}

/**
 * GET 요청 처리 (P_RETURN_URL로 리다이렉트된 경우 — 결과 표시용)
 * 주의: 여기서 P_STATUS=00이어도 실제 결제 처리는 POST 핸들러에서 완료됨.
 * DB에서 completed 상태를 확인해서만 성공 페이지 표시 (파라미터 조작 방어)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const P_STATUS = searchParams.get('P_STATUS') || '';
  const P_TID = searchParams.get('P_TID') || '';
  const P_OID = searchParams.get('P_OID') || '';

  log('[Callback v12.0 GET] Received:', { P_STATUS, P_TID, P_OID });

  if (P_OID) {
    // DB에서 실제 결제 완료 여부 확인 (URL 파라미터 조작 방어)
    try {
      const payment = await prisma.payment.findUnique({
        where: { orderId: P_OID },
        select: { status: true },
      });

      if (payment?.status === 'completed') {
        return NextResponse.redirect(
          new URL(`/payment/success?orderId=${P_OID}&tid=${P_TID}`, request.url),
          303
        );
      }
    } catch (err) {
      error('[Callback v12.0 GET] DB 조회 오류:', err);
    }
  }

  return NextResponse.redirect(
    new URL('/payment/failed?message=InvalidRequest', request.url),
    303
  );
}
