export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateTravelContractPDF } from '@/lib/contracts/travel-contract-pdf';
import { TravelContractDataSchema } from '@/lib/contracts/types';
import { logger } from '@/lib/logger';
import { checkRateLimit, RateLimitPolicies } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip-utils';

/**
 * GET /api/contracts/[token]/pdf
 * 고객이 서명 완료된 계약서를 PDF로 다운로드
 * - 서명된 계약서(status: 'signed')만 허용
 * - 인증 불필요 (토큰으로 접근)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // WO-ME-10: 토큰 최소 길이를 25자로 강화 (cuid/hex64 모두 통과)
    if (!token || token.length < 25 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 토큰입니다.' }, { status: 400 });
    }

    // PDF 생성은 puppeteer 기반으로 비용이 크므로 LOGIN 정책(5분/5회) 적용
    const ip = getClientIp(request);
    const { limited } = await checkRateLimit(`contract:pdf:${ip}`, RateLimitPolicies.LOGIN);
    if (limited) {
      return NextResponse.json(
        { ok: false, error: '너무 많은 시도입니다. 5분 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const contract = await prisma.travelContract.findUnique({
      where: { token },
      select: {
        status: true,
        contractData: true,
        customerSignature: true,
        contractorSignature: true,
        customerAddress: true,
        contractorPhone: true,
        companions: true,
        signedAt: true,
        expiresAt: true,
        Reservation: {
          select: {
            User: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ ok: false, error: '계약서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (contract.status !== 'signed') {
      return NextResponse.json(
        { ok: false, error: '서명이 완료된 계약서만 다운로드할 수 있습니다.' },
        { status: 403 }
      );
    }
    // WO-V3-06: 서명 완료 후에는 만료 여부와 무관하게 다운로드 허용 (PDF는 이미 완성된 계약 증빙)

    // WO-CR-08: Zod로 contractData 파싱
    const parseResult = TravelContractDataSchema.safeParse(contract.contractData);
    if (!parseResult.success) {
      logger.error('[ContractPDF] contractData 타입 불일치', { token: token.slice(0, 8) });
      return NextResponse.json({ ok: false, error: '계약서 데이터가 손상되었습니다.' }, { status: 500 });
    }
    const contractData = parseResult.data;

    // WO-HI-05: companions null 처리 — 타입 안전하게 변환
    const rawCompanions = contract.companions;
    const companions: Array<{ name: string; phone: string }> =
      Array.isArray(rawCompanions)
        ? rawCompanions.map((c: unknown) => {
            const obj = c as Record<string, unknown>;
            return {
              name:  typeof obj?.name  === 'string' ? obj.name  : '',
              phone: typeof obj?.phone === 'string' ? obj.phone : '',
            };
          })
        : [];

    // WO-ME-06: logger.log → logger.info
    logger.info('[ContractPDF] PDF 다운로드 요청', { token: token.slice(0, 8) + '...' });

    const pdfBuffer = await generateTravelContractPDF(
      contractData,
      contract.customerSignature || undefined,
      contract.contractorSignature || undefined,
      contract.customerAddress || undefined,
      companions,
      contract.signedAt ? new Date(contract.signedAt) : undefined,
      contract.contractorPhone || undefined,
    );

    // WO-ME-08: PDF 파일명 sanitize
    const rawName =
      contractData.mainTravelerName ||
      contract.Reservation?.User?.name ||
      '고객';
    const safeName = rawName.replace(/[^가-힣a-zA-Z0-9]/g, '_').slice(0, 20);
    const dateStr = contract.signedAt
      ? new Date(contract.signedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const filename = encodeURIComponent(`여행계약서_${safeName}_${dateStr}.pdf`);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[ContractPDF] PDF 생성 오류', { error: msg });
    return NextResponse.json({ ok: false, error: 'PDF 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
