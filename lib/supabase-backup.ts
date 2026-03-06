/**
 * lib/supabase-backup.ts
 * Neon → Supabase 자동 백업 동기화
 * - daily-all 크론에서 매일 UTC 15:00 (KST 00:00) 실행
 * - 최근 48시간 이내 변경된 레코드만 증분 동기화
 */

import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const BACKUP_URL = process.env.SUPABASE_BACKUP_URL;

/** 백업 DB 클라이언트 (SUPABASE_BACKUP_URL 없으면 null) */
function getBackupClient(): PrismaClient | null {
  if (!BACKUP_URL) return null;
  return new PrismaClient({
    datasources: { db: { url: BACKUP_URL } },
  });
}

type SyncResult = {
  table: string;
  synced: number;
  skipped?: boolean;
  error?: string;
};

async function syncTable<T extends Record<string, unknown>>(
  name: string,
  rows: T[],
  upsertFn: (row: T) => Promise<unknown>
): Promise<SyncResult> {
  if (rows.length === 0) return { table: name, synced: 0 };
  let synced = 0;
  const errors: string[] = [];
  for (const row of rows) {
    try {
      await upsertFn(row);
      synced++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (errors.length > 0) {
    logger.warn(`[SupabaseBackup] ${name} 일부 실패`, { errors: errors.slice(0, 3) });
  }
  return { table: name, synced };
}

export async function runSupabaseBackup(): Promise<{ results: SyncResult[]; skipped: boolean }> {
  const backup = getBackupClient();
  if (!backup) {
    logger.warn('[SupabaseBackup] SUPABASE_BACKUP_URL 미설정 — 백업 건너뜀');
    return { results: [], skipped: true };
  }

  // 최근 48시간 이내 변경된 레코드만 동기화 (증분 백업)
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const results: SyncResult[] = [];

  try {
    // 1. User (최근 변경된 유저만)
    const users = await prisma.user.findMany({
      where: { updatedAt: { gte: since } },
    });
    results.push(await syncTable('User', users as Record<string, unknown>[], async (row) => {
      const { id, ...updateData } = row;
      await backup.user.upsert({
        where: { id: id as number },
        update: updateData as Parameters<typeof backup.user.update>[0]['data'],
        create: row as Parameters<typeof backup.user.create>[0]['data'],
      });
    }));

    // 2. CruiseProduct (상품)
    const products = await prisma.cruiseProduct.findMany({
      where: { updatedAt: { gte: since } },
    });
    results.push(await syncTable('CruiseProduct', products as Record<string, unknown>[], async (row) => {
      const { id, ...updateData } = row;
      await backup.cruiseProduct.upsert({
        where: { id: id as number },
        update: updateData as Parameters<typeof backup.cruiseProduct.update>[0]['data'],
        create: row as Parameters<typeof backup.cruiseProduct.create>[0]['data'],
      });
    }));

    // 3. MallProductContent (상품 상세 콘텐츠)
    const mallContents = await prisma.mallProductContent.findMany({
      where: { updatedAt: { gte: since } },
    });
    results.push(await syncTable('MallProductContent', mallContents as Record<string, unknown>[], async (row) => {
      const { id, ...updateData } = row;
      await backup.mallProductContent.upsert({
        where: { id: id as number },
        update: updateData as Parameters<typeof backup.mallProductContent.update>[0]['data'],
        create: row as Parameters<typeof backup.mallProductContent.create>[0]['data'],
      });
    }));

    // 4. Reservation (예약)
    const reservations = await prisma.reservation.findMany({
      where: { updatedAt: { gte: since } },
    });
    results.push(await syncTable('Reservation', reservations as Record<string, unknown>[], async (row) => {
      const { id, ...updateData } = row;
      await backup.reservation.upsert({
        where: { id: id as number },
        update: updateData as Parameters<typeof backup.reservation.update>[0]['data'],
        create: row as Parameters<typeof backup.reservation.create>[0]['data'],
      });
    }));

    // 5. Payment (결제)
    const payments = await prisma.payment.findMany({
      where: { updatedAt: { gte: since } },
    });
    results.push(await syncTable('Payment', payments as Record<string, unknown>[], async (row) => {
      const { id, ...updateData } = row;
      await backup.payment.upsert({
        where: { id: id as number },
        update: updateData as Parameters<typeof backup.payment.update>[0]['data'],
        create: row as Parameters<typeof backup.payment.create>[0]['data'],
      });
    }));

    // 6. AffiliateProfile (어필리에이트)
    const affiliates = await prisma.affiliateProfile.findMany({
      where: { updatedAt: { gte: since } },
    });
    results.push(await syncTable('AffiliateProfile', affiliates as Record<string, unknown>[], async (row) => {
      const { id, ...updateData } = row;
      await backup.affiliateProfile.upsert({
        where: { id: id as number },
        update: updateData as Parameters<typeof backup.affiliateProfile.update>[0]['data'],
        create: row as Parameters<typeof backup.affiliateProfile.create>[0]['data'],
      });
    }));

    // 7. Trip (여행)
    const trips = await prisma.trip.findMany({
      where: { updatedAt: { gte: since } },
    });
    results.push(await syncTable('Trip', trips as Record<string, unknown>[], async (row) => {
      const { id, ...updateData } = row;
      await backup.trip.upsert({
        where: { id: id as number },
        update: updateData as Parameters<typeof backup.trip.update>[0]['data'],
        create: row as Parameters<typeof backup.trip.create>[0]['data'],
      });
    }));

    // 8. UserTrip (유저 여행)
    const userTrips = await prisma.userTrip.findMany({
      where: { updatedAt: { gte: since } },
    });
    results.push(await syncTable('UserTrip', userTrips as Record<string, unknown>[], async (row) => {
      const { id, ...updateData } = row;
      await backup.userTrip.upsert({
        where: { id: id as number },
        update: updateData as Parameters<typeof backup.userTrip.update>[0]['data'],
        create: row as Parameters<typeof backup.userTrip.create>[0]['data'],
      });
    }));

    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
    logger.info('[SupabaseBackup] 백업 완료', {
      totalSynced,
      tables: results.map(r => `${r.table}:${r.synced}`).join(', '),
    });

    return { results, skipped: false };
  } catch (error) {
    logger.error('[SupabaseBackup] 백업 오류', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await backup.$disconnect();
  }
}
