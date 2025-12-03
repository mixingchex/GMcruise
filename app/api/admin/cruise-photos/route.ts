// app/api/admin/cruise-photos/route.ts
// 크루즈정보사진 폴더 탐색 API (구글 드라이브)

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getDriveClient } from '@/lib/google-drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 관리자 또는 판매원 권한 확인 (읽기 전용)
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

  // 관리자이거나 판매원(AffiliateProfile이 있음)이면 접근 허용
  if (user?.role !== 'admin' && !user?.AffiliateProfile) {
    return NextResponse.json({ ok: false, message: 'Admin or Partner access required' }, { status: 403 });
  }

  return { user, isAdmin: user?.role === 'admin' };
}

// 구글 드라이브 폴더 ID 찾기 (경로 기반)
async function findFolderByPath(drive: any, parentFolderId: string, folderName: string, sharedDriveId: string): Promise<string | null> {
  try {
    // 폴더명에 특수문자가 있을 수 있으므로 이스케이프 처리
    const escapedFolderName = folderName.replace(/'/g, "\\'");
    const query = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${escapedFolderName}' and trashed=false`;

    const searchOptions: any = {
      q: query,
      fields: 'files(id, name)',
      pageSize: 1,
    };

    if (sharedDriveId && sharedDriveId !== 'root') {
      searchOptions.supportsAllDrives = true;
      searchOptions.includeItemsFromAllDrives = true;
      searchOptions.corpora = 'allDrives';
    }

    const response = await drive.files.list(searchOptions);
    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id || null;
    }
    return null;
  } catch (error: any) {
    console.error('[Find Folder By Path] Error:', error);
    console.error('[Find Folder By Path] Details:', { parentFolderId, folderName, error: error.message });
    return null;
  }
}

/**
 * GET: 크루즈정보사진 폴더 구조 및 이미지 목록 조회 (구글 드라이브)
 */
export async function GET(req: NextRequest) {
  console.log('[Cruise Photos API] Request received');
  try {
    // 관리자 또는 판매원 권한 확인 (선택적 - 로그인 사용자만 허용하되 에러는 무시)
    let isAuthenticated = false;
    try {
      const authResult = await requireAdminOrPartner();
      if (!('status' in authResult)) {
        isAuthenticated = true;
      }
    } catch (authError) {
      // 인증 실패해도 기본 조회는 허용 (이미지는 Google Drive에서 공개 설정됨)
      console.warn('[Cruise Photos] Auth check failed, allowing read-only access');
    }

    const { searchParams } = new URL(req.url);
    const folderPath = searchParams.get('folder') || ''; // 예: "홍콩" 또는 "홍콩/홍콩후기"

    // 구글 드라이브 크루즈정보사진 폴더 ID
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: 'google_drive_cruise_images_folder_id' },
      select: { configValue: true },
    });

    // 기본 폴더 ID (제공된 URL에서 추출: 17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck)
    const rootFolderId = config?.configValue || '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck';

    if (!rootFolderId) {
      return NextResponse.json({ ok: false, message: '크루즈정보사진 폴더 ID가 설정되지 않았습니다.' }, { status: 400 });
    }

    // 공유 드라이브 ID (기본값: 0AJVz1C-KYWR0Uk9PVA)
    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '0AJVz1C-KYWR0Uk9PVA';

    let drive;
    try {
      drive = getDriveClient();
    } catch (error: any) {
      console.error('[Cruise Photos] Google Drive client error:', error);
      console.error('[Cruise Photos] Environment variables:', {
        hasEmail: !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
        hasKey: !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY,
        email: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
      });
      return NextResponse.json(
        { ok: false, message: `Google Drive 연결 실패: ${error.message}` },
        { status: 500 }
      );
    }

    // 경로에 따라 폴더 찾기
    let targetFolderId = rootFolderId;
    if (folderPath) {
      const pathParts = folderPath.split('/').filter(p => p.trim());
      let currentFolderId = rootFolderId;

      for (const part of pathParts) {
        if (!part.trim()) continue;
        const foundId = await findFolderByPath(drive, currentFolderId, part.trim(), sharedDriveId);
        if (!foundId) {
          console.warn(`[Cruise Photos] Folder not found: ${part} in ${currentFolderId}`);
          return NextResponse.json({ ok: true, folders: [], images: [], currentPath: folderPath });
        }
        currentFolderId = foundId;
      }
      targetFolderId = currentFolderId;
    }

    // 폴더 목록 조회
    const folderQuery = `'${targetFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const folderOptions: any = {
      q: folderQuery,
      fields: 'files(id, name)',
      pageSize: 1000,
    };

    if (sharedDriveId && sharedDriveId !== 'root') {
      folderOptions.supportsAllDrives = true;
      folderOptions.includeItemsFromAllDrives = true;
      folderOptions.corpora = 'allDrives';
    }

    let folderResponse;
    try {
      console.log('[Cruise Photos] Fetching folders from:', targetFolderId);
      console.log('[Cruise Photos] Query:', folderQuery);
      folderResponse = await drive.files.list(folderOptions);
      console.log('[Cruise Photos] Folder response:', { count: folderResponse.data.files?.length || 0 });
    } catch (error: any) {
      console.error('[Cruise Photos] Folder list error:', error);
      console.error('[Cruise Photos] Error details:', {
        message: error.message,
        code: error.code,
        errors: error.errors,
      });
      return NextResponse.json(
        { ok: false, message: `폴더 목록 조회 실패: ${error.message}`, error: error.code },
        { status: 500 }
      );
    }

    const folders: Array<{ name: string; path: string; id: string }> = (folderResponse.data.files || [])
      .filter(file => file.name !== '.backup') // .backup 폴더 제외
      .map((file) => ({
        name: file.name || '',
        path: folderPath ? `${folderPath}/${file.name}` : file.name,
        id: file.id || '',
      }));


    // 이미지 파일 목록 조회
    const imageQuery = `'${targetFolderId}' in parents and mimeType contains 'image/' and trashed=false`;
    const imageOptions: any = {
      q: imageQuery,
      fields: 'files(id, name, mimeType, modifiedTime, size)',
      pageSize: 1000,
    };

    if (sharedDriveId && sharedDriveId !== 'root') {
      imageOptions.supportsAllDrives = true;
      imageOptions.includeItemsFromAllDrives = true;
      imageOptions.corpora = 'allDrives';
    }

    let imageResponse;
    try {
      imageResponse = await drive.files.list(imageOptions);

    } catch (error: any) {
      console.error('[Cruise Photos] Image list error:', error);
      console.error('[Cruise Photos] Error details:', {
        message: error.message,
        code: error.code,
        errors: error.errors,
      });
      return NextResponse.json(
        { ok: false, message: `이미지 목록 조회 실패: ${error.message}`, error: error.code },
        { status: 500 }
      );
    }

    // 이미지 파일들을 공개로 설정
    const images = await Promise.all(
      (imageResponse.data.files || []).map(async (file) => {
        if (!file.id || !file.name) return null;

        // WebP 파일도 허용 (주석 처리 또는 제거)
        // if (file.mimeType === 'image/webp') {
        //   return null;
        // }

        // 이미지 파일만 처리
        if (!file.mimeType?.startsWith('image/')) {
          return null;
        }

        // 이미지 파일만 처리
        if (!file.mimeType?.startsWith('image/')) {
          return null;
        }

        // 권한 설정 로직 제거 (Service Account가 readonly 권한만 있어서 실패함)
        // 이미지는 Proxy API를 통해 제공되므로 Drive 상에서 공개일 필요 없음

        // 프록시 URL 생성 (WebP 변환 지원)
        const proxyUrl = `/api/admin/cruise-photos/image?id=${file.id}`;
        const webpUrl = `/api/admin/cruise-photos/image?id=${file.id}&format=webp`;

        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

        return {
          id: file.id,
          name: file.name,
          url: proxyUrl,
          webpUrl: webpUrl,
          size: parseInt(file.size || '0', 10),
          modified: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
          code: {
            url: webpUrl, // WebP 우선 사용
            imageTag: `<Image src="${webpUrl}" alt="${nameWithoutExt}" width={500} height={300} />`,
            htmlTag: `<img src="${webpUrl}" alt="${nameWithoutExt}" />`,
          },
        };
      })
    );

    // null 값 제거
    const validImages = images.filter((img): img is NonNullable<typeof img> => img !== null);

    // 중복 제거 (ID 기준)
    const uniqueImages = Array.from(
      new Map(validImages.map((img) => [img.id, img])).values()
    );

    return NextResponse.json({
      ok: true,
      folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
      images: uniqueImages.sort((a, b) => b.modified.getTime() - a.modified.getTime()),
      currentPath: folderPath,
    });
  } catch (error: any) {
    console.error('[Cruise Photos] 에러:', error);
    console.error('[Cruise Photos] 에러 스택:', error.stack);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || '크루즈정보사진 목록을 불러오는 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

