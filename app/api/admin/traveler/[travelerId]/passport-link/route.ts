// WO-NEW-06-A: 관리자 전용 여권 Drive 링크 API
// GET /api/admin/traveler/[travelerId]/passport-link
// 감사 로그 기록 후 Drive URL 반환 (PII URL 직접 노출 방지)
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { log } from '@/lib/logger-wrapper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ travelerId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !['admin', 'superadmin'].includes(sessionUser.role ?? '')) {
    return NextResponse.json({ ok: false, message: '관리자만 접근 가능합니다.' }, { status: 403 });
  }

  const { travelerId: travelerIdStr } = await params;
  const travelerId = parseInt(travelerIdStr);
  if (isNaN(travelerId)) {
    return NextResponse.json({ ok: false, message: '잘못된 여행자 ID' }, { status: 400 });
  }

  const traveler = await prisma.traveler.findUnique({
    where: { id: travelerId },
    select: { id: true, passportImage: true, passportNo: true, reservationId: true },
  });

  if (!traveler) {
    return NextResponse.json({ ok: false, message: '여행자를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (!traveler.passportImage) {
    return NextResponse.json({ ok: false, message: '여권 이미지가 없습니다.' }, { status: 404 });
  }

  // 감사 로그 (PII 최소화: 여권번호 앞 3자리만, 이름 제외)
  log(
    `[PassportView] adminId=${sessionUser.id}, travelerId=${travelerId}, ` +
    `passportNo=${(traveler.passportNo ?? '').slice(0, 3)}***, reservationId=${traveler.reservationId}`
  );

  return NextResponse.json({ ok: true, url: traveler.passportImage });
}
