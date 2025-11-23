import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

/**
 * GET /api/partner/scheduled-messages/[id]
 * 특정 예약 메시지 조회
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

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid message ID' }, { status: 400 });
    }

    const message = await prisma.scheduledMessage.findFirst({
      where: {
        id,
        adminId: user.id, // 본인이 생성한 메시지만
      },
      include: {
        ScheduledMessageStage: {
          orderBy: { order: 'asc' },
        },
        targetGroup: {
          select: {
            id: true,
            name: true,
            _count: { select: { members: true } },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ ok: false, error: 'Message not found' }, { status: 404 });
    }

    // Transform ScheduledMessageStage to stages for frontend
    const formattedMessage = {
      ...message,
      stages: message.ScheduledMessageStage || [],
    };

    return NextResponse.json({ ok: true, message: formattedMessage });
  } catch (error) {
    console.error('[Partner Scheduled Messages GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch scheduled message' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/partner/scheduled-messages/[id]
 * 예약 메시지 수정 (판매원은 수정 불가)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid message ID' }, { status: 400 });
    }

    // 판매원/대리점장 프로필 확인
    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: user.id },
      select: { id: true, type: true },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      category,
      groupName,
      description,
      sendMethod,
      senderName,
      senderPhone,
      senderEmail,
      optOutNumber,
      isAdMessage,
      autoAddAdTag,
      autoAddOptOut,
      startDate,
      startTime,
      maxDays,
      repeatInterval,
      targetGroupId,
      stages,
      isActive,
    } = body;

    // 메시지 소유권 확인
    const existingMessage = await prisma.scheduledMessage.findFirst({
      where: {
        id,
        adminId: user.id,
      },
    });

    if (!existingMessage) {
      return NextResponse.json({ ok: false, error: 'Message not found or unauthorized' }, { status: 404 });
    }

    // targetGroupId가 있으면 해당 그룹이 판매원/대리점장의 그룹인지 확인
    if (targetGroupId) {
      const group = await prisma.customerGroup.findFirst({
        where: {
          id: targetGroupId,
          affiliateProfileId: affiliateProfile.id,
        },
      });

      if (!group) {
        return NextResponse.json(
          { ok: false, error: '선택한 그룹을 찾을 수 없거나 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    // 기존 단계 삭제 후 새로 생성
    await prisma.scheduledMessageStage.deleteMany({
      where: { scheduledMessageId: id },
    });

    // 예약 메시지 업데이트
    const updatedMessage = await prisma.scheduledMessage.update({
      where: { id },
      data: {
        title,
        category: category || '예약메시지',
        groupName: groupName || null,
        description: description || null,
        sendMethod,
        senderName: senderName || null,
        senderPhone: senderPhone || null,
        senderEmail: senderEmail || null,
        optOutNumber: optOutNumber || null,
        isAdMessage: isAdMessage || false,
        autoAddAdTag: autoAddAdTag !== false,
        autoAddOptOut: autoAddOptOut !== false,
        startDate: startDate ? new Date(startDate) : null,
        startTime: startTime || null,
        maxDays: maxDays || (sendMethod === 'sms' ? 999999 : 99999),
        repeatInterval: repeatInterval || null,
        targetGroupId: targetGroupId || null,
        isActive: isActive !== undefined ? isActive : true,
        ScheduledMessageStage: {
          create: stages.map((stage: any, index: number) => ({
            stageNumber: stage.stageNumber || index + 1,
            daysAfter: stage.daysAfter || 0,
            sendTime: stage.sendTime || null,
            title: stage.title,
            content: stage.content,
            order: index,
          })),
        },
      },
      include: {
        ScheduledMessageStage: {
          orderBy: { order: 'asc' },
        },
        targetGroup: {
          select: {
            id: true,
            name: true,
            _count: { select: { members: true } },
          },
        },
      },
    });

    // Transform ScheduledMessageStage to stages for frontend
    const formattedMessage = {
      ...updatedMessage,
      stages: updatedMessage.ScheduledMessageStage || [],
    };

    return NextResponse.json({ ok: true, message: formattedMessage });
  } catch (error) {
    console.error('[Partner Scheduled Messages PUT] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to update scheduled message' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/partner/scheduled-messages/[id]
 * 예약 메시지 삭제 (판매원은 삭제 불가)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid message ID' }, { status: 400 });
    }

    // 판매원/대리점장 프로필 확인
    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: user.id },
      select: { id: true, type: true },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    // 메시지 소유권 확인
    const existingMessage = await prisma.scheduledMessage.findFirst({
      where: {
        id,
        adminId: user.id,
      },
    });

    if (!existingMessage) {
      return NextResponse.json({ ok: false, error: 'Message not found or unauthorized' }, { status: 404 });
    }

    // 예약 메시지 삭제 (Cascade로 단계도 자동 삭제됨)
    await prisma.scheduledMessage.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, message: '예약 메시지가 삭제되었습니다.' });
  } catch (error) {
    console.error('[Partner Scheduled Messages DELETE] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete scheduled message' },
      { status: 500 }
    );
  }
}







