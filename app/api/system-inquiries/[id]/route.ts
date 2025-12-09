export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// GET: 시스템 상담 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: '유효한 ID가 필요합니다.' }, { status: 400 });
    }

    const consultation = await prisma.systemConsultation.findUnique({
      where: { id },
    });

    if (!consultation) {
      return NextResponse.json({ ok: false, error: '상담 신청을 찾을 수 없습니다.' }, { status: 404 });
    }

    // manager/agent 프로필 조회
    const profileIds = [consultation.managerId, consultation.agentId].filter((id): id is number => id !== null);
    const profiles = profileIds.length > 0
      ? await prisma.affiliateProfile.findMany({
          where: { id: { in: profileIds } },
          select: { id: true, displayName: true, affiliateCode: true },
        })
      : [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return NextResponse.json({
      ok: true,
      inquiry: {
        id: consultation.id,
        name: consultation.name,
        phone: consultation.phone,
        message: consultation.message,
        status: consultation.status,
        createdAt: consultation.createdAt.toISOString(),
        updatedAt: consultation.updatedAt?.toISOString() || consultation.createdAt.toISOString(),
        manager: consultation.managerId ? profileMap.get(consultation.managerId) || null : null,
        agent: consultation.agentId ? profileMap.get(consultation.agentId) || null : null,
      },
    });
  } catch (error) {
    console.error('[System Inquiry Detail] GET Error:', error);
    return NextResponse.json({ ok: false, error: '상담 정보를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH: 시스템 상담 수정 (노트, 상태 등)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: '유효한 ID가 필요합니다.' }, { status: 400 });
    }

    const body = await req.json();
    const { notes, status, message } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (notes !== undefined) updateData.message = notes; // notes를 message 필드에 저장
    if (message !== undefined) updateData.message = message;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.systemConsultation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      message: '수정되었습니다.',
      inquiry: updated,
    });
  } catch (error) {
    console.error('[System Inquiry Detail] PATCH Error:', error);
    return NextResponse.json({ ok: false, error: '수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE: 시스템 상담 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: '유효한 ID가 필요합니다.' }, { status: 400 });
    }

    await prisma.systemConsultation.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: '삭제되었습니다.',
    });
  } catch (error) {
    console.error('[System Inquiry Detail] DELETE Error:', error);
    return NextResponse.json({ ok: false, error: '삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
