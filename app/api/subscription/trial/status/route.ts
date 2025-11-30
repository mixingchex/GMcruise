export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json(
                { ok: false, message: '전화번호가 필요합니다.' },
                { status: 400 }
            );
        }

        // 전화번호 정규화
        const normalizedPhone = phone.replace(/[^0-9]/g, '');

        const lead = await prisma.affiliateLead.findFirst({
            where: {
                customerPhone: normalizedPhone,
                status: { not: 'CANCELLED' },
            },
            select: {
                id: true,
                customerName: true,
                metadata: true,
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (!lead) {
            return NextResponse.json({ ok: false, message: '체험 정보를 찾을 수 없습니다.' });
        }

        const metadata = lead.metadata as any || {};
        const trialExpiresAt = metadata.trialExpiresAt;

        if (!trialExpiresAt) {
            return NextResponse.json({ ok: false, message: '체험 기간 정보가 없습니다.' });
        }

        return NextResponse.json({
            ok: true,
            trial: {
                name: lead.customerName,
                expiresAt: trialExpiresAt,
            }
        });
    } catch (error: any) {
        console.error('[Trial Status] Error:', error);
        return NextResponse.json(
            { ok: false, message: '상태 조회 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
