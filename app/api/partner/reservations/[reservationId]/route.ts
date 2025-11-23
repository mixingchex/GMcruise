import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerContext } from '@/app/api/partner/_utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/partner/reservations/[reservationId]
 * 예약 상세 정보 조회 (Traveler 포함)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { reservationId: string } }
) {
  try {
    const { profile } = await requirePartnerContext();
    const reservationId = parseInt(params.reservationId);

    if (isNaN(reservationId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid reservation ID' },
        { status: 400 }
      );
    }

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

    // 예약 정보 조회 (Traveler 포함)
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        Traveler: {
          orderBy: [
            { roomNumber: 'asc' },
            { id: 'asc' },
          ],
        },
        Trip: {
          include: {
            Product: {
              select: {
                id: true,
                productCode: true,
                cruiseLine: true,
                shipName: true,
                packageName: true,
                nights: true,
                days: true,
                basePrice: true,
                description: true,
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { ok: false, error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // 권한 확인: 예약이 관리하는 고객의 예약인지 확인
    if (!managedUserIds.includes(reservation.userId)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      reservation: {
        id: reservation.id,
        totalPeople: reservation.totalPeople,
        pnrStatus: reservation.pnrStatus,
        createdAt: reservation.createdAt.toISOString(),
        trip: reservation.Trip ? {
          ...reservation.Trip,
          product: reservation.Trip.Product,
        } : null,
        user: reservation.User,
        travelers: reservation.Traveler.map((t) => ({
          id: t.id,
          roomNumber: t.roomNumber,
          korName: t.korName,
          engSurname: t.engSurname,
          engGivenName: t.engGivenName,
          passportNo: t.passportNo,
          residentNum: t.residentNum,
          nationality: t.nationality,
          dateOfBirth: t.dateOfBirth ? t.dateOfBirth.toISOString().split('T')[0] : null,
          passportExpiryDate: t.passportExpiryDate ? t.passportExpiryDate.toISOString().split('T')[0] : null,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Reservation GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch reservation' },
      { status: 500 }
    );
  }
}

