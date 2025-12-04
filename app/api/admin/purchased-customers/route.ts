import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 체크
    const user = await prisma.user.findUnique({
      where: { id: Number(session.userId) },
      select: { role: true, permissions: true },
    });

    if (!user || !['admin', 'superadmin'].includes(user.role || '')) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // 예약 목록 조회 (결제 완료된 예약만)
    const reservations = await prisma.reservation.findMany({
      where: {
        // 취소되지 않은 예약만
        status: { not: 'CANCELLED' },
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
          select: {
            id: true,
            shipName: true,
            departureDate: true,
            spreadsheetId: true,
            productCode: true,
          },
        },
        Traveler: {
          select: {
            id: true,
            korName: true,
            engSurname: true,
            engGivenName: true,
            passportNo: true,
            nationality: true,
            birthDate: true,
            issueDate: true,    // 여권생성일
            expiryDate: true,
            gender: true,
            residentNum: true,  // 주민번호
            roomNumber: true,
            passportImage: true,
            notes: true,        // 비고
          },
        },
        AffiliateSale: {
          include: {
            AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
              select: {
                displayName: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const mappedReservations = reservations.map((r) => ({
      id: r.id,
      totalPeople: r.totalPeople,
      pnrStatus: r.pnrStatus,
      createdAt: r.createdAt?.toISOString(),
      user: r.User ? {
        id: r.User.id,
        name: r.User.name,
        phone: r.User.phone,
        email: r.User.email,
      } : null,
      trip: r.Trip ? {
        id: r.Trip.id,
        departureDate: r.Trip.departureDate?.toISOString(),
        spreadsheetId: r.Trip.spreadsheetId,
        shipName: r.Trip.shipName,
        productCode: r.Trip.productCode,
        product: {
          cruiseLine: null,
          shipName: r.Trip.shipName,
          packageName: r.Trip.productCode,
        },
      } : null,
      travelers: r.Traveler.map((t) => ({
        id: t.id,
        korName: t.korName,
        engSurname: t.engSurname,
        engGivenName: t.engGivenName,
        passportNo: t.passportNo,
        nationality: t.nationality,
        birthDate: t.birthDate,
        issueDate: t.issueDate,      // 여권생성일
        expiryDate: t.expiryDate,
        gender: t.gender,
        residentNum: t.residentNum,  // 주민번호
        roomNumber: t.roomNumber,
        passportImage: t.passportImage,
        notes: t.notes,              // 비고
      })),
      affiliate: r.AffiliateSale?.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile ? {
        displayName: r.AffiliateSale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile.displayName,
        type: r.AffiliateSale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile.type,
      } : null,
    }));

    return NextResponse.json({
      ok: true,
      reservations: mappedReservations,
    });
  } catch (error: any) {
    console.error('[Admin Purchased Customers] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}
