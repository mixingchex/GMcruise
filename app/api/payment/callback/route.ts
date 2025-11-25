export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

// 웰컴페이먼츠 결제 완료 콜백 API
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData(); // 웰컴페이먼츠는 form-data로 전송
    
    // 웰컴페이먼츠에서 전달하는 결제 결과 데이터
    const orderId = body.get('orderId') as string;
    const resultCode = body.get('resultCode') as string;
    const resultMsg = body.get('resultMsg') as string;
    const amount = body.get('amount') as string;
    const signature = body.get('signature') as string;
    
    console.log('[Payment Callback] Received:', { orderId, resultCode, resultMsg, amount });

    // 서명 검증
    const pgSignkey = process.env.PG_SIGNKEY;
    if (!pgSignkey) {
      return NextResponse.json(
        { ok: false, error: 'PG 설정 오류' },
        { status: 500 }
      );
    }

    // 웰컴페이먼츠 서명 검증 로직 (실제 API 문서에 맞게 수정 필요)
    const verifyData = `${orderId}${resultCode}${amount}${pgSignkey}`;
    const expectedSignature = crypto.createHash('sha256').update(verifyData).digest('hex').toUpperCase();

    if (signature !== expectedSignature) {
      console.error('[Payment Callback] Signature mismatch:', { signature, expectedSignature });
      return NextResponse.json(
        { ok: false, error: '서명 검증 실패' },
        { status: 400 }
      );
    }

    // 결제 성공 여부 확인
    // 웰컴페이먼츠 성공 코드: '0000' (일반), '00' (간편결제), 'SUCCESS' 등
    const isSuccess = resultCode === '0000' || resultCode === '00' || resultCode === 'SUCCESS';

    // 결제 정보 업데이트
    try {
      const payment = await prisma.payment.findUnique({
        where: { orderId },
      });

      if (payment) {
        // 기존 결제 정보 업데이트
        await prisma.payment.update({
          where: { orderId },
          data: {
            status: isSuccess ? 'completed' : 'failed',
            paidAt: isSuccess ? new Date() : null,
            failedAt: !isSuccess ? new Date() : null,
            failureReason: !isSuccess ? resultMsg || '결제 실패' : null,
            metadata: {
              ...(payment.metadata as any || {}),
              callbackReceivedAt: new Date().toISOString(),
              resultCode,
              resultMsg,
            },
          },
        });
      } else {
        // 결제 정보가 없는 경우 로그만 남김 (이미 결제 요청 시 생성되어야 함)
        console.warn('[Payment Callback] Payment not found in DB:', orderId);
      }
    } catch (dbError) {
      console.error('[Payment Callback] DB update error:', dbError);
      // DB 업데이트 실패해도 결제 처리는 계속 진행
    }

    if (isSuccess) {
      // 결제 성공 처리
      console.log('[Payment Callback] Payment successful:', orderId);
      
      // 결제 정보를 DB에서 조회
      const payment = await prisma.payment.findUnique({
        where: { orderId },
        select: {
          productCode: true,
          amount: true,
          buyerName: true,
          buyerEmail: true,
          buyerTel: true,
          metadata: true,
          affiliateCode: true,
          affiliateMallUserId: true,
        },
      });

      if (payment) {
        // 결제 웹훅 호출 (어필리에이트 판매 생성)
        try {
          const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payment/webhook`;
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imp_uid: orderId,
              merchant_uid: orderId,
              status: 'paid',
              amount: payment.amount,
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
          // 웹훅 실패해도 결제 처리는 성공으로 처리
        }
      } else {
        console.warn('[Payment Callback] Payment not found for webhook:', orderId);
      }
    } else {
      // 결제 실패 처리
      console.error('[Payment Callback] Payment failed:', { orderId, resultCode, resultMsg });
    }

    // 웰컴페이먼츠에 응답 (성공 시)
    return NextResponse.json({
      ok: true,
      resultCode: '0000',
      resultMsg: 'OK',
    });
  } catch (error) {
    console.error('[Payment Callback] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '결제 콜백 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 결제 완료 페이지 리다이렉트
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    const resultCode = searchParams.get('resultCode');
    const resultMsg = searchParams.get('resultMsg');

    // 결제 결과에 따라 리다이렉트
    const isSuccess = resultCode === '0000' || resultCode === '00';
    
    if (isSuccess) {
      // 결제 성공 페이지로 리다이렉트
      return NextResponse.redirect(
        new URL(`/payment/success?orderId=${orderId}`, req.url)
      );
    } else {
      // 결제 실패 페이지로 리다이렉트
      return NextResponse.redirect(
        new URL(`/payment/failed?orderId=${orderId}&error=${encodeURIComponent(resultMsg || '결제 실패')}`, req.url)
      );
    }
  } catch (error) {
    console.error('[Payment Callback GET] Error:', error);
    return NextResponse.redirect(
      new URL('/payment/failed?error=알 수 없는 오류', req.url)
    );
  }
}
