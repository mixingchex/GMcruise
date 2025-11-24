// app/api/admin/images/route.ts
// 이미지 목록 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { readdir, stat } from 'fs/promises';
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
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
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

    return NextResponse.json({
      ok: true,
      images: images.sort((a, b) => b.modified.getTime() - a.modified.getTime()),
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










