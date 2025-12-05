import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Prisma 트랜잭션으로 상품 및 콘텐츠 동시 생성
    const product = await prisma.$transaction(async (tx) => {
      // 1. 기존 테스트 상품 삭제 (초기화)
      // MallProductContent는 onDelete: Cascade로 자동 삭제됨
      await tx.cruiseProduct.deleteMany({
        where: { productCode: 'TEST_PAY_1000' }
      });

      // 2. 새 상품 생성 (Product + Content) - Nested Write
      const newProduct = await tx.cruiseProduct.create({
        data: {
          // [CruiseProduct 필드]
          productCode: 'TEST_PAY_1000',
          cruiseLine: 'Royal Caribbean',
          shipName: 'Spectrum of the Seas',
          packageName: '[PG테스트] 오키나와 1,000원 (결제/어필리에이트 검증)',
          nights: 3,
          days: 4,
          basePrice: 1000,
          saleStatus: '판매중',
          isMainProduct: true,

          // [일정표 JSON]
          itineraryPattern: [
            { day: 1, port: '인천', arrival: '-', departure: '16:00' },
            { day: 2, port: '해상', arrival: '-', departure: '-' },
            { day: 3, port: '오키나와', arrival: '07:00', departure: '15:00' },
            { day: 4, port: '인천', arrival: '07:00', departure: '-' }
          ],

          // [핵심] MallProductContent 연결 (가격표 포함)
          MallProductContent: {
            create: {
              thumbnail: 'https://placehold.co/600x400/png?text=Test+Product',
              // layout 필드에 pricingRows를 JSON으로 저장
              layout: {
                thumbnail: 'https://placehold.co/600x400/png?text=Test+Product',
                // 상세페이지가 참조하는 실제 가격표 구조 (adult, child 필드 필수)
                pricingRows: [
                  {
                    id: 'test_room_1',
                    roomType: 'INSIDE',
                    label: '테스트 내측 (1,000원)',
                    adult: 1000,
                    adult3rd: 1000,
                    child2to11: 1000,
                    infantUnder2: 1000
                  }
                ],
                detailBlocks: [],
                includedItems: ['테스트 포함사항'],
                excludedItems: ['테스트 불포함사항']
              }
            }
          }
        },
        include: {
          MallProductContent: true
        }
      });

      return newProduct;
    });

    return NextResponse.json({
      ok: true,
      message: '테스트 상품 생성 완료',
      product
    });

  } catch (error) {
    console.error('[create-test-product] Error:', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
