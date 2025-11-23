import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { buildScopedGroupWhere, partnerGroupInclude, serializePartnerGroup } from '@/app/api/partner/customer-groups/utils';

/**
 * GET /api/partner/customer-groups/[id]
 * 특정 그룹 조회 (CustomerGroup 모델 사용)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    const groupId = Number((await params).id);
    if (!Number.isInteger(groupId)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 그룹 ID입니다.' }, { status: 400 });
    }

    const group = await prisma.customerGroup.findFirst({
      where: buildScopedGroupWhere(groupId, user.id, affiliateProfile.id),
      include: partnerGroupInclude,
    });

    if (!group) {
      return NextResponse.json({ ok: false, error: '그룹을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, group: serializePartnerGroup(group) });
  } catch (error) {
    console.error('[Partner Customer Groups GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch customer group' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/partner/customer-groups/[id]
 * 그룹 수정 (CustomerGroup 모델 사용)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    const groupId = Number((await params).id);
    if (!Number.isInteger(groupId)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 그룹 ID입니다.' }, { status: 400 });
    }

    const existingGroup = await prisma.customerGroup.findFirst({
      where: buildScopedGroupWhere(groupId, user.id, affiliateProfile.id),
    });

    if (!existingGroup) {
      return NextResponse.json({ ok: false, error: '그룹을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, color, parentGroupId } = body;

    const resolvedParentGroupId =
      parentGroupId === null || parentGroupId === undefined
        ? existingGroup.parentGroupId
        : Number.isFinite(Number(parentGroupId))
          ? Number(parentGroupId)
          : existingGroup.parentGroupId;

    const group = await prisma.customerGroup.update({
      where: { id: groupId },
      data: {
        name: name?.trim() || existingGroup.name,
        description:
          description !== undefined
            ? description?.trim() || null
            : existingGroup.description,
        color: color !== undefined ? color || null : existingGroup.color,
        parentGroupId: resolvedParentGroupId,
      },
      include: partnerGroupInclude,
    });

    return NextResponse.json({ ok: true, group: serializePartnerGroup(group) });
  } catch (error) {
    console.error('[Partner Customer Groups PUT] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to update customer group' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/partner/customer-groups/[id]
 * 그룹 삭제 (CustomerGroup 모델 사용)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    const groupId = Number((await params).id);
    if (!Number.isInteger(groupId)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 그룹 ID입니다.' }, { status: 400 });
    }

    const group = await prisma.customerGroup.findFirst({
      where: buildScopedGroupWhere(groupId, user.id, affiliateProfile.id),
      select: { id: true },
    });

    if (!group) {
      return NextResponse.json({ ok: false, error: '그룹을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
    }

    // 그룹에 속한 고객들의 groupId를 null로 설정 (고객은 삭제되지 않음)
    await prisma.affiliateLead.updateMany({
      where: {
        groupId: groupId,
        OR: [
          { managerId: affiliateProfile.id },
          { agentId: affiliateProfile.id },
        ],
      },
      data: {
        groupId: null,
      },
    });

    // 그룹 삭제
    await prisma.customerGroup.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ ok: true, message: '그룹이 삭제되었습니다. 그룹에 속한 고객은 그룹만 해제되었습니다.' });
  } catch (error) {
    console.error('[Partner Customer Groups DELETE] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete customer group' },
      { status: 500 }
    );
  }
}
