// app/api/admin/mall/cruise-photos/route.ts
// 크루즈정보사진 폴더 목록 및 이미지 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { listFilesInFolder } from '@/lib/google-drive';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SESSION_COOKIE = 'cg.sid.v2';

async function checkAdminAuth() {
  const sessionId = cookies().get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { User: true },
    });

    if (session && session.User.role === 'admin') {
      return session.User;
    }
  } catch (error) {
    console.error('[Admin Auth] Error:', error);
  }

  return null;
}

// GET: 폴더 목록 또는 특정 폴더의 이미지 목록 조회
export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const folderPath = url.searchParams.get('folder'); // 예: "MSC벨리시마" 또는 "MSC벨리시마/객실"
    const listFolders = url.searchParams.get('listFolders') === 'true'; // 폴더 목록만 조회

    // Google Drive 크루즈정보사진 폴더 ID 가져오기
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: 'google_drive_cruise_images_folder_id' },
      select: { configValue: true },
    });

    const cruiseImagesFolderId = config?.configValue || process.env.GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID;

    if (!cruiseImagesFolderId) {
      return NextResponse.json(
        { ok: false, error: '크루즈정보사진 폴더 ID가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // Google Drive에서 파일 목록 가져오기
    const result = await listFilesInFolder(cruiseImagesFolderId, folderPath || undefined);

    if (!result.ok || !result.files) {
      return NextResponse.json(
        { ok: false, error: result.error || '파일 목록을 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    // 폴더 목록 조회
    if (listFolders || !folderPath) {
      // Google Drive에서는 폴더 구조를 직접 조회하기 어려우므로,
      // 파일 경로에서 폴더 구조를 추출
      const folders = new Set<string>();
      
      for (const file of result.files) {
        // 파일명에 경로가 포함되어 있는 경우 (예: "MSC벨리시마/객실/image.jpg")
        const pathParts = file.name.split('/');
        if (pathParts.length > 1) {
          // 마지막 부분(파일명) 제외하고 폴더 경로만 추출
          const folderPath = pathParts.slice(0, -1).join('/');
          folders.add(folderPath);
        }
      }

      return NextResponse.json({
        ok: true,
        folders: Array.from(folders).sort(),
      });
    }

    // 특정 폴더의 이미지 목록 조회
    const images: string[] = [];
    
    for (const file of result.files) {
      // 파일명이 폴더 경로로 시작하는지 확인
      if (!folderPath || file.name.startsWith(folderPath + '/') || file.name === folderPath) {
        const ext = file.name.toLowerCase().split('.').pop() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          images.push(file.url);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      folder: folderPath,
      images: images.sort(),
    });
  } catch (error: any) {
    console.error('[Cruise Photos API] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}



