import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/affiliate/customers/register
 * 판매원/대리점장이 고객 및 동행인을 등록
 * 등록된 고객/동행인은 비밀번호 3800으로 크루즈 가이드 지니에 로그인 가능
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
      return NextResponse.json({ ok: false, error: '판매원 또는 대리점장만 고객을 등록할 수 있습니다.' }, { status: 403 });
    }

    const body = await req.json();
    const { customerName, customerPhone, productCode, isCompanion, mainCustomerPhone } = body;

    // 필수 필드 검증
    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { ok: false, error: '고객 이름과 전화번호는 필수입니다.' },
        { status: 400 }
      );
    }

    // 전화번호 정규화 (일관성 유지: customer-ownership.ts와 동일하게)
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
    const normalizedPhone = normalizePhone(customerPhone);

    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { ok: false, error: '올바른 전화번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 동행인인 경우 메인 고객 전화번호 확인
    if (isCompanion && !mainCustomerPhone) {
      return NextResponse.json(
        { ok: false, error: '동행인인 경우 메인 고객 전화번호가 필요합니다.' },
        { status: 400 }
      );
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

    // ✅ 절대법칙: 동행인 등록 시 즉시 User 생성 (유료 서비스 고객으로)
    // 이름과 전화번호로 기존 User 확인
    let existingUser = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        name: customerName.trim(),
        role: 'user',
      },
      select: {
        id: true,
        customerSource: true,
        customerStatus: true,
        password: true,
      },
    });

    let userId: number;
    if (existingUser) {
      // 기존 User가 있으면 customerSource와 비밀번호 업데이트
      userId = existingUser.id;
      await prisma.user.update({
        where: { id: userId },
        data: {
          customerSource: 'cruise-guide',
          customerStatus: 'active',
          password: '3800',
          isLocked: false,
          isHibernated: false,
        },
      });
      console.log('[Affiliate Customer Register] 기존 User 업데이트:', { userId, phone: normalizedPhone });
    } else {
      // 새 User 생성 (유료 서비스 고객)
      const now = new Date();
      const newUser = await prisma.user.create({
        data: {
          name: customerName.trim(),
          phone: normalizedPhone,
          password: '3800',
          role: 'user',
          customerSource: 'cruise-guide',
          customerStatus: 'active',
          onboarded: false, // 로그인 시 온보딩 완료
          loginCount: 0,
          isLocked: false,
          isHibernated: false,
          updatedAt: now,
        },
      });
      userId = newUser.id;
      console.log('[Affiliate Customer Register] 새 User 생성:', { userId, phone: normalizedPhone });
    }

    // AffiliateLead 생성 또는 업데이트
    const leadData: any = {
      customerName: customerName.trim(),
      customerPhone: normalizedPhone,
      status: 'NEW',
      source: isCompanion ? 'companion' : 'direct',
      metadata: {
        productCode: productCode || null,
        registeredBy: affiliateProfile.id,
        registeredAt: new Date().toISOString(),
        isCompanion: isCompanion || false,
        mainCustomerPhone: isCompanion ? normalizePhone(mainCustomerPhone) : null,
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

    // 기존 Lead 확인 (동일한 전화번호)
    const existingLead = await prisma.affiliateLead.findFirst({
      where: {
        customerPhone: normalizedPhone,
        status: { not: 'CANCELLED' },
      },
    });

    let lead;
    if (existingLead) {
      // 기존 Lead 업데이트
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
      // 새 Lead 생성
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
      lead: {
        id: lead.id,
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        status: lead.status,
        manager: lead.manager,
        agent: lead.agent,
        isCompanion: isCompanion || false,
      },
      user: {
        id: userId,
        name: customerName.trim(),
        phone: normalizedPhone,
        customerSource: 'cruise-guide',
        customerStatus: 'active',
      },
      message: isCompanion ? '동행인이 등록되었습니다. 비밀번호 3800으로 로그인할 수 있습니다.' : '고객이 등록되었습니다. 비밀번호 3800으로 로그인할 수 있습니다.',
    });
  } catch (error: any) {
    console.error('[Affiliate Customer Register] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '고객 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

