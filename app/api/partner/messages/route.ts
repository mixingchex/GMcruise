export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

const SESSION_COOKIE = 'cg.sid.v2';
const ALLOWED_TYPES = ['received', 'sent'] as const;
type MessageType = (typeof ALLOWED_TYPES)[number];

// Helper: Check Authentication
async function checkAuth() {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sid) return null;

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: {
            id: true,
            role: true,
            name: true,
            AffiliateProfile: true,
          },
        },
      },
    });

    if (!session || !session.User) return null;

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      logger.warn('[Partner Messages] Session expired');
      return null;
    }

    if (
      !['admin', 'manager', 'agent'].includes(session.User.role) &&
      !session.User.AffiliateProfile
    )
      return null;

    return {
      userId: session.User.id,
      role: session.User.role,
      name: session.User.name,
      profile: session.User.AffiliateProfile,
    };
  } catch (error: unknown) {
    logger.error('[Partner Messages] Auth check error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

const messageTypes = [
  'team-dashboard',
  'agent-manager',
  'manager-agent',
  'manager-manager',
  'agent-admin',
  'manager-admin',
];

// GET: Fetch Messages
export async function GET(req: NextRequest) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type') || 'received';

    // [보안] type 파라미터 화이트리스트 강제
    if (!ALLOWED_TYPES.includes(typeParam as MessageType)) {
      return NextResponse.json({ ok: false, error: '잘못된 type 파라미터입니다.' }, { status: 400 });
    }
    const type = typeParam as MessageType;

    // [보안] limit 상한 설정 (DoS 방지)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const where: {
      messageType: { in: string[] };
      isActive: boolean;
      adminId?: number;
      userId?: number;
    } = {
      messageType: { in: messageTypes },
      isActive: true,
    };

    if (type === 'sent') {
      where.adminId = user.userId;
    } else {
      where.userId = user.userId;
    }

    const messages = await prisma.adminMessage.findMany({
      where,
      include: {
        User_AdminMessage_adminIdToUser: {
          select: { id: true, name: true, role: true },
        },
        User_AdminMessage_userIdToUser: {
          select: { id: true, name: true, role: true },
        },
        UserMessageRead: {
          where: { userId: user.userId },
          select: { readAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      title: msg.title,
      content: msg.content,
      messageType: msg.messageType,
      createdAt: msg.createdAt.toISOString(),
      sender: {
        id: msg.User_AdminMessage_adminIdToUser.id,
        name: msg.User_AdminMessage_adminIdToUser.name,
        role: msg.User_AdminMessage_adminIdToUser.role,
      },
      recipient: msg.User_AdminMessage_userIdToUser
        ? {
            id: msg.User_AdminMessage_userIdToUser.id,
            name: msg.User_AdminMessage_userIdToUser.name,
            role: msg.User_AdminMessage_userIdToUser.role,
          }
        : null,
      isRead: type === 'sent' ? true : msg.UserMessageRead.length > 0,
      readAt:
        type === 'sent' ? null : msg.UserMessageRead[0]?.readAt?.toISOString() || null,
    }));

    return NextResponse.json({ ok: true, messages: formattedMessages });
  } catch (error: unknown) {
    logger.error('[Partner Messages GET] Error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: '메시지 조회 실패' }, { status: 500 });
  }
}

// POST: Send Message (supports bulk send to multiple recipients)
export async function POST(req: NextRequest) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recipientUserIds, title, content } = body;

    // [보안] 입력값 길이 제한
    if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
      return NextResponse.json({ ok: false, error: '제목은 1~200자 이내여야 합니다.' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0 || content.length > 10000) {
      return NextResponse.json({ ok: false, error: '내용은 1~10000자 이내여야 합니다.' }, { status: 400 });
    }

    const recipientIds: number[] = Array.isArray(recipientUserIds)
      ? recipientUserIds
      : body.recipientUserId
      ? [parseInt(body.recipientUserId)]
      : [];

    if (recipientIds.length === 0) {
      return NextResponse.json({ ok: false, error: '수신자를 지정해야 합니다.' }, { status: 400 });
    }

    // [최적화] N+1 제거 — 일괄 조회
    const validRecipients = await prisma.user.findMany({
      where: {
        id: { in: recipientIds.filter((id) => id !== user.userId) },
      },
      select: { id: true, role: true },
    });

    if (validRecipients.length === 0) {
      return NextResponse.json({ ok: false, error: '유효한 수신자가 없습니다.' }, { status: 400 });
    }

    // [최적화] N+1 제거 + 트랜잭션 — 부분 생성 방지
    const createdMessages = await prisma.$transaction(
      validRecipients.map((recipient) => {
        let messageType = 'team-dashboard';
        if (user.role === 'agent') {
          if (recipient.role === 'manager') messageType = 'agent-manager';
          else if (recipient.role === 'admin') messageType = 'agent-admin';
        } else if (user.role === 'manager') {
          if (recipient.role === 'agent') messageType = 'manager-agent';
          else if (recipient.role === 'manager') messageType = 'manager-manager';
          else if (recipient.role === 'admin') messageType = 'manager-admin';
        }
        return prisma.adminMessage.create({
          data: {
            adminId: user.userId,
            userId: recipient.id,
            title: title.trim(),
            content: content.trim(),
            messageType,
            isActive: true,
          },
        });
      })
    );

    return NextResponse.json({
      ok: true,
      message: `${createdMessages.length}건 전송 완료`,
      count: createdMessages.length,
    });
  } catch (error: unknown) {
    logger.error('[Partner Messages POST] Error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: '메시지 전송 실패' }, { status: 500 });
  }
}

// PATCH: Mark as Read
export async function PATCH(req: NextRequest) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const messageId = parseInt(body.messageId);
    if (!messageId || isNaN(messageId)) {
      return NextResponse.json({ ok: false, error: 'messageId가 필요합니다.' }, { status: 400 });
    }

    const existingRead = await prisma.userMessageRead.findFirst({
      where: { messageId, userId: user.userId },
    });

    if (!existingRead) {
      await prisma.userMessageRead.create({
        data: { messageId, userId: user.userId, readAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logger.error('[Partner Messages PATCH] Error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: '읽음 처리 실패' }, { status: 500 });
  }
}

// DELETE: Delete Message (Soft Delete — recipient 전용)
export async function DELETE(req: NextRequest) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: 'messageId가 필요합니다.' }, { status: 400 });
    }

    const messageId = parseInt(id);
    if (isNaN(messageId)) {
      return NextResponse.json({ ok: false, error: '잘못된 messageId입니다.' }, { status: 400 });
    }

    const message = await prisma.adminMessage.findUnique({ where: { id: messageId } });
    if (!message) {
      return NextResponse.json({ ok: false, error: '메시지를 찾을 수 없습니다.' }, { status: 404 });
    }

    // [보안] 수신자만 삭제 가능 (발신자가 삭제 시 수신자도 못 읽는 문제 방지)
    if (message.userId !== user.userId) {
      return NextResponse.json({ ok: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    await prisma.adminMessage.update({
      where: { id: messageId },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logger.error('[Partner Messages DELETE] Error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: '삭제 실패' }, { status: 500 });
  }
}
