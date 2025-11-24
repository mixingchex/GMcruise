// app/api/admin/images/route.ts
// 이미지 목록 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { readdir, stat, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

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

export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'images';

    const imageLibraryDir = path.join(process.cwd(), 'public', 'image-library');
    const targetDir = path.join(imageLibraryDir, folder);

    // 보안: 상위 디렉토리 접근 방지
    if (!targetDir.startsWith(imageLibraryDir)) {
      return NextResponse.json({ ok: false, message: 'Invalid folder path' }, { status: 400 });
    }

    if (!existsSync(targetDir)) {
      return NextResponse.json({ ok: true, images: [], folders: [] });
    }

    const items = await readdir(targetDir, { withFileTypes: true });
    const images: Array<{
      name: string;
      url: string;
      webpUrl: string | null;
      size: number;
      modified: Date;
      code: {
        url: string;
        imageTag: string;
        htmlTag: string;
      };
    }> = [];
    const folders: string[] = [];

    for (const item of items) {
      if (item.isDirectory()) {
        folders.push(item.name);
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        // WebP 파일은 목록에서 제외 (원본 파일만 표시)
        if (ext === '.webp') {
          continue;
        }
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
          const filePath = path.join(targetDir, item.name);
          const stats = await stat(filePath);
          const url = `/image-library/${folder}/${item.name}`;
          
          // WebP 버전 확인
          const nameWithoutExt = path.parse(item.name).name;
          const webpPath = path.join(targetDir, `${nameWithoutExt}.webp`);
          const webpUrl = existsSync(webpPath) ? `/image-library/${folder}/${nameWithoutExt}.webp` : null;

          images.push({
            name: item.name,
            url,
            webpUrl,
            size: stats.size,
            modified: stats.mtime,
            code: {
              url: webpUrl || url,
              imageTag: `<Image src="${webpUrl || url}" alt="${nameWithoutExt}" width={500} height={300} />`,
              htmlTag: `<img src="${webpUrl || url}" alt="${nameWithoutExt}" />`,
            },
          });
        }
      }
    }

    // 폴더 목록 가져오기 (루트 레벨)
    const rootFolders: string[] = [];
    if (existsSync(imageLibraryDir)) {
      const rootItems = await readdir(imageLibraryDir, { withFileTypes: true });
      for (const item of rootItems) {
        if (item.isDirectory()) {
          rootFolders.push(item.name);
        }
      }
    }

    // 중복 제거 (URL 기준)
    const uniqueImages = Array.from(
      new Map(images.map((img) => [img.url, img])).values()
    );

    return NextResponse.json({
      ok: true,
      images: uniqueImages.sort((a, b) => b.modified.getTime() - a.modified.getTime()),
      folders,
      rootFolders,
      currentFolder: folder,
    });
  } catch (error: any) {
    console.error('[Image List] 에러:', error);
    return NextResponse.json(
      { ok: false, message: error.message || '이미지 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');
    const folder = searchParams.get('folder') || 'images';

    if (!imageUrl) {
      return NextResponse.json({ ok: false, message: '이미지 URL이 필요합니다.' }, { status: 400 });
    }

    const imageLibraryDir = path.join(process.cwd(), 'public', 'image-library');
    const targetDir = path.join(imageLibraryDir, folder);

    // 보안: 상위 디렉토리 접근 방지
    if (!targetDir.startsWith(imageLibraryDir)) {
      return NextResponse.json({ ok: false, message: 'Invalid folder path' }, { status: 400 });
    }

    // URL에서 파일명 추출
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const filePath = path.join(targetDir, filename);

    // 보안: 상위 디렉토리 접근 방지
    if (!filePath.startsWith(targetDir)) {
      return NextResponse.json({ ok: false, message: 'Invalid file path' }, { status: 400 });
    }

    // 파일 존재 확인
    if (!existsSync(filePath)) {
      return NextResponse.json({ ok: false, message: '파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 원본 파일 삭제
    await unlink(filePath);

    // WebP 버전도 삭제 (존재하는 경우)
    const nameWithoutExt = path.parse(filename).name;
    const webpPath = path.join(targetDir, `${nameWithoutExt}.webp`);
    if (existsSync(webpPath)) {
      await unlink(webpPath);
    }

    return NextResponse.json({
      ok: true,
      message: '이미지가 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('[Image Delete] 에러:', error);
    return NextResponse.json(
      { ok: false, message: error.message || '이미지 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}










