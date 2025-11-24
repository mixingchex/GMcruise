// app/api/admin/cruise-photos/image/route.ts
// 크루즈정보사진 이미지 프록시 API (WebP 변환 및 다운로드 지원)

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { google } from 'googleapis';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    throw new Error('Google Drive 서비스 계정 정보가 설정되어 있지 않습니다.');
  }

  // Private key 처리: 환경 변수에서 오는 다양한 형식 처리
  let processedKey = privateKey;
  
  // 따옴표 제거 (환경 변수가 따옴표로 감싸져 있는 경우)
  if ((processedKey.startsWith('"') && processedKey.endsWith('"')) ||
      (processedKey.startsWith("'") && processedKey.endsWith("'"))) {
    processedKey = processedKey.slice(1, -1);
  }
  
  // 줄바꿈 문자 처리
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
}

// GET: 구글 드라이브 이미지 가져오기 (WebP 변환 및 다운로드 지원)
export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const authError = await requireAdmin();
    if (authError) return authError;

    const url = new URL(req.url);
    const fileId = url.searchParams.get('id');
    const format = url.searchParams.get('format'); // 'webp' 또는 null
    const download = url.searchParams.get('download') === 'true'; // PNG 다운로드
    const watermark = url.searchParams.get('watermark') !== 'false'; // 워터마크 (기본값: true)

    if (!fileId) {
      return NextResponse.json({ ok: false, error: 'File ID is required' }, { status: 400 });
    }

    const drive = getDriveClient();
    // 공유 드라이브 ID (기본값: 0AJVz1C-KYWR0Uk9PVA)
    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '0AJVz1C-KYWR0Uk9PVA';

    // 파일 정보 가져오기
    const fileInfoOptions: any = {
      fileId,
      fields: 'mimeType, name',
    };

    if (sharedDriveId && sharedDriveId !== 'root') {
      fileInfoOptions.supportsAllDrives = true;
    }

    const fileInfo = await drive.files.get(fileInfoOptions);
    const mimeType = fileInfo.data.mimeType || 'image/jpeg';
    const fileName = fileInfo.data.name || 'image';

    // 이미지가 아니면 에러 반환
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'File is not an image' }, { status: 400 });
    }

    // 이미지 데이터 가져오기
    const getOptions: any = {
      fileId,
      alt: 'media',
    };

    if (sharedDriveId && sharedDriveId !== 'root') {
      getOptions.supportsAllDrives = true;
    }

    const imageResponse = await drive.files.get(getOptions, {
      responseType: 'arraybuffer',
    });

    if (!imageResponse.data) {
      throw new Error('Failed to fetch image data');
    }

    let imageBuffer = Buffer.from(imageResponse.data as ArrayBuffer) as Buffer;
    let outputMimeType = mimeType;
    let outputFileName = fileName;

    // WebP 변환
    if (format === 'webp') {
      try {
        imageBuffer = await sharp(imageBuffer)
          .webp({ quality: 80 })
          .toBuffer();
        outputMimeType = 'image/webp';
        outputFileName = fileName.replace(/\.[^/.]+$/, '') + '.webp';
      } catch (error) {
        console.error('[Cruise Photos Image] WebP conversion error:', error);
        // 변환 실패 시 원본 반환
      }
    }

    // PNG 다운로드 (워터마크 포함)
    if (download && format !== 'webp') {
      try {
        // 크루즈닷 로고 워터마크 경로 (public 폴더에 있어야 함)
        const watermarkPath = process.cwd() + '/public/logo-watermark.png';
        const fs = await import('fs/promises');
        
        let watermarkBuffer: Buffer | null = null;
        try {
          watermarkBuffer = await fs.readFile(watermarkPath);
        } catch (error) {
          console.warn('[Cruise Photos Image] Watermark file not found, skipping watermark');
        }

        let processedImage = sharp(imageBuffer);

        // 워터마크 추가
        if (watermark && watermarkBuffer) {
          const metadata = await processedImage.metadata();
          const watermarkImage = sharp(watermarkBuffer);
          const watermarkMetadata = await watermarkImage.metadata();

          // 워터마크 크기 조정 (원본 이미지의 20% 크기)
          const watermarkWidth = Math.floor((metadata.width || 1000) * 0.2);
          const watermarkHeight = Math.floor((watermarkMetadata.height || 1) * (watermarkWidth / (watermarkMetadata.width || 1)));

          // 워터마크 리사이즈
          const resizedWatermark = await watermarkImage
            .resize(watermarkWidth, watermarkHeight, { fit: 'inside' })
            .ensureAlpha()
            .png()
            .toBuffer();

          // 투명도 적용 (불투명도 30% = 알파 0.3)
          const opacity = 0.3;
          const watermarkWithOpacity = await sharp(resizedWatermark)
            .ensureAlpha()
            .png({ 
              quality: 100,
              compressionLevel: 9,
            })
            .toBuffer();
          
          // 알파 채널에 투명도 적용
          const watermarkData = await sharp(watermarkWithOpacity)
            .raw()
            .ensureAlpha()
            .toBuffer({ resolveWithObject: true });
          
          const pixels = watermarkData.data;
          for (let i = 3; i < pixels.length; i += 4) {
            pixels[i] = Math.floor(pixels[i] * opacity); // 알파 채널에 투명도 적용
          }
          
          const finalWatermark = await sharp(Buffer.from(pixels), {
            raw: {
              width: watermarkWidth,
              height: watermarkHeight,
              channels: 4,
            },
          })
            .png()
            .toBuffer();

          // 워터마크를 오른쪽 하단에 배치
          processedImage = processedImage.composite([
            {
              input: finalWatermark,
              top: (metadata.height || 0) - watermarkHeight - 20,
              left: (metadata.width || 0) - watermarkWidth - 20,
              blend: 'over',
            },
          ]);
        }

        // PNG로 변환
        imageBuffer = (await processedImage.png().toBuffer()) as Buffer;
        outputMimeType = 'image/png';
        outputFileName = fileName.replace(/\.[^/.]+$/, '') + '.png';
      } catch (error) {
        console.error('[Cruise Photos Image] PNG conversion/watermark error:', error);
        // 변환 실패 시 원본 반환
      }
    }

    // 응답 헤더 설정
    const headers: Record<string, string> = {
      'Content-Type': outputMimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    };

    // 다운로드인 경우 Content-Disposition 헤더 추가
    if (download) {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(outputFileName)}"`;
    }

    return new NextResponse(imageBuffer as any, {
      headers,
    });
  } catch (error: any) {
    console.error('[Cruise Photos Image] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

