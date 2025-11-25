export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { buildScopedGroupWhere } from '@/app/api/partner/customer-groups/utils';

/**
 * POST /api/partner/customer-groups/[id]/members
 * 그룹에 고객 추가
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = Number((await params).id);
    if (!Number.isInteger(groupId)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 그룹 ID입니다.' }, { status: 400 });
    }

    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: sessionUser.id },
      select: { id: true },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: '추가할 고객 ID 목록이 필요합니다.' },
        { status: 400 }
      );
    }

    const normalizedUserIds = userIds
      .map((memberId: number) => Number(memberId))
      .filter((memberId) => Number.isInteger(memberId) && memberId > 0);

    if (normalizedUserIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: '유효한 고객 ID가 없습니다.' },
        { status: 400 }
      );
    }

    const group = await prisma.customerGroup.findFirst({
      where: buildScopedGroupWhere(groupId, sessionUser.id, affiliateProfile.id),
      select: { id: true },
    });

    if (!group) {
      return NextResponse.json({ ok: false, error: '그룹을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const memberId of normalizedUserIds) {
      try {
        await prisma.customerGroupMember.create({
          data: {
            groupId,
            userId: memberId,
            addedBy: sessionUser.id,
          },
        });
        addedCount++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          skippedCount++;
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      added: addedCount,
      skipped: skippedCount,
    });
  } catch (error: any) {
    console.error('[Partner Customer Groups Members POST] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to add members' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/partner/customer-groups/[id]/members
 * 그룹에서 고객 제거
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = Number((await params).id);
    if (!Number.isInteger(groupId)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 그룹 ID입니다.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');

    if (!userIdParam) {
      return NextResponse.json(
        { ok: false, error: '제거할 고객 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const memberId = Number(userIdParam);
    if (!Number.isInteger(memberId)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 고객 ID입니다.' }, { status: 400 });
    }

    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: sessionUser.id },
      select: { id: true },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    const group = await prisma.customerGroup.findFirst({
      where: buildScopedGroupWhere(groupId, sessionUser.id, affiliateProfile.id),
      select: { id: true },
    });

    if (!group) {
      return NextResponse.json({ ok: false, error: '그룹을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
    }

    await prisma.customerGroupMember.deleteMany({
      where: {
        groupId,
        userId: memberId,
      },
    });

    return NextResponse.json({ ok: true, message: '고객이 그룹에서 제거되었습니다.' });
  } catch (error: any) {
    console.error('[Partner Customer Groups Members DELETE] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to remove member' },
      { status: 500 }
    );
  }
}
