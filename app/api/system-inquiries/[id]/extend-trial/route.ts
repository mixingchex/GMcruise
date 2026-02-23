export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST: 시스템 상담 신청자의 B2B 대시보드 무료 체험 3일 연장
// B2B 체험 정보는 AffiliateLead.metadata.trialExpiresAt에 저장됨
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    console.log('[System Extend Trial] Starting...');

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      console.log('[System Extend Trial] No session user');
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }
    console.log('[System Extend Trial] Session user:', sessionUser.id, 'role:', sessionUser.role);

    const resolvedParams = await context.params;
    const consultationId = parseInt(resolvedParams.id);
    console.log('[System Extend Trial] Consultation ID:', consultationId);

    if (isNaN(consultationId)) {
      return NextResponse.json({ ok: false, error: '유효한 ID가 필요합니다.' }, { status: 400 });
    }

    const body = await req.json();
    console.log('[System Extend Trial] Body:', body);
    const { days = 3, phone } = body;

    if (!Number.isInteger(days) || days < 1 || days > 30) {
      return NextResponse.json({ ok: false, error: '연장 기간은 1~30일 사이여야 합니다.' }, { status: 400 });
    }


    // 시스템 상담 정보 조회
    const consultation = await prisma.systemConsultation.findUnique({
      where: { id: consultationId },
    });

    console.log('[System Extend Trial] Consultation found:', consultation ? { id: consultation.id, name: consultation.name } : 'null');

    if (!consultation) {
      return NextResponse.json({ ok: false, error: '상담 신청을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 전화번호로 AffiliateLead 찾기 (B2B 무료 체험 정보가 여기 저장됨)
    const phoneToSearch = phone || consultation.phone;
    const normalizedPhone = phoneToSearch?.replace(/[^0-9]/g, '');

    if (!normalizedPhone) {
      return NextResponse.json({ ok: false, error: '연락처 정보가 없습니다.' }, { status: 400 });
    }

    // AffiliateLead에서 해당 전화번호의 B2B 유입 고객 찾기
    const lead = await prisma.affiliateLead.findFirst({
      where: {
        OR: [
          { customerPhone: normalizedPhone },
          { customerPhone: phoneToSearch },
        ],
      },
      orderBy: { createdAt: 'desc' }, // 가장 최근 리드
    });

    if (!lead) {
      return NextResponse.json({
        ok: false,
        error: `해당 연락처(${phoneToSearch})로 등록된 B2B 고객을 찾을 수 없습니다.`,
      }, { status: 404 });
    }

    // 현재 metadata에서 trialExpiresAt 확인
    const metadata = (lead.metadata as any) || {};
    const currentTrialEnd = metadata.trialExpiresAt ? new Date(metadata.trialExpiresAt) : new Date();
    const now = new Date();

    // 만료된 경우 오늘부터, 아직 유효한 경우 기존 날짜부터 연장
    const baseDate = currentTrialEnd > now ? currentTrialEnd : now;
    const newTrialEnd = new Date(baseDate);
    newTrialEnd.setDate(newTrialEnd.getDate() + days);

    // AffiliateLead.metadata 업데이트
    const updatedMetadata = {
      ...metadata,
      trialExpiresAt: newTrialEnd.toISOString(),
      trialExtendedAt: now.toISOString(),
      trialExtendedBy: sessionUser.name || sessionUser.id,
      trialExtendedDays: (metadata.trialExtendedDays || 0) + days,
    };

    await prisma.affiliateLead.update({
      where: { id: lead.id },
      data: {
        metadata: updatedMetadata,
        updatedAt: new Date(),
      },
    });

    const formattedDate = newTrialEnd.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    console.log(`[System Inquiry Extend Trial] ${consultation.name} (${consultation.phone}) B2B trial extended by ${days} days until ${formattedDate}`);

    return NextResponse.json({
      ok: true,
      message: `${consultation.name}님의 B2B 대시보드 무료 체험이 ${days}일 연장되었습니다.\n새 만료일: ${formattedDate}`,
      newTrialEndDate: newTrialEnd.toISOString(),
    });
  } catch (error) {
    console.error('[System Inquiry Extend Trial] Error:', error);
    return NextResponse.json({ ok: false, error: '연장 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
