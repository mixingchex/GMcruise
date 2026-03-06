export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 25 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 토큰입니다.' }, { status: 400 });
    }

    const contract = await prisma.travelContract.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        signedAt: true,
        contractData: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ ok: false, error: '계약서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (contract.status === 'expired') {
      return NextResponse.json({ ok: false, error: '만료된 계약서입니다.' }, { status: 410 });
    }

    if (contract.expiresAt && new Date(contract.expiresAt) < new Date()) {
      // 만료 처리
      await prisma.travelContract.update({
        where: { token },
        data: { status: 'expired' },
      });
      return NextResponse.json({ ok: false, error: '만료된 계약서입니다.' }, { status: 410 });
    }

    // WO-CR-14: 민감 정보 노출 차단 — contractData 전체 대신 서명 페이지에 필요한 필드만 반환
    // 프론트엔드(app/contract/[token]/page.tsx)에서 contract.contractData.xxx 접근 방식 유지를 위해
    // contractData 키 아래에 필요한 필드만 선별하여 반환
    const cd = contract.contractData as Record<string, unknown>;

    return NextResponse.json({
      ok: true,
      contract: {
        id: contract.id,
        status: contract.status,
        isSigned: contract.status === 'signed',
        expiresAt: contract.expiresAt,
        signedAt: contract.signedAt,
        // contractData: 서명 페이지 표시에 필요한 최소 필드만 포함
        // 고객 서명이미지, 주소, 토큰 등 민감 필드는 제외
        contractData: {
          productName:        typeof cd?.productName === 'string'        ? cd.productName        : '',
          shipName:           typeof cd?.shipName === 'string'           ? cd.shipName           : '',
          airlineName:        typeof cd?.airlineName === 'string'        ? cd.airlineName        : undefined,
          mainTravelerName:   typeof cd?.mainTravelerName === 'string'   ? cd.mainTravelerName   : '',
          mainTravelerPhone:  typeof cd?.mainTravelerPhone === 'string'  ? cd.mainTravelerPhone  : '',
          totalPeople:        typeof cd?.totalPeople === 'number'        ? cd.totalPeople        : 0,
          departureDate:      typeof cd?.departureDate === 'string'      ? cd.departureDate      : '',
          returnDate:         typeof cd?.returnDate === 'string'         ? cd.returnDate         : '',
          nights:             typeof cd?.nights === 'number'             ? cd.nights             : 0,
          days:               typeof cd?.days === 'number'              ? cd.days               : 0,
          pricePerPerson:     typeof cd?.pricePerPerson === 'number'     ? cd.pricePerPerson     : 0,
          totalAmount:        typeof cd?.totalAmount === 'number'        ? cd.totalAmount        : 0,
          departure:          typeof cd?.departure === 'string'          ? cd.departure          : '',
          arrival:            typeof cd?.arrival === 'string'            ? cd.arrival            : '',
          affiliateName:      typeof cd?.affiliateName === 'string'      ? cd.affiliateName      : '',
          affiliatePhone:     typeof cd?.affiliatePhone === 'string'     ? cd.affiliatePhone     : undefined,
          isPackage:          typeof cd?.isPackage === 'boolean'         ? cd.isPackage          : false,
          hasHotel:           typeof cd?.hasHotel === 'boolean'          ? cd.hasHotel           : false,
          hasInsurance:       typeof cd?.hasInsurance === 'boolean'      ? cd.hasInsurance       : false,
          cancellationPolicy: Array.isArray(cd?.cancellationPolicy)      ? cd.cancellationPolicy : [],
        },
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[Contract GET]', { error: msg });
    return NextResponse.json({ ok: false, error: '조회 실패' }, { status: 500 });
  }
}
