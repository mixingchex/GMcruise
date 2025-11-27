// scripts/update-dashboard-stats.ts
// 대시보드 통계 데이터 사전 계산 및 저장 스크립트
// 매 시간마다 실행하여 통계 데이터를 미리 계산하여 저장

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

async function updateDashboardStats() {
  try {
    logger.log('[Dashboard Stats] 통계 데이터 계산 시작');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. 사용자 통계
    const [
      totalUsers,
      activeUsers,
      hibernatedUsers,
      genieUsers,
      mallUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isHibernated: false } }),
      prisma.user.count({ where: { isHibernated: true } }),
      prisma.user.count({ where: { role: 'user' } }),
      prisma.user.count({ where: { role: 'community' } }),
    ]);

    // 2. 여행 통계
    const totalTrips = await prisma.trip.count();
    const tripsByStatus = await prisma.trip.groupBy({
      by: ['status'],
      _count: true,
    });
    const upcomingTrips = tripsByStatus.find(s => s.status === 'Upcoming')?._count || 0;
    const inProgressTrips = tripsByStatus.find(s => s.status === 'InProgress')?._count || 0;
    const completedTrips = tripsByStatus.find(s => s.status === 'Completed')?._count || 0;

    // 3. 만족도 통계
    const reviewStats = await prisma.cruiseReview.aggregate({
      _avg: { rating: true },
      _count: { id: true },
      where: {
        isApproved: true,
        isDeleted: false,
      },
    });
    const avgSatisfaction = reviewStats._avg.rating || 0;
    const reviewCount = reviewStats._count.id || 0;

    // 4. 알림 통계
    const totalNotifications = await prisma.notificationLog.count();

    // 5. 상품 통계
    const totalProducts = await prisma.cruiseProduct.count();

    // 6. PWA 설치 통계
    const [
      pwaGenieInstalled,
      pwaMallInstalled,
      pwaBothInstalled,
    ] = await Promise.all([
      prisma.user.count({ where: { pwaGenieInstalledAt: { not: null } } }),
      prisma.user.count({ where: { pwaMallInstalledAt: { not: null } } }),
      prisma.user.count({
        where: {
          pwaGenieInstalledAt: { not: null },
          pwaMallInstalledAt: { not: null },
        },
      }),
    ]);

    // 7. 어필리에이트 통계
    const [
      totalBranchManagers,
      totalSalesAgents,
      totalAffiliateLeads,
      salesStats,
      commissionStats,
    ] = await Promise.all([
      prisma.affiliateProfile.count({
        where: { type: 'BRANCH_MANAGER', status: 'ACTIVE' },
      }),
      prisma.affiliateProfile.count({
        where: { type: 'SALES_AGENT', status: 'ACTIVE' },
      }),
      prisma.affiliateLead.count(),
      prisma.affiliateSale.aggregate({
        _count: { id: true },
        _sum: { saleAmount: true },
      }),
      prisma.commissionLedger.groupBy({
        by: ['isSettled'],
        _sum: { amount: true },
      }),
    ]);

    const totalAffiliateSales = salesStats._count.id || 0;
    const totalAffiliateSalesAmount = salesStats._sum.saleAmount || 0;
    const totalCommissionPending = commissionStats.find(s => s.isSettled === false)?._sum.amount || 0;
    const totalCommissionSettled = commissionStats.find(s => s.isSettled === true)?._sum.amount || 0;

    // 8. 최근 7일 트렌드 데이터
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyUsersRaw = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT 
        DATE_TRUNC('day', "createdAt")::date as date,
        COUNT(*)::int as count
      FROM "User"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;

    const dailyTripsRaw = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT 
        DATE_TRUNC('day', "createdAt")::date as date,
        COUNT(*)::int as count
      FROM "Trip"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;

    const dailyUsers = dailyUsersRaw.map(d => ({
      date: d.date.toISOString().split('T')[0],
      count: Number(d.count),
    }));

    const dailyTrips = dailyTripsRaw.map(d => ({
      date: d.date.toISOString().split('T')[0],
      count: Number(d.count),
    }));

    const trendData: Array<{ date: string; users: number; trips: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      
      const userCount = dailyUsers.find(d => d.date === dateStr)?.count || 0;
      const tripCount = dailyTrips.find(d => d.date === dateStr)?.count || 0;
      
      trendData.push({
        date: dateStr,
        users: userCount,
        trips: tripCount,
      });
    }

    // 9. 상품 조회 통계 (간소화)
    const productViews = await prisma.productView.findMany({
      take: 1000, // 샘플링 (성능 최적화)
      select: {
        CruiseProduct: {
          select: {
            cruiseLine: true,
            shipName: true,
            itineraryPattern: true,
          },
        },
      },
    });

    const COUNTRY_CODE_TO_NAME: Record<string, string> = {
      'JP': '일본', 'KR': '한국', 'TH': '태국', 'VN': '베트남',
      'MY': '말레이시아', 'SG': '싱가포르', 'ES': '스페인',
      'FR': '프랑스', 'IT': '이탈리아', 'GR': '그리스',
      'TR': '터키', 'US': '미국', 'CN': '중국', 'TW': '대만',
      'HK': '홍콩', 'PH': '필리핀', 'ID': '인도네시아',
    };

    const cruiseViewCounts = new Map<string, number>();
    const countryViewCounts = new Map<string, number>();

    productViews.forEach(view => {
      if (view.CruiseProduct) {
        const cruiseName = `${view.CruiseProduct.cruiseLine} ${view.CruiseProduct.shipName}`.trim();
        cruiseViewCounts.set(cruiseName, (cruiseViewCounts.get(cruiseName) || 0) + 1);
      }

      if (view.CruiseProduct?.itineraryPattern) {
        const pattern = view.CruiseProduct.itineraryPattern;
        const countries = new Set<string>();
        
        if (pattern.destination && Array.isArray(pattern.destination)) {
          pattern.destination.forEach((dest: string) => {
            if (dest && typeof dest === 'string') {
              const countryName = dest.split(' - ')[0].split(',')[0].trim();
              if (countryName) countries.add(countryName);
            }
          });
        }
        
        if (Array.isArray(pattern)) {
          pattern.forEach((day: any) => {
            if (day && day.country) {
              const countryCode = day.country;
              const countryName = COUNTRY_CODE_TO_NAME[countryCode] || countryCode;
              if (countryCode !== 'KR') {
                countries.add(countryName);
              }
            }
          });
        }
        
        countries.forEach(country => {
          countryViewCounts.set(country, (countryViewCounts.get(country) || 0) + 1);
        });
      }
    });

    const topCruises = Array.from(cruiseViewCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const topCountries = Array.from(countryViewCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const productViewsData = {
      topCruises,
      topCountries,
    };

    // 통계 데이터 저장 또는 업데이트
    await prisma.dashboardStats.upsert({
      where: { date: today },
      update: {
        totalUsers,
        activeUsers,
        hibernatedUsers,
        genieUsers,
        mallUsers,
        totalTrips,
        upcomingTrips,
        inProgressTrips,
        completedTrips,
        avgSatisfaction,
        reviewCount,
        totalNotifications,
        totalProducts,
        pwaGenieInstalled,
        pwaMallInstalled,
        pwaBothInstalled,
        totalBranchManagers,
        totalSalesAgents,
        totalAffiliateLeads,
        totalAffiliateSales,
        totalAffiliateSalesAmount,
        totalCommissionPending,
        totalCommissionSettled,
        trends: trendData as any,
        productViews: productViewsData as any,
        updatedAt: now,
      },
      create: {
        date: today,
        totalUsers,
        activeUsers,
        hibernatedUsers,
        genieUsers,
        mallUsers,
        totalTrips,
        upcomingTrips,
        inProgressTrips,
        completedTrips,
        avgSatisfaction,
        reviewCount,
        totalNotifications,
        totalProducts,
        pwaGenieInstalled,
        pwaMallInstalled,
        pwaBothInstalled,
        totalBranchManagers,
        totalSalesAgents,
        totalAffiliateLeads,
        totalAffiliateSales,
        totalAffiliateSalesAmount,
        totalCommissionPending,
        totalCommissionSettled,
        trends: trendData as any,
        productViews: productViewsData as any,
      },
    });

    logger.log('[Dashboard Stats] 통계 데이터 저장 완료', {
      date: today.toISOString(),
      totalUsers,
      totalTrips,
    });

  } catch (error) {
    logger.error('[Dashboard Stats] 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  updateDashboardStats()
    .then(() => {
      logger.log('[Dashboard Stats] 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[Dashboard Stats] 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { updateDashboardStats };

