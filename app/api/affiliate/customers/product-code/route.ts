export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

/**
 * GET /api/affiliate/customers/product-code?phone={phone}
 * 메인 고객 전화번호로 구매한 상품 코드 조회
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ ok: false, error: '전화번호가 필요합니다.' }, { status: 400 });
    }

    // 전화번호 정규화
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone.length < 10) {
      return NextResponse.json({ ok: false, error: '올바른 전화번호를 입력해주세요.' }, { status: 400 });
    }

    // 1. 전화번호로 User 찾기
    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ 
        ok: true, 
        productCode: null, 
        message: '고객을 찾을 수 없습니다.' 
      });
    }

    // 2. 최신 Trip 조회 (productId 포함)
    const latestTrip = await prisma.trip.findFirst({
      where: { userId: user.id },
      orderBy: { startDate: 'desc' },
      select: { 
        id: true, 
        productId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!latestTrip || !latestTrip.productId) {
      // Trip이 없으면 AffiliateLead에서 productCode 확인
      const lead = await prisma.affiliateLead.findFirst({
        where: { 
          customerPhone: normalizedPhone,
          status: { not: 'CANCELLED' },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          metadata: true,
        },
      });

      if (lead && lead.metadata) {
        // metadata에서 productCode 추출
        const metadata = lead.metadata as any;
        const productCodeFromMetadata = metadata?.productCode;
        
        if (productCodeFromMetadata) {
          return NextResponse.json({ 
            ok: true, 
            productCode: productCodeFromMetadata,
            source: 'lead',
            customerName: user.name,
          });
        }
      }

      return NextResponse.json({ 
        ok: true, 
        productCode: null, 
        message: '구매한 상품을 찾을 수 없습니다.' 
      });
    }

    // 3. productId로 CruiseProduct 조회하여 productCode 가져오기
    const product = await prisma.cruiseProduct.findUnique({
      where: { id: latestTrip.productId },
      select: { productCode: true, packageName: true },
    });

    if (!product) {
      return NextResponse.json({ 
        ok: true, 
        productCode: null, 
        message: '상품 정보를 찾을 수 없습니다.' 
      });
    }

    return NextResponse.json({ 
      ok: true, 
      productCode: product.productCode,
      packageName: product.packageName,
      source: 'trip',
      customerName: user.name,
      tripStartDate: latestTrip.startDate,
      tripEndDate: latestTrip.endDate,
    });
  } catch (error: any) {
    console.error('[Affiliate Customer Product Code] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '상품 코드 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
