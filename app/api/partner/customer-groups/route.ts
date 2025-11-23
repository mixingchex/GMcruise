import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { buildOwnershipFilter, partnerGroupInclude, serializePartnerGroup } from '@/app/api/partner/customer-groups/utils';

/**
 * GET /api/partner/customer-groups
 * 판매원/대리점장의 고객 그룹 목록 조회 (CustomerGroup 모델 사용)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      console.error('[Partner Customer Groups GET] No session user');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Partner Customer Groups GET] User:', { id: user.id, name: user.name });

    // 판매원/대리점장 프로필 확인 (모든 상태 조회)
    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { 
        userId: user.id,
      },
      select: { id: true, type: true, status: true },
    });

    console.log('[Partner Customer Groups GET] Affiliate profile:', affiliateProfile);

    if (!affiliateProfile || !affiliateProfile.id) {
      console.error('[Partner Customer Groups GET] Affiliate profile not found for user:', user.id);
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    const ownershipFilter = buildOwnershipFilter(user.id, affiliateProfile.id);
    console.log('[Partner Customer Groups GET] Ownership filter:', ownershipFilter);
    
    const groups = await prisma.customerGroup.findMany({
      where: ownershipFilter,
      include: partnerGroupInclude,
      orderBy: { createdAt: 'desc' },
    });

    console.log('[Partner Customer Groups GET] Found groups:', groups.length);

    // 각 그룹의 고객 수(leadCount) 계산
    const groupsWithLeadCount = await Promise.all(
      groups.map(async (group) => {
        try {
          const leadCount = await prisma.affiliateLead.count({
            where: {
              groupId: group.id,
              OR: [
                { managerId: affiliateProfile.id },
                { agentId: affiliateProfile.id },
              ],
            },
          });
          return { group, leadCount };
        } catch (error) {
          console.error(`[Partner Customer Groups GET] Error counting leads for group ${group.id}:`, error);
          return { group, leadCount: 0 };
        }
      })
    );

    console.log('[Partner Customer Groups GET] Groups with lead count:', groupsWithLeadCount.length);

    return NextResponse.json({ 
      ok: true, 
      groups: groupsWithLeadCount.map(({ group, leadCount }) => serializePartnerGroup(group, leadCount))
    });
  } catch (error) {
    console.error('[Partner Customer Groups GET] Error:', error);
    console.error('[Partner Customer Groups GET] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch customer groups',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/partner/customer-groups
 * 판매원/대리점장의 고객 그룹 생성 (CustomerGroup 모델 사용)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      console.error('[Partner Customer Groups POST] No session user');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Partner Customer Groups POST] User:', { id: user.id, name: user.name });

    // 판매원/대리점장 프로필 확인 (모든 상태 조회)
    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { 
        userId: user.id,
      },
      select: { id: true, type: true, status: true },
    });

    console.log('[Partner Customer Groups POST] Affiliate profile:', affiliateProfile);

    if (!affiliateProfile || !affiliateProfile.id) {
      console.error('[Partner Customer Groups POST] Affiliate profile not found for user:', user.id);
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, color, userIds, parentGroupId } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: '그룹 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    const normalizedUserIds = Array.isArray(userIds)
      ? userIds
          .map((memberId: number) => Number(memberId))
          .filter((memberId) => Number.isInteger(memberId) && memberId > 0)
      : [];

    const resolvedParentGroupId =
      parentGroupId === null || parentGroupId === undefined
        ? null
        : Number(parentGroupId);
    const parentGroupIdValue = Number.isFinite(resolvedParentGroupId) ? resolvedParentGroupId : null;

    const group = await prisma.customerGroup.create({
      data: {
        adminId: user.id,
        affiliateProfileId: affiliateProfile.id,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        parentGroupId: parentGroupIdValue,
        CustomerGroupMember:
          normalizedUserIds.length > 0
            ? {
                create: normalizedUserIds.map((memberId) => ({
                  userId: memberId,
                  addedBy: user.id,
                })),
              }
            : undefined,
      },
      include: partnerGroupInclude,
    });

    return NextResponse.json({ ok: true, group: serializePartnerGroup(group) });
  } catch (error) {
    console.error('[Partner Customer Groups POST] Error:', error);
    console.error('[Partner Customer Groups POST] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to create customer group',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}
