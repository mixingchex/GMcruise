export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/auth';
import { generateTravelContractPDF } from '@/lib/contracts/travel-contract-pdf';

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
    const resId = parseInt(reservationId);

    const contract = await prisma.travelContract.findUnique({
      where: { reservationId: resId },
    });

    if (!contract) {
      return new NextResponse('Contract not found', { status: 404 });
    }

    const pdfBuffer = await generateTravelContractPDF(
      contract.contractData as any,
      contract.customerSignature || undefined,
      contract.contractorSignature || undefined,
      contract.customerAddress || undefined,
      contract.companions as any || [],
    );

    const productName = (contract.contractData as any)?.productName || '크루즈닷';
    const fileName = `크루즈닷_여행계약서_${productName}_${resId}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error: any) {
    console.error('[TravelContract PDF]', error);
    return new NextResponse('PDF generation failed', { status: 500 });
  }
}
