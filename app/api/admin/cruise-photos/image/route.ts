// app/api/admin/cruise-photos/image/route.ts
// 크루즈정보사진 이미지 프록시 API

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getDriveClient } from '@/lib/google-drive';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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



// GET: 구글 드라이브 이미지 가져오기
// - 조회: 원본 이미지 그대로 반환
// - 다운로드: 워터마크 포함 PNG로 변환
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const download = url.searchParams.get('download') === 'true';

    const fileId = url.searchParams.get('id');

    // 다운로드 요청시에만 권한 확인 (이미지 조회는 허용)
    // 이미지 자체는 공개되지만, 워터마크 포함 다운로드는 인증 필요
    if (download) {
      const authResult = await requireAdminOrPartner();
      if ('status' in authResult) return authResult;
    }

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

    // 다운로드시 워터마크 포함 PNG로 변환
    if (download) {
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

        // 워터마크 추가 (정중앙에 크게 배치) - 다운로드시 무조건 적용
        if (watermarkBuffer) {
          const metadata = await processedImage.metadata();
          const imageWidth = metadata.width || 1000;
          const imageHeight = metadata.height || 1000;
          const watermarkImage = sharp(watermarkBuffer);
          const watermarkMetadata = await watermarkImage.metadata();

          // 워터마크 크기 조정 (원본 이미지의 50% 크기로 크게)
          const watermarkWidth = Math.floor(imageWidth * 0.5);
          const watermarkHeight = Math.floor((watermarkMetadata.height || 1) * (watermarkWidth / (watermarkMetadata.width || 1)));

          // 워터마크 리사이즈 및 흑백 변환
          const resizedWatermark = await watermarkImage
            .resize(watermarkWidth, watermarkHeight, { fit: 'inside' })
            .grayscale() // 흑백 변환
            .ensureAlpha()
            .png()
            .toBuffer();

          // 투명도 적용 (불투명도 40% = 알파 0.40 - 더 잘 보이도록)
          const opacity = 0.40;
          const watermarkData = await sharp(resizedWatermark)
            .raw()
            .ensureAlpha()
            .toBuffer({ resolveWithObject: true });

          const pixels = watermarkData.data;
          for (let i = 3; i < pixels.length; i += 4) {
            pixels[i] = Math.floor(pixels[i] * opacity); // 알파 채널에 투명도 적용
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

        // PNG로 변환 (품질과 속도 균형)
        imageBuffer = (await processedImage.png({ compressionLevel: 6 }).toBuffer()) as Buffer;
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

