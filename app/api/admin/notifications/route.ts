import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';

async function checkAdminAuth(sid: string | undefined): Promise<{ isAdmin: boolean; userId: number | null }> {
  try {
    if (!sid) return { isAdmin: false, userId: null };

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { 
        User: {
          include: {
            AffiliateProfile: true,
          },
        },
      },
    });

    if (!session || !session.User) {
      return { isAdmin: false, userId: null };
    }

    const user = session.User;
    const isAdmin = user.role === 'admin' || !!user.AffiliateProfile;

    return { isAdmin, userId: user.id };
  } catch (error) {
    console.error('[Notifications API] Auth check error:', error);
    return { isAdmin: false, userId: null };
  }
}

// GET: 알림 목록 조회 (읽지 않은 알림만)
export async function GET(req: NextRequest) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    const auth = await checkAdminAuth(sid);
    
    if (!auth.isAdmin || !auth.userId) {
      return NextResponse.json(
        { ok: false, error: '인증이 필요합니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const includeRead = searchParams.get('includeRead') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    // 알림 조회 조건
    const where: any = {
      OR: [
        { userId: auth.userId }, // 개인 알림
        { userId: null }, // 전체 공지사항
      ],
    };

    if (!includeRead) {
      where.isRead = false;
    }

    // 알림 조회
    const notifications = await prisma.adminNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        User: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 읽지 않은 알림 개수
    const unreadCount = await prisma.adminNotification.count({
      where: {
        OR: [
          { userId: auth.userId },
          { userId: null },
        ],
        isRead: false,
      },
    });

    const formattedNotifications = notifications.map(notif => ({
      id: notif.id,
      notificationType: notif.notificationType,
      title: notif.title,
      content: notif.content,
      relatedCustomerId: notif.relatedCustomerId,
      relatedNoteId: notif.relatedNoteId,
      relatedMessageId: notif.relatedMessageId,
      isRead: notif.isRead,
      readAt: notif.readAt?.toISOString() || null,
      priority: notif.priority,
      createdAt: notif.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json(
      { ok: false, error: '알림을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

// POST: 알림 읽음 처리
export async function POST(req: NextRequest) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    const auth = await checkAdminAuth(sid);
    
    if (!auth.isAdmin || !auth.userId) {
      return NextResponse.json(
        { ok: false, error: '인증이 필요합니다.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // 모든 알림 읽음 처리
      await prisma.adminNotification.updateMany({
        where: {
          OR: [
            { userId: auth.userId },
            { userId: null },
          ],
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        message: '모든 알림을 읽음 처리했습니다.',
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { ok: false, error: '알림 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 특정 알림 읽음 처리
    await prisma.adminNotification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: '알림을 읽음 처리했습니다.',
    });
  } catch (error: any) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json(
      { ok: false, error: '알림 읽음 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}

