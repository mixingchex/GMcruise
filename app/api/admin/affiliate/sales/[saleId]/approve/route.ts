// app/api/admin/affiliate/sales/[saleId]/approve/route.ts
// 판매 확정 승인 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { syncSaleCommissionLedgers } from '@/lib/affiliate/commission-ledger';
import { notifySaleApproved } from '@/lib/affiliate/sales-notification';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인
async function checkAdminAuth() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true, name: true },
        },
      },
    });

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    console.error('[Approve Sale] Auth error:', error);
    return null;
  }
}

/**
 * POST: 판매 확정 승인
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        status: true,
        audioFileGoogleDriveUrl: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 판매만 승인할 수 있습니다' },
        { status: 400 }
      );
    }

    // 4. 판매 승인 처리 (트랜잭션으로 원자적 처리)
    const result = await prisma.$transaction(async (tx) => {
      // 현재 판매 정보 확인 (commissionProcessed 체크)
      const currentSale = await tx.affiliateSale.findUnique({
        where: { id: saleId },
        select: { metadata: true },
      });

      const currentMetadata = currentSale?.metadata as any;
      const commissionProcessed = currentMetadata?.commissionProcessed || false;

      // 판매 승인 처리
      const updatedSale = await tx.affiliateSale.update({
        where: { id: saleId },
        data: {
          status: 'APPROVED',
          approvedById: admin.id,
          approvedAt: new Date(),
          confirmedAt: new Date(), // 기존 필드와 호환성 유지
        },
      });

      // 5. 수당 중복 지급 방지: 이미 처리되었으면 스킵
      if (!commissionProcessed) {
        try {
          await syncSaleCommissionLedgers(saleId, {
            includeHq: true,
            regenerate: false,
          }, tx);

          // commissionProcessed 플래그 업데이트
          await tx.affiliateSale.update({
            where: { id: saleId },
            data: {
              metadata: {
                ...currentMetadata,
                commissionProcessed: true,
                commissionProcessedAt: new Date().toISOString(),
              },
            },
          });

          console.log(`[Approve Sale] 수당 계산 완료: Sale #${saleId}`);
        } catch (commissionError: any) {
          console.error(`[Approve Sale] 수당 계산 오류:`, commissionError);
          // 수당 계산 실패해도 승인은 완료 (나중에 수동으로 계산 가능)
        }
      } else {
        console.log(`[Approve Sale] Commission already processed for sale ${saleId}, skipping`);
      }

      return updatedSale;
    });

    const updatedSale = result;

    // 6. 알림 전송
    try {
      await notifySaleApproved(saleId);
      console.log(`[Approve Sale] 알림 전송 완료: Sale #${saleId}`);
    } catch (notificationError: any) {
      console.error(`[Approve Sale] 알림 전송 오류:`, notificationError);
      // 알림 실패해도 승인은 완료
    }

    return NextResponse.json({
      ok: true,
      message: '판매가 승인되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
      },
    });
  } catch (error: any) {
    console.error('[Approve Sale] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
