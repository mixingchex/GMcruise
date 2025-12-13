export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { generateCsrfToken } from '@/lib/csrf';

const SESSION_COOKIE = 'cg.sid.v2';

/**
 * 캐시된 체험 세션 복원 API
 * localStorage에 저장된 체험 정보로 서버 세션을 복원
 */
export async function POST(req: Request) {
  try {
    const { name, phone, mallUserId } = await req.json();

    if (!phone || !mallUserId) {
      return NextResponse.json(
        { ok: false, error: '세션 정보가 없습니다.' },
        { status: 400 }
      );
    }

    // 연락처 정규화
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    console.log('[Trial Restore] 세션 복원 요청:', { name, phone: normalizedPhone, mallUserId });

    // 사용자 확인
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { mallUserId: mallUserId },
        ],
      },
    });

    if (!user) {
      console.log('[Trial Restore] 사용자를 찾을 수 없습니다.');
      return NextResponse.json(
        { ok: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 체험 계약 확인
    const existingContract = await prisma.affiliateContract.findFirst({
      where: {
        userId: user.id,
        metadata: {
          path: ['contractType'],
          equals: 'SUBSCRIPTION_AGENT',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!existingContract) {
      console.log('[Trial Restore] 체험 계약을 찾을 수 없습니다.');
      return NextResponse.json(
        { ok: false, error: '체험 계약을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const metadata = existingContract.metadata as any || {};
    const isTrial = metadata.isTrial === true;
    const trialEndDate = metadata.trialEndDate ? new Date(metadata.trialEndDate) : null;
    const now = new Date();

    // 체험 기간 확인
    if (!isTrial || !trialEndDate || now > trialEndDate) {
      console.log('[Trial Restore] 체험 기간이 만료되었습니다.');
      return NextResponse.json(
        { ok: false, error: '체험 기간이 만료되었습니다.' },
        { status: 410 } // Gone
      );
    }

    // 기존 세션 삭제 (있으면)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // 새 세션 생성
    const sessionId = randomBytes(32).toString('hex');
    const remainingDays = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.min(remainingDays, 7));

    const session = await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        csrfToken: generateCsrfToken(),
        expiresAt,
      },
      select: { id: true, csrfToken: true },
    });

    // 쿠키 설정
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: remainingDays * 24 * 60 * 60,
    });

    console.log('[Trial Restore] 세션 복원 완료:', {
      userId: user.id,
      mallUserId: user.mallUserId,
      remainingDays,
    });

    return NextResponse.json({
      ok: true,
      mallUserId: user.mallUserId,
      remainingDays,
      expiresAt: trialEndDate.toISOString(),
      message: '체험 세션이 복원되었습니다.',
    });
  } catch (error: any) {
    console.error('[Trial Restore] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || '세션 복원에 실패했습니다.' },
      { status: 500 }
    );
  }
}


