import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * 여권 도움 요청 API
 * POST /api/customer/passport-request
 * 
 * 고객이 "도와주세요" 버튼을 누르면 호출되는 API입니다.
 * 담당자와 관리자에게 알림을 준비하고, Reservation의 pnrStatus를 업데이트합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, reservationId, requesterName, requesterPhone } = body;

    // 필수 필드 검증
    if (!userId || !reservationId) {
      return NextResponse.json(
        { ok: false, message: 'userId와 reservationId는 필수입니다.' },
        { status: 400 }
      );
    }

    // Reservation 존재 확인
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        Trip: {
          select: {
            id: true,
            cruiseName: true,
            departureDate: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { ok: false, message: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 요청한 userId가 예약 소유자인지 확인
    if (reservation.mainUserId !== userId) {
      return NextResponse.json(
        { ok: false, message: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. Reservation의 pnrStatus를 '도움요청'으로 업데이트
      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          pnrStatus: '도움요청',
        },
      });

      // 2. 담당자 정보 찾기 (판매원/대리점장)
      // TODO: 추후 AffiliateProfile 관계를 통해 담당자 찾기 로직 추가
      // 현재는 Trip의 userId만 있으므로, 임시로 사용자 정보만 출력

      return { reservation: updatedReservation };
    });

    // 3. 알림 준비 (현재는 console.log로 대체)
    const customerName = reservation.User?.name || '고객';
    const customerPhone = reservation.User?.phone || '';
    const cruiseName = reservation.Trip?.cruiseName || '크루즈';
    const departureDate = reservation.Trip?.departureDate
      ? new Date(reservation.Trip.departureDate).toLocaleDateString('ko-KR')
      : '날짜 미정';

    console.log('────────────────────────────────────────────');
    console.log('[알림] 여권 등록 도움 요청');
    console.log('────────────────────────────────────────────');
    console.log(`고객: ${customerName} (${customerPhone})`);
    if (requesterName && requesterPhone) {
      console.log(`신청자: ${requesterName} (${requesterPhone})`);
    }
    console.log(`크루즈: ${cruiseName}`);
    console.log(`출발일: ${departureDate}`);
    console.log(`예약 ID: ${reservationId}`);
    console.log(`인원수: ${reservation.totalPeople}명 (단체 여행)`);
    console.log(`상태: 도움요청`);
    console.log('────────────────────────────────────────────');
    console.log('📧 담당자(판매원/대리점장)에게 알림 발송 필요');
    console.log('📧 관리자에게 알림 발송 필요');
    console.log('────────────────────────────────────────────');

    // TODO: 실제 알림 발송 로직 구현
    // - 담당자에게 SMS/알림톡 발송
    // - 관리자에게 이메일/알림 발송

    return NextResponse.json({
      ok: true,
      message: '도움 요청이 성공적으로 등록되었습니다. 담당자가 곧 연락드리겠습니다.',
      data: {
        reservationId: result.reservation.id,
        pnrStatus: result.reservation.pnrStatus,
      },
    });
  } catch (error: any) {
    console.error('[Passport Request] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || '도움 요청 등록에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}

