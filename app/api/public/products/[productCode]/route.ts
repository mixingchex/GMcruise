export const dynamic = 'force-dynamic';

// app/api/public/products/[productCode]/route.ts
// 공개 상품 상세 조회 API (로그인 불필요)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET: 상품 상세 정보 조회
 * 로그인 없이 접근 가능
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { productCode: string } }
) {
  try {
    // Next.js 15+에서는 params가 Promise일 수 있음
    const resolvedParams = await params;
    const productCode = resolvedParams.productCode?.toUpperCase();

    if (!productCode) {
      return NextResponse.json(
        { ok: false, error: '상품 코드가 필요합니다.' },
        { status: 400 }
      );
    }


    // 상품 노출 기준: saleStatus='판매중' 화이트리스트 — 새 상태 추가 시 자동 차단
    // AffiliateProduct는 수당 추적 전용 — 노출 여부에 영향 없음
    const product = await prisma.cruiseProduct.findFirst({
      where: {
        productCode,
        saleStatus: '판매중',
      },
      select: {
        id: true,
        productCode: true,
        cruiseLine: true,
        shipName: true,
        packageName: true,
        nights: true,
        days: true,
        basePrice: true,
        source: true,
        itineraryPattern: true,
        description: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        MallProductContent: {
          select: {
            thumbnail: true,
            images: true,
            videos: true,
            layout: true,
          },
        },
      },
    });

    if (!product) {
      logger.warn('[Public Product Detail API] 상품을 찾을 수 없음:', productCode);
      return NextResponse.json(
        { ok: false, error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      product,
    });
  } catch (error) {
    logger.error('[Public Product Detail API] GET error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        ok: false, 
        error: '상품 정보를 불러올 수 없습니다.',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        })
      },
      { status: 500 }
    );
  }
}
