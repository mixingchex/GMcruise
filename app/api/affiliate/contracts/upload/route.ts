import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

function normalizeFileName(name: string, fallback: string) {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;
  const replaced = trimmed
    .replace(/[^\w.\-가-힣ㄱ-ㅎㅏ-ㅣ ]+/g, '')
    .replace(/\s+/g, '_');
  return replaced || fallback;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'signature';

    // 현재는 signature만 지원
    if (type !== 'signature') {
      return NextResponse.json({ ok: false, message: '현재는 서명(signature)만 업로드할 수 있습니다.' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, message: '업로드할 파일이 필요합니다.' }, { status: 400 });
    }

    const originalName = formData.get('fileName')?.toString() || file.name || `signature-${Date.now()}.png`;
    const mimeType = file.type || 'application/octet-stream';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 파일 크기 검증 (최대 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, message: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.` },
        { status: 400 }
      );
    }

    // 파일 크기 최소 검증 (빈 파일 방지)
    if (buffer.length === 0) {
      return NextResponse.json(
        { ok: false, message: '파일이 비어있습니다.' },
        { status: 400 }
      );
    }

    // 이미지 형식 검증 (PNG, JPG, JPEG, WEBP만 허용)
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return NextResponse.json(
        { ok: false, message: '지원하지 않는 파일 형식입니다. PNG, JPG, JPEG, WEBP만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 이미지 파일 무결성 검증 (매직 넘버 확인)
    const isPNG = buffer.length >= 4 && 
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJPEG = buffer.length >= 3 && 
      buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isWEBP = buffer.length >= 12 && 
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // WEBP
    
    const isValidImage = isPNG || isJPEG || isWEBP;
    
    if (!isValidImage) {
      logger.error('[Contract Signature] Invalid image file detected:', {
        mimeType,
        bufferStart: Array.from(buffer.slice(0, 12)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '),
        fileSize: buffer.length
      });
      return NextResponse.json(
        { ok: false, message: '유효하지 않은 이미지 파일입니다. 파일이 손상되었을 수 있습니다.' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const safeFileName = normalizeFileName(originalName, `signature-${timestamp}.png`);
    const uniqueFileName = `${timestamp}-${safeFileName}`;

    // 1단계: 서버에 먼저 저장 (/tmp 디렉토리)
    const tmpDir = '/tmp';
    const tmpFilePath = join(tmpDir, uniqueFileName);
    
    try {
      await writeFile(tmpFilePath, buffer);
      logger.log(`[Contract Signature] Saved to server: ${tmpFilePath}`);
    } catch (error: any) {
      // 서버 저장 실패는 경고만 로그하고 계속 진행 (에러 발생 안 함)
      logger.warn('[Contract Signature] Server save failed (non-critical, continuing):', error?.message || error);
    }

    // 2단계: Base64로 인코딩하여 즉시 반환 (싸인 이미지 바로 표시)
    const base64Image = `data:${mimeType};base64,${buffer.toString('base64')}`;
    
    // 3단계: Google Drive 폴더 ID 확인 및 백그라운드 업로드
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: 'google_drive_signatures_folder_id' },
      select: { configValue: true },
    });

    const folderId = config?.configValue || process.env.GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID || '1PcdSnWQ3iCdd87Y-UI_63HSjlYqcFGyX';

    // Google Drive 업로드는 백그라운드에서 진행 (응답 지연 없음)
    if (folderId && folderId !== 'root') {
      const { uploadFileToDrive } = await import('@/lib/google-drive');
      
      // 백그라운드에서 Google Drive 업로드 (응답을 기다리지 않음)
      uploadFileToDrive({
        folderId,
        fileName: uniqueFileName,
        mimeType: mimeType || 'image/png',
        buffer: buffer,
        makePublic: true, // 서명 이미지는 공개 (계약서에 포함되어야 함)
      }).then((uploadResult) => {
        if (uploadResult.ok && uploadResult.url && uploadResult.fileId) {
          logger.log(`[Contract Signature] Uploaded to Google Drive (background): ${uploadResult.url}`);
          // TODO: 필요시 DB에 Google Drive URL 업데이트 (Base64 URL을 Google Drive URL로 교체)
        } else {
          logger.warn('[Contract Signature] Google Drive upload failed (background):', uploadResult.error);
        }
      }).catch((error) => {
        logger.error('[Contract Signature] Google Drive upload error (background):', error);
        // 백그라운드 업로드 실패해도 서버에는 저장되어 있으므로 계속 진행
      });
    } else {
      logger.warn('[Contract Signature] Google Drive folder ID not configured, skipping upload');
    }

    // 서버 저장 완료 시 즉시 응답 반환 (싸인 이미지 바로 표시)
    return NextResponse.json({
      ok: true,
      url: base64Image, // Base64 이미지로 즉시 표시
      fileId: uniqueFileName,
      originalName,
      storedName: uniqueFileName,
      mimeType,
      size: buffer.length,
      type,
      message: '서명이 저장되었습니다.',
    });
  } catch (error: any) {
    logger.error('[AffiliateContractUpload] error:', error);
    return NextResponse.json({ ok: false, message: error?.message || '파일 업로드 중 오류가 발생했습니다.' }, { status: 500 });
  }
}