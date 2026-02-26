export const dynamic = 'force-dynamic';

// app/api/admin/itinerary-groups/route.ts
// 일정 그룹 저장/불러오기 API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인
async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { role: true },
        },
      },
    });

    return session?.User.role === 'admin';
  } catch (error) {
    console.error('[Admin Itinerary Groups] Auth check error:', error);
    return false;
  }
}

// 그룹 목록 조회
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ?nights=X 필터 (선택)
    const { searchParams } = new URL(request.url);
    const nightsFilter = searchParams.get('nights');

    const groups = await prisma.itineraryGroup.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        itinerary: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // 각 그룹의 dayCount(총 일수) 계산
    type MappedGroup = {
      id: number; name: string; description: string | null;
      dayCount: number; nights: number; createdAt: Date; updatedAt: Date;
    };
    const mappedGroups: MappedGroup[] = groups
      .map((g): MappedGroup => {
        const dayCount = Array.isArray(g.itinerary) ? (g.itinerary as unknown[]).length : 0;
        const nights = dayCount > 0 ? dayCount - 1 : 0;
        return { id: g.id, name: g.name, description: g.description, dayCount, nights, createdAt: g.createdAt, updatedAt: g.updatedAt };
      })
      .filter((g: MappedGroup) => {
        if (!nightsFilter) return true;
        return g.nights === parseInt(nightsFilter);
      });

    return NextResponse.json({
      ok: true,
      groups: mappedGroups
    });
  } catch (error) {
    console.error('[Admin Itinerary Groups] Failed to load groups:', error);
    return NextResponse.json({
      ok: false,
      error: '그룹 목록을 불러오는데 실패했습니다.',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}

// 새 그룹 저장
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, itinerary } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({
        ok: false,
        error: '그룹 이름을 입력해주세요.'
      }, { status: 400 });
    }

    if (!itinerary || !Array.isArray(itinerary)) {
      return NextResponse.json({
        ok: false,
        error: '일정 데이터가 올바르지 않습니다.'
      }, { status: 400 });
    }

    const dayCount = itinerary.length;
    const nights = dayCount > 0 ? dayCount - 1 : 0;
    const autoDesc = nights > 0 ? `${nights}박${dayCount}일` : `${dayCount}일 일정`;

    const now = new Date();
    const group = await prisma.itineraryGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || autoDesc,
        itinerary: itinerary,
        updatedAt: now,
      }
    });

    return NextResponse.json({
      ok: true,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        dayCount,
        nights,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }
    });
  } catch (error) {
    console.error('[Admin Itinerary Groups] Failed to save group:', error);
    return NextResponse.json({
      ok: false,
      error: '그룹 저장에 실패했습니다.',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}
