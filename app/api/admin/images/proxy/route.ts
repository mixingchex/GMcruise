// app/api/admin/images/proxy/route.ts
// 이미지 라이브러리 이미지 프록시 API (로고 워터마크 포함 다운로드 지원)

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { google } from 'googleapis';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 관리자 또는 판매원 권한 확인
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

  if (user?.role !== 'admin' && !user?.AffiliateProfile) {
    return NextResponse.json({ ok: false, message: 'Admin or Partner access required' }, { status: 403 });
  }

  return { user, isAdmin: user?.role === 'admin' };
}

function getDriveClient() {
  const clientEmail =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.CLIENT_EMAIL;
  const privateKey =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    const envStatus = {
      GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      CLIENT_EMAIL: !!process.env.CLIENT_EMAIL,
      GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY: !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY,
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      PRIVATE_KEY: !!process.env.PRIVATE_KEY,
    };
    throw new Error(`Google Drive 서비스 계정 정보가 설정되어 있지 않습니다. (Email: ${Object.entries(envStatus).filter(([k, v]) => k.includes('EMAIL') && v).map(([k]) => k).join(',') || 'NONE'}, Key: ${Object.entries(envStatus).filter(([k, v]) => k.includes('KEY') && v).map(([k]) => k).join(',') || 'NONE'})`);
  }

  let processedKey = privateKey;
  if ((processedKey.startsWith('"') && processedKey.endsWith('"')) ||
    (processedKey.startsWith("'") && processedKey.endsWith("'"))) {
    processedKey = processedKey.slice(1, -1);
  }
  if (processedKey.includes('\\n')) {
    processedKey = processedKey.replace(/\\n/g, '\n');
  }
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

// GET: 이미지 프록시 (로고 워터마크 포함 다운로드 지원)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get('id');
    const download = url.searchParams.get('download') === 'true';
    const watermark = url.searchParams.get('watermark') !== 'false';

    // 다운로드 요청시에만 권한 확인
    if (download) {
      const authResult = await requireAdminOrPartner();
      if ('status' in authResult) return authResult;
    }

    if (!fileId) {
      return NextResponse.json({ ok: false, error: 'File ID is required' }, { status: 400 });
    }

    const drive = getDriveClient();
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

    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'File is not an image' }, { status: 400 });
    }

    // 이미지 데이터 가져오기
    const getOptions: any = { fileId, alt: 'media' };
    if (sharedDriveId && sharedDriveId !== 'root') {
      getOptions.supportsAllDrives = true;
    }

    const imageResponse = await drive.files.get(getOptions, {
      responseType: 'arraybuffer',
    });

    if (!imageResponse.data) {
      throw new Error('Failed to fetch image data');
    }

    let imageBuffer = Buffer.from(imageResponse.data as ArrayBuffer);
    let outputMimeType = mimeType;
    let outputFileName = fileName;

    // PNG 다운로드 (워터마크 포함)
    if (download) {
      try {
        const watermarkPath = process.cwd() + '/public/logo-watermark.png';
        const fs = await import('fs/promises');

        let watermarkBuffer: Buffer | null = null;
        try {
          watermarkBuffer = await fs.readFile(watermarkPath);
        } catch (error) {
          console.warn('[Image Proxy] Watermark file not found, skipping watermark');
        }

        let processedImage = sharp(imageBuffer);

        // 워터마크 추가 (정중앙에 크게 배치)
        if (watermark && watermarkBuffer) {
          const metadata = await processedImage.metadata();
          const imageWidth = metadata.width || 1000;
          const imageHeight = metadata.height || 1000;
          const watermarkImage = sharp(watermarkBuffer);
          const watermarkMetadata = await watermarkImage.metadata();

          // 워터마크 크기 조정 (원본 이미지의 50% 크기로 크게)
          const watermarkWidth = Math.floor(imageWidth * 0.5);
          const watermarkHeight = Math.floor((watermarkMetadata.height || 1) * (watermarkWidth / (watermarkMetadata.width || 1)));

          // 워터마크 리사이즈
          const resizedWatermark = await watermarkImage
            .resize(watermarkWidth, watermarkHeight, { fit: 'inside' })
            .ensureAlpha()
            .png()
            .toBuffer();

          // 투명도 적용 (불투명도 25%)
          const opacity = 0.25;
          const watermarkData = await sharp(resizedWatermark)
            .raw()
            .ensureAlpha()
            .toBuffer({ resolveWithObject: true });

          const pixels = watermarkData.data;
          for (let i = 3; i < pixels.length; i += 4) {
            pixels[i] = Math.floor(pixels[i] * opacity);
          }

          const finalWatermark = await sharp(Buffer.from(pixels), {
            raw: {
              width: watermarkData.info.width,
              height: watermarkData.info.height,
              channels: 4,
            },
          })
            .png()
            .toBuffer();

          // 워터마크를 정중앙에 배치
          const centerTop = Math.floor((imageHeight - watermarkData.info.height) / 2);
          const centerLeft = Math.floor((imageWidth - watermarkData.info.width) / 2);

          processedImage = processedImage.composite([
            {
              input: finalWatermark,
              top: centerTop,
              left: centerLeft,
              blend: 'over',
            },
          ]);
        }

        // PNG로 변환
        imageBuffer = await processedImage.png({ compressionLevel: 6 }).toBuffer();
        outputMimeType = 'image/png';
        outputFileName = fileName.replace(/\.[^/.]+$/, '') + '.png';
      } catch (error) {
        console.error('[Image Proxy] PNG conversion/watermark error:', error);
      }
    }

    // 응답 헤더 설정
    const headers: Record<string, string> = {
      'Content-Type': outputMimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    };

    if (download) {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(outputFileName)}"`;
    }

    return new NextResponse(imageBuffer, { headers });
  } catch (error: any) {
    console.error('[Image Proxy] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch image' },
      { status: 500 }
    );
  }
}
