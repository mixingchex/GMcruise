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

    // Google Drive에 직접 업로드 (가장 빠른 방법)
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: 'google_drive_signatures_folder_id' },
      select: { configValue: true },
    });

    const folderId = config?.configValue || process.env.GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID;

    if (!folderId || folderId === 'root') {
      logger.error('[Contract Signature] Google Drive folder ID not configured');
      return NextResponse.json(
        { 
          ok: false, 
          message: '서명 업로드 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.' 
        }, 
        { status: 500 }
      );
    }

    // Google Drive에 직접 업로드 (메모리에서 바로, 가장 빠름)
    const { uploadFileToDrive } = await import('@/lib/google-drive');
    
    // 타임아웃 20초로 설정 (빠른 응답을 위해)
    const uploadTimeout = 20000;
    let uploadResult: any = null;
    let lastError: any = null;

    try {
      const uploadPromise = uploadFileToDrive({
        folderId,
        fileName: uniqueFileName,
        mimeType: mimeType || 'image/png',
        buffer: buffer, // 메모리에서 직접 업로드
        makePublic: true, // 서명 이미지는 공개 (계약서에 포함되어야 함)
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('업로드 타임아웃: 20초 내에 완료되지 않았습니다.')), uploadTimeout);
      });

      uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (uploadResult.ok && uploadResult.url && uploadResult.fileId) {
        logger.log(`[Contract Signature] Uploaded to Google Drive: ${uploadResult.url}`);
        
        // 백그라운드에서 서버에 백업 저장 (비동기, 응답 지연 없음)
        const tmpDir = '/tmp';
        const tmpFilePath = join(tmpDir, uniqueFileName);
        writeFile(tmpFilePath, buffer).catch((e) => {
          logger.warn('[Contract Signature] Background backup save failed (non-critical):', e);
        });

        // 즉시 응답 반환 (가장 빠름)
        return NextResponse.json({
          ok: true,
          url: uploadResult.url,
          fileId: uploadResult.fileId,
          originalName,
          storedName: uniqueFileName,
          mimeType,
          size: buffer.length,
          type,
        });
      } else {
        lastError = uploadResult.error || '알 수 없는 오류';
        throw new Error(lastError);
      }
    } catch (error: any) {
      lastError = error;
      logger.error('[Contract Signature] Google Drive upload error:', error);
      
      // 실패 시 재시도 (1회만, 빠른 실패를 위해)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
        
        const retryResult = await uploadFileToDrive({
          folderId,
          fileName: uniqueFileName,
          mimeType: mimeType || 'image/png',
          buffer: buffer,
          makePublic: true,
        });

        if (retryResult.ok && retryResult.url && retryResult.fileId) {
          logger.log(`[Contract Signature] Uploaded to Google Drive (retry): ${retryResult.url}`);
          return NextResponse.json({
            ok: true,
            url: retryResult.url,
            fileId: retryResult.fileId,
            originalName,
            storedName: uniqueFileName,
            mimeType,
            size: buffer.length,
            type,
          });
        }
      } catch (retryError: any) {
        logger.error('[Contract Signature] Retry also failed:', retryError);
      }

      // 최종 실패 응답
      return NextResponse.json(
        { 
          ok: false, 
          message: `서명 업로드 실패: ${lastError?.message || lastError || 'Google Drive 업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}` 
        }, 
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('[AffiliateContractUpload] error:', error);
    return NextResponse.json({ ok: false, message: error?.message || '파일 업로드 중 오류가 발생했습니다.' }, { status: 500 });
  }
}