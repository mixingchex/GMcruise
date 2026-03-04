// WO-NEW-06-C: 관리자 전용 여권 Drive 폴더 URL API
// GET /api/admin/trips/[tripId]/passport-folder
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { log } from '@/lib/logger-wrapper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !['admin', 'superadmin'].includes(sessionUser.role ?? '')) {
    return NextResponse.json({ ok: false, message: '관리자만 접근 가능합니다.' }, { status: 403 });
  }

  const { tripId: tripIdStr } = await params;
  const tripId = parseInt(tripIdStr);
  if (isNaN(tripId)) {
    return NextResponse.json({ ok: false, message: '잘못된 Trip ID' }, { status: 400 });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, googleFolderId: true, shipName: true, departureDate: true },
  });

  if (!trip) {
    return NextResponse.json({ ok: false, message: 'Trip을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (!trip.googleFolderId) {
    return NextResponse.json(
      {
        ok: false,
        message: '여권 폴더가 아직 생성되지 않았습니다. 여권 이미지가 업로드된 후 사용 가능합니다.',
      },
      { status: 404 }
    );
  }

  const folderUrl = `https://drive.google.com/drive/folders/${trip.googleFolderId}`;

  // 감사 로그 (folderId 앞 8자리만 — passport-link와 동일 수준)
  log(`[PassportFolder] adminId=${sessionUser.id}, tripId=${tripId}, folderId=${trip.googleFolderId!.slice(0, 8)}***`);

  return NextResponse.json({ ok: true, folderUrl });
}
