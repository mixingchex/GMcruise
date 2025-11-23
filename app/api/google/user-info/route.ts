import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { getGoogleUserInfo } from '@/lib/google/drive';

export const dynamic = 'force-dynamic';

// 구글 사용자 정보 가져오기
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
    // 실제로는 세션 또는 암호화된 저장소에서 가져와야 함
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      // 로컬 스토리지에서 토큰을 가져오는 경우를 대비해 빈 응답 반환
      return NextResponse.json({ ok: false, error: '구글 드라이브 인증이 필요합니다.' }, { status: 401 });
    }

    // 사용자 정보 가져오기
    const userInfo = await getGoogleUserInfo(accessToken);

    return NextResponse.json({
      ok: true,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      accessToken: accessToken, // 임시로 반환 (실제로는 제거해야 함)
    });
  } catch (error) {
    console.error('[Google User Info] Error:', error);
    return NextResponse.json(
      { ok: false, error: '사용자 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}







