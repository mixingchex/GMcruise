export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { error as logError } from '@/lib/logger-wrapper';

/**
 * GET: 내 여행 목록 조회 (/my-trips 페이지용)
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다' }, { status: 401 });
    }

    const userTrips = await prisma.userTrip.findMany({
      where: { userId: user.id },
      include: {
        Itinerary: {
          orderBy: { date: 'asc' },
          select: { country: true, location: true, type: true },
        },
        CruiseProduct: {
          select: { cruiseLine: true, shipName: true, packageName: true, source: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const trips = userTrips.map((ut) => {
      // 중복 없는 방문 도시 목록 (기항지 location 기준)
      const destinations = ut.Itinerary
        .filter((it) => it.location && it.type !== 'sea')
        .map((it) => it.location as string)
        .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

      return {
        id: ut.id,
        cruiseName: ut.cruiseName,
        packageName: ut.CruiseProduct?.packageName || ut.cruiseName,
        nights: ut.nights,
        days: ut.days,
        startDate: ut.startDate?.toISOString() || null,
        endDate: ut.endDate?.toISOString() || null,
        destinations,
        status: ut.status,
        product: {
          cruiseLine: ut.CruiseProduct?.cruiseLine || null,
          shipName: ut.CruiseProduct?.shipName || null,
          source: ut.CruiseProduct?.source || null,
        },
      };
    });

    return NextResponse.json({ ok: true, trips });
  } catch (err) {
    logError('[API] 여행 목록 조회 오류:', err);
    return NextResponse.json({ ok: false, error: '여행 목록 조회 중 오류가 발생했습니다' }, { status: 500 });
  }
}
