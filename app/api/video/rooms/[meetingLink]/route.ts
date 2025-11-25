export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';

// 미팅 링크로 참가
export async function GET(
  request: NextRequest,
  { params }: { params: { meetingLink: string } }
) {
  try {
    const { meetingLink } = params;
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');

    // 미팅 방 조회
    const room = await prisma.meetingRoom.findUnique({
      where: { meetingLink },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { ok: false, error: '미팅을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 비밀번호 확인
    if (room.password && room.password !== password) {
      return NextResponse.json(
        { ok: false, error: '비밀번호가 올바르지 않습니다.', requiresPassword: true },
        { status: 403 }
      );
    }

    // 참가자 수 확인
    const currentParticipants = room.participants.filter((p) => !p.leftAt).length;
    if (currentParticipants >= room.maxParticipants) {
      return NextResponse.json(
        { ok: false, error: `최대 참가자 수(${room.maxParticipants}명)에 도달했습니다.` },
        { status: 403 }
      );
    }

    // 예약된 미팅인지 확인
    if (room.status === 'SCHEDULED' && room.scheduledStart) {
      const now = new Date();
      const startTime = new Date(room.scheduledStart);
      if (now < startTime) {
        return NextResponse.json({
          ok: false,
          error: '아직 미팅 시작 시간이 아닙니다.',
          scheduledStart: room.scheduledStart,
        }, { status: 403 });
      }
    }

    // 종료된 미팅인지 확인
    if (room.status === 'ENDED') {
      return NextResponse.json(
        { ok: false, error: '이미 종료된 미팅입니다.' },
        { status: 403 }
      );
    }

    // 호스트 여부 확인 (세션 기반)
    const sid = cookies().get(SESSION_COOKIE)?.value;
    let isHost = false;
    if (sid) {
      try {
        const session = await prisma.session.findUnique({
          where: { id: sid },
          select: { userId: true },
        });
        if (session && session.userId === room.hostId) {
          isHost = true;
        }
      } catch (error) {
        console.error('[Video Room] Session check error:', error);
      }
    }

    return NextResponse.json({
      ok: true,
      room: {
        id: room.id,
        roomId: room.roomId,
        title: room.title,
        description: room.description,
        hostName: room.host?.name || '알 수 없음',
        currentParticipants: currentParticipants,
        maxParticipants: room.maxParticipants,
        isWaitingRoomEnabled: room.isWaitingRoomEnabled,
        status: room.status,
        isHost: isHost,
      },
    });
  } catch (error) {
    console.error('[Video Room] Join error:', error);
    return NextResponse.json(
      { ok: false, error: '미팅 참가에 실패했습니다.' },
      { status: 500 }
    );
  }
}
