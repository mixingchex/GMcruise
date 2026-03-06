export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: '권한이 없습니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : Math.min(pageRaw, 1000);
    const limit = 20;

    const [contracts, total] = await prisma.$transaction([
      prisma.travelContract.findMany({
        where: { status: 'expired' },
        select: {
          id: true,
          reservationId: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          Reservation: {
            select: {
              User: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.travelContract.count({ where: { status: 'expired' } }),
    ]);

    return NextResponse.json({ ok: true, contracts, total, page, limit });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[TravelContract expired GET]', { error: msg });
    return NextResponse.json({ ok: false, error: '조회 실패' }, { status: 500 });
  }
}
