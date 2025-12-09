export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { appendSystemConsultationNoteToSheet } from '@/lib/google/b2b-backup';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET: 시스템 상담 문의의 상담기록 조회 (관리자용)
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const consultationId = parseInt(resolvedParams.id);

    if (isNaN(consultationId)) {
      return NextResponse.json({ ok: false, error: '유효한 ID가 필요합니다.' }, { status: 400 });
    }

    // 시스템 상담 문의 확인
    const consultation = await prisma.systemConsultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      return NextResponse.json({ ok: false, error: '상담 문의를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 상담기록 조회
    const notes = await prisma.systemConsultationNote.findMany({
      where: { consultationId },
      orderBy: [{ consultedAt: 'desc' }, { id: 'desc' }],
    });

    // 프로필 정보 조회
    const profileIds = notes
      .map((n) => n.createdByProfileId)
      .filter((id): id is number => id !== null);

    const profiles = profileIds.length > 0
      ? await prisma.affiliateProfile.findMany({
          where: { id: { in: profileIds } },
          select: { id: true, displayName: true, type: true },
        })
      : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const consultationNotes = notes.map((note) => {
      const profile = note.createdByProfileId ? profileMap.get(note.createdByProfileId) : null;

      let createdByLabel = note.createdByType || '본사';
      if (note.createdByType === 'BRANCH_MANAGER') createdByLabel = '대리점장';
      else if (note.createdByType === 'SALES_AGENT') createdByLabel = '판매원';
      else if (note.createdByType === 'ADMIN') createdByLabel = '본사';

      return {
        id: note.id,
        content: note.content,
        consultedAt: note.consultedAt?.toISOString() || note.createdAt.toISOString(),
        nextActionDate: note.nextActionDate?.toISOString() || null,
        nextActionNote: note.nextActionNote,
        statusAfter: note.statusAfter,
        audioFileUrl: note.audioFileUrl,
        createdByName: note.createdByName || profile?.displayName || '관리자',
        createdByLabel,
        createdAt: note.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      ok: true,
      consultationNotes,
    });
  } catch (error) {
    console.error('[System Inquiry Consultations] GET Error:', error);
    return NextResponse.json({ ok: false, error: '상담기록 조회에 실패했습니다.' }, { status: 500 });
  }
}

// POST: 시스템 상담 문의에 상담기록 추가 (관리자용)
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const consultationId = parseInt(resolvedParams.id);

    if (isNaN(consultationId)) {
      return NextResponse.json({ ok: false, error: '유효한 ID가 필요합니다.' }, { status: 400 });
    }

    const body = await req.json();
    const {
      content,
      consultedAt,
      nextActionDate,
      nextActionNote,
      statusAfter,
      audioFileUrl,
    } = body;

    if (!content?.trim()) {
      return NextResponse.json({ ok: false, error: '상담 내용을 입력해주세요.' }, { status: 400 });
    }

    // 시스템 상담 문의 확인
    const consultation = await prisma.systemConsultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      return NextResponse.json({ ok: false, error: '상담 문의를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 상담자 정보
    let profileId: number | null = null;
    let consultantType = 'ADMIN';
    let consultantName = sessionUser.name || '관리자';

    const profile = await prisma.affiliateProfile.findFirst({
      where: { userId: sessionUser.id, status: 'ACTIVE' },
      select: { id: true, type: true, displayName: true },
    });

    if (profile) {
      profileId = profile.id;
      consultantType = profile.type || 'ADMIN';
      consultantName = profile.displayName || sessionUser.name || '관리자';
    }

    const consultedAtDate = consultedAt ? new Date(consultedAt) : new Date();

    // 상담기록 저장
    const createdNote = await prisma.systemConsultationNote.create({
      data: {
        consultationId,
        content: content.trim(),
        consultedAt: consultedAtDate,
        audioFileUrl: audioFileUrl || null,
        createdByName: consultantName,
        createdByType: consultantType,
        createdByProfileId: profileId,
        nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
        nextActionNote: nextActionNote || null,
        statusAfter: statusAfter || null,
        updatedAt: new Date(),
      },
    });

    // 상태 변경이 있으면 SystemConsultation 상태도 업데이트
    if (statusAfter) {
      await prisma.systemConsultation.update({
        where: { id: consultationId },
        data: {
          status: statusAfter,
          updatedAt: new Date(),
        },
      });
    }

    // Google 스프레드시트 백업
    const createdAtStr = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const consultedAtStr = consultedAtDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    // 담당자 이름 조회
    let partnerName = '본사';
    const partnerProfileId = consultation.agentId || consultation.managerId;
    if (partnerProfileId) {
      const partnerProfile = await prisma.affiliateProfile.findUnique({
        where: { id: partnerProfileId },
        select: { displayName: true },
      });
      if (partnerProfile) {
        partnerName = partnerProfile.displayName || '파트너';
      }
    }

    appendSystemConsultationNoteToSheet({
      noteId: createdNote.id,
      consultationId,
      customerName: consultation.name,
      customerPhone: consultation.phone,
      partnerName,
      consultedAt: consultedAtStr,
      content: content.trim(),
      consultantName,
      consultantType:
        consultantType === 'BRANCH_MANAGER' ? '대리점장' :
        consultantType === 'SALES_AGENT' ? '판매원' : '본사',
      nextActionDate: nextActionDate || null,
      nextActionNote: nextActionNote || null,
      statusAfter: statusAfter || null,
      audioFileUrl: audioFileUrl || null,
      createdAt: createdAtStr,
    }).catch((err) => {
      console.error('[System Inquiry Consultations] 스프레드시트 백업 실패:', err);
    });

    return NextResponse.json({
      ok: true,
      message: '상담기록이 저장되었습니다.',
      consultation: {
        id: createdNote.id,
        content: createdNote.content,
        consultedAt: createdNote.consultedAt?.toISOString() || createdNote.createdAt.toISOString(),
        createdByName: consultantName,
        createdByLabel:
          consultantType === 'BRANCH_MANAGER' ? '대리점장' :
          consultantType === 'SALES_AGENT' ? '판매원' : '본사',
      },
    });
  } catch (error) {
    console.error('[System Inquiry Consultations] POST Error:', error);
    return NextResponse.json({ ok: false, error: '상담기록 저장에 실패했습니다.' }, { status: 500 });
  }
}

/**
 * 시스템 상담 문의의 상담기록 삭제 API (관리자용)
 * DELETE /api/system-inquiries/[id]/consultations?noteId=123
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const consultationId = parseInt(resolvedParams.id);

    if (isNaN(consultationId)) {
      return NextResponse.json({ ok: false, error: '유효한 ID가 필요합니다.' }, { status: 400 });
    }

    // URL 파라미터에서 삭제할 상담기록 ID 추출
    const url = new URL(req.url);
    const noteId = url.searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json({ ok: false, error: '삭제할 상담기록 ID가 필요합니다.' }, { status: 400 });
    }

    const numericNoteId = parseInt(noteId);
    if (isNaN(numericNoteId)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 상담기록 ID입니다.' }, { status: 400 });
    }

    // 상담기록 확인
    const note = await prisma.systemConsultationNote.findUnique({
      where: { id: numericNoteId },
      select: { id: true, consultationId: true },
    });

    if (!note) {
      return NextResponse.json({ ok: false, error: '상담기록을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 해당 시스템 상담에 속한 기록인지 확인
    if (note.consultationId !== consultationId) {
      return NextResponse.json({ ok: false, error: '해당 상담의 기록이 아닙니다.' }, { status: 400 });
    }

    // 상담기록 삭제
    await prisma.systemConsultationNote.delete({
      where: { id: numericNoteId },
    });

    return NextResponse.json({
      ok: true,
      message: '상담기록이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('[System Inquiry Consultations] DELETE Error:', error);
    return NextResponse.json({ ok: false, error: '상담기록 삭제에 실패했습니다.' }, { status: 500 });
  }
}
