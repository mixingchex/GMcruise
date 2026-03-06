export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { STANDARD_CRUISE_CANCELLATION_POLICY } from '@/lib/contracts/travel-contract-generator';
import type { TravelContractData } from '@/lib/contracts/types';
import { sendTravelContractRequestEmail } from '@/lib/email';
import { Prisma } from '@prisma/client';

/** 계약서 서명 요청 유효기간 — POST 신규 발송 및 PUT 재발송 공통 */
const CONTRACT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

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
      select: {
        id: true,
        reservationId: true,
        token: true,
        status: true,
        expiresAt: true,
        signedAt: true,
        contractData: true,
        customerAddress: true,
        contractorPhone: true,
        companions: true,
        generatedAt: true,
        pdfUrl: true,
        marketingConsent: true,
        createdAt: true,
        updatedAt: true,
        customerSignature: true,
        contractorSignature: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ ok: true, contract: null });
    }

    const { customerSignature, contractorSignature, ...contractWithoutSignatures } = contract;

    return NextResponse.json({
      ok: true,
      contract: {
        ...contractWithoutSignatures,
        hasCustomerSignature: !!customerSignature,
        hasContractorSignature: !!contractorSignature,
      },
    });
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
    const expiresAt = new Date(Date.now() + CONTRACT_EXPIRY_MS);

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

    // TOCTOU 방지: upsert 대신 updateMany(guard) + create 분리 패턴
    // updateMany where { status: { not: 'signed' } } → findUnique와 updateMany 사이에
    // 동시 서명이 발생하면 count=0으로 감지하여 409 반환
    let contract;
    if (existingContract) {
      const newToken = randomBytes(32).toString('hex');
      try {
        contract = await prisma.$transaction(async (tx) => {
          const current = await tx.travelContract.findUnique({
            where: { reservationId: resId },
            select: { id: true, status: true },
          });
          if (!current) {
            throw Object.assign(new Error(''), { code: 'NOT_FOUND' });
          }
          if (current.status === 'signed') {
            throw Object.assign(new Error(''), { code: 'ALREADY_SIGNED' });
          }
          return tx.travelContract.update({
            where: { id: current.id },
            data: {
              token: newToken, // 재발송 시 새 토큰 발급 — 구 이메일 링크 무효화
              contractData,
              status: 'pending',
              expiresAt,
              customerSignature: null,
              signedAt: null,
            },
          });
        });
      } catch (txErr: unknown) {
        const code = (txErr as NodeJS.ErrnoException).code;
        if (code === 'NOT_FOUND') {
          return NextResponse.json({ ok: false, error: '계약서 갱신 후 조회 실패' }, { status: 500 });
        }
        if (code === 'ALREADY_SIGNED') {
          return NextResponse.json({
            ok: false,
            error: '계약서가 방금 서명되었습니다. 취소 후 재발송하세요.',
          }, { status: 409 });
        }
        throw txErr;
      }
    } else {
      const newToken = randomBytes(32).toString('hex');
      contract = await prisma.travelContract.create({
        data: {
          reservationId: resId,
          token: newToken,
          contractData,
          status: 'pending',
          expiresAt,
          companions: [],
        },
      });
    }

    // 서명 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr';
    const signUrl = `${baseUrl}/contract/${contract.token}`;

    logger.info('[TravelContract POST] 계약서 생성', {
      reservationId: resId,
      contractId: contract.id,
      adminId: auth.user?.id,
    });

    // 고객 이메일 있으면 서명 요청 이메일 자동발송 (실패해도 계약서 생성 성공)
    let emailSent = false;
    const customerEmail = reservation.User?.email;
    if (customerEmail) {
      emailSent = await sendTravelContractRequestEmail({
        customerEmail,
        customerName: contractData.mainTravelerName,
        productName: contractData.productName,
        signUrl,
        expiresAt,
      }).catch((err: unknown) => {
        logger.error('[TravelContract POST] 서명요청 이메일 발송 실패', {
          reservationId: resId,
          error: err instanceof Error ? err.message : String(err),
        });
        return false;
      });
    }

    // GET 응답과 동일하게 서명 이미지 마스킹 — PII 최소 노출
    const { customerSignature, contractorSignature, ...safeContract } = contract;
    return NextResponse.json({
      ok: true,
      contract: {
        ...safeContract,
        hasCustomerSignature: !!customerSignature,
        hasContractorSignature: !!contractorSignature,
      },
      signUrl,
      emailSent,
      message: emailSent
        ? '계약서가 생성되고 서명 요청 이메일이 발송되었습니다.'
        : '계약서가 생성되었습니다.',
    });
  } catch (error: unknown) {
    // P2-05: Unique Constraint 충돌 (동시 요청 등으로 P2002 발생 시)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ ok: false, error: '이 예약의 계약서가 이미 존재합니다.' }, { status: 409 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[TravelContract POST]', { error: msg });
    return NextResponse.json({ ok: false, error: '계약서 생성 실패' }, { status: 500 });
  }
}

// PUT /api/admin/travel-contracts/[reservationId]
// 서명된 계약서를 pending으로 리셋 (재발송 전처리)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: '권한이 없습니다.' }, { status: 401 });
    }

    const { reservationId } = await params;
    const resId = parseInt(reservationId, 10);
    if (isNaN(resId) || resId <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid reservationId' }, { status: 400 });
    }

    const sessionUser = auth.user;
    if (sessionUser?.role === 'partner') {
      return NextResponse.json({ ok: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 200).trim() : '';

    // signed 상태인 계약서만 리셋 허용 — $transaction + update로 토큰 교체 (구 이메일 링크 무효화)
    const newToken = randomBytes(32).toString('hex');
    const resetExpiresAt = new Date(Date.now() + CONTRACT_EXPIRY_MS);

    let resetContract: { id: number };
    try {
      resetContract = await prisma.$transaction(async (tx) => {
        const current = await tx.travelContract.findUnique({
          where: { reservationId: resId },
          select: { id: true, status: true },
        });
        if (!current) {
          throw Object.assign(new Error('계약서를 찾을 수 없습니다.'), { code: 'NOT_FOUND' });
        }
        if (current.status !== 'signed') {
          throw Object.assign(
            new Error(`서명된 계약서가 없습니다. 현재 상태: ${current.status}`),
            { code: 'NOT_SIGNED' }
          );
        }
        return tx.travelContract.update({
          where: { id: current.id },
          data: {
            token: newToken, // 구 토큰 무효화 — 구 이메일 링크로 서명 불가
            status: 'pending',
            expiresAt: resetExpiresAt,
            customerSignature: null,
            contractorSignature: null,
            customerAddress: null,
            contractorPhone: null,
            companions: [],
            signedAt: null,
            marketingConsent: null,
            pdfUrl: null,
          },
          select: { id: true },
        });
      });
    } catch (txErr: unknown) {
      const code = (txErr as NodeJS.ErrnoException).code;
      if (code === 'NOT_FOUND') {
        return NextResponse.json({ ok: false, error: '계약서를 찾을 수 없습니다.' }, { status: 404 });
      }
      if (code === 'NOT_SIGNED') {
        return NextResponse.json({
          ok: false,
          error: (txErr as Error).message,
        }, { status: 409 });
      }
      throw txErr;
    }

    // 취소 이력 DB 저장 (실패해도 PUT 자체는 성공)
    const contractForAudit = resetContract;
    if (contractForAudit) {
      await prisma.travelContractAudit.create({
        data: {
          contractId: contractForAudit.id,
          action: 'reset',
          adminId: sessionUser?.id ?? null,
          reason: reason || null,
          previousStatus: 'signed',
          metadata: { reservationId: resId },
        },
      }).catch((auditErr: unknown) => {
        logger.warn('[TravelContract PUT] audit 저장 실패 (무시)', {
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        });
      });
    }

    logger.info('[TravelContract PUT] 계약서 서명 취소 (재발송용)', {
      reservationId: resId,
      adminId: sessionUser?.id,
      ...(reason ? { reason } : {}),
    });

    return NextResponse.json({ ok: true, message: '계약서가 초기화되었습니다.' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[TravelContract PUT]', { error: msg });
    return NextResponse.json({ ok: false, error: '계약서 초기화 실패' }, { status: 500 });
  }
}
