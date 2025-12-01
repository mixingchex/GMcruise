export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { uploadFileToDrive, findOrCreateFolder } from '@/lib/google-drive';

// 구글 드라이브에 녹화 파일 업로드
export async function POST(request: NextRequest) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    if (!sid) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { User: true },
    });

    if (!session || !session.User) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    const meetingId = formData.get('meetingId') as string;

    if (!file || !fileName) {
      return NextResponse.json({ ok: false, error: '파일이 필요합니다.' }, { status: 400 });
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
