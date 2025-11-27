export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePartnerContext } from '@/app/api/partner/_utils';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

/**
 * 대리점장이 정액제 판매원 계정 생성
 */
export async function POST(req: Request) {
  try {
    const { profile } = await requirePartnerContext();

    if (profile.type !== 'BRANCH_MANAGER') {
      return NextResponse.json({ ok: false, message: '대리점장만 계정을 생성할 수 있습니다.' }, { status: 403 });
    }

    const { name, phone, email } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ ok: false, message: '이름과 연락처는 필수입니다.' }, { status: 400 });
    }

    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    // 기존 사용자 확인
    let user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
      include: {
        AffiliateProfile: true,
      },
    });

    if (user) {
      // 기존 사용자가 이미 정액제 판매원인지 확인
      const existingContract = await prisma.affiliateContract.findFirst({
        where: {
          userId: user.id,
          metadata: {
            path: ['contractType'],
            equals: 'SUBSCRIPTION_AGENT',
          },
        },
      });

      if (existingContract) {
        return NextResponse.json({ ok: false, message: '이미 정액제 판매원 계정이 존재합니다.' }, { status: 400 });
      }
    } else {
      // 새 사용자 생성
      const mallUserId = `sub_${Date.now()}_${nanoid(6)}`;
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          phone: normalizedPhone,
          email: email?.trim() || null,
          mallUserId,
          password: 'qwe1', // 기본 비밀번호
        },
        include: {
          AffiliateProfile: true,
        },
      });
    }

    // AffiliateProfile 생성 또는 업데이트
    let affiliateProfile = user.AffiliateProfile;
    if (!affiliateProfile) {
      const affiliateCode = `SUB${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      affiliateProfile = await prisma.affiliateProfile.create({
        data: {
          userId: user.id,
          affiliateCode,
          type: 'SALES_AGENT',
          status: 'DRAFT',
          displayName: name.trim(),
        },
      });

      // 대리점장과의 관계 생성
      await prisma.affiliateRelation.create({
        data: {
          managerId: profile.id,
          agentId: affiliateProfile.id,
          status: 'ACTIVE',
          connectedAt: new Date(),
        },
      });
    }

    // 정액제 판매원 계약서 생성
    const now = new Date();
    const contract = await prisma.affiliateContract.create({
      data: {
        userId: user.id,
        name: name.trim(),
        phone: normalizedPhone,
        email: email?.trim() || null,
        residentId: '000000-0000000', // 임시값 (나중에 수정)
        address: '주소 미입력', // 임시값
        invitedByProfileId: profile.id,
        status: 'submitted',
        metadata: {
          contractType: 'SUBSCRIPTION_AGENT',
          createdBy: 'branch_manager',
          createdByProfileId: profile.id,
          manualEntry: true,
        },
        submittedAt: now,
        updatedAt: now,
      },
    });

    logger.log('[Partner Subscription Create]', {
      contractId: contract.id,
      userId: user.id,
      managerId: profile.id,
    });

    return NextResponse.json({
      ok: true,
      message: '정액제 판매원 계정이 생성되었습니다.',
      contract,
      user,
    });
  } catch (error: any) {
    logger.error('[Partner Subscription Create API] Error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || '계정 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

