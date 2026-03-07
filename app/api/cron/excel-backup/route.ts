// [PHASE2] 크루즈가이드AI 경량화로 제거됨 (2026-03-07)
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ ok: false, message: '지원 종료된 기능입니다.' }, { status: 410 });
}
