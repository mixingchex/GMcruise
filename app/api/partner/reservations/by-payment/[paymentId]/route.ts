import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerContext } from '@/app/api/partner/_utils';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { profile } = await requirePartnerContext();

    const paymentId = parseInt(params.paymentId);
    if (isNaN(paymentId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payment ID' },
        { status: 400 }
      );
    }

    // 결제 정보 조회
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        buyerName: true,
        buyerTel: true,
        buyerEmail: true,
        orderId: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: 'Payment not found' },
        { status: 404 }
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

    // 해당 결제와 연결된 예약 조회 (buyerTel 또는 buyerEmail로 매칭, 그리고 관리하는 고객만)
    const reservations = await prisma.reservation.findMany({
      where: {
        AND: [
          {
            OR: [
              { user: { phone: payment.buyerTel } },
              { user: { email: payment.buyerEmail } },
            ],
          },
          {
            userId: managedUserIds.length > 0 ? { in: managedUserIds } : { in: [] },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        Traveler: {
          select: {
            id: true,
            korName: true,
            engSurname: true,
            engGivenName: true,
            passportNo: true,
            birthDate: true,
            expiryDate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      ok: true,
      reservations: reservations.map((r) => ({
        id: r.id,
        totalPeople: r.totalPeople,
        pnrStatus: r.pnrStatus,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
        travelers: r.Traveler,
      })),
    });
  } catch (error: any) {
    console.error('[Reservations by Payment] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Failed to fetch reservations',
      },
      { status: 500 }
    );
  }
}

