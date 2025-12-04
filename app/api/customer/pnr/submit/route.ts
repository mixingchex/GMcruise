export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface TravelerInput {
  id?: number;
  korName: string;
  engSurname?: string | null;
  engGivenName?: string | null;
  phone?: string | null;
  roomNumber: number;
}

interface PnrSubmitBody {
  reservationId: number;
  travelers: TravelerInput[];
}

export async function POST(req: NextRequest) {
  try {
    const body: PnrSubmitBody = await req.json();
    const { reservationId, travelers } = body;

    if (!reservationId || !travelers || !Array.isArray(travelers) || travelers.length === 0) {
      return NextResponse.json(
        { ok: false, message: '예약 ID와 여행자 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 예약 정보 확인
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        Traveler: true,
        Trip: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { ok: false, message: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 기존 Traveler ID 목록
    const existingTravelerIds = reservation.Traveler.map((t) => t.id);
    const submittedTravelerIds = travelers.filter((t) => t.id).map((t) => t.id!);

    // 트랜잭션으로 처리
    await prisma.$transaction(async (tx) => {
      // 1. 기존 Traveler 업데이트 또는 새 Traveler 생성
      for (const traveler of travelers) {
        if (traveler.id && existingTravelerIds.includes(traveler.id)) {
          // 기존 Traveler 업데이트
          await tx.traveler.update({
            where: { id: traveler.id },
            data: {
              korName: traveler.korName,
              engSurname: traveler.engSurname || null,
              engGivenName: traveler.engGivenName || null,
              roomNumber: traveler.roomNumber,
            },
          });
        } else {
          // 새 Traveler 생성
          await tx.traveler.create({
            data: {
              reservationId: reservationId,
              korName: traveler.korName,
              engSurname: traveler.engSurname || null,
              engGivenName: traveler.engGivenName || null,
              roomNumber: traveler.roomNumber,
            },
          });
        }
      }

      // 2. 제출에서 제외된 기존 Traveler 삭제 (선택적)
      const travelersToDelete = existingTravelerIds.filter(
        (id) => !submittedTravelerIds.includes(id)
      );

      if (travelersToDelete.length > 0) {
        await tx.traveler.deleteMany({
          where: {
            id: { in: travelersToDelete },
            reservationId: reservationId,
          },
        });
      }

      // 3. Reservation 업데이트
      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          pnrStatus: 'COMPLETED',
          totalPeople: travelers.length,
          updatedAt: new Date(),
        },
      });
    });

    // 업데이트된 예약 정보 반환
    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        Traveler: {
          orderBy: [
            { roomNumber: 'asc' },
            { id: 'asc' },
          ],
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'PNR 정보가 성공적으로 저장되었습니다.',
      reservation: updatedReservation,
    });
  } catch (error: any) {
    console.error('[Customer PNR Submit] Error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || 'PNR 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
