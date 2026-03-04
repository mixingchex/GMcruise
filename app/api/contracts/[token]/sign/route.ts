export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendTravelContractSignedEmail, sendTravelContractCustomerEmail } from '@/lib/email';
import { generateTravelContractPDF } from '@/lib/contracts/travel-contract-pdf';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { customerAddress, customerSignature, contractorSignature, companions } = body;

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
    if (base64Part && !/^[A-Za-z0-9+/=]+$/.test(base64Part.substring(0, 100))) {
      return NextResponse.json({ ok: false, error: '서명 데이터가 손상되었습니다.' }, { status: 400 });
    }
    if (customerSignature.length > 700000) {
      return NextResponse.json({ ok: false, error: '서명 이미지 크기가 너무 큽니다. (최대 500KB)' }, { status: 400 });
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
    if (companions?.some((c: any) => !c.name || c.name.length > 50 || !c.phone || c.phone.length > 20)) {
      return NextResponse.json({ ok: false, error: '동반자 정보 형식이 올바르지 않습니다.' }, { status: 400 });
    }

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
        signedAt: new Date(),
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

    // 비동기: 이메일 발송 (응답에 영향 없음)
    const contract = await prisma.travelContract.findUnique({
      where: { token },
      select: { contractData: true, reservationId: true },
    });

    if (contract) {
      const contractData = contract.contractData as any;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr';

      (async () => {
        try {
          // PDF 생성 (서명 포함)
          const pdfBuffer = await generateTravelContractPDF(
            contractData,
            customerSignature,
            body.contractorSignature || undefined,
            customerAddress || undefined,
            companions || undefined,
          );

          // 관리자 이메일
          const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_SMTP_USER;
          if (adminEmail) {
            await sendTravelContractSignedEmail({
              adminEmail,
              customerName: contractData.mainTravelerName || '고객',
              productName: contractData.productName || '',
              reservationId: contract.reservationId,
              signedAt: new Date().toISOString(),
              pdfBuffer,
            });
          }

          // 고객 이메일 (contractData에 email 필드 있을 때)
          const customerEmail = contractData.customerEmail as string | undefined;
          if (customerEmail) {
            const downloadUrl = `${baseUrl}/api/contracts/${token}/pdf`;
            await sendTravelContractCustomerEmail({
              customerEmail,
              customerName: contractData.mainTravelerName || '고객',
              productName: contractData.productName || '',
              downloadUrl,
              signedAt: new Date().toISOString(),
            });
          }

          // Google Drive 아카이브 (설정된 경우)
          // TODO: pdfUrl DB 업데이트 - WO-BIZ-04
          logger.log('[ContractSign] 이메일 발송 완료', { token });
        } catch (err: any) {
          logger.error('[ContractSign] 사후 처리 오류', { token, error: err.message });
        }
      })();
    }

    return NextResponse.json({
      ok: true,
      message: '계약서 서명이 완료되었습니다.',
      signedAt: new Date(),
    });
  } catch (error: any) {
    logger.error('[Contract Sign POST]', error);
    return NextResponse.json({ ok: false, error: '서명 처리 실패' }, { status: 500 });
  }
}
