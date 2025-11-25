export const dynamic = 'force-dynamic';

// app/api/admin/dashboard/route.ts
// 관리자 대시보드 통계 API

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인
async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) {
    console.log('[Admin Dashboard] No session ID');
    return false;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { role: true },
        },
      },
    });

    if (!session) {
      console.log('[Admin Dashboard] Session not found:', sid?.substring(0, 10) + '...');
      return false;
    }

    if (!session.User) {
      console.log('[Admin Dashboard] User not found in session:', { sessionId: session.id, userId: session.userId });
      return false;
    }

    const isAdmin = session.User.role === 'admin';
    console.log('[Admin Dashboard] Auth check:', { userId: session.userId, role: session.User.role, isAdmin });
    return isAdmin;
  } catch (error: any) {
    console.error('[Admin Dashboard] Auth check error:', error);
    console.error('[Admin Dashboard] Auth check error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return false;
  }
}

export async function GET() {
  try {
    // 관리자 권한 확인
    const sid = cookies().get(SESSION_COOKIE)?.value;
    
    if (!sid) {
      console.log('[Admin Dashboard] No session cookie found');
      return NextResponse.json({ 
        ok: false, 
        error: '인증이 필요합니다. 다시 로그인해 주세요.',
        details: 'No session cookie'
      }, { status: 403 });
    }

    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      console.log('[Admin Dashboard] Admin check failed for session:', sid);
      return NextResponse.json({ 
        ok: false, 
        error: '인증이 필요합니다. 다시 로그인해 주세요.',
        details: 'Admin check failed'
      }, { status: 403 });
    }

    // 1. 사용자 통계 (전체 - 크루즈몰 + 지니AI 가이드)
    let totalUsers = 0;
    let activeUsers = 0;
    let hibernatedUsers = 0;
    let genieUsers = 0;
    let mallUsers = 0;
    
    try {
      totalUsers = await prisma.user.count();
      activeUsers = await prisma.user.count({
        where: { isHibernated: false },
      });
      hibernatedUsers = await prisma.user.count({
        where: { isHibernated: true },
      });
      genieUsers = await prisma.user.count({
        where: { role: 'user' },
      });
      mallUsers = await prisma.user.count({
        where: { role: 'community' },
      });
    } catch (userError: any) {
      console.error('[Admin Dashboard] User stats error:', userError);
      console.error('[Admin Dashboard] User stats error details:', {
        message: userError?.message,
        code: userError?.code,
        meta: userError?.meta,
      });
    }

    // 2. 여행 통계
    let totalTrips = 0;
    let upcomingTrips = 0;
    let inProgressTrips = 0;
    let completedTrips = 0;
    let currentTrips: any[] = [];
    
    try {
      totalTrips = await prisma.trip.count();
      const tripsByStatus = await prisma.trip.groupBy({
        by: ['status'],
        _count: true,
      });
      upcomingTrips = tripsByStatus.find(s => s.status === 'Upcoming')?._count || 0;
      inProgressTrips = tripsByStatus.find(s => s.status === 'InProgress')?._count || 0;
      completedTrips = tripsByStatus.find(s => s.status === 'Completed')?._count || 0;
      
      // 현재 진행 중인 여행 (최대 10개만)
      currentTrips = await prisma.trip.findMany({
        where: { status: 'InProgress' },
        take: 10, // 성능 최적화: 최대 10개만 가져오기
        select: {
          id: true,
          cruiseName: true,
          startDate: true,
          endDate: true,
          destination: true,
          User: {
            select: { name: true, phone: true },
          },
        },
        orderBy: {
          startDate: 'asc',
        },
      });
    } catch (tripError: any) {
      console.error('[Admin Dashboard] Trip stats error:', tripError);
      console.error('[Admin Dashboard] Trip stats error details:', {
        message: tripError?.message,
        code: tripError?.code,
        meta: tripError?.meta,
      });
    }

    // 4. 만족도 평균 (크루즈몰 후기 - CruiseReview)
    let avgSatisfaction = 0;
    let reviewCount = 0;
    let recentFeedback: any[] = [];
    
    try {
      const reviewStats = await prisma.cruiseReview.aggregate({
        _avg: {
          rating: true,
        },
        _count: {
          id: true,
        },
        where: {
          isApproved: true,
          isDeleted: false,
        },
      });
      avgSatisfaction = reviewStats._avg.rating || 0;
      reviewCount = reviewStats._count.id || 0;
      
      recentFeedback = await prisma.cruiseReview.findMany({
        take: 5,
        where: {
          isApproved: true,
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          rating: true,
          title: true,
          content: true,
          cruiseLine: true,
          shipName: true,
          createdAt: true,
        },
      });
    } catch (reviewError: any) {
      console.error('[Admin Dashboard] Review stats error:', reviewError);
      console.error('[Admin Dashboard] Review stats error details:', {
        message: reviewError?.message,
        code: reviewError?.code,
        meta: reviewError?.meta,
      });
    }

    // 6. 알림 통계
    let notificationStats: any[] = [];
    let totalNotifications = 0;
    
    try {
      notificationStats = await prisma.notificationLog.groupBy({
        by: ['notificationType'],
        _count: true,
      });
      totalNotifications = await prisma.notificationLog.count();
    } catch (notificationError: any) {
      console.error('[Admin Dashboard] Notification stats error:', notificationError);
      console.error('[Admin Dashboard] Notification stats error details:', {
        message: notificationError?.message,
        code: notificationError?.code,
        meta: notificationError?.meta,
      });
    }

    // 8. 크루즈 상품 통계
    let totalProducts = 0;
    try {
      totalProducts = await prisma.cruiseProduct.count();
    } catch (productError: any) {
      console.error('[Admin Dashboard] Product count error:', productError);
    }

    // 9. PWA 설치 통계
    let pwaGenieInstalled = 0;
    let pwaMallInstalled = 0;
    let pwaBothInstalled = 0;
    
    try {
      pwaGenieInstalled = await prisma.user.count({
        where: { pwaGenieInstalledAt: { not: null } },
      });
      pwaMallInstalled = await prisma.user.count({
        where: { pwaMallInstalledAt: { not: null } },
      });
      pwaBothInstalled = await prisma.user.count({
        where: {
          pwaGenieInstalledAt: { not: null },
          pwaMallInstalledAt: { not: null },
        },
      });
    } catch (pwaError: any) {
      console.error('[Admin Dashboard] PWA stats error:', pwaError);
    }

    // 9. 최근 7일 트렌드 데이터 (일별)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 일별 사용자 가입 수 (SQLite 호환)
    let dailyUsers: Array<{ date: string; count: number }> = [];
    let dailyTrips: Array<{ date: string; count: number }> = [];
    
    try {
      const dailyUsersRaw = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          date(createdAt) as date,
          COUNT(*) as count
        FROM User
        WHERE createdAt >= ${sevenDaysAgo}
        GROUP BY date(createdAt)
        ORDER BY date ASC
      `;
      dailyUsers = dailyUsersRaw.map(d => ({
        date: d.date,
        count: Number(d.count),
      }));
    } catch (dailyUsersError: any) {
      console.error('[Admin Dashboard] Daily users query error:', dailyUsersError);
    }

    // 일별 여행 등록 수 (SQLite 호환)
    try {
      const dailyTripsRaw = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          date(createdAt) as date,
          COUNT(*) as count
        FROM Trip
        WHERE createdAt >= ${sevenDaysAgo}
        GROUP BY date(createdAt)
        ORDER BY date ASC
      `;
      dailyTrips = dailyTripsRaw.map(d => ({
        date: d.date,
        count: Number(d.count),
      }));
    } catch (dailyTripsError: any) {
      console.error('[Admin Dashboard] Daily trips query error:', dailyTripsError);
    }

    // 일별 통합 데이터 생성
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

    // 10. 상품 조회 통계 (크루즈별, 국가별) - 최적화: 필요한 필드만 선택
    let productViews: any[] = [];
    try {
      productViews = await prisma.productView.findMany({
        select: {
          id: true,
          CruiseProduct: {
            select: {
              cruiseLine: true,
              shipName: true,
              itineraryPattern: true,
            },
          },
        },
      });
    } catch (productViewError: any) {
      console.error('[Admin Dashboard] Product views query error:', productViewError);
    }

    // 국가 코드 -> 국가명 매핑
    const COUNTRY_CODE_TO_NAME: Record<string, string> = {
      'JP': '일본',
      'KR': '한국',
      'TH': '태국',
      'VN': '베트남',
      'MY': '말레이시아',
      'SG': '싱가포르',
      'ES': '스페인',
      'FR': '프랑스',
      'IT': '이탈리아',
      'GR': '그리스',
      'TR': '터키',
      'US': '미국',
      'CN': '중국',
      'TW': '대만',
      'HK': '홍콩',
      'PH': '필리핀',
      'ID': '인도네시아',
    };

    // 크루즈별 조회 수 집계
    const cruiseViewCounts = new Map<string, number>();
    productViews.forEach(view => {
      if (view.CruiseProduct) {
        const cruiseName = `${view.CruiseProduct.cruiseLine} ${view.CruiseProduct.shipName}`.trim();
        cruiseViewCounts.set(cruiseName, (cruiseViewCounts.get(cruiseName) || 0) + 1);
      }
    });

    // 국가별 조회 수 집계
    const countryViewCounts = new Map<string, number>();
    productViews.forEach(view => {
      if (view.CruiseProduct?.itineraryPattern) {
        const pattern = view.CruiseProduct.itineraryPattern;
        const countries = new Set<string>();
        
        // destination 필드가 있는 경우
        if (pattern.destination && Array.isArray(pattern.destination)) {
          pattern.destination.forEach((dest: string) => {
            if (dest && typeof dest === 'string') {
              const countryName = dest.split(' - ')[0].split(',')[0].trim();
              if (countryName) countries.add(countryName);
            }
          });
        }
        
        // itineraryPattern이 배열인 경우
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

    // 상위 10개 크루즈
    const topCruises = Array.from(cruiseViewCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 상위 10개 국가
    const topCountries = Array.from(countryViewCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 11. 어필리에이트 통계
    let totalBranchManagers = 0;
    let totalSalesAgents = 0;
    let totalAffiliateLeads = 0;
    let totalAffiliateSales = 0;
    let totalAffiliateSalesAmount = 0;
    let totalCommissionPending = 0;
    let totalCommissionSettled = 0;
    let recentAffiliateSales: any[] = [];

    try {
      // 대리점장 수
      totalBranchManagers = await prisma.affiliateProfile.count({
        where: { type: 'BRANCH_MANAGER', status: 'ACTIVE' },
      });

      // 판매원 수
      totalSalesAgents = await prisma.affiliateProfile.count({
        where: { type: 'SALES_AGENT', status: 'ACTIVE' },
      });

      // 총 리드 수
      totalAffiliateLeads = await prisma.affiliateLead.count();

      // 총 판매 건수 및 매출액
      const salesStats = await prisma.affiliateSale.aggregate({
        _count: { id: true },
        _sum: { saleAmount: true },
      });
      totalAffiliateSales = salesStats._count.id || 0;
      totalAffiliateSalesAmount = salesStats._sum.saleAmount || 0;

      // 총 수당 (정산 대기 / 정산 완료)
      const commissionStats = await prisma.commissionLedger.groupBy({
        by: ['isSettled'],
        _sum: { amount: true },
      });
      totalCommissionPending = commissionStats.find(s => s.isSettled === false)?._sum.amount || 0;
      totalCommissionSettled = commissionStats.find(s => s.isSettled === true)?._sum.amount || 0;

      // 최근 판매 5건 - 최적화: 필요한 필드만 선택
      recentAffiliateSales = await prisma.affiliateSale.findMany({
        take: 5,
        orderBy: { saleDate: 'desc' },
        select: {
          id: true,
          productCode: true,
          saleAmount: true,
          saleDate: true,
          status: true,
          AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
            select: { displayName: true, nickname: true },
          },
          AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile: {
            select: { displayName: true, nickname: true },
          },
        },
      });
    } catch (affiliateError: any) {
      console.error('[Admin Dashboard] Affiliate stats error:', affiliateError);
      console.error('[Admin Dashboard] Affiliate stats error details:', {
        message: affiliateError?.message,
        code: affiliateError?.code,
        meta: affiliateError?.meta,
      });
    }

    return NextResponse.json({
      ok: true,
      dashboard: {
        users: {
          total: totalUsers, // 전체 (크루즈몰 + 지니AI 가이드)
          active: activeUsers,
          hibernated: hibernatedUsers,
          genieUsers: genieUsers, // 지니AI 가이드 사용자 수
          mallUsers: mallUsers, // 크루즈몰 사용자 수
          source: 'all', // 전체 출처 명시
        },
        trips: {
          total: totalTrips,
          upcoming: upcomingTrips,
          inProgress: inProgressTrips,
          completed: completedTrips,
          source: 'genie', // 지니AI 가이드 출처 명시
        },
        currentTrips: currentTrips.map(trip => ({
          id: trip.id,
          cruiseName: trip.cruiseName,
          userName: trip.User?.name || 'Unknown',  // ✅ null 체크 추가
          userPhone: trip.User?.phone || '',  // ✅ null 체크 추가
          startDate: trip.startDate,
          endDate: trip.endDate,
          destination: trip.destination,
        })),
        satisfaction: {
          average: avgSatisfaction ? Math.round(avgSatisfaction * 10) / 10 : 0,
          count: reviewCount,
          source: 'mall', // 크루즈몰 출처 명시
          recentFeedback: recentFeedback.map(review => ({
            id: review.id,
            tripId: null,
            cruiseName: review.cruiseLine && review.shipName 
              ? `${review.cruiseLine} ${review.shipName}` 
              : review.cruiseLine || review.shipName || 'Unknown',
            score: review.rating,
            comments: review.content,
            createdAt: review.createdAt,
          })),
        },
        notifications: {
          total: totalNotifications,
          byType: notificationStats.map(stat => ({
            type: stat.notificationType,
            count: stat._count,
          })),
        },
        pushSubscriptions: mallUsers, // 크루즈몰 가입 인원
        pushSubscriptionsSource: 'mall', // 크루즈몰 출처 명시
        products: totalProducts,
        trends: trendData,
        productViews: {
          topCruises,
          topCountries,
          source: 'mall', // 크루즈몰 출처 명시
        },
        pwaInstalls: {
          genie: pwaGenieInstalled, // 크루즈가이드 지니 바탕화면 추가 수
          mall: pwaMallInstalled, // 크루즈몰 바탕화면 추가 수
          both: pwaBothInstalled, // 둘 다 추가한 사용자 수
        },
        affiliate: {
          branchManagers: totalBranchManagers, // 총 대리점장 수
          salesAgents: totalSalesAgents, // 총 판매원 수
          totalPartners: totalBranchManagers + totalSalesAgents, // 총 파트너 수
          leads: totalAffiliateLeads, // 총 리드 수
          sales: {
            count: totalAffiliateSales, // 총 판매 건수
            amount: totalAffiliateSalesAmount, // 총 매출액
          },
          commission: {
            pending: totalCommissionPending, // 정산 대기 수당
            settled: totalCommissionSettled, // 정산 완료 수당
            total: totalCommissionPending + totalCommissionSettled, // 총 수당
          },
          recentSales: recentAffiliateSales.map(sale => ({
            id: sale.id,
            productCode: sale.productCode,
            saleAmount: sale.saleAmount,
            saleDate: sale.saleDate,
            agentName: sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.displayName
              || sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.nickname
              || '판매원',
            managerName: sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile?.displayName
              || sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile?.nickname
              || '대리점장',
            status: sale.status,
          })),
        },
      },
    });
  } catch (error) {
    console.error('[Admin Dashboard API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Admin Dashboard API] Error details:', {
      message: errorMessage,
      stack: errorStack,
    });
    return NextResponse.json(
      { ok: false, error: errorMessage, details: process.env.NODE_ENV === 'development' ? errorStack : undefined },
      { status: 500 }
    );
  }
}
