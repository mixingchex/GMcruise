// app/api/admin/cruise-photos/route.ts
// 크루즈정보사진 폴더 탐색 API (구글 드라이브)

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { google } from 'googleapis';

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

function getDriveClient() {
  const clientEmail =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.error('[Cruise Photos] Missing credentials:', {
      hasEmail: !!clientEmail,
      hasKey: !!privateKey,
      emailEnv: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ? 'GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL' : 
                process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'GOOGLE_SERVICE_ACCOUNT_EMAIL' : 'none',
      keyEnv: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY' :
              process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY' : 'none',
    });
    throw new Error('Google Drive 서비스 계정 정보가 설정되어 있지 않습니다.');
  }

  try {
    // Private key 처리: 환경 변수에서 오는 다양한 형식 처리
    let processedKey = privateKey;
    
    // 따옴표 제거 (환경 변수가 따옴표로 감싸져 있는 경우)
    if ((processedKey.startsWith('"') && processedKey.endsWith('"')) ||
        (processedKey.startsWith("'") && processedKey.endsWith("'"))) {
      processedKey = processedKey.slice(1, -1);
    }
    
    // 줄바꿈 문자 처리 (여러 형식 지원)
    // 환경 변수에서 \n이 문자열로 들어오는 경우 처리
    if (processedKey.includes('\\n')) {
      processedKey = processedKey.replace(/\\n/g, '\n');
    }
    
    // Windows/Mac 줄바꿈 정규화
    processedKey = processedKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: processedKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    return google.drive({ version: 'v3', auth });
  } catch (error: any) {
    console.error('[Cruise Photos] Failed to create Drive client:', error);
    console.error('[Cruise Photos] Auth error details:', {
      message: error.message,
      code: error.code,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      privateKeyLength: privateKey?.length,
      privateKeyStart: privateKey?.substring(0, 50),
    });
    throw error;
  }
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
  try {
    // 관리자 권한 확인
    const authError = await requireAdmin();
    if (authError) return authError;

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

    const folders: Array<{ name: string; path: string; id: string }> = (folderResponse.data.files || []).map((file) => ({
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
      console.log('[Cruise Photos] Fetching images from:', targetFolderId);
      console.log('[Cruise Photos] Image query:', imageQuery);
      imageResponse = await drive.files.list(imageOptions);
      console.log('[Cruise Photos] Image response:', { count: imageResponse.data.files?.length || 0 });
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

        // WebP 파일은 목록에서 제외
        if (file.mimeType === 'image/webp') {
          return null;
        }

        // 이미지 파일만 처리
        if (!file.mimeType?.startsWith('image/')) {
          return null;
        }

        try {
          // 파일 공개 설정 시도
          try {
            await drive.permissions.create({
              fileId: file.id,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
              supportsAllDrives: sharedDriveId && sharedDriveId !== 'root',
            });
          } catch (permError: any) {
            // 이미 공개되어 있으면 무시
            if (!permError.message?.includes('already exists')) {
              console.warn(`[Cruise Photos] Permission error for ${file.id}:`, permError.message);
            }
          }
        } catch (error) {
          console.warn(`[Cruise Photos] Failed to set permissions for ${file.id}:`, error);
        }

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

