// ⬇️ 절대법칙: Prisma 사용 API는 반드시 nodejs runtime과 force-dynamic 필요
export const runtime = 'nodejs';        // Edge Runtime 금지 (Prisma 사용)
export const dynamic = 'force-dynamic'; // 동적 데이터는 캐시 X

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { nanoid } from 'nanoid';

// 미팅 방 생성
export async function POST(request: NextRequest) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    if (!sid) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    let session;
    try {
      session = await prisma.session.findUnique({
        where: { id: sid },
        include: {
          User: {
            select: {
              id: true,
              role: true,
              name: true,
            },
          },
        },
      });
    } catch (sessionError: any) {
      console.error('[Video Rooms] Session query error (POST):', sessionError);
      console.error('[Video Rooms] Session error details:', {
        message: sessionError?.message,
        code: sessionError?.code,
        meta: sessionError?.meta,
        stack: sessionError?.stack,
      });
      return NextResponse.json({ 
        ok: false, 
        error: '세션 조회에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? sessionError?.message : undefined
      }, { status: 500 });
    }

    if (!session) {
      console.error('[Video Rooms] Session not found (POST):', { sid: sid?.substring(0, 10) + '...' });
      return NextResponse.json({ ok: false, error: '세션이 만료되었거나 존재하지 않습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    if (!session.User) {
      console.error('[Video Rooms] User not found in session (POST):', { sessionId: session.id, userId: session.userId });
      return NextResponse.json({ ok: false, error: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    if (!session.userId) {
      console.error('[Video Rooms] Session has no userId (POST):', { sessionId: session.id, session });
      return NextResponse.json({ ok: false, error: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      password, 
      maxParticipants = 10,
      isWaitingRoomEnabled = false,
      scheduledStart,
      scheduledEnd 
    } = body;

    // 미팅 방 생성
    const roomId = nanoid(12);
    const meetingLink = nanoid(16); // 공유 가능한 링크 ID
    
    // 예약된 미팅인지 확인
    const status = scheduledStart && new Date(scheduledStart) > new Date() 
      ? 'SCHEDULED' 
      : 'ACTIVE';

    let meetingRoom;
    try {
      console.log('[Video Rooms] Creating meeting room:', {
        roomId,
        hostId: session.userId,
        title: title || '화상 회의',
        maxParticipants: maxParticipants || 10,
        status,
      });

      // SQLite에서 DateTime을 올바르게 처리하기 위해 명시적으로 ISO 문자열로 변환
      const now = new Date();
      const nowISO = now.toISOString();
      
      meetingRoom = await prisma.$executeRaw`
        INSERT INTO MeetingRoom (
          roomId, hostId, title, description, password, maxParticipants,
          isWaitingRoomEnabled, isRecordingEnabled, meetingLink,
          scheduledStart, scheduledEnd, status, createdAt, updatedAt
        ) VALUES (
          ${roomId}, ${session.userId}, ${title || '화상 회의'}, ${description || ''},
          ${password || null}, ${maxParticipants || 10}, ${isWaitingRoomEnabled || false},
          ${false}, ${meetingLink},
          ${scheduledStart ? new Date(scheduledStart).toISOString() : null},
          ${scheduledEnd ? new Date(scheduledEnd).toISOString() : null},
          ${status}, ${nowISO}, ${nowISO}
        )
      `.then(async () => {
        return await prisma.meetingRoom.findUnique({
          where: { roomId },
          include: {
            host: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      });

      console.log('[Video Rooms] Meeting room created successfully:', meetingRoom.id);
    } catch (dbError: any) {
      console.error('[Video Rooms] Create database error:', dbError);
      console.error('[Video Rooms] Error details:', {
        message: dbError?.message,
        code: dbError?.code,
        meta: dbError?.meta,
        stack: dbError?.stack,
      });
      return NextResponse.json(
        { 
          ok: false, 
          error: '미팅 방 생성에 실패했습니다.',
          details: dbError?.message || '알 수 없는 오류',
        },
        { status: 500 }
      );
    }

    // 공유 가능한 미팅 링크 생성
    const shareableLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/meeting/${meetingRoom.meetingLink}`;

    return NextResponse.json({
      ok: true,
      room: {
        id: meetingRoom.id,
        roomId: meetingRoom.roomId,
        meetingLink: meetingRoom.meetingLink,
        shareableLink: shareableLink,
        title: meetingRoom.title,
        description: meetingRoom.description,
        password: meetingRoom.password ? '***' : null, // 비밀번호는 마스킹
        maxParticipants: meetingRoom.maxParticipants,
        isWaitingRoomEnabled: meetingRoom.isWaitingRoomEnabled,
        scheduledStart: meetingRoom.scheduledStart,
        scheduledEnd: meetingRoom.scheduledEnd,
        hostId: meetingRoom.hostId,
        status: meetingRoom.status,
        createdAt: meetingRoom.createdAt,
      },
    });
  } catch (error: any) {
    console.error('[Video Rooms] Create error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Video Rooms] Error details:', { 
      errorMessage, 
      errorStack,
      code: error?.code,
      meta: error?.meta,
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: '미팅 방 생성에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// 미팅 방 목록 조회
export async function GET(request: NextRequest) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    if (!sid) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    let session;
    try {
      session = await prisma.session.findUnique({
        where: { id: sid },
        select: {
          id: true,
          userId: true,
          User: {
            select: {
              id: true,
              role: true,
              name: true,
            },
          },
        },
      });
    } catch (sessionError: any) {
      console.error('[Video Rooms] Session query error (GET):', sessionError);
      console.error('[Video Rooms] Session error details:', {
        message: sessionError?.message,
        code: sessionError?.code,
        meta: sessionError?.meta,
        stack: sessionError?.stack,
      });
      return NextResponse.json({ 
        ok: false, 
        error: '세션 조회에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? sessionError?.message : undefined
      }, { status: 500 });
    }

    if (!session) {
      console.error('[Video Rooms] Session not found (GET):', { sid: sid?.substring(0, 10) + '...' });
      return NextResponse.json({ ok: false, error: '세션이 만료되었거나 존재하지 않습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    if (!session.User) {
      console.error('[Video Rooms] User not found in session (GET):', { sessionId: session.id, userId: session.userId });
      return NextResponse.json({ ok: false, error: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ACTIVE';

    // 활성 미팅 방 조회 (에러 처리 강화)
    let rooms: any[] = [];
    try {
      // 먼저 기본 쿼리만 실행 (관계 없이)
      const basicRooms = await prisma.meetingRoom.findMany({
        where: {
          status: status as any,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });
      
      // 관계 데이터를 별도로 조회 (에러 발생 시 무시)
      for (const room of basicRooms) {
        try {
          const host = await prisma.user.findUnique({
            where: { id: room.hostId },
            select: { id: true, name: true, email: true },
          }).catch(() => null);
          
          const participants = await prisma.meetingParticipant.findMany({
            where: { roomId: room.id },
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          }).catch(() => []);
          
          rooms.push({
            ...room,
            host: host || null,
            participants: participants || [],
          });
        } catch (relationError: any) {
          console.warn(`[Video Rooms] Error loading relations for room ${room.id}:`, relationError);
          // 관계 조회 실패해도 기본 정보는 포함
          rooms.push({
            ...room,
            host: null,
            participants: [],
          });
        }
      }
      
      console.log(`[Video Rooms] Successfully fetched ${rooms.length} rooms`);
    } catch (dbError: any) {
      console.error('[Video Rooms] Database query error:', dbError);
      console.error('[Video Rooms] Error details:', {
        message: dbError?.message,
        code: dbError?.code,
        meta: dbError?.meta,
        stack: dbError?.stack,
      });
      
      // 테이블이 없는 경우 빈 배열 반환
      if (dbError?.code === 'P2021' || dbError?.message?.includes('does not exist')) {
        console.warn('[Video Rooms] MeetingRoom table may not exist, returning empty array');
        rooms = [];
      } else {
        return NextResponse.json(
          { 
            ok: false, 
            error: '미팅 방 목록을 불러오는데 실패했습니다.',
            details: dbError?.message || '알 수 없는 오류',
          },
          { status: 500 }
        );
      }
    }

    // 안전하게 데이터 변환
    const roomsData = rooms.map((room) => {
      try {
        return {
          id: room.id,
          roomId: room.roomId,
          title: room.title || '제목 없음',
          description: room.description || '',
          hostId: room.hostId,
          hostName: room.host?.name || '알 수 없음',
          participantCount: Array.isArray(room.participants) ? room.participants.length : 0,
          status: room.status || 'ACTIVE',
          createdAt: room.createdAt?.toISOString() || new Date().toISOString(),
        };
      } catch (mapError) {
        console.error('[Video Rooms] Error mapping room:', room, mapError);
        return null;
      }
    }).filter((room) => room !== null);

    return NextResponse.json({
      ok: true,
      rooms: roomsData,
    });
  } catch (error) {
    console.error('[Video Rooms] List error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Video Rooms] Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      { 
        ok: false, 
        error: '미팅 방 목록을 불러오는데 실패했습니다.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

