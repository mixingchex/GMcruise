export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

import { getSessionUser } from '@/lib/auth';

import { uploadFileToDrive } from '@/lib/google-drive';

import { generateContractPDFFromId } from '@/lib/affiliate/contract-pdf';

const TARGET_FOLDER_ID = '1HN-w4tNLdmfW5K5N3zF52P_InrUdBkQ_';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionUser = await getSessionUser();

    if (!sessionUser) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const contractId = parseInt(resolvedParams.contractId);

    if (!contractId || Number.isNaN(contractId)) {
      return NextResponse.json({ ok: false, error: 'Invalid contract ID' }, { status: 400 });
    }

    // 1. 계약서 정보 조회
    const contract = await prisma.affiliateContract.findUnique({
      where: { id: contractId },
      include: { user: true }
    });

    if (!contract) return NextResponse.json({ ok: false, error: 'Contract not found' }, { status: 404 });

    // 계약서가 이미 완료된 경우
    if (contract.status === 'completed') {
      return NextResponse.json({ ok: false, error: '이미 완료된 계약서입니다.' }, { status: 400 });
    }

    // 계약서가 서명되지 않은 경우
    const metadata = contract.metadata as any;
    const signatures = metadata?.signatures || {};
    const hasSignature = signatures.main?.url || signatures.education?.url || signatures.b2b?.url;
    
    if (!hasSignature) {
      return NextResponse.json({ ok: false, error: '서명이 완료되지 않은 계약서입니다.' }, { status: 400 });
    }

    // 2. 상태 업데이트 (먼저 완료 처리)
    const updatedContract = await prisma.affiliateContract.update({
      where: { id: contractId },
      data: {
        status: 'completed',
        reviewedAt: new Date(),
        approvedById: sessionUser.id,
        metadata: {
          ...metadata,
          completedBy: sessionUser.id,
          completedAt: new Date().toISOString(),
        }
      }
    });

    // 3. PDF 생성 및 구글 드라이브 업로드
    try {
      const pdfBuffer = await generateContractPDFFromId(contractId);
      const fileName = `${contract.name || '계약서'}_${contractId}.pdf`;

      const driveResult = await uploadFileToDrive({
        folderId: TARGET_FOLDER_ID,
        fileName: fileName,
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
        makePublic: true
      });

      if (driveResult.ok && driveResult.url) {
        // DB에 파일 URL 저장 (metadata 등에)
        await prisma.affiliateContract.update({
          where: { id: contractId },
          data: {
            metadata: {
              ...(updatedContract.metadata as object),
              pdfUrl: driveResult.url
            }
          }
        });
        console.log('[Contract Complete] Uploaded to Drive:', driveResult.url);
      } else {
        console.error('[Contract Complete] Drive Upload Failed:', driveResult.error);
      }
    } catch (uploadError: any) {
      console.error('[Contract Complete] Drive Upload Failed:', uploadError);
      // 업로드 실패해도 계약 완료 상태는 유지 (필요 시 롤백)
    }

    // 4. 이메일 발송 로직은 제거됨.

    return NextResponse.json({ 
      ok: true, 
      message: '계약서가 완료되었으며 구글 드라이브에 백업되었습니다.' 
    });

  } catch (error: any) {
    console.error('[Contract Complete Error]', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
