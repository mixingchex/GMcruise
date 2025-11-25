export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext, PartnerApiError } from '@/app/api/partner/_utils';
import { buildOwnershipFilter, partnerGroupInclude, serializePartnerGroup } from '@/app/api/partner/customer-groups/utils';

/**
 * GET /api/partner/customer-groups
 * 판매원/대리점장의 고객 그룹 목록 조회 (CustomerGroup 모델 사용)
 */
export async function GET(req: NextRequest) {
  try {
    const { profile, sessionUser } = await requirePartnerContext();
    
    console.log('[Partner Customer Groups GET] Profile:', { id: profile.id, type: profile.type, userId: sessionUser.id });

    // 대리점장인 경우 팀 판매원들의 ID 목록 조회
    let teamAgentIds: number[] = [];
    if (profile.type === 'BRANCH_MANAGER') {
      const teamRelations = await prisma.affiliateRelation.findMany({
        where: {
          managerId: profile.id,
          status: 'ACTIVE',
        },
        select: {
          agentId: true,
        },
      });
      teamAgentIds = teamRelations
        .map(r => r.agentId)
        .filter((id): id is number => id !== null);
    }

    const ownershipFilter = buildOwnershipFilter(sessionUser.id, profile.id);
    console.log('[Partner Customer Groups GET] Ownership filter:', JSON.stringify(ownershipFilter));
    
    const groups = await prisma.customerGroup.findMany({
      where: ownershipFilter,
      include: partnerGroupInclude,
      orderBy: { createdAt: 'desc' },
    });

    console.log('[Partner Customer Groups GET] Found groups:', groups.length);

    // 각 그룹의 고객 수(leadCount) 계산
    // 대리점장인 경우: 자신이 managerId인 Lead + 팀 판매원들이 agentId인 Lead
    // 판매원인 경우: 자신이 agentId인 Lead
    const groupsWithLeadCount = await Promise.all(
      groups.map(async (group) => {
        try {
          const leadCount = await prisma.affiliateLead.count({
            where: {
              groupId: group.id,
              OR: [
                { managerId: profile.id },
                { agentId: profile.id },
                // 대리점장인 경우 팀 판매원들이 관리하는 Lead도 포함
                ...(profile.type === 'BRANCH_MANAGER' && teamAgentIds.length > 0
                  ? [{ agentId: { in: teamAgentIds } }]
                  : []),
              ],
            },
          });
          return { group, leadCount };
        } catch (error) {
          console.error(`[Partner Customer Groups GET] Error counting leads for group ${group.id}:`, error);
          // 에러가 발생해도 0으로 처리하고 계속 진행
          return { group, leadCount: 0 };
        }
      })
    );

    console.log('[Partner Customer Groups GET] Groups with lead count:', groupsWithLeadCount.length);

    // serializePartnerGroup에서 발생할 수 있는 에러 처리
    const serializedGroups = groupsWithLeadCount.map(({ group, leadCount }) => {
      try {
        return serializePartnerGroup(group, leadCount);
      } catch (error) {
        console.error(`[Partner Customer Groups GET] Error serializing group ${group.id}:`, error);
        // JSON.stringify에서 순환 참조나 Date 객체 문제를 피하기 위해 안전하게 로깅
        try {
          console.error(`[Partner Customer Groups GET] Group ID: ${group.id}, Name: ${group.name}`);
        } catch (logError) {
          console.error(`[Partner Customer Groups GET] Error logging group info:`, logError);
        }
        // 최소한의 정보라도 반환
        return {
          id: group.id,
          adminId: group.adminId,
          name: group.name,
          description: group.description,
          color: group.color,
          parentGroupId: group.parentGroupId,
          affiliateProfileId: group.affiliateProfileId,
          createdAt: group.createdAt instanceof Date ? group.createdAt.toISOString() : String(group.createdAt),
          updatedAt: group.updatedAt instanceof Date ? group.updatedAt.toISOString() : String(group.updatedAt),
          leadCount: leadCount ?? 0,
          members: [],
          subGroups: [],
          scheduledMessages: [],
          funnelTalkIds: [],
          funnelSmsIds: [],
          funnelEmailIds: [],
          reEntryHandling: null,
          _count: { members: 0 },
        };
      }
    });

    return NextResponse.json({ 
      ok: true, 
      groups: serializedGroups,
    });
  } catch (error) {
    if (error instanceof PartnerApiError) {
      console.error('[Partner Customer Groups GET] PartnerApiError:', {
        message: error.message,
        status: error.status,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    
    console.error('[Partner Customer Groups GET] Unexpected error:', error);
    console.error('[Partner Customer Groups GET] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : '고객 그룹 목록을 불러오지 못했습니다.',
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
    const { profile, sessionUser } = await requirePartnerContext();
    
    console.log('[Partner Customer Groups POST] Profile:', { id: profile.id, type: profile.type, userId: sessionUser.id });

    const body = await req.json();
    const { name, description, color, userIds, parentGroupId, funnelTalkIds, funnelSmsIds, funnelEmailIds, reEntryHandling } = body;

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

    // parentGroupId가 있는 경우, 해당 그룹이 본인 소유인지 확인
    if (parentGroupIdValue !== null) {
      const parentGroup = await prisma.customerGroup.findFirst({
        where: {
          id: parentGroupIdValue,
          ...buildOwnershipFilter(sessionUser.id, profile.id),
        },
      });
      
      if (!parentGroup) {
        return NextResponse.json(
          { ok: false, error: '상위 그룹을 찾을 수 없거나 권한이 없습니다.' },
          { status: 404 }
        );
      }
    }

    const group = await prisma.customerGroup.create({
      data: {
        adminId: sessionUser.id,
        affiliateProfileId: profile.id,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        parentGroupId: parentGroupIdValue,
        funnelTalkIds: Array.isArray(funnelTalkIds) && funnelTalkIds.length > 0 ? funnelTalkIds : null,
        funnelSmsIds: Array.isArray(funnelSmsIds) && funnelSmsIds.length > 0 ? funnelSmsIds : null,
        funnelEmailIds: Array.isArray(funnelEmailIds) && funnelEmailIds.length > 0 ? funnelEmailIds : null,
        reEntryHandling: reEntryHandling || null,
        CustomerGroupMember:
          normalizedUserIds.length > 0
            ? {
                create: normalizedUserIds.map((memberId) => ({
                  userId: memberId,
                  addedBy: sessionUser.id,
                })),
              }
            : undefined,
      },
      include: partnerGroupInclude,
    });

    console.log('[Partner Customer Groups POST] Created group:', { id: group.id, name: group.name });

    try {
      // 새로 생성된 그룹의 leadCount 계산
      let leadCount = 0;
      try {
        // 대리점장인 경우 팀 판매원들의 ID 목록 조회
        let teamAgentIds: number[] = [];
        if (profile.type === 'BRANCH_MANAGER') {
          const teamRelations = await prisma.affiliateRelation.findMany({
            where: {
              managerId: profile.id,
              status: 'ACTIVE',
            },
            select: {
              agentId: true,
            },
          });
          teamAgentIds = teamRelations
            .map(r => r.agentId)
            .filter((id): id is number => id !== null);
        }

        leadCount = await prisma.affiliateLead.count({
          where: {
            groupId: group.id,
            OR: [
              { managerId: profile.id },
              { agentId: profile.id },
              // 대리점장인 경우 팀 판매원들이 관리하는 Lead도 포함
              ...(profile.type === 'BRANCH_MANAGER' && teamAgentIds.length > 0
                ? [{ agentId: { in: teamAgentIds } }]
                : []),
            ],
          },
        });
      } catch (countError) {
        console.error('[Partner Customer Groups POST] Error counting leads:', countError);
        leadCount = 0;
      }

      const serializedGroup = serializePartnerGroup(group, leadCount);
      return NextResponse.json({ ok: true, group: serializedGroup });
    } catch (serializeError) {
      console.error('[Partner Customer Groups POST] Error serializing group:', serializeError);
      // 그룹은 생성되었지만 직렬화에 실패한 경우, 최소한의 정보라도 반환
      return NextResponse.json({ 
        ok: true, 
        group: {
          id: group.id,
          adminId: group.adminId,
          name: group.name,
          description: group.description,
          color: group.color,
          parentGroupId: group.parentGroupId,
          affiliateProfileId: group.affiliateProfileId,
          createdAt: group.createdAt instanceof Date ? group.createdAt.toISOString() : String(group.createdAt),
          updatedAt: group.updatedAt instanceof Date ? group.updatedAt.toISOString() : String(group.updatedAt),
          leadCount: 0,
          members: [],
          subGroups: [],
          scheduledMessages: [],
          funnelTalkIds: [],
          funnelSmsIds: [],
          funnelEmailIds: [],
          reEntryHandling: null,
          _count: { members: 0 },
        }
      });
    }
  } catch (error) {
    if (error instanceof PartnerApiError) {
      console.error('[Partner Customer Groups POST] PartnerApiError:', {
        message: error.message,
        status: error.status,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    
    console.error('[Partner Customer Groups POST] Unexpected error:', error);
    console.error('[Partner Customer Groups POST] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : '고객 그룹 생성에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}
