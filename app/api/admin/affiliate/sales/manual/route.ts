export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/affiliate/sales/manual
 * 본사 직접 매출 수동 등록 (관리자 전용)
 *
 * PG 결제를 거치지 않는 오프라인/전화/직접 거래 등록용.
 * isHqFallback = true → 파트너 수당 없음, 본사 직판으로 기록.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { normalizePhone } from '@/lib/phone-utils';
import { hashPassword, SYSTEM_PASSWORDS } from '@/lib/password';

const SESSION_COOKIE = 'cg.sid.v2';

async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;
  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { User: { select: { role: true } } },
    });
    if (!session?.User) return false;
    if (session.expiresAt && session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: sid } }).catch(() => {});
      return false;
    }
    return session.User.role === 'admin';
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    if (!(await checkAdminAuth(sid))) {
      return NextResponse.json({ ok: false, message: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      productCode,
      amount,
      saleDate,
      cabinType,
      headcount,
      remarks,
    } = body;

    // ── 필수 필드 검증 ──────────────────────────────────────────────────────
    if (!customerName?.trim()) {
      return NextResponse.json({ ok: false, message: '고객명을 입력해주세요.' }, { status: 400 });
    }
    if (!customerPhone?.trim()) {
      return NextResponse.json({ ok: false, message: '고객 연락처를 입력해주세요.' }, { status: 400 });
    }
    if (!productCode?.trim()) {
      return NextResponse.json({ ok: false, message: '상품을 선택해주세요.' }, { status: 400 });
    }
    const parsedAmount = parseInt(String(amount), 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ ok: false, message: '올바른 결제 금액을 입력해주세요.' }, { status: 400 });
    }

    // ── 상품 확인 ───────────────────────────────────────────────────────────
    const product = await prisma.cruiseProduct.findUnique({
      where: { productCode },
      select: { id: true, packageName: true, shipName: true },
    });
    if (!product) {
      return NextResponse.json({ ok: false, message: '존재하지 않는 상품코드입니다.' }, { status: 400 });
    }

    // ── HQ 프로필 조회 ──────────────────────────────────────────────────────
    const hqProfile = await prisma.affiliateProfile.findFirst({
      where: { type: 'HQ', status: 'ACTIVE' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    const hqManagerId = hqProfile?.id ?? null;

    // ── 고객 User 찾기 or 생성 ─────────────────────────────────────────────
    const normalizedPhone = normalizePhone(customerPhone.trim()) ?? '';
    let userId: number;

    if (normalizedPhone.length >= 10) {
      const existingUser = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
        select: { id: true },
      });
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            name: customerName.trim(),
            phone: normalizedPhone,
            password: await hashPassword(SYSTEM_PASSWORDS.GUIDE_ACTIVE),
            role: 'user',
            onboarded: false,
            customerSource: 'manual-sale',
            customerStatus: 'active',
          },
        });
        userId = newUser.id;
      }
    } else {
      const tempUser = await prisma.user.create({
        data: {
          name: customerName.trim(),
          phone: `manual_${Date.now()}`,
          password: await hashPassword(SYSTEM_PASSWORDS.TEMP),
          role: 'user',
          onboarded: false,
        },
      });
      userId = tempUser.id;
    }

    // ── 주문번호 생성 (수동 등록 식별) ─────────────────────────────────────
    const orderId = `manual_${Date.now()}`;
    const resolvedSaleDate = saleDate ? new Date(saleDate) : new Date();

    // ── Payment + AffiliateSale 원자적 생성 ─────────────────────────────────
    const { sale, payment } = await prisma.$transaction(async (tx) => {
      // 1. Payment 생성 (수동 등록)
      const createdPayment = await tx.payment.create({
        data: {
          orderId,
          productCode,
          productName: product.packageName,
          amount: parsedAmount,
          currency: 'KRW',
          buyerName: customerName.trim(),
          buyerTel: normalizedPhone || customerPhone.trim(),
          status: 'completed',
          pgProvider: 'manual',
          pgMid: 'manual',
          paidAt: resolvedSaleDate,
          affiliateCode: null,
          affiliateMallUserId: null,
          metadata: { isManualSale: true, remarks: remarks || null },
          updatedAt: new Date(),
        },
      });

      // 2. AffiliateSale 생성 (isHqFallback = true, 수당 0원)
      const createdSale = await tx.affiliateSale.create({
        data: {
          externalOrderCode: orderId,
          leadId: null,
          affiliateProductId: null,
          managerId: hqManagerId,
          agentId: null,
          productCode,
          cabinType: cabinType || null,
          fareCategory: null,
          headcount: headcount ? parseInt(String(headcount), 10) : null,
          saleAmount: parsedAmount,
          costAmount: null,
          netRevenue: parsedAmount,
          branchCommission: 0,
          salesCommission: 0,
          overrideCommission: 0,
          withholdingAmount: 0,
          status: 'CONFIRMED',
          saleDate: resolvedSaleDate,
          confirmedAt: resolvedSaleDate,
          updatedAt: new Date(),
          metadata: {
            isHqFallback: true,
            isManualSale: true,
            remarks: remarks || null,
            registeredBy: 'admin',
          },
        },
      });

      // 3. Payment에 saleId 연결
      await tx.payment.update({
        where: { id: createdPayment.id },
        data: { saleId: createdSale.id },
      });

      return { sale: createdSale, payment: createdPayment };
    });

    // ── Trip/Reservation 생성 (선택적, 실패해도 매출은 유지) ────────────────
    try {
      let trip = await prisma.trip.findFirst({
        where: { productCode },
        select: { id: true },
      });
      if (!trip) {
        trip = await prisma.trip.create({
          data: {
            productCode,
            shipName: product.shipName || product.packageName,
            departureDate: resolvedSaleDate,
            status: 'Upcoming',
          },
          select: { id: true },
        });
      }
      await prisma.reservation.create({
        data: {
          tripId: trip.id,
          mainUserId: userId,
          totalPeople: headcount ? parseInt(String(headcount), 10) : 1,
          cabinType: cabinType || null,
          paymentDate: resolvedSaleDate,
          paymentMethod: 'manual',
          paymentAmount: parsedAmount,
          passportStatus: 'PENDING',
          pnrStatus: 'PENDING',
          status: 'CONFIRMED',
          affiliateSaleId: sale.id,
          remarks: remarks ? `[수동등록] ${remarks}` : '[수동등록]',
        },
      });
    } catch (err) {
      logger.warn('[ManualSale] Reservation 생성 실패 (매출은 정상 등록)', {
        error: err instanceof Error ? err.message : String(err),
        saleId: sale.id,
      });
    }

    logger.info('[ManualSale] 본사 직접 매출 등록 완료', {
      orderId,
      saleId: sale.id,
      customerName: customerName.trim(),
      productCode,
      amount: parsedAmount,
    });

    return NextResponse.json({
      ok: true,
      saleId: sale.id,
      orderId,
      message: '본사 직접 매출이 등록되었습니다.',
    });
  } catch (err) {
    logger.error('[ManualSale] 등록 실패', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, message: '매출 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
