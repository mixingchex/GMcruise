// WO-04: 예약 수정 이력 조회 API
// GET /api/admin/reservations/[reservationId]/audit
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(
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

  const searchParams = req.nextUrl.searchParams;
  const rawPage = parseInt(searchParams.get('page') ?? '1');
  const rawLimit = parseInt(searchParams.get('limit') ?? '20');
  if (isNaN(rawPage) || isNaN(rawLimit)) {
    return NextResponse.json({ ok: false, message: 'page/limit는 숫자여야 합니다.' }, { status: 400 });
  }
  const page = Math.max(1, rawPage);
  const limit = Math.min(50, Math.max(1, rawLimit));

  const [logs, total] = await Promise.all([
    prisma.reservationAudit.findMany({
      where: { reservationId },
      include: {
        ChangedByUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { changedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.reservationAudit.count({ where: { reservationId } }),
  ]);

  return NextResponse.json({
    ok: true,
    data: logs.map((log) => ({
      id: log.id,
      changedAt: log.changedAt,
      changedBy: log.ChangedByUser?.name ?? `User#${log.changedBy}`,
      changedByRole: log.ChangedByUser?.role,
      fieldName: log.fieldName,
      oldValue: log.oldValue,
      newValue: log.newValue,
      reason: log.reason,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
