export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/auth';
import logger from '@/lib/logger';

/**
 * GET /api/admin/users/[userId]/password
 * 관리자 CS 전용: 고객 비밀번호 힌트 조회
 * - 감사 로그 기록 (누가/언제/어떤 고객 비밀번호를 조회했는지)
 * - 메인 사용자 API에서 분리하여 불필요한 노출 최소화
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAdmin || !auth.user) {
      return NextResponse.json({ ok: false, error: '권한이 없습니다.' }, { status: 401 });
    }

    const { userId } = await params;
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json({ ok: false, error: 'Invalid user ID' }, { status: 400 });
    }

    // 감사 로그: 누가 언제 어떤 고객 비밀번호를 조회했는지 기록
    logger.warn('[ADMIN_PASSWORD_ACCESS]', {
      adminId: auth.user.id,
      adminName: auth.user.name,
      targetUserId: userIdNum,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
    });

    // PasswordEvent에서 최신 비밀번호 조회
    const latestEvent = await prisma.passwordEvent.findFirst({
      where: { userId: userIdNum },
      orderBy: { createdAt: 'desc' },
      select: { to: true, createdAt: true, reason: true },
    });

    if (latestEvent?.to) {
      return NextResponse.json({
        ok: true,
        hint: latestEvent.to,
        changedAt: latestEvent.createdAt.toISOString(),
        reason: latestEvent.reason || null,
      });
    }

    // PasswordEvent가 없으면 user.password 확인
    const user = await prisma.user.findUnique({
      where: { id: userIdNum },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json({ ok: true, hint: null, message: '비밀번호 정보 없음' });
    }

    const pwd = user.password;
    const isHashed =
      pwd.startsWith('$2') ||
      pwd.startsWith('$argon2') ||
      pwd.startsWith('$scrypt') ||
      pwd.length > 50 ||
      /^[a-f0-9]{64}$/i.test(pwd) ||
      /^[a-f0-9]{128}$/i.test(pwd) ||
      /[^\x20-\x7E]/.test(pwd);

    return NextResponse.json({
      ok: true,
      hint: isHashed ? '(암호화됨) — 기본값: 3800' : pwd,
      changedAt: null,
      reason: null,
    });
  } catch (error: unknown) {
    console.error('[Admin Password Hint] Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch password hint' }, { status: 500 });
  }
}
