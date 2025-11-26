export const dynamic = 'force-dynamic';

// 판매원용 샘플 구매고객 생성 API
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext } from '@/lib/partner-auth';

export async function POST(req: NextRequest) {
  try {
    const { sessionUser, profile } = await requirePartnerContext();

    // 판매원만 접근 가능
    if (profile.type !== 'SALES_AGENT') {
      return NextResponse.json({ 
        ok: false, 
        error: '판매원만 접근 가능합니다.' 
      }, { status: 403 });
    }

    const body = await req.json();
    const { count = 1 } = body;

    const sampleCustomers = [];

    for (let i = 0; i < count; i++) {
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000);
      
      // 샘플 고객 생성
      const customer = await prisma.user.create({
        data: {
          name: `테스트고객${randomNum}`,
          phone: `010${String(randomNum).padStart(8, '0')}`,
          email: `test${timestamp}${randomNum}@example.com`,
          role: 'customer',
        },
      });

      // 샘플 Lead 생성 (판매원 소유)
      const lead = await prisma.lead.create({
        data: {
          agentId: sessionUser.id,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          source: 'mall',
          status: 'CONFIRMED',
        },
      });

      // 샘플 상품 찾기 또는 생성
      let product = await prisma.product.findFirst({
        where: { isActive: true },
      });

      if (!product) {
        // 샘플 상품이 없으면 생성
        product = await prisma.product.create({
          data: {
            productCode: `TEST${timestamp}`,
            productName: '테스트 크루즈 상품',
            basePrice: 3500000,
            isActive: true,
          },
        });
      }

      // 샘플 결제 생성
      const payment = await prisma.payment.create({
        data: {
          userId: customer.id,
          productId: product.id,
          amount: product.basePrice,
          status: 'paid',
          buyerName: customer.name,
          buyerTel: customer.phone,
          buyerEmail: customer.email,
          paidAt: new Date(),
        },
      });

      // 샘플 판매 내역 생성
      const sale = await prisma.affiliateSale.create({
        data: {
          agentId: sessionUser.id,
          leadId: lead.id,
          productId: product.id,
          productCode: product.productCode,
          saleAmount: product.basePrice,
          status: 'PAID',
          saleDate: new Date(),
        },
      });

      sampleCustomers.push({
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        },
        lead: {
          id: lead.id,
        },
        payment: {
          id: payment.id,
          amount: payment.amount,
        },
        sale: {
          id: sale.id,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: `${count}명의 샘플 구매고객이 생성되었습니다.`,
      customers: sampleCustomers,
    });
  } catch (error: any) {
    console.error('[Create Sample Customer] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '샘플 고객 생성 중 오류가 발생했습니다.' },
      { status: error.status || 500 }
    );
  }
}

