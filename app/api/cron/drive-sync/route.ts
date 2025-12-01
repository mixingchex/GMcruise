import { NextRequest, NextResponse } from 'next/server';
import { syncContracts, syncDocuments, syncAllActiveTripsApis, syncLeads, syncSales, syncSettlements } from '@/lib/drive-sync';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout for Vercel Pro (adjust as needed)

export async function GET(req: NextRequest) {
    try {
        // 1. Check Authorization (Optional but recommended for Cron)
        // Vercel Cron sends a header `Authorization: Bearer <CRON_SECRET>`
        // For now, we'll allow it to run if called, or check a secret query param if needed.
        // User wants to trigger it from Admin Panel too.

        const { searchParams } = new URL(req.url);
        const manual = searchParams.get('manual') === 'true';

        // 2. Check System Config
        const backupEnabledConfig = await prisma.systemConfig.findUnique({
            where: { configKey: 'drive_backup_enabled' }
        });
        const backupEnabled = backupEnabledConfig?.configValue === 'true';

        if (!backupEnabled && !manual) {
            return NextResponse.json({ ok: true, message: 'Backup is disabled in settings.' });
        }

        // 3. Get Retention Settings
        const retentionConfig = await prisma.systemConfig.findUnique({
            where: { configKey: 'drive_backup_retention_days' }
        });
        const retentionDays = retentionConfig?.configValue ? parseInt(retentionConfig.configValue) : 30;

        logger.log('[Cron] Starting Drive Sync...');

        // 4. Run Sync
        await Promise.all([
            syncContracts({ cleanup: true, retentionDays }),
            syncDocuments({ cleanup: true, retentionDays }),
            syncAllActiveTripsApis(),
            syncLeads(),
            syncSales(),
            syncSettlements()
        ]);

        logger.log('[Cron] Drive Sync Completed.');

        return NextResponse.json({
            ok: true,
            message: 'Drive Sync Completed',
            settings: {
                enabled: backupEnabled,
                retentionDays
            }
        });

    } catch (error: any) {
        logger.error('[Cron] Drive Sync Failed:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
