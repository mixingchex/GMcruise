import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext } from '@/app/api/partner/_utils';

// GET: 고객 그룹 관리 전용 고객 목록 조회
// 대리점장의 고객만 보여주되, 이미 그룹에 속한 고객은 제외
export async function GET(req: NextRequest) {
  try {
    const { profile } = await requirePartnerContext();
    if (!profile) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '1000');
    const groupId = searchParams.get('groupId'); // 특정 그룹에 속한 고객 제외 옵션

    // 대리점장의 고객만 조회 (AffiliateLead에서 User 정보 추출)
    const where: any = {
      OR: [
        { managerId: profile.id },
        { agentId: profile.id },
      ],
    };

    // 특정 그룹에 속한 고객 제외 옵션 (이미 그룹에 속한 고객은 제외하고 싶을 때)
    let userIdsToExclude: number[] = [];
    if (groupId) {
      const groupIdNum = parseInt(groupId);
      if (!isNaN(groupIdNum)) {
        // CustomerGroupMember에서 해당 그룹에 속한 고객 ID 조회
        const groupMembers = await prisma.customerGroupMember.findMany({
          where: { 
            groupId: groupIdNum,
            releasedAt: null, // 해제되지 않은 멤버만
          },
          select: { userId: true },
        });

        userIdsToExclude = groupMembers
          .map(m => m.userId)
          .filter((id): id is number => id !== null);
      }
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { customerName: { contains: search } },
            { customerPhone: { contains: search } },
          ],
        },
      ];
    }

    // 고객 목록 조회 (AffiliateLead)
    const leads = await prisma.affiliateLead.findMany({
      where,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        managerId: true,
        agentId: true,
        userId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // AffiliateProfile에서 userId 찾기
    const profileIds = new Set<number>();
    leads.forEach(lead => {
      if (lead.managerId) profileIds.add(lead.managerId);
      if (lead.agentId) profileIds.add(lead.agentId);
    });

    const profiles = await prisma.affiliateProfile.findMany({
      where: { id: { in: Array.from(profileIds) } },
      select: { id: true, userId: true },
    });

    const profileIdToUserId = new Map<number, number>();
    profiles.forEach(profile => {
      if (profile.userId) {
        profileIdToUserId.set(profile.id, profile.userId);
      }
    });

    // User 정보가 있는 고객만 필터링하고, 그룹에 속하지 않은 고객만 반환
    const customers = leads
      .map(lead => {
        const userId = lead.userId || 
          (lead.managerId && profileIdToUserId.get(lead.managerId)) ||
          (lead.agentId && profileIdToUserId.get(lead.agentId));
        
        if (!userId) return null;
        
        // 이미 그룹에 속한 고객은 제외
        if (userIdsToExclude.length > 0 && userIdsToExclude.includes(userId)) {
          return null;
        }

        return {
          id: userId, // User의 id 사용 (고객 그룹 추가용)
          name: lead.customerName || null,
          phone: lead.customerPhone || null,
          email: null, // AffiliateLead에는 email이 없음
          createdAt: lead.createdAt.toISOString(),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    return NextResponse.json({
      ok: true,
      customers,
    });
  } catch (error: any) {
    console.error('[Partner Customer Groups Customers] GET error:', error);
    return NextResponse.json(
      { ok: false, error: '고객 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

