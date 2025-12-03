import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enqueueApisSync } from '@/lib/apis-sync-queue';
import { getSession } from '@/lib/session';

export async function POST(
    req: NextRequest,
    { params }: { params: { reservationId: string } }
) {
    try {
        // 인증 체크
        const session = await getSession();
        if (!session?.userId) {
            return NextResponse.json(
                { ok: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // 사용자 정보 조회 (관리자 또는 파트너 권한 확인)
        const user = await prisma.user.findUnique({
            where: { id: Number(session.userId) },
            select: {
                role: true,
                affiliateProfile: { select: { id: true, type: true } }
            },
        });

        const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
        const isPartner = !!user?.affiliateProfile;

        if (!isAdmin && !isPartner) {
            return NextResponse.json(
                { ok: false, error: 'Forbidden' },
                { status: 403 }
            );
        }

        const reservationId = parseInt(params.reservationId);
        if (isNaN(reservationId)) {
            return NextResponse.json(
                { ok: false, error: 'Invalid reservation ID' },
                { status: 400 }
            );
        }

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { Trip: true },
        });

        if (!reservation || !reservation.Trip) {
            return NextResponse.json(
                { ok: false, error: 'Reservation or Trip not found' },
                { status: 404 }
            );
        }

        // 파트너인 경우, 자신의 예약만 동기화 가능
        if (!isAdmin && isPartner) {
            if (reservation.affiliateId !== user?.affiliateProfile?.id) {
                return NextResponse.json(
                    { ok: false, error: 'Forbidden - Not your reservation' },
                    { status: 403 }
                );
            }
        }

        // Trigger APIS Sync
        await enqueueApisSync('TRIP_SHEET', reservation.Trip.id, 0); // 0 delay for immediate action

        return NextResponse.json({
            ok: true,
            message: 'PNR data sync triggered successfully.',
        });
    } catch (error: any) {
        console.error('[API] Sync APIS Error:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to trigger PNR sync.' },
            { status: 500 }
        );
    }
}
