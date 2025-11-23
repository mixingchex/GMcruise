// app/api/affiliate/contracts/[contractId]/pdf/route.ts
// 계약서 PDF 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { generateContractPDFFromId } from '@/lib/affiliate/contract-pdf';

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

    // PDF 생성
    const pdfBuffer = await generateContractPDFFromId(contractIdNum);

    // PDF 반환
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="contract-${contractId}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('[Contract PDF] GET error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || 'PDF 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}





