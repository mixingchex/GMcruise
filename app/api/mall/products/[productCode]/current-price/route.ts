// app/api/mall/products/[productCode]/current-price/route.ts
// Mall용 현재 적용 가격 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPrice, getPriceAtDate } from '@/lib/pricing-utils';

interface RouteParams {
  params: Promise<{ productCode: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { productCode } = await params;
    const { searchParams } = new URL(request.url);

    // 특정 날짜 조회 (선택적)
    const dateParam = searchParams.get('date');
    let result;

    if (dateParam) {
      // 특정 날짜의 가격 조회
      const targetDate = new Date(dateParam);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }
      result = await getPriceAtDate(productCode, targetDate);
    } else {
      // 현재 가격 조회
      result = await getCurrentPrice(productCode);
    }

    if (!result.hasActivePeriod) {
      return NextResponse.json({
        hasPrice: false,
        message: '현재 적용되는 가격이 없습니다.',
        period: null,
        prices: [],
      });
    }

    return NextResponse.json({
      hasPrice: true,
      period: result.period,
      prices: result.prices,
    });
  } catch (error: any) {
    console.error('[Current Price GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
