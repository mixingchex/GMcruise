export const dynamic = 'force-dynamic';

// app/api/admin/itinerary-groups/[groupId]/route.ts
// 특정 그룹 불러오기 / 수정 / 삭제 API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;
  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { User: { select: { role: true } } },
    });
    return session?.User.role === 'admin';
  } catch {
    return false;
  }
}

// 특정 그룹 조회 (itinerary 포함)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    if (!(await checkAdminAuth(sid))) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId: groupIdStr } = await params;
    const groupId = parseInt(groupIdStr);
    if (isNaN(groupId)) {
      return NextResponse.json({ ok: false, error: '잘못된 그룹 ID입니다.' }, { status: 400 });
    }

    const group = await prisma.itineraryGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ ok: false, error: '그룹을 찾을 수 없습니다.' }, { status: 404 });
    }

    const dayCount = Array.isArray(group.itinerary) ? group.itinerary.length : 0;
    const nights = dayCount > 0 ? dayCount - 1 : 0;

    return NextResponse.json({
      ok: true,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        itinerary: group.itinerary,
        dayCount,
        nights,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }
    });
  } catch (error) {
    console.error('[Admin Itinerary Groups] Failed to load group:', error);
    return NextResponse.json({ ok: false, error: '그룹을 불러오는데 실패했습니다.' }, { status: 500 });
  }
}

// 그룹 이름/설명 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    if (!(await checkAdminAuth(sid))) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId: groupIdStr } = await params;
    const groupId = parseInt(groupIdStr);
    if (isNaN(groupId)) {
      return NextResponse.json({ ok: false, error: '잘못된 그룹 ID입니다.' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ ok: false, error: '그룹 이름을 입력해주세요.' }, { status: 400 });
    }

    const updated = await prisma.itineraryGroup.update({
      where: { id: groupId },
      data: {
        name: name.trim(),
        ...(description !== undefined && { description: description.trim() || null }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, group: { id: updated.id, name: updated.name, description: updated.description } });
  } catch (error) {
    console.error('[Admin Itinerary Groups] Failed to update group:', error);
    return NextResponse.json({ ok: false, error: '그룹 수정에 실패했습니다.' }, { status: 500 });
  }
}

// 그룹 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    if (!(await checkAdminAuth(sid))) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId: groupIdStr } = await params;
    const groupId = parseInt(groupIdStr);
    if (isNaN(groupId)) {
      return NextResponse.json({ ok: false, error: '잘못된 그룹 ID입니다.' }, { status: 400 });
    }

    await prisma.itineraryGroup.delete({ where: { id: groupId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Admin Itinerary Groups] Failed to delete group:', error);
    return NextResponse.json({ ok: false, error: '그룹 삭제에 실패했습니다.' }, { status: 500 });
  }
}
