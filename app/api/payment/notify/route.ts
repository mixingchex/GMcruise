export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { log, error } from '@/lib/logger-wrapper';
import { isPaymentSuccess } from '@/lib/welcomepay';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * 웰컴페이먼츠 서버 간 노티(NOTI) 처리
 *
 * 이 API는 결제 결과를 서버 대 서버로 전달받습니다.
 * Return URL 처리와 별개로 결제 결과의 신뢰성을 보장합니다.
 *
 * 가상계좌의 경우:
 * - 결제 요청 시: 가상계좌 발급 완료 노티
 * - 입금 완료 시: 입금 완료 노티 (별도)
 */
export async function POST(req: NextRequest) {
  try {
    // Content-Type에 따라 파싱 분기
    const contentType = req.headers.get('content-type') || '';

    let P_STATUS: string = '';
    let P_RMESG1: string = '';
    let P_TID: string = '';
    let P_MID: string = '';
    let P_OID: string = '';
    let P_AMT: string = '';
    let P_TYPE: string = '';
    let P_AUTH_NO: string = '';
    let P_AUTH_DT: string = '';
    let P_NOTI: string = '';
    // 가상계좌 관련
    let P_VACT_NUM: string = '';
    let P_VACT_DATE: string = '';
    let P_VACT_TIME: string = '';
    let P_VACT_NAME: string = '';
    let P_VACT_BANK_CODE: string = '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      P_STATUS = formData.get('P_STATUS') as string || '';
      P_RMESG1 = formData.get('P_RMESG1') as string || '';
      P_TID = formData.get('P_TID') as string || '';
      P_MID = formData.get('P_MID') as string || '';
      P_OID = formData.get('P_OID') as string || '';
      P_AMT = formData.get('P_AMT') as string || '';
      P_TYPE = formData.get('P_TYPE') as string || '';
      P_AUTH_NO = formData.get('P_AUTH_NO') as string || '';
      P_AUTH_DT = formData.get('P_AUTH_DT') as string || '';
      P_NOTI = formData.get('P_NOTI') as string || '';
      // 가상계좌
      P_VACT_NUM = formData.get('P_VACT_NUM') as string || '';
      P_VACT_DATE = formData.get('P_VACT_DATE') as string || '';
      P_VACT_TIME = formData.get('P_VACT_TIME') as string || '';
      P_VACT_NAME = formData.get('P_VACT_NAME') as string || '';
      P_VACT_BANK_CODE = formData.get('P_VACT_BANK_CODE') as string || '';
    } else {
      // JSON 형식
      const body = await req.json();
      P_STATUS = body.P_STATUS || body.resultCode || '';
      P_RMESG1 = body.P_RMESG1 || body.resultMsg || '';
      P_TID = body.P_TID || body.tid || '';
      P_MID = body.P_MID || body.mid || '';
      P_OID = body.P_OID || body.orderId || '';
      P_AMT = body.P_AMT || body.amount || '';
      P_TYPE = body.P_TYPE || body.payMethod || '';
      P_AUTH_NO = body.P_AUTH_NO || '';
      P_AUTH_DT = body.P_AUTH_DT || '';
      P_NOTI = body.P_NOTI || '';
      P_VACT_NUM = body.P_VACT_NUM || '';
      P_VACT_DATE = body.P_VACT_DATE || '';
      P_VACT_TIME = body.P_VACT_TIME || '';
      P_VACT_NAME = body.P_VACT_NAME || '';
      P_VACT_BANK_CODE = body.P_VACT_BANK_CODE || '';
    }

    log('[Payment Notify] 수신:', {
      P_STATUS,
      P_RMESG1,
      P_TID,
      P_OID,
      P_AMT,
      P_TYPE,
    });

    if (!P_OID) {
      error('[Payment Notify] 주문번호 없음');
      return new Response('OK', { status: 200 });
    }

    // 결제 정보 조회
    const payment = await prisma.payment.findUnique({
      where: { orderId: P_OID },
    });

    if (!payment) {
      error('[Payment Notify] 결제 정보 없음:', P_OID);
      return new Response('OK', { status: 200 });
    }

    // 이미 완료된 결제는 스킵
    if (payment.status === 'completed') {
      log('[Payment Notify] 이미 완료된 결제:', P_OID);
      return new Response('OK', { status: 200 });
    }

    const isSuccess = isPaymentSuccess(P_STATUS);

    if (isSuccess) {
      // 가상계좌 발급 (입금대기)
      if (P_TYPE === 'VBANK' && P_VACT_NUM) {
        await prisma.payment.update({
          where: { orderId: P_OID },
          data: {
            status: 'pending_vbank',
            pgTransactionId: P_TID,
            metadata: {
              ...(payment.metadata as any || {}),
              P_TYPE,
              P_VACT_NUM,
              P_VACT_DATE,
              P_VACT_TIME,
              P_VACT_NAME,
              P_VACT_BANK_CODE,
              notiReceivedAt: new Date().toISOString(),
            },
          },
        });
        log('[Payment Notify] 가상계좌 발급:', {
          orderId: P_OID,
          vbankNum: P_VACT_NUM,
          vbankDate: P_VACT_DATE,
        });
      } else {
        // 일반 결제 완료 또는 가상계좌 입금 완료
        await prisma.payment.update({
          where: { orderId: P_OID },
          data: {
            status: 'completed',
            paidAt: new Date(),
            pgTransactionId: P_TID,
            metadata: {
              ...(payment.metadata as any || {}),
              P_STATUS,
              P_RMESG1,
              P_TYPE,
              P_AUTH_NO,
              P_AUTH_DT,
              notiReceivedAt: new Date().toISOString(),
            },
          },
        });

        // 결제 완료 웹훅 호출 (어필리에이트 처리)
        try {
          await fetch(`${BASE_URL}/api/payment/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imp_uid: P_TID,
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
          error('[Payment Notify] Webhook 호출 실패:', webhookErr);
        }

        log('[Payment Notify] 결제 완료:', {
          orderId: P_OID,
          tid: P_TID,
          amount: P_AMT,
        });
      }
    } else {
      // 결제 실패
      await prisma.payment.update({
        where: { orderId: P_OID },
        data: {
          status: 'failed',
          failedAt: new Date(),
          failureReason: P_RMESG1 || '결제 실패',
          pgTransactionId: P_TID || undefined,
        },
      });
      log('[Payment Notify] 결제 실패:', {
        orderId: P_OID,
        reason: P_RMESG1,
      });
    }

    // 웰컴페이먼츠에 OK 응답 (반드시 OK 문자열 반환)
    return new Response('OK', { status: 200 });
  } catch (err) {
    error('[Payment Notify] Error:', err);
    // 에러가 발생해도 OK 응답 (재시도 방지)
    return new Response('OK', { status: 200 });
  }
}
