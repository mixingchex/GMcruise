// WO-03: Reservation.cabinType 수정 API
// PATCH /api/admin/reservations/[reservationId]/cabin
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { log, error as logError } from '@/lib/logger-wrapper';

// 허용 객실 타입 화이트리스트
// ⚠️ 실제 운영 중인 cabinType 값에 맞게 조정 필요:
//   SELECT DISTINCT "cabinType" FROM "Reservation" WHERE "cabinType" IS NOT NULL;
const VALID_CABIN_TYPES = [
  '발코니',
  '오션뷰',
  '인사이드',
  '스위트',
  '발코니 (싱글차지)',
  '오션뷰 (싱글차지)',
  '인사이드 (싱글차지)',
  '스위트 (싱글차지)',
  '기타',
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !['admin', 'superadmin'].includes(sessionUser.role ?? '')) {
    return NextResponse.json({ ok: false, message: '권한 없음' }, { status: 403 });
  }

  const { reservationId: reservationIdStr } = await params;
  const reservationId = parseInt(reservationIdStr);
  if (isNaN(reservationId)) {
    return NextResponse.json({ ok: false, message: '잘못된 예약 ID' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const cabinType: string | undefined = body?.cabinType;
  const reason: string | undefined = body?.reason;

  if (!cabinType || !(VALID_CABIN_TYPES as readonly string[]).includes(cabinType)) {
    // 사용자 입력값을 응답 메시지에 포함하지 않음 (XSS 방어)
    return NextResponse.json(
      { ok: false, message: '유효하지 않은 객실 타입입니다.' },
      { status: 400 }
    );
  }

  // 현재 예약 조회 (oldValue 기록용)
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, cabinType: true, tripId: true },
  });

  if (!reservation) {
    return NextResponse.json({ ok: false, message: '예약을 찾을 수 없음' }, { status: 404 });
  }

  const oldCabinType = reservation.cabinType;

  // 변경 없으면 early return
  if (oldCabinType === cabinType) {
    return NextResponse.json({ ok: true, message: '변경 없음', data: { cabinType } });
  }

  // cabinType 수정 + 감사 이력 동시 기록 (트랜잭션)
  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: reservationId },
      data: {
        cabinType,
        lastModifiedByName: sessionUser.name ?? String(sessionUser.id),
      },
    }),
    prisma.reservationAudit.create({
      data: {
        reservationId,
        changedBy: sessionUser.id,
        fieldName: 'cabinType',
        oldValue: oldCabinType ?? null,
        newValue: cabinType,
        reason: reason ?? null,
      },
    }),
  ]);

  log(
    `[CabinType] 변경: reservationId=${reservationId}, ` +
    `"${oldCabinType ?? 'null'}" → "${cabinType}", adminId=${sessionUser.id}`
  );

  // Google Sheets APIS 동기화 (비동기 — 실패해도 API는 성공)
  if (reservation.tripId) {
    import('@/lib/google-sheets')
      .then(({ syncApisInBackground }) => syncApisInBackground(reservation.tripId))
      .catch(() => {
        logError('[CabinType] APIS 동기화 실패', { reservationId, tripId: reservation.tripId });
      });
  }

  return NextResponse.json({
    ok: true,
    message: '객실 타입이 변경되었습니다.',
    data: {
      reservationId,
      oldCabinType,
      newCabinType: cabinType,
      changedBy: sessionUser.name ?? String(sessionUser.id),
      reason: reason ?? null,
    },
  });
}
