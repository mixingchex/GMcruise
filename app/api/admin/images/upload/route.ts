// app/api/admin/images/upload/route.ts
// 이미지 업로드 및 WebP 자동 변환 API

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 관리자 권한 확인
async function requireAdmin() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { role: true },
  });

  if (user?.role !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 });
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const authError = await requireAdmin();
    if (authError) return authError;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string | null;

    if (!file) {
      return NextResponse.json({ ok: false, message: '파일이 없습니다.' }, { status: 400 });
    }

    // 이미지 파일만 허용
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ ok: false, message: '이미지 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    // 파일명 정리 (특수문자 제거)
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const nameWithoutExt = path.parse(originalName).name;
    const ext = path.parse(originalName).ext.toLowerCase();

    // 폴더 경로 설정
    const folderPath = folder ? folder.trim() : 'images';
    const uploadDir = path.join(process.cwd(), 'public', 'image-library', folderPath);

    // 디렉토리 생성
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 원본 파일 저장
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const originalPath = path.join(uploadDir, originalName);
    await writeFile(originalPath, originalBuffer);

    // WebP 변환
    let webpPath: string | null = null;
    let webpUrl: string | null = null;

    try {
      const webpBuffer = await sharp(originalBuffer)
        .webp({ quality: 80 })
        .toBuffer();

      const webpFileName = `${nameWithoutExt}.webp`;
      webpPath = path.join(uploadDir, webpFileName);
      await writeFile(webpPath, webpBuffer);

      webpUrl = `/image-library/${folderPath}/${webpFileName}`;
    } catch (error) {
      console.error('[Image Upload] WebP 변환 실패:', error);
      // WebP 변환 실패해도 원본은 저장됨
    }

    const originalUrl = `/image-library/${folderPath}/${originalName}`;

    return NextResponse.json({
      ok: true,
      image: {
        original: {
          url: originalUrl,
          path: originalPath,
          name: originalName,
          size: originalBuffer.length,
        },
        webp: webpUrl ? {
          url: webpUrl,
          path: webpPath,
          name: `${nameWithoutExt}.webp`,
          size: webpPath ? (await import('fs/promises')).stat(webpPath).then(s => s.size).catch(() => 0) : 0,
        } : null,
        folder: folderPath,
      },
      code: {
        url: webpUrl || originalUrl,
        imageTag: `<Image src="${webpUrl || originalUrl}" alt="${nameWithoutExt}" width={500} height={300} />`,
        htmlTag: `<img src="${webpUrl || originalUrl}" alt="${nameWithoutExt}" />`,
      },
    });
  } catch (error: any) {
    console.error('[Image Upload] 에러:', error);
    return NextResponse.json(
      { ok: false, message: error.message || '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

