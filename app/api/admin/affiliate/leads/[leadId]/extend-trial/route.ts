export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(
    req: NextRequest,
    { params }: { params: { leadId: string } }
) {
    try {
        const leadId = parseInt(params.leadId);
        if (isNaN(leadId)) {
            return NextResponse.json({ ok: false, message: '잘못된 요청입니다.' }, { status: 400 });
        }

        // 인증 확인
        let sessionUser: { id: number; role: string | null } | null = null;
        try {
            const sid = cookies().get('cg.sid.v2')?.value;
            if (sid) {
                const sess = await prisma.session.findUnique({
                    where: { id: sid },
                    select: { User: { select: { id: true, role: true } } },
                });
                if (sess?.User) {
                    sessionUser = { id: sess.User.id, role: sess.User.role };
                }
            }
        } catch (authError) {
            return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 });
        }

        if (!sessionUser) {
            return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 });
        }

        // 권한 확인: 관리자 또는 해당 리드의 담당자(대리점장/판매원)
        // 일단 관리자만 허용하고, 파트너 권한은 추후 정교화하거나 여기서 체크
        const lead = await prisma.affiliateLead.findUnique({
            where: { id: leadId },
            include: {
                AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: true,
                AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile: true,
            }
        });

        if (!lead) {
            return NextResponse.json({ ok: false, message: '리드를 찾을 수 없습니다.' }, { status: 404 });
        }

        // 권한 체크 로직
        let hasPermission = false;
        if (sessionUser.role === 'admin') {
            hasPermission = true;
        } else {
            // 파트너 권한 체크
            // 현재 로그인한 유저가 해당 리드의 매니저나 에이전트인지 확인
            const userProfile = await prisma.affiliateProfile.findUnique({
                where: { userId: sessionUser.id }
            });

            if (userProfile) {
                if (lead.managerId === userProfile.id || lead.agentId === userProfile.id) {
                    hasPermission = true;
                }
            }
        }

        if (!hasPermission) {
            return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
        }

        const body = await req.json();
        const { days = 7 } = body; // 기본 7일 연장

        const currentMetadata = lead.metadata as any || {};
        const currentExpiresAt = currentMetadata.trialExpiresAt ? new Date(currentMetadata.trialExpiresAt) : new Date();

        // 만료일이 지났으면 현재 시간 기준으로 연장, 안 지났으면 기존 만료일 기준 연장
        const baseDate = currentExpiresAt < new Date() ? new Date() : currentExpiresAt;
        const newExpiresAt = new Date(baseDate);
        newExpiresAt.setDate(newExpiresAt.getDate() + days);

        // 업데이트
        await prisma.affiliateLead.update({
            where: { id: leadId },
            data: {
                metadata: {
                    ...currentMetadata,
                    trialExpiresAt: newExpiresAt.toISOString(),
                    lastTrialExtensionBy: sessionUser.id,
                    lastTrialExtensionAt: new Date().toISOString(),
                }
            }
        });

        // 이력 기록
        await prisma.affiliateInteraction.create({
            data: {
                leadId,
                createdById: sessionUser.id,
                interactionType: 'TRIAL_EXTENDED',
                note: `무료 체험 기간이 ${days}일 연장되었습니다. (만료일: ${newExpiresAt.toLocaleDateString()})`,
                metadata: {
                    extendedDays: days,
                    newExpiresAt: newExpiresAt.toISOString(),
                }
            }
        });

        return NextResponse.json({
            ok: true,
            message: `${days}일 연장되었습니다.`,
            newExpiresAt: newExpiresAt.toISOString(),
        });

    } catch (error: any) {
        console.error('[Trial Extend] Error:', error);
        return NextResponse.json(
            { ok: false, message: '연장 처리에 실패했습니다.' },
            { status: 500 }
        );
    }
}
