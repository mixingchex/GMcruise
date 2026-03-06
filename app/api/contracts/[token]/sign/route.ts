export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel: PDF 동기 생성 타임아웃 방지

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendTravelContractSignedEmail, sendTravelContractCustomerEmail } from '@/lib/email';
import { generateTravelContractPDF } from '@/lib/contracts/travel-contract-pdf';
import { TravelContractDataSchema } from '@/lib/contracts/types';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip-utils';

// WO-CR-15: 동반자 타입 가드
function isValidCompanion(c: unknown): c is { name: string; phone: string } {
  if (typeof c !== 'object' || c === null) return false;
  const obj = c as Record<string, unknown>;
  if (typeof obj.name !== 'string' || typeof obj.phone !== 'string') return false;
  if (Object.keys(obj).length !== 2) return false;
  return obj.name.trim().length > 0 && obj.name.length <= 50
      && obj.phone.trim().length > 0 && obj.phone.length <= 20;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // WO-CR-06: Rate limiting (IP당 1분에 5회)
    const ip = getClientIp(request);
    const { limited } = await checkRateLimit(`contract:sign:${ip}`, { limit: 5, windowMs: 60_000 });
    if (limited) {
      return NextResponse.json(
        { ok: false, error: '너무 많은 시도입니다. 1분 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { customerAddress, customerSignature, contractorSignature, companions, marketingConsent } = body;

    if (!customerAddress || typeof customerAddress !== 'string' || customerAddress.trim().length < 5) {
      return NextResponse.json({ ok: false, error: '주소를 정확히 입력해주세요.' }, { status: 400 });
    }

    // customerAddress 길이 제한
    if (customerAddress.length > 200) {
      return NextResponse.json({ ok: false, error: '주소는 200자 이하로 입력해주세요.' }, { status: 400 });
    }

    if (!customerSignature || typeof customerSignature !== 'string') {
      return NextResponse.json({ ok: false, error: '서명 이미지가 필요합니다.' }, { status: 400 });
    }
    if (!customerSignature.startsWith('data:image/png;base64,') &&
        !customerSignature.startsWith('data:image/jpeg;base64,')) {
      return NextResponse.json({ ok: false, error: '서명 형식이 올바르지 않습니다. (PNG 또는 JPEG만 허용)' }, { status: 400 });
    }
    // base64 문자셋 검증
    const base64Part = customerSignature.split(',')[1] || '';
    if (base64Part) {
      try {
        Buffer.from(base64Part.substring(0, 500), 'base64');
        if (!/^[A-Za-z0-9+/=]+$/.test(base64Part.substring(0, 500))) {
          return NextResponse.json({ ok: false, error: '서명 데이터가 손상되었습니다.' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ ok: false, error: '서명 데이터가 손상되었습니다.' }, { status: 400 });
      }
    }
    // P2-07: 서명 이미지 크기 제한 200KB
    if (customerSignature.length > 200 * 1024) {
      return NextResponse.json({ ok: false, error: '서명 이미지 크기가 너무 큽니다. (최대 200KB)' }, { status: 400 });
    }

    // contractorSignature 포맷 검증
    if (body.contractorSignature) {
      const sig = body.contractorSignature as string;
      if (!sig.startsWith('data:image/png;base64,') && !sig.startsWith('data:image/jpeg;base64,')) {
        return NextResponse.json({ ok: false, error: '계약자 서명 형식이 올바르지 않습니다.' }, { status: 400 });
      }
      if (sig.length > 500 * 1024) {
        return NextResponse.json({ ok: false, error: '계약자 서명 크기가 너무 큽니다.' }, { status: 400 });
      }
    }

    // 동반자 수 제한
    const MAX_COMPANIONS = 20;
    if (companions && companions.length > MAX_COMPANIONS) {
      return NextResponse.json({ ok: false, error: '동반자는 최대 20명까지 입력 가능합니다.' }, { status: 400 });
    }

    // WO-CR-15: companions strict 타입 검증
    if (companions !== undefined && companions !== null) {
      if (!Array.isArray(companions) || !companions.every(isValidCompanion)) {
        return NextResponse.json({ ok: false, error: '동반자 정보 형식이 올바르지 않습니다.' }, { status: 400 });
      }
    }

    // WO-CR-13: signedAt을 updateMany와 PDF 생성 모두에 동일 값 사용
    const signedAtDate = new Date();

    // TOCTOU 방지: atomic updateMany (pending 상태 + 만료되지 않은 계약서만 서명 처리)
    const result = await prisma.travelContract.updateMany({
      where: {
        token,
        status: 'pending',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      data: {
        status: 'signed',
        customerAddress: customerAddress.trim(),
        customerSignature,
        contractorSignature: body.contractorSignature || null,
        companions: companions || [],
        signedAt: signedAtDate,
      },
    });

    if (result.count === 0) {
      // 계약서가 없거나 이미 서명됨
      const existing = await prisma.travelContract.findUnique({
        where: { token },
        select: { status: true, expiresAt: true },
      });
      if (!existing) {
        return NextResponse.json({ ok: false, error: '계약서를 찾을 수 없습니다.' }, { status: 404 });
      }
      if (existing.status !== 'pending') {
        return NextResponse.json({ ok: false, error: '이미 서명된 계약서입니다.' }, { status: 409 });
      }
      if (existing.expiresAt && existing.expiresAt < new Date()) {
        return NextResponse.json({ ok: false, error: '계약서가 만료되었습니다.' }, { status: 410 });
      }
      return NextResponse.json({ ok: false, error: '서명 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // marketingConsent 저장 (옵셔널 — Prisma 스키마에 marketingConsent Boolean? 필드 존재)
    // 마이그레이션: npx prisma migrate dev --name add_travel_contract_marketing_consent
    if (typeof marketingConsent === 'boolean') {
      await prisma.travelContract.update({
        where: { token },
        data: { marketingConsent },
      }).catch((err: unknown) => {
        logger.error('[ContractSign] marketingConsent 저장 실패', { error: err instanceof Error ? err.message : String(err) });
      });
    }

    // WO-CR-02: Fire-and-forget IIFE 제거 → 응답 전 동기 처리 (Vercel 실행 보장)
    const contract = await prisma.travelContract.findUnique({
      where: { token },
      select: { contractData: true, reservationId: true },
    });

    if (contract) {
      // WO-CR-08: Zod로 contractData 파싱
      const parseResult = TravelContractDataSchema.safeParse(contract.contractData);
      if (!parseResult.success) {
        logger.error('[ContractSign] contractData 타입 불일치 — DB rollback', { token: token.slice(0, 8) });
        // contractData 손상 → pending으로 rollback (zombie signed 방지)
        await prisma.travelContract.update({
          where: { token },
          data: {
            status: 'pending',
            signedAt: null,
            customerSignature: null,
            contractorSignature: null,
            customerAddress: null,
            companions: [],
          },
        }).catch((rollbackErr: unknown) => {
          const rollbackMsg = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
          logger.error('[ContractSign] DB rollback 실패', { token: token.slice(0, 8), error: rollbackMsg });
        });
        return NextResponse.json(
          { ok: false, error: '계약서 데이터가 손상되었습니다. 담당자에게 문의해주세요.' },
          { status: 500 }
        );
      } else {
        const contractData = parseResult.data;
        const validCompanions = Array.isArray(companions) ? (companions as Array<{ name: string; phone: string }>) : [];
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr';

        // P0-02: PDF 생성 및 이메일 발송 — 실패 시 DB rollback
        try {
          // WO-CR-13: signedAtDate를 PDF 생성에도 전달
          const pdfBuffer = await generateTravelContractPDF(
            contractData,
            customerSignature,
            contractorSignature || undefined,
            customerAddress || undefined,
            validCompanions,
            signedAtDate,
          );

          // 관리자 이메일 (실패해도 서명 자체는 성공)
          const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_SMTP_USER || 'jmonica@cruisedot.co.kr';
          if (adminEmail) {
            await sendTravelContractSignedEmail({
              adminEmail,
              customerName: contractData.mainTravelerName,
              productName: contractData.productName,
              reservationId: contract.reservationId,
              signedAt: signedAtDate.toISOString(),
              pdfBuffer,
            }).catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              logger.error('[ContractSign] 관리자 이메일 발송 실패', { token: token.slice(0, 8), error: msg });
            });
          }

          // 고객 이메일 (contractData에 email 필드 있을 때)
          if (contractData.customerEmail) {
            const downloadUrl = `${baseUrl}/api/contracts/${token}/pdf`;
            await sendTravelContractCustomerEmail({
              customerEmail: contractData.customerEmail,
              customerName: contractData.mainTravelerName,
              productName: contractData.productName,
              downloadUrl,
              signedAt: signedAtDate.toISOString(),
            }).catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              logger.error('[ContractSign] 고객 이메일 발송 실패', { token: token.slice(0, 8), error: msg });
            });
          }

          logger.info('[ContractSign] 이메일 발송 완료', { token: token.slice(0, 8) });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error('[ContractSign] PDF 생성 실패 — DB rollback 시작', { token: token.slice(0, 8), error: msg });

          // P0-02: PDF 생성 실패 시 DB 상태를 pending으로 rollback — WO-V3-03: companions/address도 초기화
          await prisma.travelContract.update({
            where: { token },
            data: {
              status: 'pending',
              signedAt: null,
              customerSignature: null,
              contractorSignature: null,
              customerAddress: null,
              companions: [],
            },
          }).catch((rollbackErr: unknown) => {
            const rollbackMsg = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
            logger.error('[ContractSign] DB rollback 실패', { token: token.slice(0, 8), error: rollbackMsg });
          });

          return NextResponse.json(
            { ok: false, error: 'PDF 생성에 실패했습니다. 다시 시도해주세요.' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: '계약서 서명이 완료되었습니다.',
      signedAt: signedAtDate,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[Contract Sign POST]', { error: msg });
    return NextResponse.json({ ok: false, error: '서명 처리 실패' }, { status: 500 });
  }
}
