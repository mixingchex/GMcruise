export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { customerAddress, customerSignature, contractorSignature, companions } = body;

    if (!customerAddress || typeof customerAddress !== 'string' || customerAddress.trim().length < 5) {
      return NextResponse.json({ ok: false, error: '주소를 정확히 입력해주세요.' }, { status: 400 });
    }

    if (!customerSignature || typeof customerSignature !== 'string' || !customerSignature.startsWith('data:image/')) {
      return NextResponse.json({ ok: false, error: '서명이 필요합니다.' }, { status: 400 });
    }

    // base64 크기 검증 (최대 500KB)
    if (customerSignature.length > 700000) {
      return NextResponse.json({ ok: false, error: '서명 이미지가 너무 큽니다.' }, { status: 400 });
    }

    const contract = await prisma.travelContract.findUnique({
      where: { token },
    });

    if (!contract) {
      return NextResponse.json({ ok: false, error: '계약서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (contract.status === 'signed') {
      return NextResponse.json({ ok: false, error: '이미 서명된 계약서입니다.' }, { status: 409 });
    }

    if (contract.expiresAt && new Date(contract.expiresAt) < new Date()) {
      return NextResponse.json({ ok: false, error: '만료된 계약서입니다.' }, { status: 410 });
    }

    const updated = await prisma.travelContract.update({
      where: { token },
      data: {
        status: 'signed',
        customerAddress: customerAddress.trim(),
        customerSignature,
        contractorSignature: contractorSignature || customerSignature,
        companions: companions || [],
        signedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: '계약서 서명이 완료되었습니다.',
      signedAt: updated.signedAt,
    });
  } catch (error: any) {
    console.error('[Contract Sign POST]', error);
    return NextResponse.json({ ok: false, error: '서명 처리 실패' }, { status: 500 });
  }
}
