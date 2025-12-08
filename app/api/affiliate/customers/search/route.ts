export const dynamic = 'force-dynamic';

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
    const hasPurchase = searchParams.get('hasPurchase') === 'true';
    const certificateType = searchParams.get('certificateType'); // 'purchase' or 'refund'

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ ok: true, customers: [] });
    }

    // 인증서 유형이 지정된 경우: User 테이블에서 직접 검색 (customerStatus 기반)
    // purchase: 구매완료(purchase_confirmed) 고객만
    // refund: 환불완료(refunded) 고객만
    if (certificateType === 'purchase' || certificateType === 'refund') {
      const customerStatusFilter = certificateType === 'purchase' ? 'purchase_confirmed' : 'refunded';

      // 소유권 조건 설정
      let leadWhereClause: any;
      if (profile.type === 'SALES_AGENT') {
        leadWhereClause = { agentId: profile.id };
      } else if (profile.type === 'BRANCH_MANAGER') {
        const managedAgents = profile.managedAgents || [];
        const agentProfileIds = managedAgents.map((a: any) => a.id);
        leadWhereClause = {
          OR: [
            { managerId: profile.id },
            ...(agentProfileIds.length > 0 ? [{ agentId: { in: agentProfileIds } }] : []),
          ],
        };
      } else {
        return NextResponse.json({ ok: true, customers: [] });
      }

      // 파트너의 리드 전화번호 목록 가져오기
      const partnerLeads = await prisma.affiliateLead.findMany({
        where: leadWhereClause,
        select: { customerPhone: true },
      });
      const partnerPhones = partnerLeads
        .map(l => l.customerPhone)
        .filter((phone): phone is string => !!phone);

      // 해당 전화번호 중 customerStatus가 맞는 고객 검색
      const users = await prisma.user.findMany({
        where: {
          role: { not: 'admin' },
          customerStatus: customerStatusFilter,
          phone: { in: partnerPhones },
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } },
            { email: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          customerStatus: true,
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json({
        ok: true,
        customers: users.map(u => ({
          id: u.id,
          name: u.name || '',
          phone: u.phone || '',
          email: u.email || '',
          customerStatus: u.customerStatus,
          displayName: `${u.name || '이름 없음'}${u.phone ? ` (${u.phone})` : ''}`,
        })),
      });
    }

    // 기존 로직: AffiliateLead를 통해 고객 찾기
    // 검색 조건
    const searchCondition: any = {
      OR: [
        { customerName: { contains: query } },
        { customerPhone: { contains: query } },
        { customerEmail: { contains: query } },
      ],
    };

    // 구매 이력 필터
    if (hasPurchase) {
      searchCondition.AffiliateSale = {
        some: {
          status: { in: ['CONFIRMED', 'PAID'] }
        }
      };
    }

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
