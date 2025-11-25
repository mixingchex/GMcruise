export const dynamic = 'force-dynamic';

// 고객 선택 시 결제/상품 정보 조회 API
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { role: true },
        },
      },
    });

    if (!session || !session.User) return false;
    return session.User.role === 'admin';
  } catch (error) {
    console.error('[Admin Customer Purchase Info] Auth check error:', error);
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    
    if (!sid) {
      return NextResponse.json({ 
        ok: false, 
        error: '인증이 필요합니다.' 
      }, { status: 403 });
    }

    const isAdmin = await checkAdminAuth(sid);
    if (!isAdmin) {
      return NextResponse.json({ 
        ok: false, 
        error: '관리자 권한이 필요합니다.' 
      }, { status: 403 });
    }

    const customerId = parseInt(params.userId);
    if (isNaN(customerId)) {
      return NextResponse.json({ 
        ok: false, 
        error: '유효하지 않은 고객 ID입니다.' 
      }, { status: 400 });
    }

    // 고객 정보 조회
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    // 생년월일 조회 (여권 제출 완료한 경우만)
    let birthDate: string | null = null;
    const passportSubmission = await prisma.passportSubmission.findFirst({
      where: {
        userId: customerId,
        isSubmitted: true,
      },
      include: {
        PassportSubmissionGuest: {
          where: {
            name: customer.name || undefined,
          },
          take: 1,
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    if (passportSubmission && passportSubmission.PassportSubmissionGuest.length > 0) {
      const guest = passportSubmission.PassportSubmissionGuest[0];
      if (guest.dateOfBirth) {
        birthDate = guest.dateOfBirth.toISOString().split('T')[0];
      }
    }

    if (!customer) {
      return NextResponse.json({ 
        ok: false, 
        error: '고객을 찾을 수 없습니다.' 
      }, { status: 404 });
    }

    // 최근 결제 정보 조회 (Payment 모델)
    const recentPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { buyerTel: customer.phone || undefined },
          { buyerName: customer.name || undefined },
          { buyerEmail: customer.email || undefined },
        ],
        status: 'paid',
      },
      include: {
        AffiliateSale: {
          include: {
            AffiliateProduct: {
              include: {
                CruiseProduct: {
                  include: {
                    MallProductContent: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Payment에서 직접 상품 정보 조회 (productCode로)
    let paymentProduct = null;
    if (recentPayment?.productCode) {
      paymentProduct = await prisma.cruiseProduct.findUnique({
        where: { productCode: recentPayment.productCode },
        include: {
          MallProductContent: true,
        },
      });
    }

    // AffiliateSale에서도 조회
    const recentSale = await prisma.affiliateSale.findFirst({
      where: {
        metadata: {
          path: ['customerName'],
          equals: customer.name,
        },
        OR: [
          {
            metadata: {
              path: ['customerPhone'],
              equals: customer.phone,
            },
          },
        ],
        status: { not: 'CANCELLED' },
      },
      include: {
        AffiliateProduct: {
          include: {
            CruiseProduct: {
              include: {
                MallProductContent: true,
              },
            },
          },
        },
        Payment: true,
      },
      orderBy: { saleDate: 'desc' },
    });

    // UserTrip에서도 조회
    const recentTrip = await prisma.userTrip.findFirst({
      where: {
        userId: customerId,
      },
      include: {
        CruiseProduct: {
          include: {
            MallProductContent: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 최신 정보 선택 (Payment > AffiliateSale > UserTrip 순서)
    let productInfo = null;
    let paymentInfo = null;

    if (paymentProduct) {
      // Payment에서 직접 상품 정보를 찾은 경우
      productInfo = paymentProduct;
      paymentInfo = {
        amount: recentPayment?.amount || 0,
        date: recentPayment?.paidAt || null,
        currency: recentPayment?.currency || 'KRW',
      };
    } else if (recentPayment && recentPayment.AffiliateSale?.AffiliateProduct?.CruiseProduct) {
      const product = recentPayment.AffiliateSale.AffiliateProduct.CruiseProduct;
      productInfo = product;
      paymentInfo = {
        amount: recentPayment.amount,
        date: recentPayment.paidAt,
        currency: recentPayment.currency,
      };
    } else if (recentSale && recentSale.AffiliateProduct?.CruiseProduct) {
      const product = recentSale.AffiliateProduct.CruiseProduct;
      productInfo = product;
      paymentInfo = {
        amount: recentSale.saleAmount,
        date: recentSale.saleDate,
        currency: 'KRW',
      };
    } else if (recentTrip && recentTrip.CruiseProduct) {
      productInfo = recentTrip.CruiseProduct;
      paymentInfo = null; // UserTrip에는 결제 정보가 없을 수 있음
    }

    // MallProductContent에서 상세 정보 추출
    let productDetails = null;
    if (productInfo?.MallProductContent?.layout) {
      const layout = productInfo.MallProductContent.layout as any;
      productDetails = {
        tags: productInfo.tags || [],
        included: layout.included || [],
        excluded: layout.excluded || [],
        refundPolicy: layout.refundPolicy || '',
        flightInfo: layout.flightInfo || null,
        hasGuide: layout.hasGuide || false,
        hasEscort: layout.hasEscort || false,
        hasCruiseDotStaff: layout.hasCruiseDotStaff || false,
        hasTravelInsurance: layout.hasTravelInsurance || false,
      };
    }

    // 방문 국가 추출 (itineraryPattern에서)
    const visitedCountries: string[] = [];
    const destinations: string[] = [];
    if (productInfo?.itineraryPattern && Array.isArray(productInfo.itineraryPattern)) {
      productInfo.itineraryPattern.forEach((day: any) => {
        if (day.type === 'PortVisit' && day.country) {
          if (!visitedCountries.includes(day.country)) {
            visitedCountries.push(day.country);
          }
          if (day.location && !destinations.includes(day.location)) {
            destinations.push(day.location);
          }
        }
      });
    }

    return NextResponse.json({
      ok: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        birthDate: birthDate,
      },
      product: productInfo ? {
        id: productInfo.id,
        productCode: productInfo.productCode,
        cruiseLine: productInfo.cruiseLine,
        shipName: productInfo.shipName,
        packageName: productInfo.packageName,
        nights: productInfo.nights,
        days: productInfo.days,
        basePrice: productInfo.basePrice,
        description: productInfo.description,
        visitedCountries,
        destinations,
        ...productDetails,
      } : null,
      payment: paymentInfo,
    });
  } catch (error) {
    console.error('[Admin Customer Purchase Info] Error:', error);
    return NextResponse.json(
      { ok: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
