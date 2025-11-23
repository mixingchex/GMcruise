import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Next.js 15에서 params가 Promise일 수 있으므로 처리
    const resolvedParams = await Promise.resolve(params);
    const profileId = parseInt(resolvedParams.id);
    
    if (isNaN(profileId) || profileId <= 0) {
      return NextResponse.json({ ok: false, message: 'Invalid profile ID' }, { status: 400 });
    }

    const profile = await prisma.affiliateProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        displayName: true,
        contactPhone: true,
        type: true,
        status: true,
        User: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });
    }

    // contractType은 type 필드에서 판단 (BRANCH_MANAGER는 type이 BRANCH_MANAGER인 경우)
    const isBranchManager = profile.type === 'BRANCH_MANAGER';
    
    // 프로필 수정에서 입력한 displayName과 contactPhone을 우선 사용
    const mentorName = profile.displayName || profile.User?.name || '대리점장';
    const mentorPhone = profile.contactPhone || profile.User?.phone || '';
    
    console.log('[AffiliateProfile API] 멘토 정보:', {
      profileId: profile.id,
      displayName: profile.displayName,
      contactPhone: profile.contactPhone,
      user_name: profile.User?.name,
      user_phone: profile.User?.phone,
      final_name: mentorName,
      final_phone: mentorPhone,
      type: profile.type,
    });
    
    return NextResponse.json({
      ok: true,
      profile: {
        id: profile.id,
        name: mentorName,
        phone: mentorPhone,
        type: profile.type, // BRANCH_MANAGER, SALES_AGENT 등 (프론트엔드 호환성을 위해 type도 포함)
        contractType: profile.type, // 하위 호환성을 위해 contractType도 포함
        status: profile.status,
        displayName: profile.displayName, // 원본 필드도 포함 (디버깅용)
        contactPhone: profile.contactPhone, // 원본 필드도 포함 (디버깅용)
      },
    });
  } catch (error: any) {
    console.error('[AffiliateProfile API] Error:', error);
    return NextResponse.json(
      { ok: false, message: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

