export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google-drive';
import { Readable } from 'stream';
import { requirePartnerContext } from '@/app/api/partner/_utils';

// Google Drive 녹음파일 저장 폴더 ID
const AUDIO_FOLDER_ID = process.env.GOOGLE_DRIVE_UPLOADS_AUDIO_FOLDER_ID || '1XfdoQrODfjZOaQzV6X859fE2mCG4QuwY';

/**
 * 파트너용 녹음파일 업로드 API
 * POST /api/partner/upload/audio
 *
 * 판매원/대리점장이 상담 녹음 파일을 Google Drive에 업로드
 */
export async function POST(request: NextRequest) {
  try {
    const { profile, sessionUser } = await requirePartnerContext();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const leadId = formData.get('leadId') as string;
    const customerId = formData.get('customerId') as string;

    if (!file) {
      return NextResponse.json({ ok: false, error: '파일이 없습니다.' }, { status: 400 });
    }

    // 파일 확장자 확인
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      return NextResponse.json({ ok: false, error: '지원하지 않는 오디오 형식입니다.' }, { status: 400 });
    }

    // 파일명 생성: [원본파일명]_파트너타입_파트너명_고객ID_날짜시간.확장자
    const originalFileName = file.name;
    const ext = file.name.split('.').pop() || 'mp3';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const partnerType = profile.type === 'BRANCH_MANAGER' ? '대리점장' : '판매원';
    const partnerName = profile.displayName || sessionUser.name || 'unknown';
    const baseNameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '');
    const customerIdStr = customerId || leadId || 'unknown';
    const fileName = `${baseNameWithoutExt}_${partnerType}_${partnerName}_${customerIdStr}_${timestamp}.${ext}`;

    // Google Drive에 업로드
    const googleAuth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth: googleAuth });

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
        parents: [AUDIO_FOLDER_ID],
      },
      media: {
        mimeType: file.type || 'audio/mpeg',
        body: stream,
      },
      fields: 'id, webViewLink, webContentLink',
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
    });

    // 웹 링크 URL 생성
    const driveViewUrl = `https://drive.google.com/file/d/${response.data.id}/view`;
    const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${response.data.id}`;

    console.log(`[Partner Audio Upload] ${partnerType} ${partnerName} uploaded ${fileName} to Google Drive: ${driveViewUrl}`);

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
    console.error('[Partner Audio Upload Error]', error);
    return NextResponse.json({
      ok: false,
      error: error.message || '파일 업로드에 실패했습니다.',
    }, { status: 500 });
  }
}
