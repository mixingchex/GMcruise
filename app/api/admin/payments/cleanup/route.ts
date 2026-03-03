export const dynamic = 'force-dynamic';

// app/api/admin/payments/cleanup/route.ts
// 장기 pending 결제 정리 API (WO-PROD-02)
// - 관리자 세션 인증 또는 INTERNAL_WEBHOOK_SECRET 헤더 인증
// - 30분 이상 pending 상태인 Payment를 failed로 전환 (Payment.status는 String, expired 없음)

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { log, error } from '@/lib/logger-wrapper';

const DEFAULT_THRESHOLD_MINUTES = 30;
const MIN_THRESHOLD_MINUTES = 10;
const MAX_THRESHOLD_MINUTES = 1440; // 24시간
const FAILURE_REASON_PREFIX = '결제 시간 초과';

async function verifyAccess(req: NextRequest): Promise<boolean> {
  // 방법 1: 관리자 세션
  const sessionUser = await getSessionUser();
  if (sessionUser?.role?.toLowerCase() === 'admin') return true;

  // 방법 2: INTERNAL_WEBHOOK_SECRET 헤더 (Vercel Cron 등 서버 간 호출)
  // timingSafeEqual로 타이밍 어택 방어
  const secret = process.env.INTERNAL_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = req.headers.get('x-internal-webhook-secret');
    if (headerSecret) {
      const a = Buffer.from(headerSecret);
      const b = Buffer.from(secret);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
  }

  return false;
}

/**
 * GET: 정리 대상 미리보기 (실제 DB 변경 없음)
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await verifyAccess(req))) {
      return NextResponse.json({ ok: false, error: '관리자 권한이 필요합니다.' }, { status: 401 });
    }

    const thresholdMs = DEFAULT_THRESHOLD_MINUTES * 60 * 1000;
    const thresholdDate = new Date(Date.now() - thresholdMs);

    const [targetCount, statusStats] = await Promise.all([
      prisma.payment.count({
        where: { status: 'pending', createdAt: { lt: thresholdDate } },
      }),
      prisma.payment.groupBy({
        by: ['status'],
        _count: true,
        orderBy: { _count: { status: 'desc' } },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      preview: {
        targetCount,
        thresholdMinutes: DEFAULT_THRESHOLD_MINUTES,
        thresholdDate: thresholdDate.toISOString(),
        action: `pending → failed (failureReason: ${FAILURE_REASON_PREFIX} ${DEFAULT_THRESHOLD_MINUTES}분)`,
      },
      currentStats: statusStats.map((s) => ({ status: s.status, count: s._count })),
    });
  } catch (err) {
    error('[Payment Cleanup] GET error:', err);
    return NextResponse.json({ ok: false, error: '조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * POST: 정리 실행
 * Body (선택):
 *   - thresholdMinutes: number (기본 30, 최소 10, 최대 1440)
 *   - dryRun: boolean (true면 대상 목록만 반환, DB 변경 없음)
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await verifyAccess(req))) {
      return NextResponse.json({ ok: false, error: '관리자 권한이 필요합니다.' }, { status: 401 });
    }

    let thresholdMinutes = DEFAULT_THRESHOLD_MINUTES;
    let dryRun = false;

    try {
      const body = await req.json();
      if (typeof body.thresholdMinutes === 'number' && Number.isFinite(body.thresholdMinutes)) {
        thresholdMinutes = Math.min(MAX_THRESHOLD_MINUTES, Math.max(MIN_THRESHOLD_MINUTES, body.thresholdMinutes));
      }
      if (typeof body.dryRun === 'boolean') {
        dryRun = body.dryRun;
      }
    } catch {
      // 바디 없음 — 기본값 사용
    }

    const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    const now = new Date();

    if (dryRun) {
      const [totalCount, targets] = await Promise.all([
        prisma.payment.count({
          where: { status: 'pending', createdAt: { lt: thresholdDate } },
        }),
        prisma.payment.findMany({
          where: { status: 'pending', createdAt: { lt: thresholdDate } },
          select: { id: true, orderId: true, amount: true, buyerName: true, productName: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 100,
        }),
      ]);

      return NextResponse.json({
        ok: true,
        dryRun: true,
        totalCount,
        previewCount: targets.length,
        thresholdMinutes,
        thresholdDate: thresholdDate.toISOString(),
        targets,
      });
    }

    // 실제 정리 실행 (atomic updateMany)
    const result = await prisma.payment.updateMany({
      where: {
        status: 'pending',
        createdAt: { lt: thresholdDate },
      },
      data: {
        status: 'failed',
        failedAt: now,
        failureReason: `${FAILURE_REASON_PREFIX} (${thresholdMinutes}분)`,
        updatedAt: now,
      },
    });

    log('[Payment Cleanup] 완료:', {
      updatedCount: result.count,
      thresholdMinutes,
      thresholdDate: thresholdDate.toISOString(),
    });

    const afterStats = await prisma.payment.groupBy({
      by: ['status'],
      _count: true,
      orderBy: { _count: { status: 'desc' } },
    });

    return NextResponse.json({
      ok: true,
      updatedCount: result.count,
      thresholdMinutes,
      thresholdDate: thresholdDate.toISOString(),
      executedAt: now.toISOString(),
      message: `정리 완료: ${result.count}건의 결제가 failed로 전환되었습니다.`,
      afterStats: afterStats.map((s) => ({ status: s.status, count: s._count })),
    });
  } catch (err) {
    error('[Payment Cleanup] POST error:', err);
    return NextResponse.json({ ok: false, error: '정리 실행 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
