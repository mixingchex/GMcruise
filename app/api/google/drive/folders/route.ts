import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { getGoogleDriveFolders } from '@/lib/google/drive';

export const dynamic = 'force-dynamic';

// 구글 드라이브 폴더 목록 가져오기
export async function GET(request: NextRequest) {
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

    // 요청에서 accessToken 가져오기 (임시로 쿼리 파라미터에서)
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: '구글 드라이브 인증이 필요합니다.' }, { status: 401 });
    }

    // 폴더 목록 가져오기
    const folders = await getGoogleDriveFolders(accessToken);

    return NextResponse.json({
      ok: true,
      folders: folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        parents: folder.parents || [],
      })),
    });
  } catch (error) {
    console.error('[Google Drive Folders] Error:', error);
    return NextResponse.json(
      { ok: false, error: '폴더 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}







