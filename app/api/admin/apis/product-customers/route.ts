import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * 상품별 구매 고객 목록 조회
 * GET /api/admin/apis/product-customers?productCode=XXX
 */
export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const { cookies } = await import('next/headers');
    const SESSION_COOKIE = 'cg.sid.v2';
    const sid = cookies().get(SESSION_COOKIE)?.value;

    if (!sid) {
      return NextResponse.json(
        { ok: false, message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true },
        },
      },
    });

    if (!session?.User || session.User.role !== 'admin') {
      return NextResponse.json(
        { ok: false, message: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const productCode = searchParams.get('productCode');

    if (!productCode) {
      return NextResponse.json(
        { ok: false, message: 'productCode는 필수입니다.' },
        { status: 400 }
      );
    }

    // 상품별 구매 고객 조회 (UserTrip 기준)
    const userTrips = await prisma.userTrip.findMany({
      where: {
        CruiseProduct: {
          productCode: productCode,
        },
        status: {
          in: ['Upcoming', 'InProgress'],
        },
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        CruiseProduct: {
          select: {
            productCode: true,
            cruiseLine: true,
            shipName: true,
            packageName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const customers = userTrips.map((trip) => ({
      userId: trip.User.id,
      name: trip.User.name,
      phone: trip.User.phone,
      email: trip.User.email,
      tripId: trip.id,
      productCode: trip.CruiseProduct?.productCode,
      cruiseName: trip.cruiseName,
      startDate: trip.startDate,
      endDate: trip.endDate,
      status: trip.status,
    }));

    return NextResponse.json({
      ok: true,
      customers,
      total: customers.length,
    });
  } catch (error: any) {
    console.error('[Product Customers API] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || '고객 목록 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}










