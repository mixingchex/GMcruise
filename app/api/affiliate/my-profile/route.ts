import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

/**
 * GET /api/affiliate/my-profile
 * 현재 로그인한 사용자의 AffiliateProfile 정보 조회 (계약서 자동 채우기용)
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 현재 사용자의 AffiliateProfile 조회
    const profile = await prisma.affiliateProfile.findFirst({
      where: {
        userId: sessionUser.id,
      },
      select: {
        id: true,
        displayName: true,
        contactPhone: true,
        type: true,
        User: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!profile) {
      // 프로필이 없으면 User 정보만 반환
      return NextResponse.json({
        ok: true,
        profile: {
          name: sessionUser.name || '',
          phone: sessionUser.phone || '',
          email: null,
        },
        hasProfile: false,
      });
    }

    // 프로필 정보와 User 정보 병합
    const name = profile.displayName || profile.User?.name || sessionUser.name || '';
    const phone = profile.contactPhone || profile.User?.phone || sessionUser.phone || '';
    const email = profile.User?.email || null;

    return NextResponse.json({
      ok: true,
      profile: {
        id: profile.id,
        name,
        phone,
        email,
        type: profile.type,
      },
      hasProfile: true,
    });
  } catch (error: any) {
    console.error('[My Profile API] Error:', error);
    return NextResponse.json(
      { ok: false, message: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

