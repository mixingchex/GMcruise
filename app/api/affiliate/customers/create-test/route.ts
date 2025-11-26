export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/affiliate/customers/create-test
 * 판매원/대리점장이 테스트용 고객을 자동 생성
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 판매원/대리점장 프로필 확인
    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: sessionUser.id },
      select: {
        id: true,
        type: true,
        affiliateCode: true,
        displayName: true,
      },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: '어필리에이트 프로필을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (affiliateProfile.type !== 'SALES_AGENT' && affiliateProfile.type !== 'BRANCH_MANAGER') {
      return NextResponse.json({ ok: false, error: '판매원 또는 대리점장만 테스트 고객을 생성할 수 있습니다.' }, { status: 403 });
    }

    // 판매원인 경우 대리점장 확인
    let managerId: number | null = null;
    if (affiliateProfile.type === 'SALES_AGENT') {
      const agentRelation = await prisma.affiliateRelation.findFirst({
        where: {
          agentId: affiliateProfile.id,
          status: 'ACTIVE',
        },
        select: { managerId: true },
      });
      managerId = agentRelation?.managerId || null;
    } else {
      managerId = affiliateProfile.id;
    }

    // 테스트용 고객 정보 생성 (랜덤 이름과 전화번호)
    const testNames = ['김테스트', '이동행', '박고객', '최유저', '정사용자', '강크루즈', '윤여행', '임고객'];
    const randomName = testNames[Math.floor(Math.random() * testNames.length)];
    const randomPhone = `010${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`;
    
    // 전화번호 정규화
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
    const normalizedPhone = normalizePhone(randomPhone);

    // 기존 User 확인
    let existingUser = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        role: 'user',
      },
      select: {
        id: true,
        name: true,
        customerSource: true,
      },
    });

    let userId: number;
    let customerName: string;

    if (existingUser) {
      // 기존 User가 있으면 이름 업데이트
      userId = existingUser.id;
      customerName = existingUser.name || randomName;
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: customerName,
          customerSource: 'cruise-guide',
          customerStatus: 'active',
          password: '3800',
          isLocked: false,
          isHibernated: false,
        },
      });
    } else {
      // 새 User 생성
      const now = new Date();
      customerName = randomName;
      const newUser = await prisma.user.create({
        data: {
          name: customerName,
          phone: normalizedPhone,
          password: '3800',
          role: 'user',
          customerSource: 'cruise-guide',
          customerStatus: 'active',
          onboarded: false,
          loginCount: 0,
          isLocked: false,
          isHibernated: false,
          updatedAt: now,
        },
      });
      userId = newUser.id;
    }

    // AffiliateLead 생성 또는 업데이트
    const leadData: any = {
      customerName: customerName,
      customerPhone: normalizedPhone,
      status: 'NEW',
      source: 'direct',
      metadata: {
        productCode: null,
        registeredBy: affiliateProfile.id,
        registeredAt: new Date().toISOString(),
        isCompanion: false,
        isTestCustomer: true, // 테스트 고객 표시
      },
    };

    if (affiliateProfile.type === 'SALES_AGENT') {
      leadData.agentId = affiliateProfile.id;
      if (managerId) {
        leadData.managerId = managerId;
      }
    } else {
      leadData.managerId = affiliateProfile.id;
    }

    // 기존 Lead 확인
    const existingLead = await prisma.affiliateLead.findFirst({
      where: {
        customerPhone: normalizedPhone,
        status: { not: 'CANCELLED' },
      },
    });

    let lead;
    if (existingLead) {
      lead = await prisma.affiliateLead.update({
        where: { id: existingLead.id },
        data: leadData,
        include: {
          manager: {
            select: {
              id: true,
              displayName: true,
              affiliateCode: true,
            },
          },
          agent: {
            select: {
              id: true,
              displayName: true,
              affiliateCode: true,
            },
          },
        },
      });
    } else {
      lead = await prisma.affiliateLead.create({
        data: leadData,
        include: {
          manager: {
            select: {
              id: true,
              displayName: true,
              affiliateCode: true,
            },
          },
          agent: {
            select: {
              id: true,
              displayName: true,
              affiliateCode: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      ok: true,
      customer: {
        id: userId,
        name: customerName,
        phone: normalizedPhone,
        customerSource: 'cruise-guide',
        customerStatus: 'active',
        password: '3800',
      },
      lead: {
        id: lead.id,
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        status: lead.status,
      },
      message: `테스트 고객이 생성되었습니다. 이름: ${customerName}, 전화번호: ${normalizedPhone}, 비밀번호: 3800`,
    });
  } catch (error: any) {
    console.error('[Create Test Customer] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '테스트 고객 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

