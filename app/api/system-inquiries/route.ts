// app/api/system-inquiries/route.ts
// 크루즈 비즈니스 시스템 상담 문의 API

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: 시스템 문의 등록
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, message } = body;

    // 필수 필드 검증
    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { ok: false, error: '이름과 연락처를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 전화번호 정규화 (숫자만 추출)
    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { ok: false, error: '올바른 연락처를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 파트너 정보 찾기 (기존 AffiliateLead에서 검색)
    // 시스템 상담 신청은 별도 테이블(SystemConsultation)에 저장하지만,
    // 파트너 패널에서 보여주기 위해 managerId/agentId를 찾아야 함.
    let managerId: number | null = null;
    let agentId: number | null = null;

    const existingAffiliateLead = await prisma.affiliateLead.findFirst({
      where: { customerPhone: normalizedPhone },
      orderBy: { createdAt: 'desc' } // 가장 최근 리드 기준
    });

    if (existingAffiliateLead) {
      managerId = existingAffiliateLead.managerId;
      agentId = existingAffiliateLead.agentId;
    }

    // SystemConsultation 모델에 저장 (Lead/AffiliateLead와 분리)
    const consultation = await prisma.systemConsultation.create({
      data: {
        name: name.trim(),
        phone: normalizedPhone,
        message: message?.trim() || '시스템 이용 문의',
        status: 'NEW',
        managerId,
        agentId,
      },
    });

    return NextResponse.json({
      ok: true,
      message: '시스템 상담 문의가 접수되었습니다. 곧 연락드리겠습니다.',
      inquiryId: consultation.id,
    });
  } catch (error) {
    console.error('[System Inquiry] Error:', error);
    return NextResponse.json(
      { ok: false, error: '문의 접수 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 시스템 문의 목록 조회 (관리자용)
export async function GET(req: NextRequest) {
  try {
    const consultations = await prisma.systemConsultation.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      ok: true,
      inquiries: consultations, // 호환성을 위해 inquiries 키 유지
      total: consultations.length,
    });
  } catch (error) {
    console.error('[System Inquiry] GET Error:', error);
    return NextResponse.json(
      { ok: false, error: '목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


