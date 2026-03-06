export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Vercel Cron 보안: CRON_SECRET 헤더 검증 (timing-safe 비교)
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  const expected = `Bearer ${secret}`;
  if (authHeader.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // pending 상태이고 expiresAt이 지난 계약서를 expired로 전환
    const result = await prisma.travelContract.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: now, not: null },
      },
      data: { status: 'expired' },
    });

    logger.info('[CronContractExpire] 만료 계약서 처리 완료', {
      count: result.count,
      processedAt: now.toISOString(),
    });

    // 만료된 계약서가 있으면 ID 목록만 로그 (PII 제외)
    if (result.count > 0) {
      const expiredContracts = await prisma.travelContract.findMany({
        where: {
          status: 'expired',
          updatedAt: { gte: new Date(now.getTime() - 60_000) }, // 방금 처리된 것만
        },
        select: {
          id: true,
          reservationId: true,
        },
        take: 50,
      });

      logger.info('[CronContractExpire] 만료된 계약서 목록', {
        contracts: expiredContracts.map(c => ({
          id: c.id,
          reservationId: c.reservationId,
        })),
      });
    }

    return NextResponse.json({
      ok: true,
      expired: result.count,
      processedAt: now.toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[CronContractExpire] 처리 실패', { error: msg });
    return NextResponse.json({ ok: false, error: '처리 실패' }, { status: 500 });
  }
}
