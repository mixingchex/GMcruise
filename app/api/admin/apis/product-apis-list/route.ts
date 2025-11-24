import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * 상품별 APIS 목록 조회 (고객 그룹 관리용)
 * GET /api/admin/apis/product-apis-list
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

    // AffiliateProduct가 등록된 상품만 조회
    // 어필리에이트 수당이 설정된 상품만 APIS 확인 가능
    const now = new Date();
    
    // 먼저 유효한 AffiliateProduct 조회
    const activeAffiliateProducts = await prisma.affiliateProduct.findMany({
      where: {
        AND: [
          { status: 'active' },
          { isPublished: true },
          { effectiveFrom: { lte: now } },
          {
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: now } },
            ],
          },
        ],
      },
      select: {
        productCode: true,
      },
    });

    const affiliateProductCodes = activeAffiliateProducts.map(ap => ap.productCode);

    // AffiliateProduct가 등록된 상품이 없으면 빈 배열 반환
    if (affiliateProductCodes.length === 0) {
      console.log('[Product APIS List API] No active affiliate products found');
      return NextResponse.json({
        ok: true,
        apisData: [],
      });
    }

    // AffiliateProduct가 등록된 상품만 조회
    const products = await prisma.cruiseProduct.findMany({
      where: {
        AND: [
          {
            productCode: {
              in: affiliateProductCodes,
            },
          },
          {
            saleStatus: {
              in: ['판매중', '판매정지', '판매종료'],
            },
          },
        ],
      },
      include: {
        UserTrip: {
          where: {
            status: {
              in: ['Upcoming', 'InProgress'],
            },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // 각 상품별로 Trip을 찾아서 APIS 정보 가져오기
    const apisData = [];
    
    for (const product of products) {
      try {
        const trip = await prisma.trip.findUnique({
          where: { productCode: product.productCode },
          select: {
            id: true,
            googleFolderId: true,
            spreadsheetId: true,
          },
        });

        apisData.push({
          productCode: product.productCode,
          cruiseLine: product.cruiseLine,
          shipName: product.shipName,
          packageName: product.packageName,
          customerCount: product.UserTrip.length,
          saleStatus: product.saleStatus,
          startDate: product.startDate?.toISOString() || null,
          endDate: product.endDate?.toISOString() || null,
          folderUrl: trip?.googleFolderId
            ? `https://drive.google.com/drive/folders/${trip.googleFolderId}`
            : null,
          spreadsheetUrl: trip?.spreadsheetId
            ? `https://docs.google.com/spreadsheets/d/${trip.spreadsheetId}`
            : null,
          tripId: trip?.id || null,
        });
      } catch (error: any) {
        console.error(`Failed to load trip for ${product.productCode}:`, error);
        apisData.push({
          productCode: product.productCode,
          cruiseLine: product.cruiseLine,
          shipName: product.shipName,
          packageName: product.packageName,
          customerCount: product.UserTrip.length,
          saleStatus: product.saleStatus,
          startDate: product.startDate?.toISOString() || null,
          endDate: product.endDate?.toISOString() || null,
          folderUrl: null,
          spreadsheetUrl: null,
          tripId: null,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      apisData,
    });
  } catch (error: any) {
    console.error('[Product APIS List API] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || 'APIS 목록 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

