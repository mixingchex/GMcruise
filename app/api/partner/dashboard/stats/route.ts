import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerContext } from '@/app/api/partner/_utils';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { profile } = await requirePartnerContext();
    
    console.log('[Partner Dashboard Stats] Profile:', { id: profile.id, type: profile.type, userId: profile.userId });

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM 형식

    // 월별 필터링 날짜 계산
    let dateFilter: { gte?: Date; lte?: Date } = {};
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
      dateFilter = {
        gte: startDate,
        lte: endDate,
      };
    } else {
      // 기본값: 현재 달
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateFilter = {
        gte: startDate,
        lte: endDate,
      };
    }

    // 기본 통계 (누적 데이터 - 전체 기간)
    const [totalLinks, totalLeads, totalSales, teamMembers] = await Promise.all([
      // 총 링크 수 (전체 누적)
      prisma.affiliateLink.count({
        where: {
          OR: [
            { managerId: profile.id },
            { agentId: profile.id },
            { issuedById: profile.userId },
          ],
        },
      }),

      // 총 리드 수 (전체 누적)
      prisma.affiliateLead.count({
        where: {
          OR: [
            { managerId: profile.id },
            { agentId: profile.id },
          ],
        },
      }),

      // 총 판매 수 (전체 누적)
      prisma.affiliateSale.count({
        where: {
          OR: [
            { managerId: profile.id },
            { agentId: profile.id },
          ],
        },
      }),

      // 팀원 수 (대리점장만)
      profile.type === 'BRANCH_MANAGER'
        ? prisma.affiliateRelation.count({
            where: {
              managerId: profile.id,
              status: 'ACTIVE',
            },
          })
        : Promise.resolve(0),
    ]);

    // 최근 리드 (선택된 달의 최근 5개)
    const recentLeads = await prisma.affiliateLead.findMany({
      where: {
        OR: [
          { managerId: profile.id },
          { agentId: profile.id },
        ],
        createdAt: dateFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        status: true,
        createdAt: true,
      },
    });

    // 최근 판매 (선택된 달의 최근 5개)
    const recentSales = await prisma.affiliateSale.findMany({
      where: {
        AND: [
          {
            OR: [
              { managerId: profile.id },
              { agentId: profile.id },
            ],
          },
          {
            OR: [
              { saleDate: dateFilter },
              { createdAt: dateFilter },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        saleAmount: true,
        status: true,
        saleDate: true,
        createdAt: true,
      },
    });

    // 월별 판매 통계 (최근 6개월)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlySales = await prisma.affiliateSale.groupBy({
      by: ['saleDate'],
      where: {
        OR: [
          { managerId: profile.id },
          { agentId: profile.id },
        ],
        saleDate: {
          gte: sixMonthsAgo,
        },
      },
      _count: true,
      _sum: {
        saleAmount: true,
      },
    });

    // 현재 달 정보 반환 (프론트엔드에서 사용)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonth = month || currentMonth;

    return NextResponse.json({
      ok: true,
      stats: {
        totalLinks,
        totalLeads,
        totalSales,
        teamMembers,
        recentLeads,
        recentSales,
        monthlySales: monthlySales.map((s) => ({
          date: s.saleDate,
          count: s._count,
          totalAmount: s._sum.saleAmount || 0,
        })),
        currentMonth,
        selectedMonth,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/partner/dashboard/stats] error:', error);
    return NextResponse.json(
      { ok: false, message: '통계 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}



