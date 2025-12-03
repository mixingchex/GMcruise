export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

/**
 * GET /api/partner/dashboard/stats
 * 파트너(대리점장/판매원) 대시보드 통계 데이터
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 프로필 확인
    const profile = await prisma.affiliateProfile.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        userId: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ ok: false, error: 'Profile not found' }, { status: 404 });
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let stats: any = {
      profileType: profile.type,
    };

    // 대리점장인 경우
    if (profile.type === 'BRANCH_MANAGER') {
      // 1. 팀원 통계
      const teamRelations = await prisma.affiliateRelation.findMany({
        where: {
          managerId: profile.id,
          status: 'ACTIVE',
        },
        include: {
          AffiliateProfile_AffiliateRelation_agentIdToAffiliateProfile: {
            include: {
              User: { select: { isHibernated: true, isLocked: true } },
            },
          },
        },
      });

      const totalAgents = teamRelations.length;
      const activeAgents = teamRelations.filter(
        rel => !rel.AffiliateProfile_AffiliateRelation_agentIdToAffiliateProfile?.User?.isHibernated &&
          !rel.AffiliateProfile_AffiliateRelation_agentIdToAffiliateProfile?.User?.isLocked
      ).length;

      // 2. 팀 매출 통계 (본인 + 팀원)
      const teamProfileIds = [
        profile.id,
        ...teamRelations.map(rel => rel.agentId),
      ];

      const thisMonthTeamSales = await prisma.affiliateSale.aggregate({
        where: {
          managerId: profile.id,
          createdAt: { gte: thisMonthStart },
          status: { in: ['CONFIRMED', 'SETTLED'] },
        },
        _sum: { saleAmount: true },
        _count: { id: true },
      });

      const lastMonthTeamSales = await prisma.affiliateSale.aggregate({
        where: {
          managerId: profile.id,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          status: { in: ['CONFIRMED', 'SETTLED'] },
        },
        _sum: { saleAmount: true },
        _count: { id: true },
      });

      // 3. 개인 매출
      const thisMonthPersonalSales = await prisma.affiliateSale.aggregate({
        where: {
          agentId: profile.id,
          createdAt: { gte: thisMonthStart },
          status: { in: ['CONFIRMED', 'SETTLED'] },
        },
        _sum: { saleAmount: true },
        _count: { id: true },
      });

      // 4. 수수료 통계
      const thisMonthCommission = await prisma.commissionLedger.aggregate({
        where: {
          profileId: profile.id,
          createdAt: { gte: thisMonthStart },
          status: 'APPROVED',
        },
        _sum: { saleAmount: true },
      });

      const totalCommission = await prisma.commissionLedger.aggregate({
        where: {
          profileId: profile.id,
          status: 'APPROVED',
        },
        _sum: { saleAmount: true },
      });

      // 5. 고객 통계
      const totalCustomers = await prisma.affiliateLead.count({
        where: { managerId: profile.id },
      });

      const customersByStatus = await prisma.affiliateLead.groupBy({
        by: ['status'],
        where: { managerId: profile.id },
        _count: { id: true },
      });

      // 6. 팀원별 실적
      const agentPerformance = await Promise.all(
        teamRelations.map(async (rel) => {
          const agent = rel.AffiliateProfile_AffiliateRelation_agentIdToAffiliateProfile;
          const sales = await prisma.affiliateSale.aggregate({
            where: {
              agentId: agent?.id,
              createdAt: { gte: thisMonthStart },
              status: { in: ['CONFIRMED', 'SETTLED'] },
            },
            _sum: { saleAmount: true },
            _count: { id: true },
          });

          return {
            agentId: agent?.id,
            agentUserId: agent?.userId,
            salesCount: sales._count.id,
            salesAmount: sales._sum.saleAmount || 0,
          };
        })
      );

      stats.team = {
        agents: {
          total: totalAgents,
          active: activeAgents,
        },
        sales: {
          thisMonth: {
            total: {
              count: thisMonthTeamSales._count.id,
              amount: thisMonthTeamSales._sum.saleAmount || 0,
            },
            personal: {
              count: thisMonthPersonalSales._count.id,
              amount: thisMonthPersonalSales._sum.saleAmount || 0,
            },
          },
          lastMonth: {
            count: lastMonthTeamSales._count.id,
            amount: lastMonthTeamSales._sum.saleAmount || 0,
          },
        },
        performance: agentPerformance,
      };

      stats.commission = {
        thisMonth: thisMonthCommission._sum.amount || 0,
        total: totalCommission._sum.amount || 0,
      };

      stats.customers = {
        total: totalCustomers,
        byStatus: Object.fromEntries(
          customersByStatus.map(stat => [stat.status, stat._count.id])
        ),
      };
    }
    // 판매원인 경우
    else {
      // 1. 개인 매출 통계
      const thisMonthSales = await prisma.affiliateSale.aggregate({
        where: {
          agentId: profile.id,
          createdAt: { gte: thisMonthStart },
          status: { in: ['CONFIRMED', 'SETTLED'] },
        },
        _sum: { saleAmount: true },
        _count: { id: true },
      });

      const lastMonthSales = await prisma.affiliateSale.aggregate({
        where: {
          agentId: profile.id,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          status: { in: ['CONFIRMED', 'SETTLED'] },
        },
        _sum: { saleAmount: true },
        _count: { id: true },
      });

      const totalSales = await prisma.affiliateSale.aggregate({
        where: {
          agentId: profile.id,
          status: { in: ['CONFIRMED', 'SETTLED'] },
        },
        _sum: { saleAmount: true },
        _count: { id: true },
      });

      // 2. 수수료 통계
      const thisMonthCommission = await prisma.commissionLedger.aggregate({
        where: {
          profileId: profile.id,
          createdAt: { gte: thisMonthStart },
          status: 'APPROVED',
        },
        _sum: { saleAmount: true },
      });

      const totalCommission = await prisma.commissionLedger.aggregate({
        where: {
          profileId: profile.id,
          status: 'APPROVED',
        },
        _sum: { saleAmount: true },
      });

      // 3. 고객 통계
      const totalCustomers = await prisma.affiliateLead.count({
        where: { agentId: profile.id },
      });

      const customersByStatus = await prisma.affiliateLead.groupBy({
        by: ['status'],
        where: { agentId: profile.id },
        _count: { id: true },
      });

      // 4. 매니저 정보
      const managerRelation = await prisma.affiliateRelation.findFirst({
        where: {
          agentId: profile.id,
          status: 'ACTIVE',
        },
        include: {
          AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile: {
            include: {
              User: { select: { id: true, name: true } },
            },
          },
        },
      });

      stats.sales = {
        thisMonth: {
          count: thisMonthSales._count.id,
          amount: thisMonthSales._sum.saleAmount || 0,
        },
        lastMonth: {
          count: lastMonthSales._count.id,
          amount: lastMonthSales._sum.saleAmount || 0,
        },
        total: {
          count: totalSales._count.id,
          amount: totalSales._sum.saleAmount || 0,
        },
      };

      stats.commission = {
        thisMonth: thisMonthCommission._sum.amount || 0,
        total: totalCommission._sum.amount || 0,
      };

      stats.customers = {
        total: totalCustomers,
        byStatus: Object.fromEntries(
          customersByStatus.map(stat => [stat.status, stat._count.id])
        ),
      };

      stats.manager = managerRelation ? {
        userId: managerRelation.AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile?.User?.id,
        name: managerRelation.AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile?.User?.name,
      } : null;
    }

    // 공통: 지난 6개월 매출 추세
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    let monthlySales;

    if (profile.type === 'BRANCH_MANAGER') {
      monthlySales = await prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as month,
          COUNT(*) as count,
          SUM(saleAmount) as total
        FROM AffiliateSale
        WHERE managerId = ${profile.id}
          AND createdAt >= ${sixMonthsAgo}
          AND status IN ('CONFIRMED', 'SETTLED')
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month ASC
      `;
    } else {
      monthlySales = await prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as month,
          COUNT(*) as count,
          SUM(saleAmount) as total
        FROM AffiliateSale
        WHERE agentId = ${profile.id}
          AND createdAt >= ${sixMonthsAgo}
          AND status IN ('CONFIRMED', 'SETTLED')
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month ASC
      `;
    }

    stats.salesTrend = monthlySales;

    return NextResponse.json({
      ok: true,
      stats,
    });
  } catch (error: any) {
    console.error('[Partner Dashboard Stats] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
