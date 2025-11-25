export const dynamic = 'force-dynamic';

// 고객 검색 API (자동완성용)
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
    console.error('[Admin Customers Search] Auth check error:', error);
    return false;
  }
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ ok: true, customers: [] });
    }

    // 구매한 고객만 검색 (Payment가 있는 고객만)
    // 이름, 전화번호, 이메일로 검색하되 Payment가 있는 고객만
    const customersWithPayment = await prisma.payment.findMany({
      where: {
        status: 'paid',
        OR: [
          { buyerName: { contains: query } },
          { buyerTel: { contains: query } },
          { buyerEmail: { contains: query } },
        ],
      },
      select: {
        buyerName: true,
        buyerTel: true,
        buyerEmail: true,
      },
      take: limit * 2, // 중복 제거를 위해 더 많이 가져오기
      orderBy: { paidAt: 'desc' },
    });

    // Payment에서 고유한 고객 정보 추출 (이메일 기준)
    const uniqueCustomers = new Map<string, { name: string; phone: string; email: string }>();
    customersWithPayment.forEach((payment) => {
      if (payment.buyerEmail) {
        uniqueCustomers.set(payment.buyerEmail, {
          name: payment.buyerName || '',
          phone: payment.buyerTel || '',
          email: payment.buyerEmail || '',
        });
      }
    });

    // User 테이블에서 실제 사용자 정보 조회
    const customerEmails = Array.from(uniqueCustomers.keys()).slice(0, limit);
    const users = await prisma.user.findMany({
      where: {
        role: { not: 'admin' },
        email: { in: customerEmails },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    const customers = users.map(user => ({
      id: user.id,
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
    }));

    return NextResponse.json({ 
      ok: true, 
      customers: customers.map(c => ({
        id: c.id,
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
        displayName: `${c.name || '이름 없음'}${c.phone ? ` (${c.phone})` : ''}`,
      }))
    });
  } catch (error) {
    console.error('[Admin Customers Search] Error:', error);
    return NextResponse.json(
      { ok: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
