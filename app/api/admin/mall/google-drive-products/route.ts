// app/api/admin/mall/google-drive-products/route.ts
// 구글 드라이브 상품 폴더의 이미지 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { google } from 'googleapis';

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

function getDriveClient() {
  const clientEmail =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive 서비스 계정 정보가 설정되어 있지 않습니다.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'], // 파일 공개 설정을 위해 file 스코프 사용
  });

  return google.drive({ version: 'v3', auth });
}

// GET: 구글 드라이브 상품 폴더의 이미지 목록 조회
export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const folderId = url.searchParams.get('folderId'); // 특정 폴더 ID (선택적)
    const listFolders = url.searchParams.get('listFolders') === 'true'; // 폴더 목록만 조회

    // 구글 드라이브 상품 폴더 ID 가져오기
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: 'google_drive_products_folder_id' },
      select: { configValue: true },
    });

    const productsFolderId = config?.configValue || process.env.GOOGLE_DRIVE_PRODUCTS_FOLDER_ID || '18YuEBt313yyKI3F7PSzjFFRF3Af-bVPH';

    if (!productsFolderId) {
      return NextResponse.json({
        ok: false,
        error: '상품 폴더 ID가 설정되지 않았습니다. 관리자 설정에서 Google Drive 상품 폴더 ID를 설정해주세요.',
      }, { status: 400 });
    }

    const drive = getDriveClient();
    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;

    // 폴더 목록 조회
    if (listFolders) {
      const query = `'${productsFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      const searchOptions: any = {
        q: query,
        fields: 'files(id, name)',
        pageSize: 1000,
      };

      if (sharedDriveId && sharedDriveId !== 'root') {
        searchOptions.supportsAllDrives = true;
        searchOptions.includeItemsFromAllDrives = true;
        searchOptions.corpora = 'allDrives';
      }

      const response = await drive.files.list(searchOptions);
      const folders = (response.data.files || []).map((file) => ({
        id: file.id,
        name: file.name || '',
      }));

      return NextResponse.json({
        ok: true,
        folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    // 특정 폴더의 이미지 목록 조회
    const targetFolderId = folderId || productsFolderId;
    
    // 이미지 파일만 조회 (mimeType이 image로 시작하는 파일)
    const query = `'${targetFolderId}' in parents and mimeType contains 'image/' and trashed=false`;
    
    const searchOptions: any = {
      q: query,
      fields: 'files(id, name, webViewLink, webContentLink, thumbnailLink, mimeType)',
      pageSize: 1000,
    };

    if (sharedDriveId && sharedDriveId !== 'root') {
      searchOptions.supportsAllDrives = true;
      searchOptions.includeItemsFromAllDrives = true;
      searchOptions.corpora = 'allDrives';
    }

    console.log('[Google Drive Products API] Querying folder:', targetFolderId);
    console.log('[Google Drive Products API] Query:', query);
    
    const response = await drive.files.list(searchOptions);
    
    console.log('[Google Drive Products API] Response:', {
      fileCount: response.data.files?.length || 0,
      files: response.data.files?.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType })) || []
    });
    
    // 이미지 파일들을 공개로 설정하고 직접 이미지 URL 생성
    const images = await Promise.all(
      (response.data.files || []).map(async (file) => {
        if (!file.id) return null;
        
        try {
          // 파일이 공개되어 있는지 확인하고, 공개되어 있지 않으면 공개로 설정
          try {
            await drive.permissions.create({
              fileId: file.id,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
              supportsAllDrives: sharedDriveId && sharedDriveId !== 'root',
            });
            console.log(`[Google Drive] Made file public: ${file.id}`);
          } catch (permError: any) {
            // 이미 공개되어 있거나 권한이 있는 경우 무시
            if (!permError.message?.includes('already exists') && !permError.message?.includes('Permission denied')) {
              console.warn(`[Google Drive] Permission error for ${file.id}:`, permError.message);
            }
          }
        } catch (error) {
          console.warn(`[Google Drive] Failed to set permissions for ${file.id}:`, error);
        }
        
        // 파일을 공개로 설정한 후, 직접 이미지 URL 생성
        // 공개 설정 후 webContentLink를 다시 가져와야 할 수 있음
        let directImageUrl = '';
        let thumbnailUrl = '';
        
        // 공개 설정 후 파일 정보 다시 가져오기 (webContentLink 업데이트 확인)
        try {
          const updatedFile = await drive.files.get({
            fileId: file.id,
            fields: 'webContentLink, thumbnailLink, webViewLink',
            supportsAllDrives: sharedDriveId && sharedDriveId !== 'root',
          });
          
          // webContentLink가 있으면 사용 (가장 안정적)
          if (updatedFile.data.webContentLink) {
            directImageUrl = updatedFile.data.webContentLink;
          } else if (updatedFile.data.thumbnailLink) {
            // thumbnailLink를 사용하되, 크기를 크게 설정
            directImageUrl = updatedFile.data.thumbnailLink.replace(/=s\d+/, '=s2000');
          } else {
            // 파일 ID로 직접 이미지 URL 생성
            directImageUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
          }
          
          // 썸네일 URL
          if (updatedFile.data.thumbnailLink) {
            thumbnailUrl = updatedFile.data.thumbnailLink.replace(/=s\d+/, '=s400');
          } else {
            thumbnailUrl = directImageUrl;
          }
        } catch (updateError) {
          console.warn(`[Google Drive] Failed to get updated file info for ${file.id}:`, updateError);
          // 폴백: 원본 파일 정보 사용
          if (file.webContentLink) {
            directImageUrl = file.webContentLink;
          } else if (file.thumbnailLink) {
            directImageUrl = file.thumbnailLink.replace(/=s\d+/, '=s2000');
          } else {
            directImageUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
          }
          thumbnailUrl = file.thumbnailLink 
            ? file.thumbnailLink.replace(/=s\d+/, '=s400')
            : directImageUrl;
        }
        
        // 프록시 URL 생성 (공유 설정과 무관하게 작동)
        const proxyUrl = `/api/admin/mall/google-drive-image?id=${file.id}`;
        
        console.log(`[Google Drive Products API] Image URL generated:`, {
          id: file.id,
          name: file.name,
          proxyUrl: proxyUrl,
          directUrl: directImageUrl,
          webContentLink: file.webContentLink,
        });
        
        // 프록시 URL을 우선 사용 (공유 설정 문제 해결)
        // 프록시는 서비스 계정으로 이미지를 가져오므로 공개 설정이 필요 없음
        return {
          id: file.id,
          name: file.name || '',
          url: proxyUrl, // 프록시 URL 우선 사용 (공유 설정 무관)
          proxyUrl: proxyUrl, // 프록시 URL (명시적)
          directUrl: directImageUrl, // 직접 URL (백업용, 공개 설정 필요)
          viewUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`, // 뷰어 링크 (참고용)
          thumbnail: proxyUrl, // 썸네일도 프록시 URL 사용
          mimeType: file.mimeType || 'image/jpeg',
        };
      })
    );
    
    // null 값 제거
    const validImages = images.filter((img): img is NonNullable<typeof img> => img !== null);

    return NextResponse.json({
      ok: true,
      folderId: targetFolderId,
      images: validImages.sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (error: any) {
    console.error('[Google Drive Products API] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch images from Google Drive' },
      { status: 500 }
    );
  }
}

