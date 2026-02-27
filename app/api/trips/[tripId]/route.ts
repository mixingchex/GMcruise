export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { error as logError } from '@/lib/logger-wrapper';

/**
 * GET: 특정 여행 상세 조회 (Itinerary 포함)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다' }, { status: 401 });
    }

    const tripId = parseInt(params.tripId);
    if (isNaN(tripId)) {
      return NextResponse.json({ ok: false, error: '잘못된 여행 ID입니다' }, { status: 400 });
    }

    const userTrip = await prisma.userTrip.findFirst({
      where: {
        id: tripId,
        userId: user.id, // 본인 여행만 조회 가능
      },
      include: {
        Itinerary: {
          orderBy: { date: 'asc' },
        },
        CruiseProduct: {
          select: {
            id: true,
            productCode: true,
            cruiseLine: true,
            shipName: true,
            packageName: true,
            itineraryPattern: true,
          },
        },
      },
    });

    if (!userTrip) {
      return NextResponse.json({ ok: false, error: '여행을 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, trip: userTrip });
  } catch (err) {
    logError('[API] 여행 상세 조회 오류:', err);
    return NextResponse.json({ ok: false, error: '여행 조회 중 오류가 발생했습니다' }, { status: 500 });
  }
}
