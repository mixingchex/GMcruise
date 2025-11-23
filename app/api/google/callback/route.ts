import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGoogleDriveAuth, getGoogleUserInfo } from '@/lib/google/drive';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

// 구글 OAuth 콜백 처리
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/dashboard?error=google_auth_failed`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/dashboard?error=no_code`
      );
    }

    // 세션 확인
    const sid = cookies().get(SESSION_COOKIE)?.value;
    if (!sid) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/dashboard?error=no_session`
      );
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { User: true },
    });

    if (!session || !session.User) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/dashboard?error=invalid_session`
      );
    }

    // 토큰 교환
    const oauth2Client = getGoogleDriveAuth();
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/dashboard?error=no_tokens`
      );
    }

    // 사용자 정보 가져오기
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    // 구글 계정 정보 저장 (User 모델에 필드 추가 필요)
    // 임시로 세션에 저장하거나 별도 테이블에 저장
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        // googleDriveAccessToken: tokens.access_token, // 암호화 필요
        // googleDriveRefreshToken: tokens.refresh_token, // 암호화 필요
        // googleEmail: userInfo.email,
      },
    });

    // 리다이렉트 URL 가져오기 (원래 있던 페이지로 돌아가기)
    const returnUrl = new URL(request.url).searchParams.get('returnUrl') || 
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/video-meetings`;

    // 성공 리다이렉트 (토큰과 사용자 정보를 쿼리 파라미터로 전달 - 실제로는 세션에 저장해야 함)
    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set('google_auth', 'success');
    redirectUrl.searchParams.set('google_token', tokens.access_token || '');
    redirectUrl.searchParams.set('google_email', userInfo.email || '');
    redirectUrl.searchParams.set('google_name', userInfo.name || '');
    redirectUrl.searchParams.set('google_picture', userInfo.picture || '');

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('[Google Callback] Error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/dashboard?error=callback_failed`
    );
  }
}

