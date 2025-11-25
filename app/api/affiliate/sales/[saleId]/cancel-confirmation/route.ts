export const dynamic = 'force-dynamic';

// app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts
// 판매 확정 요청 취소 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 세션에서 사용자 정보 가져오기
async function getCurrentUser() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true },
        },
      },
    });

    if (!session || !session.User) return null;
    return session.User;
  } catch (error) {
    return null;
  }
}

/**
 * POST: 판매 확정 요청 취소
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 사용자 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      include: {
        AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
          select: { userId: true },
        },
        AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile: {
          select: { userId: true },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 4. 권한 확인 (본인이 제출한 요청만 취소 가능)
    if (sale.submittedById !== user.id) {
      return NextResponse.json(
        { ok: false, error: '본인이 제출한 요청만 취소할 수 있습니다' },
        { status: 403 }
      );
    }

    // 5. 상태 확인 (PENDING_APPROVAL만 취소 가능)
    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 요청만 취소할 수 있습니다' },
        { status: 400 }
      );
    }

    // 6. 요청 취소 처리 (상태를 PENDING으로 되돌림)
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'PENDING',
        submittedAt: null,
        submittedById: null,
        // Google Drive 파일은 그대로 유지 (나중에 재사용 가능)
      },
    });

    return NextResponse.json({
      ok: true,
      message: '요청이 취소되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
      },
    });
  } catch (error: any) {
    console.error('[Cancel Confirmation] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
