export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

/**
 * GET /api/partner/customer-groups/[id]/message-logs
 * 대리점의 고객 그룹 예약 메시지 전송 기록 조회
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

    // 판매원/대리점장 프로필 확인
    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: user.id },
      select: { id: true, type: true },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    const groupId = parseInt(params.id);
    if (isNaN(groupId)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 그룹 ID입니다.' }, { status: 400 });
    }

    // 고객 그룹 존재 및 권한 확인
    const group = await prisma.customerGroup.findFirst({
      where: {
        id: groupId,
        affiliateProfileId: affiliateProfile.id,
      },
      select: { id: true, name: true },
    });

    if (!group) {
      return NextResponse.json({ ok: false, error: '고객 그룹을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
    }

    // 그룹 멤버와 전송 기록 조회
    const members = await prisma.customerGroupMember.findMany({
      where: {
        groupId: groupId,
        releasedAt: null,
      },
      include: {
        User_CustomerGroupMember_userIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    // 각 멤버별 전송 기록 집계
    const now = new Date();
    const memberStats = await Promise.all(
      members.map(async (member) => {
        const user = member.User_CustomerGroupMember_userIdToUser;
        const addedAt = new Date(member.addedAt);
        const daysSinceAdded = Math.floor((now.getTime() - addedAt.getTime()) / (1000 * 60 * 60 * 24));

        // 전송 기록 조회
        const logs = await prisma.scheduledMessageLog.findMany({
          where: {
            userId: user.id,
            ScheduledMessage: {
              targetGroupId: groupId,
            },
          },
          include: {
            ScheduledMessage: {
              select: {
                id: true,
                title: true,
                sendMethod: true,
              },
            },
          },
          orderBy: { sentAt: 'desc' },
        });

        const sentCount = logs.filter((log) => log.status === 'sent').length;
        const failedCount = logs.filter((log) => log.status === 'failed').length;

        const recentLogs = logs.slice(0, 5).map((log) => ({
          id: log.id,
          messageTitle: log.ScheduledMessage.title,
          sendMethod: log.ScheduledMessage.sendMethod,
          stageNumber: log.stageNumber,
          sentAt: log.sentAt.toISOString(),
          status: log.status,
          errorMessage: log.errorMessage,
        }));

        return {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone,
          addedAt: addedAt.toISOString(),
          daysSinceAdded,
          sentCount,
          failedCount,
          totalCount: sentCount + failedCount,
          recentLogs,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      group: {
        id: group.id,
        name: group.name,
      },
      members: memberStats,
      summary: {
        totalMembers: members.length,
        totalSent: memberStats.reduce((sum, m) => sum + m.sentCount, 0),
        totalFailed: memberStats.reduce((sum, m) => sum + m.failedCount, 0),
      },
    });
  } catch (error: any) {
    console.error('[Partner Customer Group Message Logs] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch message logs',
      },
      { status: 500 }
    );
  }
}
