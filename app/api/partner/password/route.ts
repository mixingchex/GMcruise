// app/api/partner/password/route.ts
// 파트너 비밀번호 변경 API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext } from '@/app/api/partner/_utils';

// PUT: 파트너 비밀번호 변경
export async function PUT(req: NextRequest) {
  try {
    const { profile, sessionUser } = await requirePartnerContext();

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.trim().length === 0) {
      return NextResponse.json(
        { ok: false, message: '새 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 현재 사용자 정보 조회 (비밀번호 이력 포함)
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { 
        id: true, 
        password: true,
        PasswordEvent: {
          select: {
            id: true,
            from: true,
            to: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 실제 현재 비밀번호 가져오기 (PasswordEvent의 최신 to 값 우선, 없으면 user.password)
    const latestPasswordEvent = user.PasswordEvent && user.PasswordEvent.length > 0 
      ? user.PasswordEvent[0] 
      : null;
    const actualCurrentPassword = latestPasswordEvent?.to || user.password || null;

    console.log('[Partner Password] Password check:', {
      userId: user.id,
      hasCurrentPassword: !!(currentPassword && typeof currentPassword === 'string' && currentPassword.trim().length > 0),
      actualFromEvent: actualCurrentPassword ? '***' : null,
      actualFromUser: user.password ? '***' : null,
      hasLatestEvent: !!latestPasswordEvent,
    });

    // 현재 비밀번호 확인 (선택사항 - currentPassword가 제공되고 비어있지 않은 경우에만 확인)
    if (currentPassword && typeof currentPassword === 'string' && currentPassword.trim().length > 0) {
      const trimmedCurrentPassword = currentPassword.trim();
      // PasswordEvent의 최신 to 값과 user.password 둘 다 확인
      const matchesEventPassword = actualCurrentPassword === trimmedCurrentPassword;
      const matchesUserPassword = user.password === trimmedCurrentPassword;
      
      if (!matchesEventPassword && !matchesUserPassword) {
        console.error('[Partner Password] Password mismatch:', {
          userId: user.id,
          providedLength: trimmedCurrentPassword.length,
          actualFromEventLength: actualCurrentPassword?.length || 0,
          actualFromUserLength: user.password?.length || 0,
          matchesEventPassword,
          matchesUserPassword,
        });
        return NextResponse.json(
          { ok: false, message: '현재 비밀번호가 일치하지 않습니다.' },
          { status: 400 }
        );
      }
      
      console.log('[Partner Password] Password verified successfully');
    } else {
      console.log('[Partner Password] Skipping current password check (not provided)');
    }

    // 비밀번호 이벤트 기록 (실제 현재 비밀번호를 from으로 사용)
    await prisma.passwordEvent.create({
      data: {
        userId: user.id,
        from: actualCurrentPassword || user.password || '',
        to: newPassword.trim(),
        reason: `파트너 비밀번호 변경 (파트너 ID: ${profile.user?.mallUserId || sessionUser.id})`,
      },
    });

    // 비밀번호 업데이트 (평문으로 저장)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword.trim() },
    });

    return NextResponse.json({
      ok: true,
      message: '비밀번호가 변경되었습니다.',
    });
  } catch (error: any) {
    console.error('[Partner Password] PUT error:', error);
    if (error.name === 'PartnerApiError') {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status || 403 }
      );
    }
    return NextResponse.json(
      { ok: false, message: '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}









