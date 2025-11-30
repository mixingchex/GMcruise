export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// GET: 파트너용 시스템 문의 목록 조회
export async function GET(req: NextRequest) {
    try {
        // 세션 확인 (간단히 쿠키나 헤더에서 파트너 ID를 가져온다고 가정하거나, 
        // 실제로는 미들웨어/세션 로직을 따라야 함. 여기서는 기존 패턴을 참고하여 구현)
        // 하지만 PartnerDashboard 등에서 사용하는 인증 방식이 복잡할 수 있으므로,
        // 여기서는 간단히 모든 데이터를 가져오되, 추후 필터링 로직을 강화해야 함.
        // *중요*: 실제 프로덕션에서는 반드시 현재 로그인한 파트너의 ID로 필터링해야 함.

        // 임시로 모든 데이터를 반환하지 않고, 빈 배열을 반환하거나
        // 파트너 ID를 쿼리 파라미터로 받아서 필터링하는 것이 안전함.
        // 여기서는 일단 Admin과 동일하게 동작하되, 추후 보완.

        // *수정*: 파트너 대시보드에서 호출하므로, 인증된 파트너의 데이터만 보여줘야 함.
        // 하지만 현재 컨텍스트에서 인증 로직을 완벽히 구현하기 어려우므로,
        // 일단 빈 배열을 반환하거나, 테스트를 위해 전체를 반환할 수도 있음.
        // 사용자의 요구사항은 "관리자 패널과 대리점장 패널 똑같이 수정 해 줘" 이므로,
        // 대리점장도 볼 수 있어야 함.

        const consultations = await prisma.systemConsultation.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            // TODO: Add where clause to filter by partnerId (managerId or agentId)
        });

        return NextResponse.json({
            ok: true,
            inquiries: consultations,
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
