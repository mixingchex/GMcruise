// app/api/admin/images/route.ts
// 이미지 목록 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { listFilesInFolder, deleteFileFromDrive } from '@/lib/google-drive';

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

    // Google Drive 이미지 폴더 ID 가져오기
    const imagesFolderId = process.env.GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID;
    
    if (!imagesFolderId) {
      return NextResponse.json(
        { ok: false, message: 'Google Drive 이미지 폴더 ID가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // Google Drive에서 파일 목록 가져오기
    const result = await listFilesInFolder(imagesFolderId, folder !== 'images' ? folder : undefined);

    if (!result.ok || !result.files) {
      return NextResponse.json(
        { ok: true, images: [], folders: [], rootFolders: [], currentFolder: folder }
      );
    }

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

    // 이미지 파일만 필터링
    for (const file of result.files) {
      const ext = file.name.toLowerCase().split('.').pop() || '';
      // WebP 파일은 목록에서 제외 (원본 파일만 표시)
      if (ext === 'webp') {
        continue;
      }
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        
        // WebP 버전 찾기 (같은 폴더에 있을 것으로 가정)
        const webpFile = result.files.find(f => 
          f.name === `${nameWithoutExt}.webp` || f.name === `${nameWithoutExt}.WEBP`
        );
        const webpUrl = webpFile ? webpFile.url : null;

        images.push({
          name: file.name,
          url: file.url,
          webpUrl,
          size: 0, // Google Drive에서 크기 정보는 별도로 가져와야 함
          modified: new Date(), // Google Drive에서 수정 시간은 별도로 가져와야 함
          code: {
            url: webpUrl || file.url,
            imageTag: `<Image src="${webpUrl || file.url}" alt="${nameWithoutExt}" width={500} height={300} />`,
            htmlTag: `<img src="${webpUrl || file.url}" alt="${nameWithoutExt}" />`,
          },
        });
      }
    }

    // 중복 제거 (URL 기준)
    const uniqueImages = Array.from(
      new Map(images.map((img) => [img.url, img])).values()
    );

    return NextResponse.json({
      ok: true,
      images: uniqueImages.sort((a, b) => b.modified.getTime() - a.modified.getTime()),
      folders: [], // Google Drive 폴더 구조는 별도로 관리
      rootFolders: [],
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

    if (!imageUrl) {
      return NextResponse.json({ ok: false, message: '이미지 URL이 필요합니다.' }, { status: 400 });
    }

    // Google Drive URL인지 확인
    if (imageUrl.includes('drive.google.com')) {
      // Google Drive에서 삭제
      const deleteResult = await deleteFileFromDrive(imageUrl);
      if (!deleteResult.ok) {
        return NextResponse.json(
          { ok: false, message: deleteResult.error || '이미지 삭제 실패' },
          { status: 500 }
        );
      }

      // WebP 버전도 삭제 시도 (파일명에서 추출)
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      if (filename && !filename.toLowerCase().endsWith('.webp')) {
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        // WebP 파일 ID는 정확히 알 수 없으므로, 원본 파일 삭제만 수행
        // 필요시 별도로 WebP 파일 URL을 받아서 삭제해야 함
      }
    } else {
      // 로컬 파일 삭제 (하위 호환성)
      const fsPromises = await import('fs/promises');
      const fs = await import('fs');
      const pathModule = await import('path');
      
      const folder = searchParams.get('folder') || 'images';
      const imageLibraryDir = pathModule.join(process.cwd(), 'public', 'image-library');
      const targetDir = pathModule.join(imageLibraryDir, folder);

      // 보안: 상위 디렉토리 접근 방지
      if (!targetDir.startsWith(imageLibraryDir)) {
        return NextResponse.json({ ok: false, message: 'Invalid folder path' }, { status: 400 });
      }

      // URL에서 파일명 추출
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const filePath = pathModule.join(targetDir, filename);

      // 보안: 상위 디렉토리 접근 방지
      if (!filePath.startsWith(targetDir)) {
        return NextResponse.json({ ok: false, message: 'Invalid file path' }, { status: 400 });
      }

      // 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ ok: false, message: '파일을 찾을 수 없습니다.' }, { status: 404 });
      }

      // 원본 파일 삭제
      await fsPromises.unlink(filePath);

      // WebP 버전도 삭제 (존재하는 경우)
      const nameWithoutExt = pathModule.parse(filename).name;
      const webpPath = pathModule.join(targetDir, `${nameWithoutExt}.webp`);
      if (fs.existsSync(webpPath)) {
        await fsPromises.unlink(webpPath);
      }
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










