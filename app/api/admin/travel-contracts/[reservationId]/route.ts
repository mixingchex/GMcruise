export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { STANDARD_CRUISE_CANCELLATION_POLICY } from '@/lib/contracts/travel-contract-generator';
import type { TravelContractData } from '@/lib/contracts/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: '권한이 없습니다.' }, { status: 401 });
    }

    const { reservationId } = await params;
    // WO-CR-20: reservationId 음수 검증
    const resId = parseInt(reservationId, 10);
    if (isNaN(resId) || resId <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid reservationId' }, { status: 400 });
    }

    const contract = await prisma.travelContract.findUnique({
      where: { reservationId: resId },
    });

    return NextResponse.json({ ok: true, contract });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[TravelContract GET]', { error: msg });
    return NextResponse.json({ ok: false, error: '조회 실패' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: '권한이 없습니다.' }, { status: 401 });
    }

    const { reservationId } = await params;
    // WO-CR-20: reservationId 음수 검증
    const resId = parseInt(reservationId, 10);
    if (isNaN(resId) || resId <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid reservationId' }, { status: 400 });
    }

    // WO-CR-07: partner role 접근 차단 (admin/superadmin만 허용)
    const sessionUser = auth.user;
    if (sessionUser?.role === 'partner') {
      logger.warn('[ContractCreate] partner role 접근 시도', {
        userId: sessionUser.id,
        reservationId: resId,
      });
      return NextResponse.json({ ok: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    // 예약 + 관련 데이터 조회
    const reservation = await prisma.reservation.findUnique({
      where: { id: resId },
      include: {
        Trip: true,
        Traveler: true,
        User: true,
        AffiliateSale: {
          include: {
            AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json({ ok: false, error: '예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 상품 정보 조회
    const product = await prisma.cruiseProduct.findUnique({
      where: { productCode: reservation.Trip.productCode },
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: '상품 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 메인 여행자 (첫 번째 또는 예약자)
    const mainTraveler = reservation.Traveler?.[0];
    if (!mainTraveler) {
      logger.warn('[TravelContract] No traveler data for reservation', { reservationId: resId });
    }
    const mainName = mainTraveler?.korName || reservation.User?.name || '미입력';
    const mainPhone = mainTraveler?.phone || reservation.User?.phone || '';

    // 어필리에이트 담당자
    const affiliateAgent = reservation.AffiliateSale
      ?.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile;
    const affiliateName = affiliateAgent?.displayName
      || reservation.agentName
      || '크루즈닷 담당자';
    const affiliatePhone = affiliateAgent?.contactPhone || null;

    // 패키지 여부
    const productTags = Array.isArray(product.tags) ? (product.tags as string[]) : [];
    const isPackage = !!(reservation.airlineName || product.airlineName);
    const hasHotel = productTags.some(t => t.includes('호텔') || t.toLowerCase().includes('hotel'));
    const hasInsurance = productTags.some(t => t.includes('보험') || t.toLowerCase().includes('insurance'));

    // 날짜 포맷
    const trip = reservation.Trip;
    const fmtDate = (d: Date) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

    const departureDate = trip.departureDate || trip.createdAt || new Date();
    const returnDate = trip.endDate ?? departureDate; // null이면 당일 여행으로 처리
    const nights = trip.endDate
      ? Math.max(0, Math.ceil((returnDate.getTime() - departureDate.getTime()) / 86400000))
      : 0;
    const days = nights + 1;

    // 1인당 가격
    const totalAmount = reservation.paymentAmount || 0;
    const totalPeople = Math.max(1, reservation.totalPeople || 1);
    const pricePerPerson = totalAmount > 0 && totalPeople > 0
      ? Math.round(totalAmount / totalPeople)
      : (product.basePrice || 0);

    // 교통수단별 출발/도착 기본값
    const departure = reservation.airlineName ? '인천국제공항' : '부산항';
    // 크루즈는 출발항과 귀항이 동일한 경우가 많지만, 항공 포함시 귀항지 구분
    const arrival = reservation.airlineName ? '인천국제공항' : '부산항 (귀항)';

    const contractData: TravelContractData = {
      reservationId: resId,
      // WO-ME-02: productName, shipName .trim() 추가
      productName: (product.packageName || '').trim(),
      shipName: (product.shipName || '').trim(),
      airlineName: reservation.airlineName || product.airlineName || null,
      isPackage,
      hasHotel,
      hasInsurance,
      departureDate: fmtDate(departureDate),
      returnDate: fmtDate(returnDate),
      nights,
      days,
      departure,
      arrival,
      totalPeople,
      mainTravelerName: mainName,
      mainTravelerPhone: mainPhone,
      pricePerPerson,
      totalAmount: totalAmount || pricePerPerson * totalPeople,
      affiliateName,
      affiliatePhone,
      customerEmail: reservation.User?.email || null,
      cancellationPolicy: STANDARD_CRUISE_CANCELLATION_POLICY,
      excludedItems: [],
    };

    // 계약 만료일 (생성 후 7일)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 기존 계약서 조회 (이미 서명된 경우 차단, 토큰 재사용)
    const existingContract = await prisma.travelContract.findUnique({
      where: { reservationId: resId },
      select: { token: true, status: true },
    });

    // 이미 서명된 경우 차단
    if (existingContract?.status === 'signed') {
      return NextResponse.json({
        ok: false,
        error: '이미 서명된 계약서입니다. 취소 후 재발송하세요.',
      }, { status: 409 });
    }

    // 새로 만들 때만 토큰 생성 (기존 계약서는 토큰 유지)
    const token = existingContract?.token || randomBytes(32).toString('hex');

    // Upsert (이미 있으면 갱신, token은 update에 포함하지 않음)
    const contract = await prisma.travelContract.upsert({
      where: { reservationId: resId },
      update: {
        contractData,
        status: 'pending',
        expiresAt,
        customerSignature: null,
        signedAt: null,
      },
      create: {
        reservationId: resId,
        token,
        contractData,
        status: 'pending',
        expiresAt,
      },
    });

    // 서명 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr';
    const signUrl = `${baseUrl}/contract/${contract.token}`;

    logger.info('[TravelContract POST] 계약서 생성', {
      reservationId: resId,
      contractId: contract.id,
      adminId: auth.user?.id,
    });

    return NextResponse.json({
      ok: true,
      contract,
      signUrl,
      message: '계약서가 생성되었습니다.',
    });
  } catch (error: unknown) {
    // P2-05: Unique Constraint 충돌 (동시 요청 등으로 P2002 발생 시)
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json({ ok: false, error: '이 예약의 계약서가 이미 존재합니다.' }, { status: 409 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[TravelContract POST]', { error: msg });
    return NextResponse.json({ ok: false, error: '계약서 생성 실패' }, { status: 500 });
  }
}
