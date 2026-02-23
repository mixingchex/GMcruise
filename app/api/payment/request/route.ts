export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { log, error } from '@/lib/logger-wrapper';
import { getSessionUser } from '@/lib/auth';
import { getWelcomePayConfig } from '@/lib/welcomepay';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// 웰컴페이먼츠 결제 요청 API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productCode, productName: bodyProductName, amount, buyerName, buyerEmail, buyerTel, roomSelections, chatSessionId, partnerId } = body;

    // 필수 필드 검증
    if (!productCode || !amount || !buyerName || !buyerTel) {
      return NextResponse.json(
        { ok: false, error: '필수 정보를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 무료체험 사용자 결제 차단
    const sessionUser = await getSessionUser();
    if (sessionUser) {
      // 전체 사용자 정보 조회 (mallUserId 확인)
      const fullUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, mallUserId: true },
      });

      if (fullUser) {
        // 무료체험 사용자 확인 (mallUserId가 trial_로 시작하는 경우)
        const isTrialUser = fullUser.mallUserId?.startsWith('trial_');

        if (isTrialUser) {
          // 체험 계약 확인 (7일 체험 기간인지)
          const trialContract = await prisma.affiliateContract.findFirst({
            where: {
              userId: fullUser.id,
              metadata: {
                path: ['isTrial'],
                equals: true,
              },
            },
          });

          if (trialContract && trialContract.metadata) {
            const metadata = trialContract.metadata as Record<string, unknown>;
            const trialEndDate = metadata.trialEndDate ? new Date(metadata.trialEndDate as string) : null;

            // 체험 기간 중이면 결제 차단
            if (trialEndDate && new Date() < trialEndDate) {
              return NextResponse.json(
                { ok: false, error: '무료체험은 판매 결제가 연결되지 않습니다.' },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    // 어필리에이트 추적 정보
    // 우선순위: body의 partnerId (URL 파라미터) > 쿠키의 affiliate_mall_user_id
    // URL의 partner 파라미터를 최우선으로 사용 (정확한 판매원 추적)
    const cookies = req.cookies;
    const affiliateCode = cookies.get('affiliate_code')?.value || null;
    const affiliateMallUserIdFromCookie = cookies.get('affiliate_mall_user_id')?.value || null;
    const finalPartnerId = partnerId || affiliateMallUserIdFromCookie || null;

    // 방 선택 정보 검증 (크루즈 상품의 경우에만 필수)
    interface RoomSelection {
      adult?: number;
      adult3rd?: number;
      child2to11?: number;
      infantUnder2?: number;
      roomType?: string;
    }
    let totalGuests = 1; // 기본값: 1명
    if (roomSelections && Array.isArray(roomSelections) && roomSelections.length > 0) {
      totalGuests = roomSelections.reduce((sum: number, selection: RoomSelection) => {
        return sum + (selection.adult || 0) + (selection.adult3rd || 0) +
          (selection.child2to11 || 0) + (selection.infantUnder2 || 0);
      }, 0);

      if (totalGuests === 0) {
        return NextResponse.json(
          { ok: false, error: '최소 1명 이상 선택해주세요.' },
          { status: 400 }
        );
      }
    }

    // 상품 정보 확인 (DB에서 조회, 없으면 body에서 받은 productName 사용)
    const product = await prisma.cruiseProduct.findUnique({
      where: { productCode },
      select: { id: true, packageName: true, basePrice: true },
    });

    // 상품명 결정: DB 상품명 > body에서 받은 상품명 > 기본값
    const finalProductName = product?.packageName || bodyProductName || '상품 결제';

    // 웰컴페이먼츠 설정 확인
    const config = getWelcomePayConfig();
    if (!config.mid || !config.signKey) {
      return NextResponse.json(
        { ok: false, error: 'PG 결제 설정이 완료되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 주문번호 생성 (가맹점ID_타임스탬프)
    const orderId = `${config.mid}_${Date.now()}`;

    // 어필리에이트 정보를 metadata에 포함
    interface PaymentMetadata {
      productCode: string;
      roomSelections: RoomSelection[];
      totalGuests: number;
      chatSessionId: string | null;
      affiliateCode?: string;
      partnerId?: string;
    }
    const metadata: PaymentMetadata = {
      productCode,
      roomSelections,
      totalGuests,
      chatSessionId: chatSessionId || null,
    };

    if (affiliateCode) {
      metadata.affiliateCode = affiliateCode;
    }
    // URL의 partner 파라미터를 최우선으로 사용 (정확한 판매원 추적)
    if (finalPartnerId) {
      metadata.partnerId = finalPartnerId;
    }

    // 결제 정보를 DB에 저장
    await prisma.payment.create({
      data: {
        orderId,
        productCode,
        productName: finalProductName,
        amount: parseInt(String(amount)),
        currency: 'KRW',
        buyerName,
        buyerEmail: buyerEmail || null,
        buyerTel,
        status: 'pending',
        pgProvider: 'welcomepayments',
        pgMid: config.mid,
        affiliateCode,
        affiliateMallUserId: finalPartnerId,
        metadata,
        updatedAt: new Date(),
      },
    });

    // 결제 체크아웃 페이지 URL 생성
    const checkoutUrl = `${BASE_URL}/payment/checkout?orderId=${orderId}`;

    // 디버깅: 결제 데이터 출력
    log('[Payment Request] Payment Created:', {
      orderId,
      amount: parseInt(String(amount)),
      productName: finalProductName,
      buyerName,
      buyerTel,
      checkoutUrl,
    });

    return NextResponse.json({
      ok: true,
      orderId,
      checkoutUrl, // 결제 체크아웃 페이지 URL
      message: '결제 요청이 생성되었습니다. checkoutUrl로 이동해주세요.',
    });
  } catch (err) {
    // 에러는 항상 로깅 (결제 오류는 중요)
    error('[Payment Request] Error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : '결제 요청 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
