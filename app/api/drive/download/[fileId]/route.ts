export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAccessToken } from '@/lib/google-auth-jwt';

/**
 * Google Drive 파일 프록시 다운로드 API
 * GET /api/drive/download/[fileId]
 *
 * 서비스 계정으로 파일을 가져와 클라이언트에게 전달
 * 403 권한 문제 해결
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json({ error: '파일 ID가 필요합니다.' }, { status: 400 });
    }

    const accessToken = await getGoogleAccessToken();

    // 1. 파일 메타데이터 가져오기
    const metaResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=name,mimeType,size`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      console.error('[Drive Download] Metadata fetch failed:', errorText);
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    const metadata = await metaResponse.json();
    const fileName = metadata.name || 'download';
    const mimeType = metadata.mimeType || 'application/octet-stream';

    // 2. 파일 콘텐츠 다운로드
    const downloadResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      console.error('[Drive Download] Download failed:', errorText);
      return NextResponse.json({ error: '파일 다운로드 실패' }, { status: 500 });
    }

    // 3. 파일 스트림으로 응답
    const fileBuffer = await downloadResponse.arrayBuffer();

    // 파일명 인코딩 (한글 지원)
    const encodedFileName = encodeURIComponent(fileName).replace(/'/g, "%27");

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': String(fileBuffer.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[Drive Download Error]', error);
    return NextResponse.json({ error: error.message || '다운로드 실패' }, { status: 500 });
  }
}
