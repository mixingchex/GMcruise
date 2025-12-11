export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getTeamAgentIds } from '@/app/api/partner/customer-groups/utils';

/**
 * GET /api/partner/funnel-messages/logs
 * 퍼널 메시지 발송 로그 조회 (누적 통계 포함)
 */
export async function GET(req: NextRequest) {
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
      return NextResponse.json({ ok: false, error: '판매원/대리점장 프로필이 없습니다.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const groupId = searchParams.get('groupId');
    const funnelId = searchParams.get('funnelId');
    const skip = (page - 1) * limit;

    // 대리점장인 경우 팀 판매원 ID 목록 조회
    const teamAgentIds = await getTeamAgentIds(affiliateProfile.id, affiliateProfile.type || '');
    const profileIds = [affiliateProfile.id, ...teamAgentIds];

    // 발송된 퍼널 메시지 로그 조회 (AdminActionLog 기반)
    const whereCondition: any = {
      action: 'partner_funnel.sms.sent',
      details: {
        path: ['profileId'],
        // Prisma JSON 필터링
      },
    };

    // AdminActionLog에서 발송 로그 조회
    const logs = await prisma.adminActionLog.findMany({
      where: {
        action: 'partner_funnel.sms.sent',
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // 최근 500개 로그
    });

    // profileId 기준으로 필터링 (JSON 필드 필터링)
    const filteredLogs = logs.filter((log) => {
      const details = log.details as any;
      if (!details?.profileId) return false;
      if (!profileIds.includes(details.profileId)) return false;
      if (groupId && details.groupId !== parseInt(groupId)) return false;
      if (funnelId && details.funnelMessageId !== parseInt(funnelId)) return false;
      return true;
    });

    // 그룹별, 퍼널별 통계 집계
    const statsMap = new Map<string, {
      groupId: number;
      groupName: string;
      funnelMessageId: number;
      funnelTitle: string;
      stageNumber: number;
      totalSent: number;
      lastSentAt: Date;
      logs: any[];
    }>();

    for (const log of filteredLogs) {
      const details = log.details as any;
      const key = `${details.groupId || 0}-${details.funnelMessageId || 0}-${details.stageNumber || 0}`;

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          groupId: details.groupId || 0,
          groupName: '', // 나중에 조회
          funnelMessageId: details.funnelMessageId || 0,
          funnelTitle: '', // 나중에 조회
          stageNumber: details.stageNumber || 0,
          totalSent: 0,
          lastSentAt: log.createdAt,
          logs: [],
        });
      }

      const stat = statsMap.get(key)!;
      stat.totalSent++;
      if (log.createdAt > stat.lastSentAt) {
        stat.lastSentAt = log.createdAt;
      }
      stat.logs.push({
        id: log.id,
        leadId: details.leadId,
        phone: details.phone,
        messageLength: details.messageLength,
        sentAt: log.createdAt.toISOString(),
      });
    }

    // 그룹명, 퍼널명 조회
    const groupIds = [...new Set([...statsMap.values()].map(s => s.groupId).filter(id => id > 0))];
    const funnelIds = [...new Set([...statsMap.values()].map(s => s.funnelMessageId).filter(id => id > 0))];

    const [groups, funnels] = await Promise.all([
      groupIds.length > 0
        ? prisma.partnerCustomerGroup.findMany({
            where: { id: { in: groupIds } },
            select: { id: true, name: true },
          })
        : [],
      funnelIds.length > 0
        ? prisma.funnelMessage.findMany({
            where: { id: { in: funnelIds } },
            select: { id: true, title: true },
          })
        : [],
    ]);

    const groupNameMap = new Map(groups.map(g => [g.id, g.name]));
    const funnelTitleMap = new Map(funnels.map(f => [f.id, f.title]));

    // 통계에 그룹명, 퍼널명 추가
    const stats = [...statsMap.values()].map(stat => ({
      ...stat,
      groupName: groupNameMap.get(stat.groupId) || `그룹 #${stat.groupId}`,
      funnelTitle: funnelTitleMap.get(stat.funnelMessageId) || `퍼널 #${stat.funnelMessageId}`,
      logs: stat.logs.slice(0, 5), // 최근 5개만 포함
    }));

    // 정렬: 최근 발송순
    stats.sort((a, b) => b.lastSentAt.getTime() - a.lastSentAt.getTime());

    // 페이지네이션 적용
    const paginatedStats = stats.slice(skip, skip + limit);
    const total = stats.length;

    // 전체 통계
    const totalSentAll = filteredLogs.length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySent = filteredLogs.filter(log => log.createdAt >= todayStart).length;

    return NextResponse.json({
      ok: true,
      summary: {
        totalSent: totalSentAll,
        todaySent,
        groupCount: groupIds.length,
        funnelCount: funnelIds.length,
      },
      stats: paginatedStats.map(stat => ({
        groupId: stat.groupId,
        groupName: stat.groupName,
        funnelMessageId: stat.funnelMessageId,
        funnelTitle: stat.funnelTitle,
        stageNumber: stat.stageNumber,
        totalSent: stat.totalSent,
        lastSentAt: stat.lastSentAt.toISOString(),
        recentLogs: stat.logs,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Partner Funnel Logs GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '발송 로그 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
