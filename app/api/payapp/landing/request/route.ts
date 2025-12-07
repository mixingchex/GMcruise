export const dynamic = 'force-dynamic';

/**
 * 랜딩페이지 PayApp 결제 요청 API
 * POST /api/payapp/landing/request
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requestLandingPayment } from '@/lib/payapp';
import { nanoid } from 'nanoid';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      landingPageId,
      productName,
      amount,
      customerName,
      customerPhone,
      customerEmail,
      returnUrl,
      payType,
    } = body;

    // 필수 필드 검증
    if (!landingPageId || !productName || !amount || !customerName || !customerPhone) {
      return NextResponse.json(
        { ok: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 금액 검증 (1000원 이상)
    if (amount < 1000) {
      return NextResponse.json(
        { ok: false, error: '결제 금액은 1,000원 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 랜딩페이지 존재 확인
    const landingPage = await prisma.landingPage.findUnique({
      where: { id: landingPageId },
      select: { id: true, title: true, slug: true },
    });

    if (!landingPage) {
      return NextResponse.json(
        { ok: false, error: '랜딩페이지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 주문번호 생성
    const orderId = `LP${landingPageId}-${Date.now()}-${nanoid(6)}`;
    const cleanPhone = customerPhone.replace(/-/g, '').replace(/\s/g, '');

    // DB에 결제 레코드 생성 (pending 상태)
    const payment = await prisma.payAppPayment.create({
      data: {
        orderId,
        landingPageId,
        productName,
        amount,
        customerName,
        customerPhone: cleanPhone,
        customerEmail: customerEmail || null,
        status: 'pending',
        var1: orderId,
        var2: landingPageId.toString(),
      },
    });

    // 기본 URL 가져오기
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.cruisedot.co.kr';

    // PayApp 결제 요청
    const result = await requestLandingPayment({
      goodname: productName,
      price: amount,
      recvphone: cleanPhone,
      memo: `랜딩페이지: ${landingPage.title}`,
      var1: orderId,
      var2: landingPageId.toString(),
      feedbackurl: `${baseUrl}/api/payapp/landing/webhook`,
      returnurl: returnUrl || `${baseUrl}/landing/${landingPage.slug}/payment/complete?orderId=${orderId}`,
      smsuse: 'n',
      openpaytype: payType || undefined,
    });

    if (result.state !== '1') {
      // 결제 요청 실패
      await prisma.payAppPayment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          metadata: { error: result.errorMessage, errno: result.errno },
        },
      });

      return NextResponse.json(
        { ok: false, error: result.errorMessage || '결제 요청에 실패했습니다.' },
        { status: 400 }
      );
    }

    // 결제 요청 성공 - mul_no와 payurl 저장
    await prisma.payAppPayment.update({
      where: { id: payment.id },
      data: {
        mulNo: result.mul_no,
        payUrl: result.payurl,
        status: 'requested',
      },
    });

    console.log('[PayApp Landing] 결제 요청 성공:', {
      orderId,
      mulNo: result.mul_no,
      payUrl: result.payurl,
    });

    return NextResponse.json({
      ok: true,
      orderId,
      paymentId: payment.id,
      mulNo: result.mul_no,
      payUrl: result.payurl,
    });
  } catch (error: any) {
    console.error('[PayApp Landing Request] 오류:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || '결제 요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
