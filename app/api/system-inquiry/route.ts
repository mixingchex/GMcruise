// app/api/system-inquiry/route.ts
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

    // 시스템 문의 저장 (Lead 테이블 활용, source: 'system_inquiry')
    const inquiry = await prisma.lead.create({
      data: {
        name: name.trim(),
        phone: normalizedPhone,
        source: 'system_inquiry', // 시스템 이용 문의 구분
        status: 'new',
        notes: message?.trim() || '시스템 이용 문의',
        metadata: {
          inquiryType: 'business_system',
          submittedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: '시스템 상담 문의가 접수되었습니다. 곧 연락드리겠습니다.',
      inquiryId: inquiry.id,
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
    const inquiries = await prisma.lead.findMany({
      where: {
        source: 'system_inquiry',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        notes: true,
        metadata: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      inquiries,
      total: inquiries.length,
    });
  } catch (error) {
    console.error('[System Inquiry] GET Error:', error);
    return NextResponse.json(
      { ok: false, error: '목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


