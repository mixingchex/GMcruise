export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSubscriptionInfo } from '@/lib/subscription-limits';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const subscriptionInfo = await getSubscriptionInfo(sessionUser.id);

    return NextResponse.json({
      ok: true,
      subscription: subscriptionInfo ? {
        isTrial: subscriptionInfo.isTrial,
        status: subscriptionInfo.status,
        trialEndDate: subscriptionInfo.trialEndDate?.toISOString() || null,
        endDate: subscriptionInfo.endDate?.toISOString() || null,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || '구독 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

