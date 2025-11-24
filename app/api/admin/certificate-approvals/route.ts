// 관리자용 인증서 승인 관리 API
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

// GET: 승인 요청 목록 조회
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    
    if (!user) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 또는 대리점장/본사만 접근 가능
    const isAdmin = user.role === 'admin' || user.role === 'ADMIN';
    
    if (!isAdmin) {
      // 대리점장 또는 본사인지 확인
      const affiliateProfile = await prisma.affiliateProfile.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          type: { in: ['BRANCH_MANAGER', 'HQ'] },
        },
      });

      if (!affiliateProfile) {
        return NextResponse.json(
          { ok: false, error: '관리자 또는 대리점장/본사 권한이 필요합니다.' },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const certificateType = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (certificateType) {
      where.certificateType = certificateType;
    }

    const [approvals, total] = await Promise.all([
      prisma.certificateApproval.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          Requester: {
            select: {
              id: true,
              name: true,
              phone: true,
              AffiliateProfile: {
                select: {
                  type: true,
                  displayName: true,
                  branchLabel: true,
                },
              },
            },
          },
          Customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          Approver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.certificateApproval.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      approvals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Admin Certificate Approvals GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '조회 실패' },
      { status: 500 }
    );
  }
}

























