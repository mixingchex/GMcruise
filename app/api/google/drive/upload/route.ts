import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { uploadToGoogleDrive } from '@/lib/google/drive';

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

    // 사용자의 구글 드라이브 토큰 가져오기 (실제로는 암호화된 저장소에서)
    // const user = await prisma.user.findUnique({ where: { id: session.userId } });
    // const accessToken = decrypt(user.googleDriveAccessToken);

    // 임시: 요청 본문에서 토큰 받기 (실제로는 세션에서 가져와야 함)
    const accessToken = formData.get('accessToken') as string;
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: '구글 드라이브 인증이 필요합니다.' }, { status: 401 });
    }

    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 구글 드라이브에 업로드
    const uploadedFile = await uploadToGoogleDrive(
      accessToken,
      fileName || `meeting-recording-${Date.now()}.webm`,
      buffer,
      file.type || 'video/webm'
    );

    return NextResponse.json({
      ok: true,
      file: {
        id: uploadedFile.id,
        name: uploadedFile.name,
        link: uploadedFile.webViewLink,
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







