import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 파트너 프로필 확인
        const profile = await prisma.affiliateProfile.findFirst({
            where: { userId: user.id },
            select: { id: true, type: true },
        });

        if (!profile) {
            return NextResponse.json({ ok: false, error: 'Profile not found' }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q') || '';
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!query || query.trim().length < 1) {
            return NextResponse.json({ ok: true, customers: [] });
        }

        // 파트너의 리드(AffiliateLead) 중에서 검색
        // 대리점장인 경우 팀원의 리드도 검색 가능해야 하는지? -> 일단 본인/팀원 리드 모두 검색 가능하도록

        let whereClause: any = {
            OR: [
                { customerName: { contains: query } },
                { customerPhone: { contains: query } },
            ],
        };

        if (profile.type === 'BRANCH_MANAGER') {
            // 대리점장: 본인 또는 팀원의 리드
            const teamRelations = await prisma.affiliateRelation.findMany({
                where: { managerId: profile.id, status: 'ACTIVE' },
                select: { agentId: true },
            });
            const agentIds = teamRelations.map(r => r.agentId);

            whereClause.OR.push(
                { managerId: profile.id },
                { agentId: profile.id },
                { agentId: { in: agentIds } }
            );
        } else {
            // 판매원: 본인의 리드만
            whereClause.agentId = profile.id;
        }

        const leads = await prisma.affiliateLead.findMany({
            where: whereClause,
            select: {
                id: true,
                customerName: true,
                customerPhone: true,
                // customerEmail: true, // Lead 모델에 없음
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            ok: true,
            customers: leads.map(lead => ({
                id: lead.id,
                name: lead.customerName || '',
                phone: lead.customerPhone || '',
                email: '', // Lead 모델에 이메일이 없으므로 빈 값
                displayName: `${lead.customerName || '이름 없음'}${lead.customerPhone ? ` (${lead.customerPhone})` : ''}`,
            })),
        });

    } catch (error) {
        console.error('[Partner Customer Search] Error:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to search customers' },
            { status: 500 }
        );
    }
}
