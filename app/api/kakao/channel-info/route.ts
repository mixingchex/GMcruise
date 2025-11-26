export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// GET: 카카오 채널 정보 조회 (공개용)
export async function GET(req: NextRequest) {
  try {
    const channelId = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_ID || '';
    const channelUrl = channelId ? `https://pf.kakao.com/_${channelId}` : '';
    const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '';
    
    // 환경 변수 확인
    const missingVars: string[] = [];
    if (!channelId) missingVars.push('NEXT_PUBLIC_KAKAO_CHANNEL_ID');
    if (!kakaoJsKey) missingVars.push('NEXT_PUBLIC_KAKAO_JS_KEY');
    
    if (missingVars.length > 0) {
      console.error('[Kakao Channel Info] Missing environment variables:', missingVars);
      return NextResponse.json({
        ok: false,
        error: '환경 변수가 설정되지 않았습니다',
        missingVars,
        channelId: '',
        channelUrl: '',
      });
    }
    
    return NextResponse.json({
      ok: true,
      channelId,
      channelUrl,
    });
  } catch (error) {
    console.error('[Kakao Channel Info] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to get channel info' },
      { status: 500 }
    );
  }
}
