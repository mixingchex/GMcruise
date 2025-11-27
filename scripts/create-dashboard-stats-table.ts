// scripts/create-dashboard-stats-table.ts
// DashboardStats 테이블 생성 스크립트

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

async function createDashboardStatsTable() {
  try {
    logger.log('[Create DashboardStats] 테이블 생성 시작');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DashboardStats" (
        "id" SERIAL NOT NULL,
        "date" TIMESTAMP(3) NOT NULL,
        "totalUsers" INTEGER NOT NULL DEFAULT 0,
        "activeUsers" INTEGER NOT NULL DEFAULT 0,
        "hibernatedUsers" INTEGER NOT NULL DEFAULT 0,
        "genieUsers" INTEGER NOT NULL DEFAULT 0,
        "mallUsers" INTEGER NOT NULL DEFAULT 0,
        "totalTrips" INTEGER NOT NULL DEFAULT 0,
        "upcomingTrips" INTEGER NOT NULL DEFAULT 0,
        "inProgressTrips" INTEGER NOT NULL DEFAULT 0,
        "completedTrips" INTEGER NOT NULL DEFAULT 0,
        "avgSatisfaction" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "reviewCount" INTEGER NOT NULL DEFAULT 0,
        "totalNotifications" INTEGER NOT NULL DEFAULT 0,
        "totalProducts" INTEGER NOT NULL DEFAULT 0,
        "pwaGenieInstalled" INTEGER NOT NULL DEFAULT 0,
        "pwaMallInstalled" INTEGER NOT NULL DEFAULT 0,
        "pwaBothInstalled" INTEGER NOT NULL DEFAULT 0,
        "totalBranchManagers" INTEGER NOT NULL DEFAULT 0,
        "totalSalesAgents" INTEGER NOT NULL DEFAULT 0,
        "totalAffiliateLeads" INTEGER NOT NULL DEFAULT 0,
        "totalAffiliateSales" INTEGER NOT NULL DEFAULT 0,
        "totalAffiliateSalesAmount" INTEGER NOT NULL DEFAULT 0,
        "totalCommissionPending" INTEGER NOT NULL DEFAULT 0,
        "totalCommissionSettled" INTEGER NOT NULL DEFAULT 0,
        "trends" JSONB,
        "productViews" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "DashboardStats_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "DashboardStats_date_key" ON "DashboardStats"("date")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "DashboardStats_date_idx" ON "DashboardStats"("date")
    `);

    logger.log('[Create DashboardStats] 테이블 생성 완료');

  } catch (error: any) {
    if (error.message?.includes('already exists') || error.code === '42P07') {
      logger.log('[Create DashboardStats] 테이블이 이미 존재합니다');
    } else {
      logger.error('[Create DashboardStats] 오류:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  createDashboardStatsTable()
    .then(() => {
      logger.log('[Create DashboardStats] 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[Create DashboardStats] 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { createDashboardStatsTable };


