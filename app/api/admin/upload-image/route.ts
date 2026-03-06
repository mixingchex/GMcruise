export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // sharp는 Node.js 네이티브 바이너리 — Edge 런타임 불가

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { uploadFileToDrive } from '@/lib/google-drive';
import sharp from 'sharp';
import { logger } from '@/lib/logger';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인
async function checkAdminAuth() {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sid) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true, name: true },
        },
      },
    });

    if (!session || !session.User || session.User.role !== 'admin') {
      return null;
    }

    // 세션 만료 확인
    if (session.expiresAt && session.expiresAt < new Date()) {
      return null;
    }

    return {
      id: session.User.id,
      name: session.User.name,
      role: session.User.role,
    };
  } catch (error) {
    logger.error('[Upload Image] Auth check error:', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ ok: false, error: '파일이 없습니다.' }, { status: 400 });
    }

    // 파일 크기 확인 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 });
    }

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: '이미지 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    // 파일 버퍼 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 파일명 생성 (타임스탬프 + 원본 파일명, 확장자는 .webp로 통일)
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const fileName = `messages_${timestamp}_${nameWithoutExt}.webp`;

    // WebP 변환 (quality:85 — JPEG 95+ 수준 화질, 용량 60~80% 절감)
    // animated:true = GIF 애니메이션 프레임 전체 보존 → animated WebP 변환
    let webpBuffer: Buffer;
    if (file.type === 'image/webp') {
      webpBuffer = buffer;
    } else {
      try {
        webpBuffer = await sharp(buffer, { animated: true })
          .webp({ quality: 85 })
          .toBuffer();
      } catch (sharpErr) {
        logger.error('[Upload Image] WebP 변환 실패', { error: sharpErr instanceof Error ? sharpErr.message : String(sharpErr) });
        return NextResponse.json({ ok: false, error: '이미지 변환에 실패했습니다.' }, { status: 400 });
      }
    }

    // Google Drive 이미지 폴더 ID 가져오기
    const { getDriveFolderId } = await import('@/lib/config/drive-config');
    const imagesFolderId = await getDriveFolderId('UPLOADS_IMAGES');

    if (!imagesFolderId) {
      return NextResponse.json(
        { ok: false, error: 'Google Drive 이미지 폴더 ID가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // Google Drive에 WebP만 업로드
    const uploadResult = await uploadFileToDrive({
      folderId: imagesFolderId,
      fileName: fileName,
      mimeType: 'image/webp',
      buffer: webpBuffer,
      makePublic: true,
    });

    if (!uploadResult.ok || !uploadResult.url) {
      return NextResponse.json(
        { ok: false, error: uploadResult.error || '이미지 업로드 실패' },
        { status: 500 }
      );
    }

    const imageUrl = uploadResult.url;

    return NextResponse.json({
      ok: true,
      url: imageUrl,
      fileName,
    });
  } catch (error) {
    logger.error('[Upload Image] Error:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { ok: false, error: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
