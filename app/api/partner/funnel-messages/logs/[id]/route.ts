export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getTeamAgentIds } from '@/app/api/partner/customer-groups/utils';

/**
 * GET /api/partner/funnel-messages/logs/[id]
 * 특정 퍼널+그룹+단계의 발송 상세 로그 조회
 * id 형식: {groupId}-{funnelMessageId}-{stageNumber}
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const idParts = resolvedParams.id.split('-');

    if (idParts.length !== 3) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 ID 형식입니다.' }, { status: 400 });
    }

    const [groupIdStr, funnelIdStr, stageStr] = idParts;
    const groupId = parseInt(groupIdStr);
    const funnelMessageId = parseInt(funnelIdStr);
    const stageNumber = parseInt(stageStr);

    if (isNaN(groupId) || isNaN(funnelMessageId) || isNaN(stageNumber)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 ID입니다.' }, { status: 400 });
    }

    // 판매원/대리점장 프로필 확인
    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: user.id },
      select: { id: true, type: true },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: '판매원/대리점장 프로필이 없습니다.' }, { status: 404 });
    }

    // 대리점장인 경우 팀 판매원 ID 목록 조회
    const teamAgentIds = await getTeamAgentIds(affiliateProfile.id, affiliateProfile.type || '');
    const profileIds = [affiliateProfile.id, ...teamAgentIds];

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // AdminActionLog에서 해당 조건의 발송 로그 조회
    const allLogs = await prisma.adminActionLog.findMany({
      where: {
        action: 'partner_funnel.sms.sent',
      },
      orderBy: { createdAt: 'desc' },
      take: 2000, // 최대 2000개
    });

    // 필터링
    const filteredLogs = allLogs.filter((log) => {
      const details = log.details as any;
      if (!details?.profileId) return false;
      if (!profileIds.includes(details.profileId)) return false;
      if (details.groupId !== groupId) return false;
      if (details.funnelMessageId !== funnelMessageId) return false;
      if (details.stageNumber !== stageNumber) return false;
      return true;
    });

    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(skip, skip + limit);

    // leadId로 고객 정보 조회
    const leadIds = [...new Set(paginatedLogs.map(log => (log.details as any).leadId).filter(Boolean))];
    const leads = leadIds.length > 0
      ? await prisma.affiliateLead.findMany({
          where: { id: { in: leadIds } },
          select: { id: true, customerName: true, customerPhone: true },
        })
      : [];

    const leadMap = new Map<number, { id: number; customerName: string | null; customerPhone: string | null }>(
      leads.map(l => [l.id, l])
    );

    // 그룹, 퍼널 정보 조회
    const [group, funnel] = await Promise.all([
      prisma.partnerCustomerGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true },
      }),
      prisma.funnelMessage.findUnique({
        where: { id: funnelMessageId },
        select: {
          id: true,
          title: true,
          FunnelMessageStage: {
            where: { stageNumber },
            select: { id: true, stageNumber: true, content: true, sendTime: true, daysAfter: true },
          },
        },
      }),
    ]);

    const stageInfo = funnel?.FunnelMessageStage?.[0] || null;

    // 응답 데이터 구성
    const recipients = paginatedLogs.map((log) => {
      const details = log.details as any;
      const lead = leadMap.get(details.leadId);

      return {
        id: log.id,
        leadId: details.leadId,
        customerName: lead?.customerName || '알 수 없음',
        customerPhone: lead?.customerPhone || details.phone || '알 수 없음',
        sentAt: log.createdAt.toISOString(),
        messageLength: details.messageLength,
        aligoResult: details.aligoResult,
      };
    });

    return NextResponse.json({
      ok: true,
      info: {
        groupId,
        groupName: group?.name || `그룹 #${groupId}`,
        funnelMessageId,
        funnelTitle: funnel?.title || `퍼널 #${funnelMessageId}`,
        stageNumber,
        stageContent: stageInfo?.content || '',
        stageSendTime: stageInfo?.sendTime || '',
        stageDaysAfter: stageInfo?.daysAfter || 0,
      },
      totalSent: total,
      recipients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Partner Funnel Logs Detail GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '발송 상세 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
