import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * 내 지급명세서 조회 API
 * GET /api/affiliate/my-payslips
 */
export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자의 어필리에이트 프로필 조회
    const profile = await prisma.affiliateProfile.findUnique({
      where: { userId: sessionUser.id },
      select: { id: true, type: true },
    });

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: '어필리에이트 프로필이 없습니다.' },
        { status: 404 }
      );
    }

    // 지급명세서 조회 (최근 순)
    const payslips = await prisma.affiliatePayslip.findMany({
      where: {
        profileId: profile.id,
      },
      orderBy: {
        period: 'desc',
      },
      select: {
        id: true,
        period: true,
        type: true,
        totalSales: true,
        totalCommission: true,
        totalWithholding: true,
        netPayment: true,
        status: true,
        approvedAt: true,
        sentAt: true,
        pdfUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      payslips,
    });
  } catch (error: any) {
    console.error('[My Payslips] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || '지급명세서 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}



















