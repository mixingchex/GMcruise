export const dynamic = 'force-dynamic';

// app/api/payment/order/[orderId]/route.ts
// 결제 주문 상태 조회 API
// - 인증된 사용자만 조회 가능 (orderId는 PG사 리다이렉트 URL에서만 전달되는 비예측 값)
// - 결제 성공 페이지 서버 검증에 사용

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { error } from '@/lib/logger-wrapper';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ ok: false, error: '주문번호가 필요합니다.' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        status: true,
        amount: true,
        productName: true,
        buyerName: true,
        buyerTel: true,
        paidAt: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ ok: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }

    // IDOR 방어: 본인 결제(전화번호 일치) 또는 admin만 조회 가능
    const isOwner =
      typeof sessionUser.phone === 'string' &&
      sessionUser.phone.length > 0 &&
      payment.buyerTel === sessionUser.phone;
    const isAdmin = sessionUser.role?.toLowerCase() === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ ok: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      order: {
        orderId: payment.orderId,
        status: payment.status,
        amount: payment.amount,
        productName: payment.productName,
        buyerName: payment.buyerName,
        paidAt: payment.paidAt,
        // buyerTel은 내부 검증용으로만 사용, 응답에 포함하지 않음
      },
    });
  } catch (err) {
    error('[Payment Order] GET error:', err);
    return NextResponse.json({ ok: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
