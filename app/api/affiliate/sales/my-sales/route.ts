export const dynamic = 'force-dynamic';

// app/api/affiliate/sales/my-sales/route.ts
// 내 판매 목록 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

async function getCurrentUser() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true },
        },
      },
    });
    return session?.User || null;
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다' }, { status: 401 });
    }

    // 사용자의 어필리에이트 프로필 찾기
    const profile = await prisma.affiliateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, type: true },
    });

    if (!profile) {
      return NextResponse.json({ ok: true, sales: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const month = searchParams.get('month'); // YYYY-MM 형식

    // 본인 판매만 조회
    const where: any = {};
    if (profile.type === 'SALES_AGENT') {
      where.agentId = profile.id;
    } else if (profile.type === 'BRANCH_MANAGER') {
      where.managerId = profile.id;
    } else {
      return NextResponse.json({ ok: true, sales: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }

    // 월별 필터링
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
      
      where.saleDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    // 전체 개수 조회
    const total = await prisma.affiliateSale.count({ where });
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // 판매 목록 조회
    const sales = await prisma.affiliateSale.findMany({
      where,
      select: {
        id: true,
        productCode: true,
        saleAmount: true,
        status: true,
        audioFileGoogleDriveUrl: true,
        saleDate: true,
        submittedAt: true,
        approvedAt: true,
      },
      orderBy: {
        saleDate: 'desc', // 판매일 기준 내림차순
      },
      skip,
      take: limit,
    });

    // 월별 통계 계산 (필터링된 where 조건 사용)
    const stats = await prisma.affiliateSale.groupBy({
      by: ['status'],
      where,
      _sum: {
        saleAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // 통계 데이터 정리
    const summary = {
      APPROVED: { amount: 0, count: 0 },
      PENDING_APPROVAL: { amount: 0, count: 0 },
      PENDING: { amount: 0, count: 0 },
      REJECTED: { amount: 0, count: 0 },
      CONFIRMED: { amount: 0, count: 0 },
    };

    stats.forEach((stat) => {
      const status = stat.status as keyof typeof summary;
      if (summary[status]) {
        summary[status].amount = stat._sum.saleAmount || 0;
        summary[status].count = stat._count.id;
      }
    });

    return NextResponse.json({
      ok: true,
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      summary,
    });
  } catch (error: any) {
    console.error('[My Sales] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
