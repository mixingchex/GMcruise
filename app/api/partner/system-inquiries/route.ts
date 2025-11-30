export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET: 파트너용 시스템 문의 목록 조회
// GET: 파트너용 시스템 문의 목록 조회
export async function GET(req: NextRequest) {
    try {
        const { profile } = await requirePartnerContext(req);

        const where: any = {};

        if (profile.type === 'BRANCH_MANAGER') {
            where.managerId = profile.id;
        } else if (profile.type === 'SALES_AGENT') {
            where.agentId = profile.id;
        } else {
            where.OR = [
                { managerId: profile.id },
                { agentId: profile.id }
            ];
        }

        const consultations = await prisma.systemConsultation.findMany({
            where,
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({
            ok: true,
            consultations,
            total: consultations.length,
        });
    } catch (error) {
        console.error('[Partner System Inquiry] GET Error:', error);
        return NextResponse.json(
            { ok: false, error: '목록 조회 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
