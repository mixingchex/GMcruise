// 판매원/대리점장의 고객 검색 API
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext } from '@/lib/partner-auth';

export async function GET(req: NextRequest) {
  try {
    const { sessionUser, profile } = await requirePartnerContext({ includeManagedAgents: true });

    // 판매원 또는 대리점장만 접근 가능
    if (profile.type !== 'SALES_AGENT' && profile.type !== 'BRANCH_MANAGER') {
      return NextResponse.json({ 
        ok: false, 
        error: '판매원 또는 대리점장만 접근 가능합니다.' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ ok: true, customers: [] });
    }

    // AffiliateLead를 통해 고객 찾기
    // 검색 조건
    const searchCondition = {
      OR: [
        { customerName: { contains: query } },
        { customerPhone: { contains: query } },
        { customerEmail: { contains: query } },
      ],
    };

    // 소유권 조건
    let ownershipCondition: any;
    if (profile.type === 'SALES_AGENT') {
      // 판매원인 경우: 본인의 Lead만 (agentId가 본인인 경우)
      ownershipCondition = { agentId: profile.id };
    } else if (profile.type === 'BRANCH_MANAGER') {
      // 대리점장의 경우 소속 판매원들의 profileId도 포함
      const managedAgents = profile.managedAgents || [];
      const agentProfileIds = managedAgents.map((a: any) => a.id);
      ownershipCondition = {
        OR: [
          { managerId: profile.id },
          ...(agentProfileIds.length > 0 ? [{ agentId: { in: agentProfileIds } }] : []),
        ],
      };
    } else {
      return NextResponse.json({ ok: true, customers: [] });
    }

    // 검색 조건과 소유권 조건을 AND로 결합
    const whereCondition = {
      AND: [
        searchCondition,
        ownershipCondition,
      ],
    };

    const leads = await prisma.affiliateLead.findMany({
      where: whereCondition,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // 고객 정보 추출 (중복 제거)
    const customerMap = new Map<number, {
      id: number;
      name: string;
      phone: string;
      email: string;
    }>();

    leads.forEach(lead => {
      // Lead 정보 사용 (고객 ID는 임시로 음수 사용)
      const tempId = -(lead.id);
      if (!customerMap.has(tempId)) {
        customerMap.set(tempId, {
          id: tempId,
          name: lead.customerName || '',
          phone: lead.customerPhone || '',
          email: lead.customerEmail || '',
        });
      }
    });

    const customers = Array.from(customerMap.values());

    return NextResponse.json({ 
      ok: true, 
      customers: customers.map(c => ({
        id: c.id,
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
        displayName: `${c.name || '이름 없음'}${c.phone ? ` (${c.phone})` : ''}`,
      }))
    });
  } catch (error: any) {
    console.error('[Affiliate Customers Search] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다.' },
      { status: error.status || 500 }
    );
  }
}

