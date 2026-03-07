export const dynamic = 'force-dynamic';

// app/api/payment/webhook/route.ts
// 결제 완료 웹훅 (외부 결제 시스템에서 호출)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateLedgerEntries, calculateCommissionBreakdown } from '@/lib/affiliate/commission';
import { notifyCommissionTierMissing } from '@/lib/affiliate/admin-notifications';
import { log, error, warn } from '@/lib/logger-wrapper';
import { hashPassword, SYSTEM_PASSWORDS } from '@/lib/password';
import { normalizePhone } from '@/lib/phone-utils';

/**
 * POST: 결제 완료 웹훅
 * 내부 callback 라우트에서만 호출되는 내부 전용 엔드포인트.
 * WEBHOOK_SECRET 헤더 검증으로 외부 임의 호출을 차단한다.
 */
export async function POST(req: NextRequest) {
  // [보안] 내부 전용 비밀키 검증 (자동화 보호)
  // INTERNAL_WEBHOOK_SECRET이 설정되면 → 엄격한 검증 (권장)
  // 미설정이면 → 경고 후 통과 (하위호환, Vercel 환경변수 추가 시 자동 보안 강화)
  const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET;
  if (!webhookSecret) {
    error('[Payment Webhook] INTERNAL_WEBHOOK_SECRET 환경변수가 설정되지 않았습니다. 모든 요청 거부.');
    return NextResponse.json({ ok: false, message: '서버 설정 오류' }, { status: 500 });
  }
  const requestSecret = req.headers.get('x-internal-webhook-secret');
  if (requestSecret !== webhookSecret) {
    error('[Payment Webhook] Unauthorized request - invalid x-internal-webhook-secret');
    return NextResponse.json({ ok: false, message: '인증되지 않은 요청입니다.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      imp_uid, // 아임포트 결제 고유 ID (또는 PG TID)
      merchant_uid, // 주문번호
      status, // 결제 상태 ('paid', 'ready', 'failed', 'cancelled')
      amount, // 결제 금액
      productCode,
      customerName,
      customerPhone,
      cabinType,
      fareCategory,
      headcount,
      costAmount,
      metadata, // 추가 메타데이터 (leadId, partnerId 등)
      // [v11.0] callback에서 직접 전달되는 파트너 정보
      affiliateCode: directAffiliateCode,
      affiliateMallUserId: directAffiliateUserId,
      _partnerSource, // 디버그용 출처 정보
    } = body;

    // [v11.0] 디버그 로그
    log('[Payment Webhook v11.0] ===== 요청 수신 =====');
    log('[Payment Webhook v11.0] 기본 정보:', {
      imp_uid,
      merchant_uid,
      status,
      amount,
      productCode,
      customerName,
    });
    log('[Payment Webhook v11.0] 파트너 정보 (직접 전달):', {
      directAffiliateCode: directAffiliateCode || '(empty)',
      directAffiliateUserId: directAffiliateUserId || '(empty)',
      _partnerSource: _partnerSource || '(unknown)',
    });

    // 결제 성공 여부 확인
    if (status !== 'paid') {
      return NextResponse.json({ ok: false, message: '결제가 완료되지 않았습니다.' }, { status: 400 });
    }

    if (!imp_uid || !merchant_uid || !amount || !productCode) {
      return NextResponse.json({ ok: false, message: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    // 🔒 결제 금액 검증: DB에 저장된 금액과 비교
    if (merchant_uid) {
      const existingPayment = await prisma.payment.findFirst({
        where: { orderId: merchant_uid },
        select: { amount: true },
      });

      if (existingPayment && existingPayment.amount !== amount) {
        error('[Payment Webhook] 금액 불일치 탐지:', {
          expected: existingPayment.amount,
          received: amount,
          orderId: merchant_uid,
        });
        return NextResponse.json({
          ok: false,
          message: '결제 금액이 일치하지 않습니다. 관리자에게 문의하세요.'
        }, { status: 400 });
      }
    }

    // 🔒 중복 호출 방지: 이미 처리된 주문인지 확인 (DB 에러 핸들링 추가)
    let existingSale = null;
    try {
      existingSale = await prisma.affiliateSale.findFirst({
        where: { externalOrderCode: merchant_uid },
        select: { id: true, createdAt: true },
      });

      if (existingSale) {
        log(`[Payment Webhook] ⚠️ 이미 처리된 주문입니다: ${merchant_uid} (saleId: ${existingSale.id})`);
        return NextResponse.json({
          ok: true,
          message: '이미 처리된 주문입니다.',
          saleId: existingSale.id,
          duplicate: true,
        });
      }
    } catch (dbError) {
      // DB 조회 실패 시에도 계속 진행 (graceful degradation)
      error('[Payment Webhook] DB 조회 실패 (중복 체크):', dbError);
      warn('[Payment Webhook] 중복 체크 실패 - 계속 진행 (중복 가능성 있음)');
      // 중복 생성 방지를 위해 나중에 skipDuplicates: true 사용
    }

    // [v11.0] 어필리에이트 코드 추적 - 우선순위: 직접전달 > 쿠키 > metadata
    const cookies = req.cookies;
    const affiliateCode = directAffiliateCode || cookies.get('affiliate_code')?.value || metadata?.affiliateCode || null;
    const affiliateMallUserId = directAffiliateUserId || cookies.get('affiliate_mall_user_id')?.value || metadata?.partnerId || null;
    const leadId = metadata?.leadId || null;

    log('[Payment Webhook v11.0] 최종 파트너 정보:', {
      affiliateCode: affiliateCode || 'NONE',
      affiliateMallUserId: affiliateMallUserId || 'NONE',
      leadId: leadId || 'NONE',
    });

    // 어필리에이트 프로필 찾기 (DB 에러 핸들링 추가)
    let managerId: number | null = null;
    let agentId: number | null = null;

    if (affiliateCode || affiliateMallUserId) {
      let affiliateProfile = null;

      try {
        // 방법 1: affiliateCode로 찾기
        if (affiliateCode) {
          affiliateProfile = await prisma.affiliateProfile.findFirst({
            where: {
              affiliateCode: affiliateCode,
              status: 'ACTIVE',
            },
            select: {
              id: true,
              type: true,
              AffiliateRelation_AffiliateRelation_agentIdToAffiliateProfile: {
                where: { status: 'ACTIVE' },
                select: { managerId: true },
                take: 1,
              },
            },
          });
        }

        // 방법 2: affiliateMallUserId로 찾기 (mallUserId로 찾기)
        if (!affiliateProfile && affiliateMallUserId) {
          // User를 mallUserId로 찾기
          const user = await prisma.user.findFirst({
            where: { mallUserId: affiliateMallUserId },
            select: { id: true, mallUserId: true },
          });

          if (user) {
            // User와 연결된 AffiliateProfile 찾기
            affiliateProfile = await prisma.affiliateProfile.findFirst({
              where: {
                userId: user.id,
                status: 'ACTIVE',
              },
              select: {
                id: true,
                type: true,
                AffiliateRelation_AffiliateRelation_agentIdToAffiliateProfile: {
                  where: { status: 'ACTIVE' },
                  select: { managerId: true },
                  take: 1,
                },
              },
            });
          }
        }

        if (affiliateProfile) {
          if (affiliateProfile.type === 'BRANCH_MANAGER') {
            managerId = affiliateProfile.id;
          } else if (affiliateProfile.type === 'SALES_AGENT') {
            agentId = affiliateProfile.id;
            // 판매원이 속한 대리점장 찾기
            const relations = affiliateProfile.AffiliateRelation_AffiliateRelation_agentIdToAffiliateProfile;
            if (relations && relations.length > 0) {
              managerId = relations[0].managerId;
            }
          }
        }
      } catch (dbError) {
        // DB 조회 실패 시에도 계속 진행 (파트너 정보 없이 본사 직접 판매로 처리)
        error('[Payment Webhook] DB 조회 실패 (어필리에이트 프로필):', dbError);
        warn('[Payment Webhook] 어필리에이트 조회 실패 - 본사 직접 판매로 처리');
      }
    }

    // Lead에서 어필리에이트 정보 가져오기 (없는 경우)
    if (!managerId && !agentId && leadId) {
      const lead = await prisma.affiliateLead.findUnique({
        where: { id: Number(leadId) },
        select: {
          managerId: true,
          agentId: true,
        },
      });

      if (lead) {
        managerId = lead.managerId ?? null;
        agentId = lead.agentId ?? null;
      }
    }

    // 고아 결제 → 본사(HQ) 자동 연결: 어필리에이트 정보 없으면 HQ managerId로 귀속
    if (!managerId && !agentId) {
      const hqProfile = await prisma.affiliateProfile.findFirst({
        where: { type: 'HQ', status: 'ACTIVE' },
        select: { id: true },
        orderBy: { createdAt: 'asc' }, // 가장 먼저 생성된 HQ
      }).catch(() => null);
      if (hqProfile) {
        managerId = hqProfile.id;
      }
    }

    // AffiliateProduct 찾기
    let affiliateProductId: number | null = null;
    if (productCode) {
      const affiliateProduct = await prisma.affiliateProduct.findFirst({
        where: {
          productCode,
          isPublished: true,
          effectiveFrom: { lte: new Date() },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
        },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      });

      if (affiliateProduct) {
        affiliateProductId = affiliateProduct.id;
      }
    }

    // 🎯 CommissionTier 조회 (상품별 수당 설정)
    let commissionTier = null;
    const roomSelections = metadata?.roomSelections || [];

    // cabinType 영문→한글 정규화 (MallProductContent에서 영문값이 올 수 있음)
    const CABIN_TYPE_NORMALIZE: Record<string, string> = {
      'INSIDE': '인사이드', 'inside': '인사이드',
      'OCEANVIEW': '오션뷰', 'oceanview': '오션뷰', 'OCEAN_VIEW': '오션뷰',
      'BALCONY': '발코니', 'balcony': '발코니',
      'SUITE': '스위트', 'suite': '스위트',
    };
    const normalizeCabinType = (raw: string | undefined | null): string | null => {
      if (!raw) return null;
      return CABIN_TYPE_NORMALIZE[raw] ?? raw;
    };

    // 객실 타입 결정: 직접 전달된 cabinType 또는 roomSelections의 첫 번째 객실
    let determinedCabinType = normalizeCabinType(cabinType);
    if (!determinedCabinType && roomSelections.length > 0) {
      determinedCabinType = normalizeCabinType(roomSelections[0].roomType);
    }

    if (affiliateProductId && determinedCabinType) {
      commissionTier = await prisma.affiliateCommissionTier.findFirst({
        where: {
          affiliateProductId,
          cabinType: determinedCabinType,
          // fareCategory가 있으면 매칭, 없으면 무시
          ...(fareCategory ? { fareCategory } : {}),
        },
        select: {
          cabinType: true,
          fareCategory: true,
          saleAmount: true,
          costAmount: true,
          branchShareAmount: true,
          salesShareAmount: true,
          overrideAmount: true,
          currency: true,
        },
      });

      if (commissionTier) {
        log('[Payment Webhook] CommissionTier 찾음:', {
          productCode,
          cabinType: determinedCabinType,
          branchShare: commissionTier.branchShareAmount,
          salesShare: commissionTier.salesShareAmount,
        });
      } else {
        warn('[Payment Webhook] CommissionTier를 찾을 수 없음:', {
          productCode,
          affiliateProductId,
          cabinType: determinedCabinType,
          fareCategory,
        });

        // 🚨 어필리에이트 판매인 경우에만 관리자 알림 (수당이 0원으로 처리됨)
        if (affiliateProductId && (managerId || agentId)) {
          notifyCommissionTierMissing(
            productCode,
            determinedCabinType || 'unknown',
            affiliateProductId,
            fareCategory
          ).catch((e) => {
            error('[Payment Webhook] 알림 전송 실패:', e);
          });
        }
      }
    }

    // 수당 계산 (🎯 CommissionTier 적용!)
    // [WO-PAY-06] commissionTier?.costAmount를 우선 사용 — breakdown과 동일한 소스로 일관성 유지
    const resolvedCostAmount = commissionTier?.costAmount ?? costAmount ?? 0;
    const netRevenue = amount - resolvedCostAmount;
    const breakdown = calculateCommissionBreakdown({
      saleAmount: amount,
      costAmount: resolvedCostAmount,
      branchCommission: commissionTier?.branchShareAmount || 0, // 🎯 Tier에서 가져옴!
      salesCommission: commissionTier?.salesShareAmount || 0,   // 🎯 Tier에서 가져옴!
      overrideCommission: commissionTier?.overrideAmount || 0,  // 🎯 Tier에서 가져옴!
      currency: commissionTier?.currency || 'KRW',
    });

    // 🎯 실제 수당 결정 (어필리에이트 여부에 따라)
    const actualBranchCommission = managerId && !agentId ? breakdown.branchCommission : 0;
    const actualSalesCommission = agentId ? breakdown.salesCommission : 0;
    const actualOverrideCommission = managerId && agentId ? breakdown.overrideCommission : 0;

    // WO-PROD-01: AffiliateSale + CommissionLedger + Payment 원자적 트랜잭션
    // 셋 중 하나라도 실패하면 전체 롤백 → 불일치 상태 원천 차단
    const { sale, ledgerResult } = await prisma.$transaction(async (tx) => {
      // 1. AffiliateSale 생성
      const createdSale = await tx.affiliateSale.create({
        data: {
          externalOrderCode: merchant_uid,
          leadId: leadId ? Number(leadId) : null,
          affiliateProductId,
          managerId: managerId,
          agentId: agentId,
          productCode,
          cabinType: determinedCabinType || cabinType || null,
          fareCategory: fareCategory || null,
          headcount: headcount || null,
          saleAmount: amount,
          costAmount: commissionTier?.costAmount || costAmount || null,
          netRevenue,
          branchCommission: actualBranchCommission,
          salesCommission: actualSalesCommission,
          overrideCommission: actualOverrideCommission,
          withholdingAmount: breakdown.totalWithholding,
          status: 'CONFIRMED',
          saleDate: new Date(),
          confirmedAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            ...metadata,
            imp_uid,
            merchant_uid,
            affiliateCode,
            affiliateMallUserId,
            commissionTierId: commissionTier ? `${affiliateProductId}-${determinedCabinType}` : null,
            roomSelections,
          },
        },
      });

      // 2. CommissionLedger 엔트리 계산 (순수 함수 — DB 없음)
      const calculatedLedger = generateLedgerEntries({
        saleId: createdSale.id,
        saleAmount: amount,
        costAmount: commissionTier?.costAmount || costAmount || 0,
        branchCommission: agentId ? 0 : (commissionTier?.branchShareAmount || 0),
        salesCommission: agentId ? (commissionTier?.salesShareAmount || 0) : 0,
        overrideCommission: managerId && agentId ? (commissionTier?.overrideAmount || 0) : 0,
        managerProfileId: managerId ?? undefined,
        agentProfileId: agentId ?? undefined,
        currency: commissionTier?.currency || 'KRW',
        metadata: {
          ...metadata,
          imp_uid,
          merchant_uid,
          affiliateCode,
          affiliateMallUserId,
          commissionTierId: commissionTier ? `${affiliateProductId}-${determinedCabinType}` : null,
        },
      });

      // 3. CommissionLedger 생성
      if (calculatedLedger.ledgerEntries.length > 0) {
        await tx.commissionLedger.createMany({
          data: calculatedLedger.ledgerEntries.map((entry) => ({
            ...entry,
            updatedAt: new Date(),
          })),
          skipDuplicates: true,
        });
        log('[Payment Webhook] CommissionLedger 생성 완료:', calculatedLedger.ledgerEntries.length);
      }

      // 4. Payment 상태 업데이트 (TOCTOU 방어: status: { not: 'completed' })
      await tx.payment.updateMany({
        where: { orderId: merchant_uid, status: { not: 'completed' } },
        data: {
          status: 'completed',
          paidAt: new Date(),
          pgTransactionId: imp_uid,
          saleId: createdSale.id,
        },
      });

      return { sale: createdSale, ledgerResult: calculatedLedger };
    });

    // 🔴 CRITICAL: Reservation 생성 (PNR/여권 정보 입력을 위해 필요)
    // 실패 시 수동 환불 필요함을 DB에 기록
    let reservationId: number | null = null;
    let reservationFailed = false;
    try {
      // 1. 총 인원 수 계산
      const totalGuests = metadata?.totalGuests || roomSelections.reduce((sum: number, sel: any) => {
        return sum + (sel.adult || 0) + (sel.adult3rd || 0) + (sel.child2to11 || 0) + (sel.infantUnder2 || 0);
      }, 0) || 1;

      // 2. User 찾기 또는 생성 (customerPhone 기준)
      // WQ-01: normalizePhone 공통 유틸 사용 (lib/phone-utils)
      const normalizedPhone = normalizePhone(customerPhone) ?? '';

      let userId: number;

      if (normalizedPhone.length >= 10) {
        // 기존 User 찾기
        let existingUser = await prisma.user.findFirst({
          where: { phone: normalizedPhone },
          select: { id: true, customerStatus: true },
        });

        if (existingUser) {
          userId = existingUser.id;
          // C-A: customerStatus만 업데이트 (이름 변경 금지 - 기존 유저 정보 보호)
          if (existingUser.customerStatus !== 'package') {
            await prisma.user.update({
              where: { id: userId },
              data: { customerStatus: 'active' },
            });
          }
        } else {
          // 새 User 생성
          const newUser = await prisma.user.create({
            data: {
              name: customerName?.trim() || '고객',
              phone: normalizedPhone,
              password: await hashPassword(SYSTEM_PASSWORDS.GUIDE_ACTIVE),
              role: 'user',
              onboarded: false,
              customerSource: 'guide-purchase',
              customerStatus: 'active',
            },
          });
          userId = newUser.id;
        }
      } else {
        // 전화번호가 없으면 임시 User 생성
        const tempUser = await prisma.user.create({
          data: {
            name: customerName?.trim() || '고객',
            phone: `temp_${Date.now()}`,
            password: await hashPassword(SYSTEM_PASSWORDS.TEMP),
            role: 'user',
            onboarded: false,
          },
        });
        userId = tempUser.id;
      }

      // 3. Trip 찾기 또는 생성 (productCode 기준)
      let trip = await prisma.trip.findFirst({
        where: { productCode },
        select: { id: true },
      });

      if (!trip) {
        // 상품 정보 조회
        const product = await prisma.cruiseProduct.findUnique({
          where: { productCode },
          select: { shipName: true, packageName: true },
        });

        // AffiliateProduct에서 출발일 조회
        const affProduct = await prisma.affiliateProduct.findFirst({
          where: { productCode },
          select: { effectiveFrom: true, effectiveTo: true },
        });

        // Trip 생성
        trip = await prisma.trip.create({
          data: {
            productCode,
            shipName: product?.shipName || product?.packageName || productCode,
            departureDate: affProduct?.effectiveFrom || new Date(),
            endDate: affProduct?.effectiveTo || null,
            status: 'Upcoming',
          },
          select: { id: true },
        });
      }

      // 4. Reservation 생성
      const reservation = await prisma.reservation.create({
        data: {
          tripId: trip.id,
          mainUserId: userId,
          totalPeople: totalGuests,
          cabinType: determinedCabinType || null,
          paymentDate: new Date(),
          paymentMethod: 'card',
          paymentAmount: amount,
          passportStatus: 'PENDING',
          pnrStatus: 'PENDING',
          status: 'CONFIRMED',
          affiliateSaleId: sale.id,
          remarks: `주문번호: ${merchant_uid}`,
        },
      });
      reservationId = reservation.id;

      // 5. 빈 Traveler 레코드 생성 (총 인원 수만큼)
      const travelerData = [];
      for (let i = 0; i < totalGuests; i++) {
        travelerData.push({
          reservationId: reservation.id,
          roomNumber: 1, // 기본값, PNR 입력 시 변경
          korName: i === 0 ? (customerName?.trim() || '') : '',
        });
      }

      if (travelerData.length > 0) {
        await prisma.traveler.createMany({
          data: travelerData,
        });
      }

      log('[Payment Webhook] Reservation 생성 완료:', {
        reservationId: reservation.id,
        tripId: trip.id,
        userId,
        totalGuests,
      });

      // 5-B. UserTrip 자동 생성 (AI 가이드 기능 활성화)
      try {
        const guideProduct = await prisma.cruiseProduct.findUnique({
          where: { productCode },
          select: {
            id: true,
            packageName: true,
            shipName: true,
            nights: true,
            days: true,
            itineraryPattern: true,
            startDate: true,
            endDate: true,
          },
        });

        // C-02: startDate는 CruiseProduct.startDate 우선, 없으면 AffiliateProduct.effectiveFrom 조회
        let resolvedStartDate: Date;
        if (guideProduct?.startDate) {
          resolvedStartDate = guideProduct.startDate;
        } else {
          const affProductForDate = await prisma.affiliateProduct.findFirst({
            where: { productCode },
            select: { effectiveFrom: true },
            orderBy: { effectiveFrom: 'desc' },
          });
          resolvedStartDate = affProductForDate?.effectiveFrom ?? new Date();
          if (!affProductForDate?.effectiveFrom) {
            warn('[Payment Webhook] ⚠️ 상품 출발일 미설정 - 현재 날짜 사용 (CruiseProduct.startDate 또는 AffiliateProduct.effectiveFrom 설정 필요):', {
              productCode,
            });
          }
        }
        const startDate = resolvedStartDate;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (guideProduct?.days || 7));

        // P0-02: UserTrip 조회/생성 — async tx → 분리 쿼리 (pgBouncer 호환)
        // externalOrderCode @unique가 이미 중복 결제를 차단하므로 tx 불필요
        // guideProduct가 없으면 productId 조건 없이 기존 UserTrip 재사용 금지 (다른 상품 오염 방지)
        const existingUserTrip = guideProduct?.id ? await prisma.userTrip.findFirst({
          where: {
            userId,
            productId: guideProduct.id,
            status: { not: 'Cancelled' },
          },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        }) : null;
        let tripResult: { id: number; isNew: boolean };
        if (existingUserTrip) {
          tripResult = { id: existingUserTrip.id, isNew: false };
          log('[Payment Webhook] ✅ 기존 UserTrip 재사용:', { userTripId: existingUserTrip.id, userId, productCode });
        } else {
          const createdUserTrip = await prisma.userTrip.create({
            data: {
              userId,
              productId: guideProduct?.id || null,
              cruiseName: guideProduct?.packageName || guideProduct?.shipName || productCode,
              destination: [],
              startDate,
              endDate,
              nights: guideProduct?.nights || 0,
              days: guideProduct?.days || 0,
              status: 'Upcoming',
              updatedAt: new Date(),
            },
          });
          tripResult = { id: createdUserTrip.id, isNew: true };
          log('[Payment Webhook] ✅ UserTrip 자동 생성 완료:', { userTripId: createdUserTrip.id, userId, productCode });
        }
        const userTripId = tripResult.id;

        // 5-C. Itinerary 자동 생성 (신규 UserTrip 또는 기존 UserTrip에 Itinerary가 없는 경우)
        const pattern = guideProduct?.itineraryPattern;
        if (!guideProduct) {
          warn('[Payment Webhook] ⚠️ CruiseProduct 없음 - Itinerary 생성 스킵:', { productCode });
        } else if (!Array.isArray(pattern) || pattern.length === 0) {
          warn('[Payment Webhook] ⚠️ itineraryPattern 비어있음 - Itinerary 생성 스킵:', {
            productCode,
            guideProductId: guideProduct.id,
          });
        } else {
          // HIGH FIX: 기존 UserTrip 재사용 시 Itinerary가 이미 있으면 스킵 (없으면 생성)
          let skipItinerary = false;
          if (!tripResult.isNew) {
            const existingCount = await prisma.itinerary.count({ where: { userTripId } });
            if (existingCount > 0) {
              log('[Payment Webhook] 기존 UserTrip - Itinerary 이미 존재, 생성 스킵:', { userTripId, existingCount });
              skipItinerary = true;
            } else {
              log('[Payment Webhook] 기존 UserTrip - Itinerary 없음, 새로 생성:', { userTripId });
            }
          }

          if (!skipItinerary) {
            const itineraryData = (pattern as Array<Record<string, unknown>>).map((p, idx) => {
              const date = new Date(startDate);
              date.setDate(date.getDate() + idx);
              const isSea = !p.location || p.location === '해상' || p.type === 'sea';
              return {
                userTripId,
                day: typeof p.day === 'number' ? p.day : idx + 1,
                date,
                type: isSea ? 'sea' : (p.type as string) || 'PortVisit',
                location: isSea ? null : (p.location as string) || null,
                country: (p.country as string) || null,
                arrival: (p.arrival as string) || null,
                departure: (p.departure as string) || null,
                updatedAt: new Date(),
              };
            });
            await prisma.itinerary.createMany({ data: itineraryData });
            log('[Payment Webhook] ✅ Itinerary 자동 생성 완료:', { count: itineraryData.length, userTripId });
          }
        }
      } catch (utErr) {
        // UserTrip 생성 실패는 결제 취소 대상 아님 — 로그만 기록
        error('[Payment Webhook] ⚠️ UserTrip 자동 생성 실패 (결제는 정상):', utErr);
      }
    } catch (err) {
      error('[Payment Webhook] 🔴 CRITICAL: Reservation 생성 실패:', err);
      reservationFailed = true;

      // 🔴 CRITICAL: 결제는 완료되었지만 예약 생성 실패 - 자동 환불 시도
      // 트랜잭션으로 Sale과 Payment 업데이트 (원자성 보장)
      try {
        // P0-02: 환불 처리 — async tx → 배열 방식 (pgBouncer 호환)
        // findFirst 제거: 조건부 updateMany(status: { not: 'completed' })로 안전하게 대체
        await prisma.$transaction([
          prisma.affiliateSale.update({
            where: { id: sale.id },
            data: {
              metadata: {
                ...(sale.metadata as object ?? {}),
                reservationFailed: true,
                reservationFailureReason: err instanceof Error ? err.message : String(err),
                reservationFailedAt: new Date().toISOString(),
                autoRefundAttempted: true,
              },
            },
          }),
          prisma.payment.updateMany({
            where: { orderId: merchant_uid },
            data: { status: 'refund_pending' },
          }),
        ]);

        log('[Payment Webhook] ✅ Reservation 실패 정보 DB 기록 완료 (트랜잭션)');
      } catch (txErr) {
        error('[Payment Webhook] ❌ Reservation 실패 정보 DB 기록 실패:', txErr);
      }

      // 환불 대상 사용자 크루즈가이드AI 접근 차단
      // (userId는 try 블록 스코프라 catch에서 미접근 → customerPhone으로 재조회)
      try {
        const refundPhone = normalizePhone(customerPhone);
        if (refundPhone) {
          const refundedUser = await prisma.user.findFirst({
            where: { phone: refundPhone },
            select: { id: true },
          });
          if (refundedUser) {
            await prisma.$transaction([
              prisma.user.update({
                where: { id: refundedUser.id },
                data: { customerStatus: 'refunded' },
              }),
              prisma.userTrip.updateMany({
                where: { userId: refundedUser.id, status: { not: 'Cancelled' } },
                data: { status: 'Cancelled' },
              }),
            ]);
            log('[Payment Webhook] ✅ 환불 처리로 인한 가이드AI 접근 차단:', { userId: refundedUser.id });
          }
        }
      } catch (blockErr) {
        error('[Payment Webhook] ❌ 환불 사용자 차단 실패 (환불 자체는 진행):', blockErr);
      }

      // 🔴 자동 환불 API 호출 시도
      try {
        log('[Payment Webhook] 자동 환불 API 호출 시작:', { imp_uid, merchant_uid, amount });

        // TODO: 실제 PG사 환불 API 호출 (아임포트/토스페이먼츠 등)
        // 현재는 DB 상태만 변경하고 관리자 알림 전송
        // 실제 환불 API 구현 예시:
        // const refundResponse = await fetch('https://api.iamport.kr/payments/cancel', {
        //   method: 'POST',
        //   headers: { 'Authorization': `Bearer ${accessToken}` },
        //   body: JSON.stringify({ imp_uid, amount, reason: '예약 생성 실패' })
        // });

        warn('[Payment Webhook] ⚠️ 자동 환불 API 미구현 - 관리자 수동 처리 필요');

      } catch (refundErr) {
        error('[Payment Webhook] ❌ 자동 환불 실패:', refundErr);
      }

      // 🔴 관리자 알림 (이메일/텔레그램 등)
      // NOTE: 알림 시스템 구현 필요 (See GitHub Issue #TBD)
      // 임시: 로그에 CRITICAL 오류로 기록
      error('[Payment Webhook] 🚨 ADMIN ACTION REQUIRED:', {
        saleId: sale.id,
        merchant_uid,
        imp_uid,
        amount,
        customerName,
        customerPhone,
        error: err instanceof Error ? err.message : String(err),
        action: 'MANUAL_REFUND_REQUIRED',
      });
    }

    // Lead 상태 업데이트 또는 생성
    let updatedLeadId: number | null = null;
    if (leadId) {
      try {
        await prisma.affiliateLead.update({
          where: { id: Number(leadId) },
          data: { status: 'PURCHASED' },
        });
        updatedLeadId = Number(leadId);
      } catch (leadErr: any) {
        // P2025: Lead가 삭제된 경우 등 — 결제 자체는 완료이므로 warn 후 계속
        warn('[Payment Webhook] Lead 상태 업데이트 실패 (무시):', {
          leadId,
          code: leadErr?.code,
          message: leadErr?.message,
        });
      }
    } else if (customerName && customerPhone && (managerId || agentId)) {
      // Lead가 없지만 고객 정보와 어필리에이트 정보가 있으면 새로 생성
      const normalizedPhone = normalizePhone(customerPhone) ?? '';

      if (normalizedPhone.length >= 10) {
        // 기존 Lead 확인
        const existingLead = await prisma.affiliateLead.findFirst({
          where: {
            customerPhone: normalizedPhone,
            status: { not: 'CANCELLED' },
          },
        });

        if (existingLead) {
          // 기존 Lead 업데이트
          await prisma.affiliateLead.update({
            where: { id: existingLead.id },
            data: {
              status: 'PURCHASED',
              customerName: customerName.trim(),
              customerPhone: normalizedPhone,
              managerId: managerId || existingLead.managerId,
              agentId: agentId || existingLead.agentId,
              metadata: {
                ...(existingLead.metadata as any || {}),
                purchasedAt: new Date().toISOString(),
                productCode,
                orderId: merchant_uid,
              },
            },
          });
          updatedLeadId = existingLead.id;
        } else {
          // 새 Lead 생성
          const newLead = await prisma.affiliateLead.create({
            data: {
              customerName: customerName.trim(),
              customerPhone: normalizedPhone,
              status: 'PURCHASED',
              source: 'purchase',
              managerId: managerId,
              agentId: agentId,
              metadata: {
                purchasedAt: new Date().toISOString(),
                productCode,
                orderId: merchant_uid,
                imp_uid,
              },
              updatedAt: new Date(),
            },
          });
          updatedLeadId = newLead.id;
        }
      }
    }

    // 결제 완료 시 자동으로 일반 크루즈 가이드 승인 처리
    if (customerPhone) {
      const normalizedPhone = normalizePhone(customerPhone) ?? '';

      if (normalizedPhone.length >= 10) {
        // 전화번호로 User 찾기
        const user = await prisma.user.findFirst({
          where: {
            phone: normalizedPhone,
          },
          select: {
            id: true,
            testModeStartedAt: true,
            customerStatus: true,
            name: true,
          },
        });

        // 3일 체험 사용자인 경우 자동 승인
        if (user && user.testModeStartedAt && user.customerStatus !== 'active' && user.customerStatus !== 'package') {
          log('[Payment Webhook] 자동 승인 처리:', {
            userId: user.id,
            name: user.name,
            phone: normalizedPhone,
            previousStatus: user.customerStatus,
          });

          await prisma.user.update({
            where: { id: user.id },
            data: {
              testModeStartedAt: null, // 3일 체험 종료
              customerStatus: 'active', // 일반 크루즈 가이드 활성화
            },
          });

          log('[Payment Webhook] 일반 크루즈 가이드 자동 승인 완료:', {
            userId: user.id,
            name: user.name,
            phone: normalizedPhone,
          });
        }
      }
    }

    // [v11.0] 실적 생성 완료 로그
    log('[Payment Webhook v11.0] ===== 실적 저장 완료 =====');
    log('[Payment Webhook v11.0] AffiliateSale:', {
      saleId: sale.id,
      managerId: managerId || 'NONE',
      agentId: agentId || 'NONE',
      amount,
      status: 'CONFIRMED',
    });
    log('[Payment Webhook v11.0] CommissionLedger:', {
      entriesCreated: ledgerResult.ledgerEntries.length,
      managerProfileId: managerId || 'NONE',
      agentProfileId: agentId || 'NONE',
    });

    // 파트너 확인 로그
    if (managerId || agentId) {
      log(`[Payment Webhook v11.0] ✅ 파트너 실적 저장 성공! affiliateMallUserId: ${affiliateMallUserId}`);
    } else {
      log('[Payment Webhook v11.0] ⚠️ 파트너 없음 - 실적은 저장되었으나 수당 배정 없음');
    }

    // Google 스프레드시트 백업 및 자동화 + 구매확인서 발송 (비동기 실행)
    // 파트너 유무와 관계없이 항상 실행 (본사 직접 판매 포함)
    // 1. 기존 구매고객관리 시트 백업
    // 2. Drive 폴더 생성 및 APIS 시트 생성
    // 3. 구매확인서 PNG 생성 및 발송
    (async () => {
        try {
          // 동적 import로 순환 참조 방지 및 성능 최적화
          const { sendToGoogleSheet } = await import('@/lib/google-sheets');
          const { ensureTripFolder, ensureApisSheet, recordPaymentToPurchasedList, initApisSheetRows, uploadCertificateToDrive } = await import('@/lib/google-automation');
          const { generateCertificatePng } = await import('@/lib/certificate-generator');
          const { sendPurchaseConfirmation } = await import('@/lib/affiliate/purchase-confirmation');

          // 담당자 정보 조회
          let managerName = '';
          let channel = '본사';

          if (managerId) {
            const mProfile = await prisma.affiliateProfile.findUnique({
              where: { id: managerId },
              select: { displayName: true, nickname: true }
            });
            managerName = mProfile?.displayName || mProfile?.nickname || '';
            channel = '대리점장';
          }

          if (agentId) {
            const aProfile = await prisma.affiliateProfile.findUnique({
              where: { id: agentId },
              select: { displayName: true, nickname: true }
            });
            managerName = aProfile?.displayName || aProfile?.nickname || '';
            channel = '판매원';
          }

          // 상품 정보 및 출발일 조회
          let productName = productCode || '';
          let departureDate = '';

          if (productCode) {
            const product = await prisma.cruiseProduct.findUnique({
              where: { productCode },
              select: { packageName: true, cruiseLine: true, shipName: true }
            });
            if (product) {
              productName = product.packageName || `${product.cruiseLine} ${product.shipName}`;
            }

            // 출발일 조회
            const trip = await prisma.trip.findFirst({
              where: { productCode },
              select: { departureDate: true }
            });

            if (trip?.departureDate) {
              departureDate = trip.departureDate.toISOString().split('T')[0];
            } else {
              const affProduct = await prisma.affiliateProduct.findFirst({
                where: { productCode },
                select: { effectiveFrom: true }
              });
              if (affProduct?.effectiveFrom) {
                departureDate = affProduct.effectiveFrom.toISOString().split('T')[0];
              }
            }
          }

          const now = new Date();
          const kstDate = now.toLocaleString('ko-KR');
          const isoDate = now.toISOString().split('T')[0];

          // 1. 기존 Google Sheet 백업 (하위 호환성 유지)
          sendToGoogleSheet({
            name: customerName ? String(customerName).trim() : '',
            phone: customerPhone ? String(customerPhone).replace(/[^0-9]/g, '') : '',
            source: 'purchase',
            productName: productName,
            channel,
            manager: managerName,
            target: 'purchased',
            reservationDate: isoDate,
            reservationNo: merchant_uid,
            departureDate: departureDate,
            cabinType: cabinType || '',
            paymentDate: isoDate,
            paymentMethod: '카드',
            amount: amount,
            lastEditor: 'System',
            lastEditTime: kstDate,
          }).catch(err => error('[Automation] Legacy Sheet Backup Error:', err));

          // 2. 새로운 자동화: Drive 폴더 및 APIS 시트 생성
          if (productName && departureDate) {
            try {
              // 폴더 생성/확인
              const folderId = await ensureTripFolder(productName, departureDate);

              // APIS 시트 생성/확인
              const sheetId = await ensureApisSheet(folderId, productName, departureDate);

              // 결제 목록 시트에 기록 (월별 시트)
              await recordPaymentToPurchasedList({
                customerName: customerName || '고객',
                customerPhone: customerPhone || '',
                productName,
                departureDate,
                amount,
                headcount: headcount || 1,
                orderId: merchant_uid,
                managerName,
                channel
              });

              // APIS 시트에 초기 행 추가
              await initApisSheetRows(sheetId, {
                customerName: customerName || '고객',
                customerPhone: customerPhone || '',
                productName,
                departureDate,
                amount,
                headcount: headcount || 1,
                orderId: merchant_uid
              });

              log('[Automation] Drive & Sheet setup completed');
            } catch (driveError) {
              error('[Automation] Drive/Sheet Error:', driveError);
            }
          }

          // 3. 구매확인서 PNG 생성 및 발송
          try {
            // 상품 상세 정보 조회 (구매확인서에 포함)
            let productDetails = undefined;
            if (productCode) {
              const productInfo = await prisma.cruiseProduct.findUnique({
                where: { productCode },
                select: {
                  tags: true,
                  visitedCountries: true,
                  destinations: true,
                  nights: true,
                  days: true,
                  cruiseLine: true,
                  shipName: true,
                  included: true,
                  excluded: true,
                  refundPolicy: true,
                  hasGuide: true,
                  hasEscort: true,
                  hasCruiseDotStaff: true,
                  hasTravelInsurance: true,
                  flightInfo: true,
                }
              });

              if (productInfo) {
                productDetails = {
                  tags: productInfo.tags || [],
                  visitedCountries: productInfo.visitedCountries || [],
                  destinations: productInfo.destinations || [],
                  nights: productInfo.nights || undefined,
                  days: productInfo.days || undefined,
                  cruiseLine: productInfo.cruiseLine || undefined,
                  shipName: productInfo.shipName || undefined,
                  included: productInfo.included || [],
                  excluded: productInfo.excluded || [],
                  refundPolicy: productInfo.refundPolicy || undefined,
                  hasGuide: productInfo.hasGuide || false,
                  hasEscort: productInfo.hasEscort || false,
                  hasCruiseDotStaff: productInfo.hasCruiseDotStaff || false,
                  hasTravelInsurance: productInfo.hasTravelInsurance || false,
                  flightIncluded: (productInfo.flightInfo as any)?.included || false,
                };
              }
            }

            // PNG 생성 (관리자 패널과 동일한 양식)
            const pngBuffer = await generateCertificatePng({
              customerName: customerName || '고객',
              birthDate: '', // 생년월일은 결제 시점에 모를 수 있음 (빈칸)
              productName,
              paymentAmount: amount,
              paymentDate: isoDate,
              orderId: merchant_uid,
              managerName,
              productDetails,
            });

            // Drive에 PNG 업로드 (비동기, 실패해도 진행)
            const pngFilename = `구매확인증서_${customerName || '고객'}_${isoDate}.png`;
            uploadCertificateToDrive(pngBuffer, pngFilename)
              .then(fileId => log(`[Automation] Certificate uploaded to Drive: ${fileId}`))
              .catch(err => error('[Automation] Certificate upload failed:', err));

            // 승인 요청 생성 (자동 승인 상태로)
            // User 찾기 (customerPhone 기준)
            let customerUserId = null;
            if (customerPhone) {
              const u = await prisma.user.findFirst({ where: { phone: customerPhone.replace(/\D/g, '') } });
              if (u) customerUserId = u.id;
            }

            // 요청자(담당자) ID
            const requesterId = agentId ?
              (await prisma.affiliateProfile.findUnique({ where: { id: agentId } }))?.userId :
              (managerId ? (await prisma.affiliateProfile.findUnique({ where: { id: managerId } }))?.userId : null);

            if (customerUserId && requesterId) {
              await prisma.certificateApproval.create({
                data: {
                  certificateType: 'purchase',
                  requesterId: requesterId,
                  requesterType: agentId ? 'SALES_AGENT' : 'BRANCH_MANAGER',
                  customerId: customerUserId,
                  customerName: customerName || '고객',
                  productName,
                  paymentAmount: amount,
                  paymentDate: isoDate,
                  status: 'approved', // 자동 승인
                  approvedBy: requesterId, // 본인 전결 처리 (또는 시스템 계정)
                  approvedAt: new Date(),
                  updatedAt: new Date(),
                }
              });
            }

            // 이메일 발송 (PNG 첨부) - 파트너 유무와 관계없이 항상 발송
            await sendPurchaseConfirmation(sale.id, pngBuffer);
            log('[Automation] Purchase Confirmation with PNG sent');
          } catch (certErr) {
            error('[Automation] Certificate Generation/Send Error:', certErr);
            // PNG 생성 실패시 기존 텍스트 이메일이라도 보내도록 fallback
            await sendPurchaseConfirmation(sale.id);
          }

        } catch (err) {
          error('[Automation] Async Task Error:', err);
        }
      })();

    // [v11.0] 응답에 실적 저장 결과 포함
    return NextResponse.json({
      ok: true,
      saleId: sale.id,
      reservationId: reservationId,
      // 🔴 예약 생성 실패 시 경고
      reservationFailed: reservationFailed,
      warning: reservationFailed ? 'MANUAL_REFUND_REQUIRED: 결제는 완료되었으나 예약 생성에 실패했습니다. 관리자에게 문의하세요.' : null,
      // [v11.0] callback에서 확인할 수 있는 실적 정보
      affiliateSaleCreated: true,
      commissionCreated: ledgerResult.ledgerEntries.length > 0,
      partnerInfo: {
        managerId: managerId || null,
        agentId: agentId || null,
        affiliateMallUserId: affiliateMallUserId || null,
        affiliateCode: affiliateCode || null,
      },
      message: reservationFailed
        ? '결제는 완료되었으나 예약 생성에 실패했습니다. 관리자가 확인 후 처리할 예정입니다.'
        : '결제 완료 및 어필리에이트 판매가 기록되었습니다.',
    });
  } catch (err) {
    error('[Payment Webhook] Error:', err);
    return NextResponse.json(
      { ok: false, message: '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
