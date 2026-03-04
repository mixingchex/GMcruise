export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const contract = await prisma.travelContract.findUnique({
      where: { token },
    });

    if (!contract) {
      return NextResponse.json({ ok: false, error: '계약서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (contract.status === 'expired') {
      return NextResponse.json({ ok: false, error: '만료된 계약서입니다.' }, { status: 410 });
    }

    if (contract.expiresAt && new Date(contract.expiresAt) < new Date()) {
      // 만료 처리
      await prisma.travelContract.update({
        where: { token },
        data: { status: 'expired' },
      });
      return NextResponse.json({ ok: false, error: '만료된 계약서입니다.' }, { status: 410 });
    }

    return NextResponse.json({
      ok: true,
      contract: {
        id: contract.id,
        token: contract.token,
        contractData: contract.contractData,
        status: contract.status,
        customerAddress: contract.customerAddress,
        companions: contract.companions,
        isSigned: contract.status === 'signed',
        signedAt: contract.signedAt,
        expiresAt: contract.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('[Contract GET]', error);
    return NextResponse.json({ ok: false, error: '조회 실패' }, { status: 500 });
  }
}
