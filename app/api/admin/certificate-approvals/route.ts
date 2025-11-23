// 관리자용 인증서 승인 관리 API
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

// GET: 승인 요청 목록 조회
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
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













