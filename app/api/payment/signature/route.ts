export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { generatePCSignature, getWelcomePayConfig, getTimestamp } from '@/lib/welcomepay';

// PC 결제용 서명 생성 API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, price } = body;

    if (!orderId || !price) {
      return NextResponse.json(
        { ok: false, error: '주문번호와 금액이 필요합니다.' },
        { status: 400 }
      );
    }

    const config = getWelcomePayConfig();
    if (!config.signKey) {
      return NextResponse.json(
        { ok: false, error: 'PG 서명키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const timestamp = getTimestamp();
    const signatureData = generatePCSignature(
      config.signKey,
      parseInt(String(price)),
      orderId,
      timestamp
    );

    console.log('[Payment Signature] Generated:', {
      orderId,
      price,
      timestamp,
      mKeyLength: signatureData.mkey.length,
      signatureLength: signatureData.signature.length,
    });

    return NextResponse.json({
      ok: true,
      timestamp,
      mKey: signatureData.mkey,
      signature: signatureData.signature,
    });
  } catch (error) {
    console.error('[Payment Signature] Error:', error);
    return NextResponse.json(
      { ok: false, error: '서명 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
