export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

/**
 * 테스트 정액제 판매원 계정 생성 (gest1, gest2, ...)
 */
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
    }

    const { count = 1 } = await req.json();

    const createdUsers = [];

    for (let i = 0; i < count; i++) {
      // 기존 gest 계정 중 가장 큰 번호 찾기
      const existingGestUsers = await prisma.user.findMany({
        where: {
          mallUserId: {
            startsWith: 'gest',
          },
        },
        orderBy: {
          mallUserId: 'desc',
        },
        take: 1,
      });

      let nextNumber = 1;
      if (existingGestUsers.length > 0) {
        const lastUserId = existingGestUsers[0].mallUserId;
        const match = lastUserId.match(/gest(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const mallUserId = `gest${nextNumber}`;
      const phone = `0100000${String(nextNumber).padStart(4, '0')}`;
      const name = `테스트${nextNumber}`;

      // 사용자 생성
      const user = await prisma.user.create({
        data: {
          name,
          phone,
          mallUserId,
          password: 'zxc1', // 초기 비밀번호
        },
      });

      // AffiliateProfile 생성
      const affiliateCode = `TEST${nextNumber}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const affiliateProfile = await prisma.affiliateProfile.create({
        data: {
          userId: user.id,
          affiliateCode,
          type: 'SALES_AGENT',
          status: 'DRAFT',
          displayName: name,
        },
      });

      // 정액제 판매원 계약서 생성 (무료 체험 시작)
      const trialStartDate = new Date();
      const trialEndDate = new Date(trialStartDate);
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7일 무료 체험

      const subscriptionStartDate = new Date(trialEndDate);
      const subscriptionEndDate = new Date(subscriptionStartDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // 1개월 정액제

      const now = new Date();
      const contract = await prisma.affiliateContract.create({
        data: {
          userId: user.id,
          name,
          phone,
          residentId: '000000-0000000',
          address: '테스트 주소',
          status: 'submitted',
          contractStartDate: trialStartDate,
          contractEndDate: subscriptionEndDate,
          metadata: {
            contractType: 'SUBSCRIPTION_AGENT',
            createdBy: 'admin',
            createdByUserId: sessionUser.id,
            manualEntry: true,
            isTrial: true,
            trialStartDate: trialStartDate.toISOString(),
            trialEndDate: trialEndDate.toISOString(),
            subscriptionStartDate: subscriptionStartDate.toISOString(),
            subscriptionEndDate: subscriptionEndDate.toISOString(),
            nextBillingDate: trialEndDate.toISOString(),
            paymentAmount: 100000,
            paymentRequired: true,
            testAccount: true,
          },
          submittedAt: now,
          updatedAt: now,
        },
      });

      createdUsers.push({
        id: user.id,
        mallUserId: user.mallUserId,
        name: user.name,
        phone: user.phone,
        password: 'zxc1',
        contractId: contract.id,
      });

      logger.log('[Admin Subscription Create Test]', {
        userId: user.id,
        mallUserId: user.mallUserId,
        contractId: contract.id,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `${count}개의 테스트 계정이 생성되었습니다.`,
      users: createdUsers,
    });
  } catch (error: any) {
    logger.error('[Admin Subscription Create Test API] Error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || '테스트 계정 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

