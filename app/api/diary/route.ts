// ⬇️ 절대법칙: Prisma 사용 API는 반드시 nodejs runtime과 force-dynamic 필요
export const runtime = 'nodejs';        // Edge Runtime 금지 (Prisma 사용)
export const dynamic = 'force-dynamic'; // 동적 데이터는 캐시 X

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

async function getAuthUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const sid = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const sess = await prisma.session.findUnique({
    where: { id: sid },
    select: { userId: true, expiresAt: true },
  });
  if (!sess?.userId) return null;
  if (sess.expiresAt && sess.expiresAt < new Date()) return null;
  return sess.userId;
}

// GET: 다이어리 기록 조회
export async function GET(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, message: 'UNAUTHORIZED' }, { status: 401 });
    }

    // URL 파라미터에서 필터 추출
    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get('countryCode');
    const tripId = searchParams.get('tripId'); // userTripId 필터

    // 쿼리 조건 구성
    const where: any = { userId };
    if (countryCode) where.countryCode = countryCode;
    if (tripId) where.userTripId = parseInt(tripId);

    // 다이어리 기록 조회
    const entries = await prisma.travelDiaryEntry.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      include: {
        UserTrip: {
          select: { id: true, cruiseName: true, destination: true },
        },
      },
    });

    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    console.error('Diary GET error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 다이어리 기록 작성
export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, message: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const { countryCode, countryName, title, content, visitDate, tripId } = body;

    // 필수 필드 검증
    if (!countryCode || !countryName || !title || !content) {
      return NextResponse.json(
        { ok: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // userTripId: 클라이언트가 제공하거나, 서버에서 활성 UserTrip 조회
    let userTripId: number | null = tripId ? parseInt(tripId) : null;

    if (!userTripId) {
      const activeTrip = await prisma.userTrip.findFirst({
        where: { userId },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      });
      userTripId = activeTrip?.id ?? null;
    }

    if (!userTripId) {
      return NextResponse.json(
        { ok: false, message: '여행 일정이 없습니다. 여행을 먼저 등록하세요.' },
        { status: 400 }
      );
    }

    // 다이어리 기록 생성
    const entry = await prisma.travelDiaryEntry.create({
      data: {
        userId,
        userTripId,
        countryCode,
        countryName,
        title,
        content,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    console.error('Diary POST error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
