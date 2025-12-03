// app/api/admin/mall/google-drive-image/route.ts
// 구글 드라이브 이미지 프록시 API (CORS 및 공개 설정 문제 해결)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getDriveClient } from '@/lib/google-drive';

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



// GET: 구글 드라이브 이미지 프록시
export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const fileId = url.searchParams.get('id');
    const size = url.searchParams.get('size') || '2000'; // 기본 크기

    if (!fileId) {
      return NextResponse.json({ ok: false, error: 'File ID is required' }, { status: 400 });
    }

    const drive = getDriveClient();
    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;

    try {
      // 파일 정보 가져오기 (mimeType 확인)
      const fileInfoOptions: any = {
        fileId,
        fields: 'mimeType',
      };

      if (sharedDriveId && sharedDriveId !== 'root') {
        fileInfoOptions.supportsAllDrives = true;
      }

      const fileInfo = await drive.files.get(fileInfoOptions);

      const mimeType = fileInfo.data.mimeType || 'image/jpeg';

      // 이미지가 아니면 에러 반환
      if (!mimeType.startsWith('image/')) {
        console.warn(`[Google Drive Image Proxy] File is not an image: ${fileId}, mimeType: ${mimeType}`);
        return NextResponse.json({ ok: false, error: 'File is not an image' }, { status: 400 });
      }

      // 이미지 데이터 가져오기 (alt: 'media' 사용)
      const getOptions: any = {
        fileId,
        alt: 'media', // 중요: 미디어 콘텐츠를 가져오기 위해 필요
      };

      if (sharedDriveId && sharedDriveId !== 'root') {
        getOptions.supportsAllDrives = true;
      }

      const imageResponse = await drive.files.get(getOptions, {
        responseType: 'arraybuffer',
      });

      if (!imageResponse.data) {
        throw new Error('Failed to fetch image data: response data is empty');
      }

      const imageBuffer = Buffer.from(imageResponse.data as ArrayBuffer);

      if (imageBuffer.length === 0) {
        throw new Error('Failed to fetch image data: buffer is empty');
      }

      console.log(`[Google Drive Image Proxy] Serving image: ${fileId}, size: ${imageBuffer.length} bytes, type: ${mimeType}`);

      // 이미지 반환
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*', // CORS 허용
          'Access-Control-Allow-Methods': 'GET',
        },
      });
    } catch (error: any) {
      console.error('[Google Drive Image Proxy] Error fetching image:', {
        fileId,
        error: error.message,
        stack: error.stack,
      });

      // 더 자세한 에러 정보 반환
      return NextResponse.json(
        {
          ok: false,
          error: error.message || 'Failed to fetch image from Google Drive',
          fileId,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Google Drive Image Proxy] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to proxy image' },
      { status: 500 }
    );
  }
}

