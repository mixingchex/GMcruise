// WO-06: 여권 이미지 일괄 ZIP 다운로드 API
// GET /api/admin/apis/passport-download?productCode=XXX
// 관리자 전용 — PII 접근 감사 로그 필수
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { log, error as logError } from '@/lib/logger-wrapper';
import JSZip from 'jszip';

// 안전 제한 (Vercel Pro: 60초, 무료: 10초)
const MAX_TRAVELERS = 50;     // 초과 시 Drive 직접 접근 안내
const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200MB

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !['admin', 'superadmin'].includes(sessionUser.role ?? '')) {
    return NextResponse.json({ ok: false, message: '관리자만 접근 가능합니다.' }, { status: 403 });
  }

  const productCode = req.nextUrl.searchParams.get('productCode');
  if (!productCode) {
    return NextResponse.json({ ok: false, message: 'productCode 파라미터가 필요합니다.' }, { status: 400 });
  }

  // Trip → 환불 제외 Reservation → passportImage가 있는 Traveler 조회
  const trip = await prisma.trip.findFirst({
    where: { productCode },
    select: {
      id: true,
      Reservation: {
        where: { status: { not: 'REFUNDED' } },
        select: {
          id: true,
          AffiliateSale: { select: { status: true } },
          Traveler: {
            where: { passportImage: { not: null } },
            select: {
              id: true,
              passportNo: true,
              engSurname: true,
              engGivenName: true,
              passportImage: true,
            },
          },
        },
      },
    },
  });

  if (!trip) {
    return NextResponse.json({ ok: false, message: '상품을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 환불된 AffiliateSale의 여행자도 제외
  const travelers = trip.Reservation
    .filter((r) => r.AffiliateSale?.status !== 'REFUNDED')
    .flatMap((r) => r.Traveler);

  if (travelers.length === 0) {
    return NextResponse.json({ ok: false, message: '다운로드 가능한 여권 이미지가 없습니다.' }, { status: 404 });
  }

  // 인원 초과 시 Drive 직접 접근 안내
  if (travelers.length > MAX_TRAVELERS) {
    return NextResponse.json(
      {
        ok: false,
        message: `인원이 많아 서버 다운로드가 불가합니다 (${travelers.length}명 > ${MAX_TRAVELERS}명 제한). Google Drive 폴더에서 직접 다운로드하세요.`,
        driveHint: true,
        travelerCount: travelers.length,
      },
      { status: 413 }
    );
  }

  // 감사 로그 (PII 최소화 — 여권번호·이름 로깅 금지)
  log(
    `[Passport Download] 시작: productCode=${productCode}, ` +
    `count=${travelers.length}, adminId=${sessionUser.id}`
  );

  const zip = new JSZip();
  let totalBytes = 0;
  let successCount = 0;

  for (const traveler of travelers) {
    if (!traveler.passportImage) continue;
    try {
      const res = await fetch(traveler.passportImage);
      if (!res.ok) continue;
      const buffer = await res.arrayBuffer();
      totalBytes += buffer.byteLength;

      if (totalBytes > MAX_TOTAL_BYTES) {
        log(`[Passport Download] 크기 초과로 중단: ${(totalBytes / 1024 / 1024).toFixed(0)}MB`);
        break;
      }

      // 파일명: 여권번호_영문이름.jpg (여권번호는 운영에 필요한 최소 식별자)
      const nameStr = [traveler.engSurname, traveler.engGivenName]
        .filter(Boolean)
        .join('_')
        .toUpperCase()
        .replace(/[^A-Z_]/g, '') || `T${traveler.id}`;
      const passportStr = (traveler.passportNo ?? `ID${traveler.id}`).replace(/[^a-zA-Z0-9]/g, '');
      zip.file(`${passportStr}_${nameStr}.jpg`, buffer);
      successCount++;
    } catch {
      // 개별 파일 오류 시 스킵 (ZIP 생성 계속)
    }
  }

  if (successCount === 0) {
    return NextResponse.json({ ok: false, message: '다운로드 가능한 이미지가 없습니다.' }, { status: 404 });
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `${productCode}_여권_${dateStr}.zip`;

  log(
    `[Passport Download] 완료: productCode=${productCode}, ` +
    `success=${successCount}/${travelers.length}, ` +
    `size=${(totalBytes / 1024 / 1024).toFixed(1)}MB, adminId=${sessionUser.id}`
  );

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}
