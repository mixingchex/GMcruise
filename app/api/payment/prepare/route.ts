export const dynamic = 'force-dynamic';

// 결제 준비 API
// 웰컴페이먼츠 PC/Mobile 폼 데이터 생성

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getWelcomePayConfig,
  createMobilePaymentForm,
  createPCPaymentForm,
  getMobilePaymentUrl,
  getPCPaymentUrl,
  ensureHttps,
  type PaymentMethod,
  type EasyPayCode,
} from '@/lib/welcomepay';

// BASE_URL은 반드시 HTTPS여야 함 (P_NEXT_URL 매뉴얼 1.21 주의사항)
const BASE_URL = ensureHttps(process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000');

/**
 * GET: 기존 결제 정보 조회
 * isMobile 쿼리 파라미터에 따라 PC/Mobile 폼 데이터 분기 생성
 */
export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('orderId');
    const isMobileParam = req.nextUrl.searchParams.get('isMobile');
    const isMobile = isMobileParam === 'true';

    console.log('[Payment Prepare GET] orderId:', orderId, 'isMobile:', isMobile);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: '주문번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 결제 정보 조회
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        amount: true,
        productCode: true,
        productName: true,
        buyerName: true,
        buyerTel: true,
        buyerEmail: true,
        status: true,
        metadata: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: '결제 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { ok: false, error: '이미 처리된 결제입니다.' },
        { status: 400 }
      );
    }

    // 웰컴페이먼츠 설정
    const config = getWelcomePayConfig();

    // 결제 파라미터 공통
    // URL 생성 (모든 콜백 URL은 HTTPS 필수)
    const nextUrl = `${BASE_URL}/api/payment/callback`;
    const returnUrl = `${BASE_URL}/api/payment/return`;
    const notiUrl = `${BASE_URL}/api/payment/notify`;

    console.log('[Payment Prepare GET] Callback URLs:', {
      BASE_URL,
      nextUrl,
      returnUrl,
      notiUrl,
    });

    const paymentParams = {
      orderId: payment.orderId,
      amount: payment.amount,
      productName: payment.productName || '크루즈 상품',
      buyerName: payment.buyerName || '',
      buyerTel: payment.buyerTel || '',
      buyerEmail: payment.buyerEmail || undefined,
      returnUrl,
      nextUrl,  // Mobile용 P_NEXT_URL
      notiUrl,
      metadata: payment.metadata as any,
    };

    let formData: Record<string, string>;
    let paymentUrl: string;

    // PC/Mobile 모두 동일한 Mobile Form Submit 방식 사용
    // PC도 팝업/스크립트 없이 순수 페이지 리다이렉트로 결제
    formData = createMobilePaymentForm(config, paymentParams) as unknown as Record<string, string>;
    paymentUrl = getMobilePaymentUrl(config, 'CARD');
    console.log('[Payment Prepare GET] Form data generated (unified)');
    console.log('[Payment Prepare GET] P_NEXT_URL:', formData.P_NEXT_URL);
    console.log('[Payment Prepare GET] Payment URL:', paymentUrl);
    console.log('[Payment Prepare GET] isMobile:', isMobile);

    return NextResponse.json({
      ok: true,
      payment: {
        orderId: payment.orderId,
        amount: payment.amount,
        productName: payment.productName,
        buyerName: payment.buyerName,
        buyerTel: payment.buyerTel,
        buyerEmail: payment.buyerEmail,
        productCode: payment.productCode,
        metadata: payment.metadata,
      },
      formData,
      paymentUrl,
      isMobile,
    });
  } catch (error) {
    console.error('[Payment Prepare GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: '결제 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST: 결제 옵션 선택 후 폼 데이터 재생성
 * 결제 수단 및 간편결제 선택 시 호출
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      payMethod = 'CARD',
      easyPayCodes = [],
      isMobile = false,
    } = body;

    console.log('[Payment Prepare POST] orderId:', orderId, 'payMethod:', payMethod, 'isMobile:', isMobile);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: '주문번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 결제 정보 조회
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        amount: true,
        productCode: true,
        productName: true,
        buyerName: true,
        buyerTel: true,
        buyerEmail: true,
        status: true,
        metadata: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: '결제 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { ok: false, error: '이미 처리된 결제입니다.' },
        { status: 400 }
      );
    }

    // 웰컴페이먼츠 설정
    const config = getWelcomePayConfig();

    // URL 생성 (모든 콜백 URL은 HTTPS 필수)
    const nextUrl = `${BASE_URL}/api/payment/callback`;
    const returnUrl = `${BASE_URL}/api/payment/return`;
    const notiUrl = `${BASE_URL}/api/payment/notify`;

    console.log('[Payment Prepare POST] Callback URLs:', {
      BASE_URL,
      nextUrl,
      isMobile,
    });

    // 결제 파라미터
    const params = {
      orderId: payment.orderId,
      amount: payment.amount,
      productName: payment.productName || '크루즈 상품',
      buyerName: payment.buyerName || '',
      buyerTel: payment.buyerTel || '',
      buyerEmail: payment.buyerEmail || undefined,
      returnUrl,
      nextUrl,  // Mobile용 P_NEXT_URL
      notiUrl,
      payMethod: payMethod as PaymentMethod,
      easyPayCodes: easyPayCodes as EasyPayCode[],
      metadata: payment.metadata as any,
    };

    let formData: Record<string, string>;
    let paymentUrl: string;

    // PC/Mobile 모두 동일한 Mobile Form Submit 방식 사용
    // PC도 팝업/스크립트 없이 순수 페이지 리다이렉트로 결제
    formData = createMobilePaymentForm(config, params) as unknown as Record<string, string>;
    paymentUrl = getMobilePaymentUrl(config, payMethod as PaymentMethod);
    console.log('[Payment Prepare POST] Form data generated (unified)');
    console.log('[Payment Prepare POST] P_NEXT_URL:', formData.P_NEXT_URL);
    console.log('[Payment Prepare POST] Payment URL:', paymentUrl);
    console.log('[Payment Prepare POST] isMobile:', isMobile);

    return NextResponse.json({
      ok: true,
      formData,
      paymentUrl,
      isMobile,
    });
  } catch (error) {
    console.error('[Payment Prepare POST] Error:', error);
    return NextResponse.json(
      { ok: false, error: '결제 준비 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
