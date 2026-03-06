export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/auth';
import { generateTravelContractPDF } from '@/lib/contracts/travel-contract-pdf';
import { TravelContractDataSchema } from '@/lib/contracts/types';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAdmin) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { reservationId } = await params;
    const resId = parseInt(reservationId, 10);
    if (isNaN(resId) || resId <= 0) {
      return new NextResponse('Invalid reservation ID', { status: 400 });
    }

    const contract = await prisma.travelContract.findUnique({
      where: { reservationId: resId },
    });

    if (!contract) {
      return new NextResponse('Contract not found', { status: 404 });
    }

    // WO-CR-08: Zod로 contractData 파싱
    const parseResult = TravelContractDataSchema.safeParse(contract.contractData);
    if (!parseResult.success) {
      logger.error('[AdminContractPDF] contractData 타입 불일치', { reservationId: resId });
      return new NextResponse('Contract data invalid', { status: 500 });
    }
    const contractData = parseResult.data;

    const companions: Array<{ name: string; phone: string }> = Array.isArray(contract.companions)
      ? (contract.companions as unknown[]).map((c) => {
          const obj = c as Record<string, unknown>;
          return {
            name: typeof obj?.name === 'string' ? obj.name : '',
            phone: typeof obj?.phone === 'string' ? obj.phone : '',
          };
        })
      : [];

    const pdfBuffer = await generateTravelContractPDF(
      contractData,
      contract.customerSignature || undefined,
      contract.contractorSignature || undefined,
      contract.customerAddress || undefined,
      companions,
    );

    const safeName = contractData.productName.replace(/[^가-힣a-zA-Z0-9]/g, '_').slice(0, 30);
    const fileName = `크루즈닷_여행계약서_${safeName}_${resId}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[AdminContractPDF] PDF 생성 오류', { error: msg });
    return new NextResponse('PDF generation failed', { status: 500 });
  }
}
