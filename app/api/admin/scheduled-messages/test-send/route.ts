export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { manualProcessScheduledMessages } from '@/lib/scheduler/scheduledMessageSender';

/**
 * POST /api/admin/scheduled-messages/test-send
 * 예약 메시지 발송 스케줄러 수동 실행 (테스트용)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 확인
    if (user.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    console.log('[Test Send] Manual scheduled message processing triggered by admin:', user.id);

    // 스케줄러 수동 실행
    await manualProcessScheduledMessages();

    return NextResponse.json({
      ok: true,
      message: '예약 메시지 발송 스케줄러가 실행되었습니다. 서버 로그를 확인해주세요.',
    });
  } catch (error) {
    console.error('[Test Send] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to process scheduled messages',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/scheduled-messages/test-send
 * 예약 메시지 발송 상태 확인
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 확인
    if (user.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const prisma = (await import('@/lib/prisma')).default;

    // 최근 발송 로그 조회
    const recentLogs = await prisma.notificationLog.findMany({
      where: {
        notificationType: 'SCHEDULED_MESSAGE',
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: 20,
    });

    // 활성화된 예약 메시지 수
    const activeMessages = await prisma.scheduledMessage.count({
      where: {
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      stats: {
        activeMessages,
        recentLogsCount: recentLogs.length,
        recentLogs: recentLogs.map((log) => ({
          id: log.id,
          userId: log.userId,
          title: log.title,
          sentAt: log.sentAt.toISOString(),
          eventKey: log.eventKey,
        })),
      },
    });
  } catch (error) {
    console.error('[Test Send] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch status',
      },
      { status: 500 }
    );
  }
}
