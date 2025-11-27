export const dynamic = 'force-dynamic';

// app/api/affiliate/contracts/[contractId]/route.ts
// 계약서 조회 API (공개)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await params;
    const contractIdNum = parseInt(contractId, 10);

    if (isNaN(contractIdNum)) {
      return NextResponse.json(
        { ok: false, message: '유효하지 않은 계약서 ID입니다.' },
        { status: 400 }
      );
    }

    // 계약서 조회
    const contract = await prisma.affiliateContract.findUnique({
      where: { id: contractIdNum },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        submittedAt: true,
        completedAt: true,
        metadata: true,
      },
    });

    if (!contract) {
      return NextResponse.json(
        { ok: false, message: '계약서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      contract: {
        id: contract.id,
        name: contract.name,
        email: contract.email,
        phone: contract.phone,
        status: contract.status,
        submittedAt: contract.submittedAt?.toISOString() || null,
        completedAt: contract.completedAt?.toISOString() || null,
        metadata: contract.metadata,
      },
    });
  } catch (error: any) {
    logger.error('[Contract API] GET error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || '계약서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

