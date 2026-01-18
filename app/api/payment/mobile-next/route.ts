export const dynamic = 'force-dynamic';

// 모바일 결제 Next URL 처리
// 웰컴페이먼츠 모바일 결제 인증 후 승인 요청

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { log, error } from '@/lib/logger-wrapper';
import { isPaymentSuccess } from '@/lib/welcomepay';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * POST: 모바일 결제 인증 결과 수신 및 승인 요청
 *
 * 웰컴페이먼츠 모바일 결제 흐름:
 * 1. 결제창 호출 (P_NEXT_URL로 인증 결과 전달)
 * 2. 인증 완료 후 P_REQ_URL로 승인 요청
 * 3. 최종 결과를 P_RETURN_URL로 전달
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // 인증 결과 파라미터
    const P_STATUS = formData.get('P_STATUS') as string;
    const P_RMESG1 = formData.get('P_RMESG1') as string;
    const P_TID = formData.get('P_TID') as string;
    const P_MID = formData.get('P_MID') as string;
    const P_OID = formData.get('P_OID') as string;
    const P_AMT = formData.get('P_AMT') as string;
    const P_REQ_URL = formData.get('P_REQ_URL') as string; // 승인 요청 URL
    const P_NOTI = formData.get('P_NOTI') as string;

    log('[Mobile Next] 인증 결과:', {
      P_STATUS,
      P_RMESG1,
      P_TID,
      P_OID,
      P_AMT,
    });

    // 인증 실패 시
    if (!isPaymentSuccess(P_STATUS)) {
      error('[Mobile Next] 인증 실패:', P_RMESG1);

      // 결제 정보 업데이트 (실패)
      if (P_OID) {
        await prisma.payment.updateMany({
          where: { orderId: P_OID },
          data: {
            status: 'failed',
            failedAt: new Date(),
            failureReason: P_RMESG1 || '인증 실패',
          },
        });
      }

      // 실패 페이지로 리다이렉트 (303으로 POST->GET 변환)
      return NextResponse.redirect(
        new URL(`/payment/failed?orderId=${P_OID}&error=${encodeURIComponent(P_RMESG1 || '인증 실패')}`, BASE_URL),
        303
      );
    }

    // 승인 요청 (P_REQ_URL로 HTTP 요청)
    if (!P_REQ_URL) {
      error('[Mobile Next] P_REQ_URL 없음');
      return NextResponse.redirect(
        new URL(`/payment/failed?orderId=${P_OID}&error=${encodeURIComponent('승인 URL이 없습니다.')}`, BASE_URL),
        303
      );
    }

    log('[Mobile Next] 승인 요청:', P_REQ_URL);

    // 승인 요청 파라미터
    const approvalParams = new URLSearchParams();
    approvalParams.append('P_MID', P_MID);
    approvalParams.append('P_TID', P_TID);

    // 승인 요청 실행
    const approvalResponse = await fetch(P_REQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: approvalParams.toString(),
    });

    const responseText = await approvalResponse.text();
    log('[Mobile Next] 승인 응답:', responseText);

    // 응답 파싱 (URL 인코딩된 형식)
    const resultParams = new URLSearchParams(responseText);
    const resultStatus = resultParams.get('P_STATUS');
    const resultMsg = resultParams.get('P_RMESG1');
    const resultTid = resultParams.get('P_TID') || P_TID;
    const resultType = resultParams.get('P_TYPE');
    const resultAuthDt = resultParams.get('P_AUTH_DT');
    const resultAuthNo = resultParams.get('P_AUTH_NO');

    // 승인 결과 확인
    if (!isPaymentSuccess(resultStatus || '')) {
      error('[Mobile Next] 승인 실패:', resultMsg);

      await prisma.payment.updateMany({
        where: { orderId: P_OID },
        data: {
          status: 'failed',
          failedAt: new Date(),
          failureReason: resultMsg || '승인 실패',
          pgTransactionId: resultTid,
        },
      });

      return NextResponse.redirect(
        new URL(`/payment/failed?orderId=${P_OID}&error=${encodeURIComponent(resultMsg || '승인 실패')}`, BASE_URL),
        303
      );
    }

    // 결제 성공 - DB 업데이트
    log('[Mobile Next] 결제 성공:', {
      orderId: P_OID,
      tid: resultTid,
      amount: P_AMT,
      authNo: resultAuthNo,
    });

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
            P_TYPE: resultType,
            P_AUTH_DT: resultAuthDt,
            P_AUTH_NO: resultAuthNo,
            P_RMESG1: resultMsg,
            approvalResponse: responseText,
          },
        },
      });

      // 결제 완료 웹훅 호출 (어필리에이트 처리)
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
      } catch (webhookErr) {
        error('[Mobile Next] Webhook 호출 실패:', webhookErr);
      }
    }

    // 성공 페이지로 리다이렉트 (303으로 POST->GET 변환)
    return NextResponse.redirect(
      new URL(`/payment/success?orderId=${P_OID}`, BASE_URL),
      303
    );
  } catch (err) {
    error('[Mobile Next] Error:', err);
    return NextResponse.redirect(
      new URL(`/payment/failed?error=${encodeURIComponent('결제 처리 중 오류가 발생했습니다.')}`, BASE_URL),
      303
    );
  }
}

// GET도 지원 (일부 PG는 GET으로 전달)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  // GET 파라미터를 FormData로 변환하여 POST 처리
  const formData = new FormData();
  searchParams.forEach((value, key) => {
    formData.append(key, value);
  });

  // POST 핸들러 호출을 위한 새 Request 생성
  const newReq = new NextRequest(req.url, {
    method: 'POST',
    body: formData,
  });

  return POST(newReq);
}
