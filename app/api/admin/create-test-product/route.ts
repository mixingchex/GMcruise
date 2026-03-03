import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: '프로덕션에서는 사용할 수 없습니다.' }, { status: 403 });
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ ok: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    // 1. 기존 테스트 상품 삭제 (초기화)
    // Cascade 설정에 따라 MallProductContent도 같이 삭제됨
    await prisma.cruiseProduct.deleteMany({
      where: { productCode: 'TEST_PAY_1000' }
    });

    // 2. 새 상품 생성 (Nested Write로 가격표 포함)
    const product = await prisma.cruiseProduct.create({
      data: {
        // [CruiseProduct] 기본 정보
        productCode: 'TEST_PAY_1000',
        cruiseLine: 'Royal Caribbean',
        shipName: 'Spectrum of the Seas',
        packageName: '[PG테스트] 오키나와 1,000원 (결제수단 선택 테스트)',
        nights: 3,
        days: 4,
        basePrice: 1000,
        saleStatus: '판매중',
        isMainProduct: true,
        updatedAt: new Date(),

        // [일정표 JSON] - 필수
        itineraryPattern: [
          { day: 1, port: '출발' }
        ],

        // [MallProductContent] 상세 내용 및 가격표
        MallProductContent: {
          create: {
            updatedAt: new Date(),
            layout: {
              thumbnail: 'https://placehold.co/600x400/png?text=Test+Product',

              // [pricingRows JSON] - 필수, 상세페이지 계산 로직에 맞는 필드명
              pricingRows: [
                {
                  id: 't1',
                  roomType: 'INSIDE',
                  adult: 1000,
                  adult3rd: 1000,
                  child2to11: 1000,
                  infantUnder2: 1000,
                  label: '테스트 객실'
                }
              ],

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

    return NextResponse.json({
      ok: true,
      message: '테스트 상품 생성 완료',
      product,
      urls: {
        상세페이지: '/products/TEST_PAY_1000',
        결제테스트: '/products/TEST_PAY_1000?partner=test123'
      }
    });

  } catch (error) {
    console.error('[create-test-product] Error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
