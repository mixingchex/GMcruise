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
  type PaymentMethod,
  type EasyPayCode,
} from '@/lib/welcomepay';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * GET: 기존 결제 정보 조회
 */
export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('orderId');

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

    // 기본 PC 폼 데이터 생성
    const formData = createPCPaymentForm(config, {
      orderId: payment.orderId,
      amount: payment.amount,
      productName: payment.productName || '크루즈 상품',
      buyerName: payment.buyerName || '',
      buyerTel: payment.buyerTel || '',
      buyerEmail: payment.buyerEmail || undefined,
      returnUrl: `${BASE_URL}/api/payment/return`,
      notiUrl: `${BASE_URL}/api/payment/notify`,
      metadata: payment.metadata as any,
    });

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
      paymentUrl: getPCPaymentUrl(config),
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

    // 결제 파라미터
    const params = {
      orderId: payment.orderId,
      amount: payment.amount,
      productName: payment.productName || '크루즈 상품',
      buyerName: payment.buyerName || '',
      buyerTel: payment.buyerTel || '',
      buyerEmail: payment.buyerEmail || undefined,
      returnUrl: `${BASE_URL}/api/payment/return`,
      nextUrl: `${BASE_URL}/api/payment/mobile-next`, // 모바일용
      notiUrl: `${BASE_URL}/api/payment/notify`,
      payMethod: payMethod as PaymentMethod,
      easyPayCodes: easyPayCodes as EasyPayCode[],
      metadata: payment.metadata as any,
    };

    let formData: Record<string, string>;
    let paymentUrl: string;

    if (isMobile) {
      // 모바일용 폼 데이터
      formData = createMobilePaymentForm(config, params) as unknown as Record<string, string>;
      paymentUrl = getMobilePaymentUrl(config, payMethod as PaymentMethod);
    } else {
      // PC용 폼 데이터
      formData = createPCPaymentForm(config, params) as unknown as Record<string, string>;
      paymentUrl = getPCPaymentUrl(config);
    }

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
