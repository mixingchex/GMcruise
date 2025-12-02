export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { uploadFileToDrive } from '@/lib/google-drive';
import { getDriveFolderId } from '@/lib/config/drive-config';

/**
 * POST /api/admin/affiliate/interactions/[interactionId]/upload
 * 상담 기록에 파일(녹음 파일 등) 업로드 - Google Drive에 백업
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ interactionId: string }> | { interactionId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const interactionId = parseInt(resolvedParams.interactionId, 10);
    if (isNaN(interactionId)) {
      return NextResponse.json({ ok: false, error: 'Invalid interaction ID' }, { status: 400 });
    }

    // 상담 기록 확인
    const interaction = await prisma.affiliateInteraction.findUnique({
      where: { id: interactionId },
      include: {
        AffiliateLead: {
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
          },
        },
      },
    });

    if (!interaction) {
      return NextResponse.json({ ok: false, error: 'Interaction not found' }, { status: 404 });
    }

    // FormData에서 파일 추출
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    // 파일 정보
    const fileName = file.name;
    const fileSize = file.size;
    const mimeType = file.type || 'application/octet-stream';
    const buffer = Buffer.from(await file.arrayBuffer());

    // 파일명 생성: interaction_[ID]_[고객이름]_[날짜]_[원본파일명]
    const customerName = interaction.AffiliateLead?.customerName || 'unknown';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const safeCustomerName = customerName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const safeFileName = fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const driveFileName = `interaction_${interactionId}_${safeCustomerName}_${dateStr}_${safeFileName}`;

    // Google Drive에 업로드 (UPLOADS_SALES_AUDIO 폴더)
    const folderId = await getDriveFolderId('UPLOADS_SALES_AUDIO');

    console.log('[Interaction Upload] Uploading to Google Drive:', {
      interactionId,
      fileName: driveFileName,
      fileSize,
      mimeType,
      folderId,
    });

    const uploadResult = await uploadFileToDrive({
      folderId,
      fileName: driveFileName,
      mimeType,
      buffer,
      makePublic: false, // 보안을 위해 비공개
    });

    if (!uploadResult.ok || !uploadResult.fileId) {
      console.error('[Interaction Upload] Google Drive upload failed:', uploadResult.error);
      return NextResponse.json(
        { ok: false, error: uploadResult.error || 'Failed to upload file to Google Drive' },
        { status: 500 }
      );
    }

    console.log('[Interaction Upload] Google Drive upload success:', {
      fileId: uploadResult.fileId,
      url: uploadResult.url,
    });

    // AffiliateMedia 레코드 생성 (DB에 기록)
    const media = await prisma.affiliateMedia.create({
      data: {
        interactionId,
        storagePath: uploadResult.url || `https://drive.google.com/file/d/${uploadResult.fileId}/view`,
        fileName,
        fileSize,
        mimeType,
        visibility: 'INTERNAL',
        uploadedById: user.id,
        metadata: {
          googleDriveFileId: uploadResult.fileId,
          originalFileName: fileName,
          uploadedAt: new Date().toISOString(),
          customerName: interaction.AffiliateLead?.customerName,
          customerPhone: interaction.AffiliateLead?.customerPhone,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'File uploaded successfully',
      media: {
        id: media.id,
        fileName: media.fileName,
        fileSize: media.fileSize,
        mimeType: media.mimeType,
        storagePath: media.storagePath,
        googleDriveFileId: uploadResult.fileId,
      },
    });
  } catch (error: any) {
    console.error('[Interaction Upload] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/affiliate/interactions/[interactionId]/upload
 * 상담 기록에 첨부된 파일 목록 조회
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ interactionId: string }> | { interactionId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const interactionId = parseInt(resolvedParams.interactionId, 10);
    if (isNaN(interactionId)) {
      return NextResponse.json({ ok: false, error: 'Invalid interaction ID' }, { status: 400 });
    }

    // 해당 상담 기록의 미디어 파일 조회
    const mediaFiles = await prisma.affiliateMedia.findMany({
      where: { interactionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        storagePath: true,
        createdAt: true,
        metadata: true,
      },
    });

    return NextResponse.json({
      ok: true,
      files: mediaFiles.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        url: file.storagePath,
        createdAt: file.createdAt.toISOString(),
        googleDriveFileId: (file.metadata as any)?.googleDriveFileId || null,
        isBackedUp: !!(file.metadata as any)?.googleDriveFileId,
      })),
    });
  } catch (error: any) {
    console.error('[Interaction Upload GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
