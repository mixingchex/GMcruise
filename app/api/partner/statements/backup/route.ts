export const dynamic = 'force-dynamic';
// [PHASE2] 크루즈가이드AI 경량화로 제거됨 (2026-03-07)
import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ ok: false, message: '지원 종료된 기능입니다.' }, { status: 410 });
}
