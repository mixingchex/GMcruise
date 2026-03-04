export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateTravelContractPDF } from '@/lib/contracts/travel-contract-pdf';
import { TravelContractData } from '@/lib/contracts/types';
import { logger } from '@/lib/logger';

/**
 * GET /api/contracts/[token]/pdf
 * 고객이 서명 완료된 계약서를 PDF로 다운로드
 * - 서명된 계약서(status: 'signed')만 허용
 * - 인증 불필요 (토큰으로 접근)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // AFTER — 최소 길이를 10으로 완화 (cuid는 25자, hex64는 64자 모두 통과)
    if (!token || token.length < 10 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 토큰입니다.' }, { status: 400 });
    }

    const contract = await prisma.travelContract.findUnique({
      where: { token },
      select: {
        status: true,
        contractData: true,
        customerSignature: true,
        contractorSignature: true,
        customerAddress: true,
        companions: true,
        signedAt: true,
        expiresAt: true,
        Reservation: {
          select: {
            User: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ ok: false, error: '계약서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (contract.status !== 'signed') {
      return NextResponse.json(
        { ok: false, error: '서명이 완료된 계약서만 다운로드할 수 있습니다.' },
        { status: 403 }
      );
    }

    const contractData = contract.contractData as TravelContractData;
    const companions = contract.companions as Array<{ name: string; phone: string }> | null;

    logger.log('[ContractPDF] PDF 다운로드 요청', { token: token.slice(0, 8) + '...' });

    const pdfBuffer = await generateTravelContractPDF(
      contractData,
      contract.customerSignature || undefined,
      contract.contractorSignature || undefined,
      contract.customerAddress || undefined,
      companions || undefined,
    );

    const customerName = contractData.mainTravelerName || contract.Reservation?.User?.name || '고객';
    const dateStr = contract.signedAt
      ? new Date(contract.signedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const filename = encodeURIComponent(`여행계약서_${customerName}_${dateStr}.pdf`);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error: any) {
    logger.error('[ContractPDF] PDF 생성 오류', { error: error.message });
    return NextResponse.json({ ok: false, error: 'PDF 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
