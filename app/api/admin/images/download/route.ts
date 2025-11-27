// app/api/admin/images/download/route.ts
// 이미지 라이브러리 이미지 다운로드 API (WebP 변환 및 워터마크 지원)

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import sharp from 'sharp';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 관리자 또는 판매원/대리점장 권한 확인
async function requireAdminOrAffiliate() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { role: true },
  });

  // 관리자는 항상 허용
  if (user?.role === 'admin') {
    return null;
  }

  // 판매원/대리점장 확인
  const affiliateProfile = await prisma.affiliateProfile.findFirst({
    where: { userId: sessionUser.id, status: 'ACTIVE' },
    select: { type: true },
  });

  if (affiliateProfile && (affiliateProfile.type === 'SALES_AGENT' || affiliateProfile.type === 'BRANCH_MANAGER')) {
    return null;
  }

  return NextResponse.json({ ok: false, message: 'Admin or Affiliate access required' }, { status: 403 });
}

// 워터마크 적용 함수
async function applyWatermark(buffer: Buffer): Promise<Buffer> {
  const watermarkPath = process.cwd() + '/public/logo-watermark.png';
  const fs = await import('fs/promises');
  
  let watermarkBuffer: Buffer | null = null;
  try {
    watermarkBuffer = await fs.readFile(watermarkPath);
  } catch (error) {
    logger.warn('[Image Library Download] Watermark file not found, skipping watermark');
    return buffer; // 워터마크 파일이 없으면 원본 반환
  }

  if (!watermarkBuffer) {
    return buffer;
  }

  let processedImage = sharp(buffer);
  const metadata = await processedImage.metadata();
  const watermarkImage = sharp(watermarkBuffer);
  const watermarkMetadata = await watermarkImage.metadata();

  // 워터마크 크기 조정 (원본 이미지의 50% 크기로 크게)
  const watermarkWidth = Math.floor((metadata.width || 1000) * 0.5);
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

  // 워터마크를 가운데에 배치
  const imageWidth = metadata.width || 1000;
  const imageHeight = metadata.height || 1000;
  const top = Math.floor((imageHeight - watermarkHeight) / 2);
  const left = Math.floor((imageWidth - watermarkWidth) / 2);
  
  processedImage = processedImage.composite([
    {
      input: finalWatermark,
      top: top,
      left: left,
      blend: 'over',
    },
  ]);

  return await processedImage.toBuffer();
}

// GET: 이미지 라이브러리 이미지 다운로드 (WebP 변환 및 워터마크 지원)
export async function GET(req: NextRequest) {
  try {
    // 관리자 또는 판매원/대리점장 권한 확인
    const authError = await requireAdminOrAffiliate();
    if (authError) return authError;

    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');
    const format = url.searchParams.get('format'); // 'webp' 또는 null
    const watermark = url.searchParams.get('watermark') !== 'false'; // 워터마크 (기본값: true)

    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: 'Image URL is required' }, { status: 400 });
    }

    // 이미지 다운로드
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    let imageBuffer = Buffer.from(imageArrayBuffer);
    
    // 파일명 추출
    const urlPath = new URL(imageUrl).pathname;
    const fileName = urlPath.split('/').pop() || 'image';
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    let outputMimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    let outputFileName = fileName;

    // 다운로드인 경우 워터마크 적용
    if (watermark) {
      try {
        imageBuffer = await applyWatermark(imageBuffer);
      } catch (error) {
        logger.error('[Image Library Download] Watermark application error:', error);
        // 워터마크 적용 실패 시 원본 반환
      }
    }

    // WebP 변환
    if (format === 'webp') {
      try {
        imageBuffer = await sharp(imageBuffer)
          .webp({ quality: 80 })
          .toBuffer();
        outputMimeType = 'image/webp';
        outputFileName = nameWithoutExt + '.webp';
      } catch (error) {
        logger.error('[Image Library Download] WebP conversion error:', error);
        // 변환 실패 시 원본 반환
      }
    } else {
      // PNG 다운로드인 경우 PNG로 변환
      try {
        imageBuffer = await sharp(imageBuffer).png().toBuffer();
        outputMimeType = 'image/png';
        outputFileName = nameWithoutExt + '.png';
      } catch (error) {
        logger.error('[Image Library Download] PNG conversion error:', error);
        // 변환 실패 시 원본 반환
      }
    }

    // 응답 헤더 설정
    const headers: Record<string, string> = {
      'Content-Type': outputMimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFileName)}"`,
    };

    return new NextResponse(imageBuffer as any, {
      headers,
    });
  } catch (error: any) {
    logger.error('[Image Library Download] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to download image' },
      { status: 500 }
    );
  }
}

