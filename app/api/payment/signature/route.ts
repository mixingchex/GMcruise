export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { generatePCSignature, generateMobileSignature, getWelcomePayConfig, getTimestamp } from '@/lib/welcomepay';
import { log, error } from '@/lib/logger-wrapper';
import prisma from '@/lib/prisma';

// PC/Mobile 결제용 서명 생성 API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, isMobile } = body;

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: '주문번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // [보안] 클라이언트 price 파라미터를 신뢰하지 않고 DB에서 실제 금액 조회
    // URL 파라미터 조작으로 소액 결제 후 환불 시도하는 공격을 원천 차단
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: { amount: true, status: true },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: '유효하지 않은 주문번호입니다.' },
        { status: 404 }
      );
    }

    if (payment.status === 'completed') {
      return NextResponse.json(
        { ok: false, error: '이미 완료된 주문입니다.' },
        { status: 400 }
      );
    }

    const price = payment.amount;

    const config = getWelcomePayConfig();
    if (!config.signKey) {
      return NextResponse.json(
        { ok: false, error: 'PG 서명키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const timestamp = getTimestamp();

    // PC와 Mobile은 signature 생성 방식이 다름
    // PC: mKey=${mkey}&oid=${orderId}&price=${amount}&timestamp=${timestamp}
    // Mobile: mkey=${mkey}&P_AMT=${amount}&P_OID=${orderId}&P_TIMESTAMP=${timestamp}
    const signatureData = isMobile
      ? generateMobileSignature(
          config.signKey,
          price,
          orderId,
          timestamp
        )
      : generatePCSignature(
          config.signKey,
          price,
          orderId,
          timestamp
        );

    log('[Payment Signature] Generated (DB amount):', {
      orderId,
      price,
      timestamp,
      isMobile: !!isMobile,
      mKeyLength: signatureData.mkey.length,
      signatureLength: signatureData.signature.length,
    });

    return NextResponse.json({
      ok: true,
      timestamp,
      mKey: signatureData.mkey,
      signature: signatureData.signature,
    });
  } catch (err) {
    error('[Payment Signature] Error:', err);
    return NextResponse.json(
      { ok: false, error: '서명 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
