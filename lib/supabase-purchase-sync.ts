/**
 * lib/supabase-purchase-sync.ts
 * 구매 완료 시 Supabase에 즉시 동기화
 *
 * 동기화 대상:
 *   - AffiliateProfile (판매원 + 대리점장) — 이름·소속·연락처
 *   - AffiliateSale (판매 실적 + 수당)
 *   - Payment (결제 정보)
 *
 * 호출 시점: webhook $transaction 완료 직후 (fire-and-forget)
 * 실패해도 결제 흐름에 영향 없음 — error 로그만 기록
 */

import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const BACKUP_URL = process.env.SUPABASE_BACKUP_URL;

function getBackupClient(): PrismaClient | null {
  if (!BACKUP_URL) return null;
  return new PrismaClient({ datasources: { db: { url: BACKUP_URL } } });
}

export type PurchaseSyncInput = {
  saleId: number;
  orderId: string; // Payment.orderId (= merchant_uid)
  managerId: number | null;
  agentId: number | null;
  leadId: number | null;
};

/**
 * 구매 완료 즉시 Supabase 동기화
 * 판매원, 대리점장, 본사명 포함 — 계약서·AI 가이드에서 활용
 */
export async function syncPurchaseToSupabase(input: PurchaseSyncInput): Promise<void> {
  const backup = getBackupClient();
  if (!backup) {
    logger.warn('[SupabasePurchaseSync] SUPABASE_BACKUP_URL 미설정 — 즉시 동기화 건너뜀');
    return;
  }

  const { saleId, orderId, managerId, agentId, leadId } = input;

  try {
    // ── 1. Neon에서 필요한 데이터 병렬 조회 ────────────────────────────────────
    const profileIds = [managerId, agentId].filter((id): id is number => id !== null);

    const [sale, payment, profiles, lead] = await Promise.all([
      prisma.affiliateSale.findUnique({
        where: { id: saleId },
      }),
      prisma.payment.findUnique({
        where: { orderId },
      }),
      profileIds.length > 0
        ? prisma.affiliateProfile.findMany({
            where: { id: { in: profileIds } },
            include: {
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  role: true,
                  onboarded: true,
                  mallNickname: true,
                  mallUserId: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      leadId
        ? prisma.affiliateLead.findUnique({ where: { id: leadId } })
        : Promise.resolve(null),
    ]);

    if (!sale || !payment) {
      logger.warn('[SupabasePurchaseSync] sale 또는 payment 없음 — 동기화 건너뜀', { saleId, orderId });
      return;
    }

    // ── 2. Supabase에 upsert (병렬 실행) ───────────────────────────────────────

    const upsertTasks: Promise<unknown>[] = [];

    // 2-A. AffiliateProfile (판매원 + 대리점장)
    for (const profile of profiles) {
      const { id, User, ...profileData } = profile as typeof profile & { User?: Record<string, unknown> };

      // User도 함께 upsert (이름·연락처가 계약서에 필요)
      if (User && typeof User === 'object' && 'id' in User) {
        const { id: userId, ...userData } = User as { id: number } & Record<string, unknown>;
        upsertTasks.push(
          backup.user
            .upsert({
              where: { id: userId },
              update: userData as Parameters<typeof backup.user.update>[0]['data'],
              create: { id: userId, ...userData } as Parameters<typeof backup.user.create>[0]['data'],
            })
            .catch((e: unknown) => {
              logger.warn('[SupabasePurchaseSync] User upsert 실패', { userId, error: String(e) });
            })
        );
      }

      upsertTasks.push(
        backup.affiliateProfile
          .upsert({
            where: { id },
            update: profileData as Parameters<typeof backup.affiliateProfile.update>[0]['data'],
            create: { id, ...profileData } as Parameters<typeof backup.affiliateProfile.create>[0]['data'],
          })
          .catch((e: unknown) => {
            logger.warn('[SupabasePurchaseSync] AffiliateProfile upsert 실패', { id, error: String(e) });
          })
      );
    }

    // 2-B. AffiliateLead
    if (lead) {
      const { id: leadDbId, ...leadData } = lead;
      upsertTasks.push(
        backup.affiliateLead
          .upsert({
            where: { id: leadDbId },
            update: leadData as Parameters<typeof backup.affiliateLead.update>[0]['data'],
            create: lead as Parameters<typeof backup.affiliateLead.create>[0]['data'],
          })
          .catch((e: unknown) => {
            logger.warn('[SupabasePurchaseSync] AffiliateLead upsert 실패', { leadId: leadDbId, error: String(e) });
          })
      );
    }

    // 2-C. AffiliateSale
    const { id: saleDbId, ...saleData } = sale;
    upsertTasks.push(
      backup.affiliateSale
        .upsert({
          where: { id: saleDbId },
          update: saleData as Parameters<typeof backup.affiliateSale.update>[0]['data'],
          create: sale as Parameters<typeof backup.affiliateSale.create>[0]['data'],
        })
        .catch((e: unknown) => {
          logger.warn('[SupabasePurchaseSync] AffiliateSale upsert 실패', { saleId: saleDbId, error: String(e) });
        })
    );

    // 2-D. Payment
    const { id: paymentDbId, ...paymentData } = payment;
    upsertTasks.push(
      backup.payment
        .upsert({
          where: { id: paymentDbId },
          update: paymentData as Parameters<typeof backup.payment.update>[0]['data'],
          create: payment as Parameters<typeof backup.payment.create>[0]['data'],
        })
        .catch((e: unknown) => {
          logger.warn('[SupabasePurchaseSync] Payment upsert 실패', { paymentId: paymentDbId, error: String(e) });
        })
    );

    await Promise.all(upsertTasks);

    // ── 3. 동기화 결과 로그 ────────────────────────────────────────────────────
    const agentProfile = profiles.find((p) => p.id === agentId);
    const managerProfile = profiles.find((p) => p.id === managerId);

    logger.info('[SupabasePurchaseSync] 구매고객 즉시 동기화 완료', {
      saleId,
      orderId,
      agent: agentProfile
        ? { id: agentId, name: agentProfile.displayName, code: agentProfile.affiliateCode }
        : null,
      manager: managerProfile
        ? { id: managerId, name: managerProfile.displayName, branch: managerProfile.branchLabel }
        : null,
    });
  } catch (err) {
    logger.error('[SupabasePurchaseSync] 동기화 실패 (결제는 정상 완료)', {
      saleId,
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    await backup.$disconnect();
  }
}
