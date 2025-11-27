export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

// GET: 관리자 인증 상태 확인
export async function GET() {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    
    if (!sid) {
      return NextResponse.json({ ok: false, authenticated: false });
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {  // ✅ 대문자 U로 변경
          select: { id: true, role: true, name: true },
        },
      },
    });

    if (!session || !session.User) {  // ✅ 대문자 U로 변경
      return NextResponse.json({ ok: false, authenticated: false });
    }

    // 관리자 패널 접근 권한: 01024958013 또는 01038609161만 허용, user1~user10은 차단
    const user = await prisma.user.findUnique({
      where: { id: session.User.id },
      select: { role: true, phone: true }
    });

    if (!user || user.role !== 'admin') {
      console.log('[Admin Auth Check] 관리자가 아님:', { userId: session.User.id, role: user?.role });
      return NextResponse.json({ ok: false, authenticated: false });
    }

    // 전화번호 정규화 (로그인 시와 동일하게 처리)
    const normalizedPhone = user.phone?.replace(/[-\s]/g, '') || '';

    // user1~user10은 관리자 패널 접근 불가
    if (normalizedPhone && /^user(1[0]|[1-9])$/.test(normalizedPhone)) {
      console.log('[Admin Auth Check] user1~user10 차단:', { phone: normalizedPhone });
      return NextResponse.json({ 
        ok: false, 
        authenticated: false,
        error: 'user1~user10은 관리자 패널에 접근할 수 없습니다.'
      });
    }

    // 01024958013 또는 01038609161만 접근 허용 (정규화된 전화번호로 비교)
    const isAuthorized = normalizedPhone === '01024958013' || normalizedPhone === '01038609161';
    
    console.log('[Admin Auth Check] 권한 확인:', { 
      phone: normalizedPhone, 
      isAuthorized,
      originalPhone: user.phone 
    });

    return NextResponse.json({
      ok: true,
      authenticated: isAuthorized,
      user: isAuthorized ? {
        id: session.User.id,
        name: session.User.name,
        role: session.User.role,
        phone: user.phone
      } : null,
    });
  } catch (error) {
    console.error('[Admin Auth Check] Error:', error);
    console.error('[Admin Auth Check] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { 
        ok: false, 
        authenticated: false,
        error: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : '인증 확인 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
