export const dynamic = 'force-dynamic';

// app/api/public/products/[productCode]/route.ts
// 공개 상품 상세 조회 API (로그인 불필요)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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


    // 상품 노출 기준: CruiseProduct.saleStatus='판매중'만으로 결정
    // AffiliateProduct는 수당 추적 전용 — 노출 여부에 영향 없음
    const product = await prisma.cruiseProduct.findFirst({
      where: {
        productCode,
        NOT: { saleStatus: { in: ['판매중지', '판매완료', '3일체험'] } },
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
      console.warn('[Public Product Detail API] 상품을 찾을 수 없음:', productCode);
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
    console.error('[Public Product Detail API] GET error:', error);
    console.error('[Public Product Detail API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
