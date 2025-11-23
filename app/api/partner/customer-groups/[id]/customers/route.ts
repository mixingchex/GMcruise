import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { buildScopedGroupWhere } from '@/app/api/partner/customer-groups/utils';

// GET: 그룹별 고객 리스트 조회 (유입날짜, 일차, 문자 발송 횟수 포함)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);
    if (isNaN(groupId)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 그룹 ID입니다.' }, { status: 400 });
    }

    // 판매원/대리점장 프로필 확인
    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { 
        userId: user.id,
      },
      select: { id: true, type: true, status: true },
    });

    if (!affiliateProfile || !affiliateProfile.id) {
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    // 그룹 소유권 확인 (CustomerGroup)
    const where = buildScopedGroupWhere(groupId, user.id, affiliateProfile.id);
    const group = await prisma.customerGroup.findFirst({
      where,
      select: { id: true, name: true },
    });

    if (!group) {
      return NextResponse.json(
        { ok: false, error: '그룹을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // CustomerGroupMember에서 그룹에 속한 고객 조회
    const memberWhere: any = {
      groupId,
    };

    // 검색 필터 (고객명, 전화번호, 이메일로 검색)
    if (search) {
      memberWhere.OR = [
        { User_CustomerGroupMember_userIdToUser: { name: { contains: search } } },
        { User_CustomerGroupMember_userIdToUser: { phone: { contains: search } } },
        { User_CustomerGroupMember_userIdToUser: { email: { contains: search } } },
      ];
    }

    const [members, total] = await Promise.all([
      prisma.customerGroupMember.findMany({
        where: memberWhere,
        include: {
          User_CustomerGroupMember_userIdToUser: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { addedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customerGroupMember.count({ where: memberWhere }),
    ]);

    // 일차 계산 헬퍼 함수
    const calculateDays = (addedAt: Date): number => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const joinDate = new Date(addedAt);
      joinDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - joinDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays + 1; // 1일차부터 시작
    };

    // 그룹에 연결된 ScheduledMessage 찾기 (funnelTalkIds, funnelSmsIds, funnelEmailIds 사용)
    const groupWithFunnels = await prisma.customerGroup.findUnique({
      where: { id: groupId },
      select: {
        funnelTalkIds: true,
        funnelSmsIds: true,
        funnelEmailIds: true,
      },
    });

    const allFunnelMessageIds: number[] = [];
    if (groupWithFunnels) {
      if (Array.isArray(groupWithFunnels.funnelTalkIds)) {
        allFunnelMessageIds.push(...groupWithFunnels.funnelTalkIds);
      }
      if (Array.isArray(groupWithFunnels.funnelSmsIds)) {
        allFunnelMessageIds.push(...groupWithFunnels.funnelSmsIds);
      }
      if (Array.isArray(groupWithFunnels.funnelEmailIds)) {
        allFunnelMessageIds.push(...groupWithFunnels.funnelEmailIds);
      }
    }

    // 각 고객별 문자 발송 횟수 계산 (ScheduledMessageLog 사용)
    const customers = await Promise.all(
      members.map(async (member) => {
        const userId = member.userId;

        // ScheduledMessageLog에서 전송 횟수 조회
        let totalSentCount = 0;
        if (allFunnelMessageIds.length > 0 && userId) {
          totalSentCount = await prisma.scheduledMessageLog.count({
            where: {
              userId,
              status: 'sent',
              scheduledMessageId: { in: allFunnelMessageIds },
            },
          });
        }

        return {
          id: member.id,
          userId: userId,
          customerName: member.User_CustomerGroupMember_userIdToUser?.name || null,
          phone: member.User_CustomerGroupMember_userIdToUser?.phone || null,
          email: member.User_CustomerGroupMember_userIdToUser?.email || null,
          groupInflowDate: member.addedAt.toISOString().split('T')[0], // YYYY-MM-DD 형식
          daysSinceInflow: calculateDays(member.addedAt), // 일차
          messageSentCount: totalSentCount, // 예약 메시지 발송 횟수 (ScheduledMessageLog 기반)
        };
      })
    );

    return NextResponse.json({
      ok: true,
      group: {
        id: group.id,
        name: group.name,
      },
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Partner Customer Groups Customers GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '고객 리스트 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

