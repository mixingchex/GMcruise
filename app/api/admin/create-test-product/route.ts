// 결제 테스트 전용 상품 생성 API
// GET /api/admin/create-test-product
//
// 데이터 스펙:
// - pricingRows: Array<{ id, roomType, adult, adult3rd, child2to11, infantUnder2 }>
// - pricing: pricingRows와 동일 (어필리에이트 호환용)
// - itineraryPattern: Array<{ day, port, arrival, departure }>

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 테스트 상품 요금표 (실제 시스템 스펙 준수)
// 객실명은 한국어로 표시 (고객 친화적)
const TEST_PRICING_ROWS = [
  {
    id: 'test_room_1',
    roomType: '인사이드 (Inside)',
    adult: 1000,        // 성인 1인 1,000원
    adult3rd: 1000,     // 3인실 성인 1,000원
    child2to11: 1000,   // 소아 1,000원
    infantUnder2: 0,    // 유아 무료
  },
  {
    id: 'test_room_2',
    roomType: '오션뷰 (Ocean View)',
    adult: 2000,
    adult3rd: 2000,
    child2to11: 2000,
    infantUnder2: 0,
  },
  {
    id: 'test_room_3',
    roomType: '발코니 (Balcony)',
    adult: 3000,
    adult3rd: 3000,
    child2to11: 3000,
    infantUnder2: 0,
  },
];

// 테스트 상품 일정표
const TEST_ITINERARY = [
  { day: 1, port: '인천', arrival: '-', departure: '16:00' },
  { day: 2, port: '해상(종일항해)', arrival: '-', departure: '-' },
  { day: 3, port: '오키나와', arrival: '07:00', departure: '15:00' },
  { day: 4, port: '인천', arrival: '08:00', departure: '-' },
];

export async function GET() {
  try {
    console.log('[Create Test Product] Starting...');

    // 1. CruiseProduct upsert
    const product = await prisma.cruiseProduct.upsert({
      where: { productCode: 'TEST_PAY_1000' },
      update: {
        packageName: '[PG테스트] 오키나와 1,000원 (성인 1인)',
        cruiseLine: 'Royal Caribbean',
        shipName: 'Spectrum of the Seas',
        nights: 3,
        days: 4,
        basePrice: 1000,
        description: '결제 테스트 전용 상품입니다. 실제 예약이 아닙니다.',
        source: 'TEST',
        category: 'test',
        saleStatus: '판매중',
        isJapan: true,
        isBudget: true,
        tags: ['테스트', 'PG테스트', '1000원'],
        itineraryPattern: TEST_ITINERARY,
        updatedAt: new Date(),
      },
      create: {
        productCode: 'TEST_PAY_1000',
        packageName: '[PG테스트] 오키나와 1,000원 (성인 1인)',
        cruiseLine: 'Royal Caribbean',
        shipName: 'Spectrum of the Seas',
        nights: 3,
        days: 4,
        basePrice: 1000,
        description: '결제 테스트 전용 상품입니다. 실제 예약이 아닙니다.',
        source: 'TEST',
        category: 'test',
        saleStatus: '판매중',
        isJapan: true,
        isBudget: true,
        tags: ['테스트', 'PG테스트', '1000원'],
        itineraryPattern: TEST_ITINERARY,
        updatedAt: new Date(),
      },
    });

    console.log('[Create Test Product] CruiseProduct upserted:', product.productCode);

    // 2. MallProductContent upsert
    // [중요] layout.pricing과 layout.pricingRows 모두 저장 (호환성)
    // - pricingRows: 상품 등록/편집 페이지에서 사용
    // - pricing: 어필리에이트/결제 시스템에서 사용
    const layoutData = {
      // 두 키 모두에 동일한 데이터 저장 (호환성)
      pricing: TEST_PRICING_ROWS,
      pricingRows: TEST_PRICING_ROWS,
      // 기타 필드
      sections: [
        {
          type: 'text',
          content: '## 결제 테스트 상품\n\n이 상품은 PG 결제 테스트용입니다.\n\n**객실 타입별 가격:**\n- INSIDE: 1,000원\n- OCEANVIEW: 2,000원\n- BALCONY: 3,000원',
        },
      ],
      departureDate: new Date().toISOString().split('T')[0], // 오늘 날짜
    };

    await prisma.mallProductContent.upsert({
      where: { productCode: 'TEST_PAY_1000' },
      update: {
        thumbnail: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800',
        images: [
          'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800',
        ],
        videos: [],
        isActive: true,
        layout: layoutData,
        updatedAt: new Date(),
      },
      create: {
        productCode: 'TEST_PAY_1000',
        thumbnail: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800',
        images: [
          'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800',
        ],
        videos: [],
        isActive: true,
        layout: layoutData,
        updatedAt: new Date(),
      },
    });

    console.log('[Create Test Product] MallProductContent upserted with pricing data');

    return NextResponse.json({
      ok: true,
      message: '✅ 테스트 상품 생성 완료!',
      product: {
        productCode: 'TEST_PAY_1000',
        packageName: '[PG테스트] 오키나와 1,000원 (성인 1인)',
        basePrice: 1000,
      },
      pricingRows: TEST_PRICING_ROWS,
      itineraryPattern: TEST_ITINERARY,
      urls: {
        상세페이지: '/products/TEST_PAY_1000',
        결제페이지: '/products/TEST_PAY_1000/payment',
        파트너테스트: '/products/TEST_PAY_1000/payment?partner=test123',
      },
      guide: '상세페이지 → 결제 페이지 → 객실 선택(INSIDE 1,000원) → 결제하기 버튼 클릭',
      dataSpec: {
        pricingRows_schema: 'Array<{ id, roomType, adult, adult3rd, child2to11, infantUnder2 }>',
        itinerary_schema: 'Array<{ day, port, arrival, departure }>',
      },
    });
  } catch (error: any) {
    console.error('[Create Test Product] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
