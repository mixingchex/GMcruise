export const dynamic = 'force-dynamic';

// app/api/affiliate/track/route.ts
// 어필리에이트 추적 쿠키를 서버사이드에서 설정 (HttpOnly — XSS 탈취 방지)

import { NextRequest, NextResponse } from 'next/server';

const AFFILIATE_CODE_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export async function POST(req: NextRequest) {
  try {
    const { mallUserId, affiliateCode } = await req.json();

    if (!mallUserId || !AFFILIATE_CODE_PATTERN.test(String(mallUserId))) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookies.set('affiliate_mall_user_id', String(mallUserId), {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      expires,
      path: '/',
    });

    if (affiliateCode && AFFILIATE_CODE_PATTERN.test(String(affiliateCode))) {
      res.cookies.set('affiliate_code', String(affiliateCode), {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        expires,
        path: '/',
      });
    }

    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
