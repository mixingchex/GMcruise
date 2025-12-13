export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { uploadFileToDrive, findOrCreateFolder } from '@/lib/google-drive';

// 구글 드라이브에 녹화 파일 업로드
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sid) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      select: {
        expiresAt: true,
        User: { select: { id: true, role: true } },
      },
    });

    if (!session || !session.User) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 🔒 세션 만료 검증
    if (session.expiresAt && session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: sid } }).catch(() => {});
      return NextResponse.json({ ok: false, error: '세션이 만료되었습니다.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    const meetingId = formData.get('meetingId') as string;

    if (!file || !fileName) {
      return NextResponse.json({ ok: false, error: '파일이 필요합니다.' }, { status: 400 });
    }

    // 🔒 파일 크기 제한 (500MB for video)
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        ok: false,
        error: `파일 크기가 너무 큽니다. (최대 500MB, 현재 ${Math.round(file.size / 1024 / 1024)}MB)`
      }, { status: 400 });
    }

    // 🔒 허용된 파일 타입 검증
    const allowedTypes = ['video/webm', 'video/mp4', 'audio/webm', 'audio/mp3', 'audio/wav'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ ok: false, error: '허용되지 않는 파일 형식입니다.' }, { status: 400 });
    }

    // Access Token is no longer needed as we use Service Account
    // const accessToken = formData.get('accessToken') as string;

    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Target Folder: Meeting Recordings
    const { getDriveFolderId } = await import('@/lib/config/drive-config');
    const folderId = await getDriveFolderId('MEETING_RECORDINGS');

    // 구글 드라이브에 업로드
    const uploadResult = await uploadFileToDrive({
      folderId: folderId,
      fileName: fileName || `meeting-recording-${Date.now()}.webm`,
      mimeType: file.type || 'video/webm',
      buffer,
      makePublic: true
    });

    if (!uploadResult.ok || !uploadResult.fileId) {
      throw new Error(uploadResult.error || 'Upload failed');
    }

    return NextResponse.json({
      ok: true,
      file: {
        id: uploadResult.fileId,
        name: fileName,
        link: uploadResult.url,
      },
    });
  } catch (error) {
    console.error('[Google Drive Upload] Error:', error);
    return NextResponse.json(
      { ok: false, error: '파일 업로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
