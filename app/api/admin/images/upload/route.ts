// app/api/admin/images/upload/route.ts
// 이미지 업로드 및 WebP 자동 변환 API

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadFileToDrive, findOrCreateFolder } from '@/lib/google-drive';
import { logger } from '@/lib/logger';
import path from 'path';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel 파일 업로드 크기 제한 (50MB)
export const maxDuration = 60; // 60초 타임아웃

// 관리자 또는 판매원 권한 확인
async function requireAdminOrPartner() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      role: true,
      AffiliateProfile: {
        select: { id: true }
      }
    },
  });

  if (user?.role !== 'admin' && !user?.AffiliateProfile) {
    return NextResponse.json({ ok: false, message: 'Admin or Partner access required' }, { status: 403 });
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // 관리자 또는 판매원 권한 확인
    const authError = await requireAdminOrPartner();
    if (authError) return authError;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string | null;

    if (!file) {
      return NextResponse.json({ ok: false, message: '파일이 없습니다.' }, { status: 400 });
    }

    // 🔒 파일 크기 제한 (50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        ok: false,
        message: `파일 크기가 너무 큽니다. (최대 50MB, 현재 ${Math.round(file.size / 1024 / 1024)}MB)`
      }, { status: 400 });
    }

    // 이미지 파일만 허용
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ ok: false, message: '이미지 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    // 🔒 파일 확장자 검증 (MIME 타입과 확장자 일치 확인)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExt = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      return NextResponse.json({ ok: false, message: '허용되지 않는 파일 확장자입니다.' }, { status: 400 });
    }

    // 파일명 정리 (특수문자 제거)
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const nameWithoutExt = path.parse(originalName).name;

    // 폴더 경로 설정
    const folderPath = folder ? folder.trim() : 'images';

    // 원본 파일 버퍼
    const originalBuffer = Buffer.from(await file.arrayBuffer());

    // Google Drive 폴더 ID 가져오기 (기본 images 폴더 사용)
    const { getDriveFolderId } = await import('@/lib/config/drive-config');
    const baseFolderId = await getDriveFolderId('UPLOADS_IMAGES');

    if (!baseFolderId) {
      return NextResponse.json(
        { ok: false, message: 'Google Drive 이미지 폴더 ID가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 서브폴더 생성 (folderPath가 있으면)
    let targetFolderId = baseFolderId;
    if (folderPath && folderPath !== 'images') {
      const subfolderResult = await findOrCreateFolder(folderPath, baseFolderId);
      if (subfolderResult.ok && subfolderResult.folderId) {
        targetFolderId = subfolderResult.folderId;
      }
    }

    // WebP 변환 후 WebP만 업로드 (원본 저장 안 함 — 용량 절감)
    // - quality:85 = JPEG 95+ 수준 화질 유지, 용량 60~80% 절감
    // - animated:true = GIF 애니메이션 프레임 전체 보존 → animated WebP 변환
    let webpBuffer: Buffer;
    if (file.type === 'image/webp') {
      webpBuffer = originalBuffer;
    } else {
      try {
        webpBuffer = await sharp(originalBuffer, { animated: true })
          .webp({ quality: 85 })
          .toBuffer();
      } catch (sharpErr) {
        logger.error('[Image Upload] WebP 변환 실패', { error: sharpErr instanceof Error ? sharpErr.message : String(sharpErr) });
        return NextResponse.json({ ok: false, message: '이미지 변환에 실패했습니다.' }, { status: 400 });
      }
    }

    const webpFileName = `${nameWithoutExt}.webp`;
    const uploadResult = await uploadFileToDrive({
      folderId: targetFolderId,
      fileName: webpFileName,
      mimeType: 'image/webp',
      buffer: webpBuffer,
      makePublic: true,
    });

    if (!uploadResult.ok || !uploadResult.url) {
      return NextResponse.json(
        { ok: false, message: `이미지 업로드 실패: ${uploadResult.error}` },
        { status: 500 }
      );
    }

    const webpUrl = uploadResult.url;

    return NextResponse.json({
      ok: true,
      image: {
        original: {
          url: webpUrl,
          name: webpFileName,
          size: webpBuffer.length,
          fileId: uploadResult.fileId,
        },
        webp: {
          url: webpUrl,
          name: webpFileName,
          size: webpBuffer.length,
        },
        folder: folderPath,
      },
      code: {
        url: webpUrl,
        imageTag: `<Image src="${webpUrl}" alt="${nameWithoutExt}" width={500} height={300} />`,
        htmlTag: `<img src="${webpUrl}" alt="${nameWithoutExt}" />`,
      },
    });
  } catch (error: unknown) {
    logger.error('[Image Upload] 에러', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { ok: false, message: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

