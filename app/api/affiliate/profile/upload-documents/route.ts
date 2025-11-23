// app/api/affiliate/profile/upload-documents/route.ts
// 신분증/통장 업로드 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { uploadFileToDrive } from '@/lib/google-drive';

const SESSION_COOKIE = 'cg.sid.v2';

// 세션에서 사용자 정보 가져오기
async function getCurrentUser() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true },
        },
      },
    });

    if (!session || !session.User) return null;
    return session.User;
  } catch (error) {
    console.error('[Upload Documents] Session error:', error);
    return null;
  }
}

const SUPPORTED_TYPES = ['ID_CARD', 'BANKBOOK'] as const;
type SupportedDocumentType = (typeof SUPPORTED_TYPES)[number];

function normalizeDocumentType(value: string | null): SupportedDocumentType | null {
  if (!value) return null;
  const trimmed = value.replace(/[\s-]/g, '').toUpperCase();
  if (trimmed === 'IDCARD') return 'ID_CARD';
  if (trimmed === 'BANKBOOK') return 'BANKBOOK';
  return null;
}

/**
 * GET: 업로드된 문서 목록 조회
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다' }, { status: 401 });
    }

    const profile = await prisma.affiliateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, type: true },
    });

    if (!profile) {
      return NextResponse.json({ ok: false, error: '어필리에이트 프로필을 찾을 수 없습니다' }, { status: 404 });
    }

    if (profile.type !== 'SALES_AGENT' && profile.type !== 'BRANCH_MANAGER') {
      return NextResponse.json({ ok: false, error: '판매원 또는 대리점장만 조회할 수 있습니다' }, { status: 403 });
    }

    const documents = await prisma.affiliateDocument.findMany({
      where: {
        profileId: profile.id,
        documentType: { in: SUPPORTED_TYPES },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({
      ok: true,
      documents: documents.map((doc) => ({
        id: doc.id,
        documentType: doc.documentType,
        filePath: doc.filePath,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        reviewedAt: doc.reviewedAt,
        isApproved: doc.status === 'APPROVED' || doc.approvedById !== null,
      })),
    });
  } catch (error: any) {
    console.error('[Upload Documents] GET error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || '문서 목록을 불러오지 못했습니다' },
      { status: 500 },
    );
  }
}

/**
 * POST: 신분증/통장 업로드
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다' }, { status: 401 });
    }

    const profile = await prisma.affiliateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, type: true },
    });

    if (!profile) {
      return NextResponse.json({ ok: false, error: '어필리에이트 프로필을 찾을 수 없습니다' }, { status: 404 });
    }

    if (profile.type !== 'SALES_AGENT' && profile.type !== 'BRANCH_MANAGER') {
      return NextResponse.json({ ok: false, error: '판매원 또는 대리점장만 업로드할 수 있습니다' }, { status: 403 });
    }

    const formData = await req.formData();
    const documentTypeRaw = (formData.get('documentType') as string | null) ?? null;
    const normalizedType = normalizeDocumentType(documentTypeRaw);

    if (!normalizedType) {
      return NextResponse.json({ ok: false, error: '업로드할 문서 타입을 지정해주세요 (idCard 또는 bankbook)' }, { status: 400 });
    }

    const uploadFile =
      (formData.get('file') as File | null) ||
      (formData.get('idCard') as File | null) ||
      (formData.get('bankbook') as File | null);

    if (!uploadFile) {
      return NextResponse.json({ ok: false, error: '업로드할 파일을 선택해주세요' }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (uploadFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: '파일 크기는 10MB를 초과할 수 없습니다' }, { status: 400 });
    }

    // 파일 형식 확인 (이미지 파일만)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(uploadFile.type)) {
      return NextResponse.json({ ok: false, error: '지원하는 파일 형식: JPG, PNG, WEBP, PDF' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await uploadFile.arrayBuffer());
    
    // 파일명 생성
    const fileExtension = uploadFile.name.split('.').pop() || 'jpg';
    const folderPrefix = normalizedType === 'ID_CARD' ? '신분증' : '통장';
    const fileName = `${folderPrefix}_${profile.type}_${profile.id}_${Date.now()}.${fileExtension}`;
    
    // Google Drive 폴더 ID (DB 설정에서 가져오기)
    const configKey = normalizedType === 'ID_CARD'
      ? 'google_drive_id_card_folder_id'
      : 'google_drive_bankbook_folder_id';
    
    const config = await prisma.systemConfig.findUnique({
      where: { configKey },
      select: { configValue: true },
    });

    const folderId = config?.configValue || (normalizedType === 'ID_CARD'
      ? process.env.GOOGLE_DRIVE_ID_CARD_FOLDER_ID 
      : process.env.GOOGLE_DRIVE_BANKBOOK_FOLDER_ID); // 하위 호환성

    if (!folderId || folderId === 'root') {
      console.error('[Upload Documents] Folder ID not configured:', normalizedType);
      return NextResponse.json({
        ok: false,
        error: '업로드 폴더가 설정되지 않았습니다. 관리자 패널에서 Google Drive 설정을 확인해주세요.',
      }, { status: 500 });
    }

    // MIME 타입 설정
    let mimeType = uploadFile.type;
    if (uploadFile.type === 'application/pdf') {
      mimeType = 'application/pdf';
    } else if (uploadFile.type.includes('image')) {
      mimeType = uploadFile.type;
    } else {
      mimeType = 'image/jpeg'; // 기본값
    }

    // Google Drive에 업로드
    const uploadResult = await uploadFileToDrive({
      folderId,
      fileName,
      mimeType,
      buffer: fileBuffer,
      makePublic: false, // 비공개 (관리자만 접근 가능)
    });

    if (!uploadResult.ok || !uploadResult.url || !uploadResult.fileId) {
      console.error('[Upload Documents] Google Drive upload failed:', uploadResult.error);
      return NextResponse.json({ ok: false, error: uploadResult.error || '파일 업로드에 실패했습니다' }, { status: 500 });
    }

    const updateData: any = {};
    if (normalizedType === 'ID_CARD') {
      updateData.idCardPath = uploadResult.url;
      updateData.idCardOriginalName = uploadFile.name;
    } else {
      updateData.bankbookPath = uploadResult.url;
      updateData.bankbookOriginalName = uploadFile.name;
    }

    const updatedProfile = await prisma.affiliateProfile.update({
      where: { id: profile.id },
      data: updateData,
      select: {
        id: true,
        idCardPath: true,
        idCardOriginalName: true,
        bankbookPath: true,
        bankbookOriginalName: true,
      },
    });

    const existingDocument = await prisma.affiliateDocument.findFirst({
      where: { profileId: profile.id, documentType: normalizedType },
    });

    if (existingDocument) {
      await prisma.affiliateDocument.update({
        where: { id: existingDocument.id },
        data: {
          filePath: uploadResult.url,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          status: 'UPLOADED',
          uploadedById: user.id,
          approvedById: null,
          reviewedAt: null,
          uploadedAt: new Date(),
        },
      });
    } else {
      await prisma.affiliateDocument.create({
        data: {
          profileId: profile.id,
          documentType: normalizedType,
          status: 'UPLOADED',
          filePath: uploadResult.url,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          uploadedById: user.id,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: `${normalizedType === 'ID_CARD' ? '신분증' : '통장'}이 성공적으로 업로드되었습니다`,
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error('[Upload Documents] Error:', error);
    return NextResponse.json({ ok: false, error: error.message || '서버 오류가 발생했습니다' }, { status: 500 });
  }
}





