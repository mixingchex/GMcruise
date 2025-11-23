import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google/drive';

export const dynamic = 'force-dynamic';

// 구글 드라이브 인증 시작
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('returnUrl');
    
    const authUrl = getGoogleAuthUrl();
    const finalAuthUrl = new URL(authUrl);
    if (returnUrl) {
      finalAuthUrl.searchParams.set('returnUrl', returnUrl);
    }
    
    return NextResponse.json({ ok: true, authUrl: finalAuthUrl.toString() });
  } catch (error) {
    console.error('[Google Auth] Error:', error);
    return NextResponse.json(
      { ok: false, error: '구글 인증 URL 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

