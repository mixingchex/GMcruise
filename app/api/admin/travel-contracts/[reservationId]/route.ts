export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
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
    const resId = parseInt(reservationId);
    if (isNaN(resId)) {
      return NextResponse.json({ ok: false, error: 'Invalid reservationId' }, { status: 400 });
    }

    const contract = await prisma.travelContract.findUnique({
      where: { reservationId: resId },
    });

    return NextResponse.json({ ok: true, contract });
  } catch (error: any) {
    logger.error('[TravelContract GET]', error);
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
    const resId = parseInt(reservationId);
    if (isNaN(resId)) {
      return NextResponse.json({ ok: false, error: 'Invalid reservationId' }, { status: 400 });
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
    const mainTraveler = reservation.Traveler[0];
    const mainName = mainTraveler?.korName || reservation.User.name || '여행자';
    const mainPhone = mainTraveler?.phone || reservation.User.phone || '';

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
    const dept = reservation.Trip.departureDate;
    const ret = reservation.Trip.endDate || dept;
    const fmtDate = (d: Date) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

    // 1인당 가격
    const pricePerPerson = reservation.paymentAmount
      ? Math.round(reservation.paymentAmount / reservation.totalPeople)
      : (product.basePrice || 0);

    // 교통수단별 출발/도착 기본값
    const departure = reservation.airlineName ? '인천국제공항' : '부산항';
    const arrival = reservation.airlineName ? '인천국제공항' : '부산항';

    const contractData: TravelContractData = {
      reservationId: resId,
      productName: product.packageName,
      shipName: product.shipName,
      airlineName: reservation.airlineName || product.airlineName || null,
      isPackage,
      hasHotel,
      hasInsurance,
      departureDate: fmtDate(dept),
      returnDate: fmtDate(ret),
      nights: product.nights,
      days: product.days,
      departure,
      arrival,
      totalPeople: reservation.totalPeople,
      mainTravelerName: mainName,
      mainTravelerPhone: mainPhone,
      pricePerPerson,
      totalAmount: reservation.paymentAmount || pricePerPerson * reservation.totalPeople,
      affiliateName,
      affiliatePhone,
      cancellationPolicy: STANDARD_CRUISE_CANCELLATION_POLICY,
      excludedItems: [],
    };

    // 계약 만료일 (생성 후 30일)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Upsert (이미 있으면 갱신)
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
  } catch (error: any) {
    logger.error('[TravelContract POST]', error);
    return NextResponse.json({ ok: false, error: '계약서 생성 실패' }, { status: 500 });
  }
}
