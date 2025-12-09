export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Vercel Serverless Functions에서 body 크기 제한 설정 (최대 4.5MB)
// Pro plan에서는 더 높은 제한 가능

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google-drive';
import { Readable } from 'stream';

// B2B 오디오 폴더 (B2B 유입 + 시스템 상담 모두 동일 폴더 사용)
// B2B 전용 오디오 폴더: https://drive.google.com/drive/folders/15h6_By31Y4Xy1MwIIWwkSc-uI-YI3A_S
const B2B_AUDIO_FOLDER_ID = '15h6_By31Y4Xy1MwIIWwkSc-uI-YI3A_S';

// 파일 크기 제한 (Vercel Free Plan: 4.5MB, FormData 오버헤드 고려해서 4MB)
const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// OPTIONS 핸들러 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customerId = formData.get('customerId') as string;
    const prospectType = formData.get('prospectType') as string; // 'lead' or 'consultation'

    if (!file) {
      return NextResponse.json({ ok: false, error: '파일이 없습니다.' }, { status: 400 });
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({
        ok: false,
        error: `파일 크기가 ${MAX_FILE_SIZE_MB}MB를 초과합니다. 만능 압축기를 사용하여 오디오를 압축해주세요.`,
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE_BYTES,
      }, { status: 413 });
    }

    // 파일 확장자 확인
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      return NextResponse.json({ ok: false, error: '지원하지 않는 오디오 형식입니다.' }, { status: 400 });
    }

    // 원본 파일명 보존 + 유형_고객ID_날짜시간 추가
    const originalFileName = file.name;
    const ext = file.name.split('.').pop() || 'mp3';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const typePrefix = prospectType === 'lead' ? 'B2B유입' : '시스템상담';
    const baseNameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '');
    const fileName = `${typePrefix}_${baseNameWithoutExt}_${customerId || 'unknown'}_${timestamp}.${ext}`;

    // Google Drive에 업로드
    const googleAuth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth: googleAuth });

    // B2B 유입 + 시스템 상담 모두 동일한 B2B 오디오 폴더 사용
    const targetFolderId = B2B_AUDIO_FOLDER_ID;

    console.log(`[Audio Upload] Uploading to B2B Audio folder (${targetFolderId}), type: ${typePrefix}`);

    // File을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Readable stream 생성
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: file.type || 'audio/mpeg',
        parents: [targetFolderId],
      },
      media: {
        mimeType: file.type || 'audio/mpeg',
        body: stream,
      },
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true,  // 공유 드라이브 지원
    });

    if (!response.data.id) {
      throw new Error('Google Drive 업로드 실패');
    }

    // 파일 공개 설정 (링크가 있는 사람 누구나)
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,  // 공유 드라이브 지원
    });

    // 웹 링크 URL 생성 (보기용 + 다운로드용)
    const driveViewUrl = `https://drive.google.com/file/d/${response.data.id}/view`;
    const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${response.data.id}`;

    console.log(`[Audio Upload] Uploaded ${fileName} to Google Drive: ${driveViewUrl}`);

    return NextResponse.json({
      ok: true,
      url: driveViewUrl,
      downloadUrl: driveDownloadUrl,
      fileId: response.data.id,
      fileName: fileName,
      originalFileName: originalFileName,
      message: '녹음 파일이 Google 드라이브에 업로드되었습니다.',
    });
  } catch (error: any) {
    console.error('[Audio Upload Error]', error);
    return NextResponse.json({
      ok: false,
      error: error.message || '파일 업로드에 실패했습니다.',
    }, { status: 500 });
  }
}

// Next.js App Router에서는 config 대신 route segment config 사용
// FormData는 자동으로 처리됨
