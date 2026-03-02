export const dynamic = 'force-dynamic';

// [비활성화] 이 라우트는 사용되지 않음
// 현재 모바일 결제 흐름: P_NEXT_URL → /api/payment/callback (POST)
// SSRF 취약점(P_REQ_URL 미검증) 방어를 위해 410 Gone 응답으로 영구 비활성화

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ ok: false, error: 'Gone' }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Gone' }, { status: 410 });
}
