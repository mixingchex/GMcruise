import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerContext } from '@/app/api/partner/_utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/partner/reservations
 * 대리점장의 예약 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const { profile } = await requirePartnerContext();

    // 대리점장/판매원이 관리하는 Lead의 userId 목록 조회
    const managedLeads = await prisma.affiliateLead.findMany({
      where: {
        OR: [
          { managerId: profile.id },
          { agentId: profile.id },
        ],
      },
      select: {
        userId: true,
      },
    });

    const managedUserIds = managedLeads
      .map(lead => lead.userId)
      .filter((id): id is number => id !== null);

    // 예약 목록 조회 (대리점장/판매원이 관리하는 고객의 예약)
    const reservations = await prisma.reservation.findMany({
      where: {
        userId: managedUserIds.length > 0 ? { in: managedUserIds } : { in: [] }, // 빈 배열이면 결과 없음
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        Trip: {
          include: {
            Product: {
              select: {
                cruiseLine: true,
                shipName: true,
                packageName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // 최대 100개
    });

    return NextResponse.json({
      ok: true,
      reservations: reservations.map((r) => ({
        id: r.id,
        totalPeople: r.totalPeople,
        pnrStatus: r.pnrStatus,
        createdAt: r.createdAt.toISOString(),
        user: r.User,
        trip: r.Trip ? {
          id: r.Trip.id,
          departureDate: r.Trip.departureDate?.toISOString() || null,
          product: r.Trip.Product,
        } : null,
      })),
    });
  } catch (error: any) {
    console.error('GET /api/partner/reservations error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || '예약 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

