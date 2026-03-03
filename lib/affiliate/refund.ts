// lib/affiliate/refund.ts
// 환불 처리 유틸리티

import prisma from '@/lib/prisma';

/**
 * 환불 처리
 * - AffiliateSale 상태를 REFUNDED로 변경
 * - 기존 수당에 대한 마이너스 REFUND 엔트리 생성
 * - 다음 정산에서 자동으로 반영됨
 * [WO-PAY-08] 모든 DB 변경을 단일 트랜잭션으로 래핑 — 부분 실패 시 장부 불일치 방지
 */
export async function processRefund(
  saleId: number,
  refundReason: string,
  processedBy: number
): Promise<{
  success: boolean;
  sale: any;
  refundEntries: any[];
}> {
  // AffiliateSale 조회 (트랜잭션 외부 — 검증용, 읽기 전용)
  const sale = await prisma.affiliateSale.findUnique({
    where: { id: saleId },
    include: {
      manager: {
        select: {
          id: true,
          displayName: true,
        },
      },
      agent: {
        select: {
          id: true,
          displayName: true,
        },
      },
      ledgerEntries: {
        where: {
          entryType: {
            notIn: ['REFUND'], // 기존 REFUND 엔트리는 제외
          },
        },
        include: {
          profile: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!sale) {
    throw new Error('판매 정보를 찾을 수 없습니다.');
  }

  if (sale.status === 'REFUNDED') {
    throw new Error('이미 환불 처리된 판매입니다.');
  }

  if (sale.status === 'CANCELLED') {
    throw new Error('취소된 판매는 환불할 수 없습니다.');
  }

  // [WO-PAY-08] 모든 변경을 단일 트랜잭션으로 실행 — 부분 실패 방지
  const { updatedSale, refundEntries } = await prisma.$transaction(async (tx) => {
    // 기존 수당 엔트리들을 기반으로 마이너스 REFUND 엔트리 생성
    const createdRefundEntries = [];

    for (const entry of sale.ledgerEntries) {
      const refundEntry = await tx.commissionLedger.create({
        data: {
          saleId: sale.id,
          profileId: entry.profileId,
          entryType: 'REFUND',
          amount: -entry.amount,
          currency: entry.currency,
          withholdingAmount: entry.withholdingAmount ? -entry.withholdingAmount : null,
          isSettled: false,
          notes: `환불: ${refundReason}`,
          metadata: {
            originalEntryId: entry.id,
            originalEntryType: entry.entryType,
            refundReason,
            processedBy,
            processedAt: new Date().toISOString(),
          },
        },
      });

      createdRefundEntries.push(refundEntry);
    }

    // AffiliateSale 상태 업데이트
    const updated = await tx.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        cancellationReason: refundReason,
        metadata: {
          ...((sale.metadata as any) || {}),
          refundProcessedBy: processedBy,
          refundProcessedAt: new Date().toISOString(),
          refundReason,
        },
      },
      include: {
        manager: {
          select: {
            id: true,
            displayName: true,
          },
        },
        agent: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Lead 상태 업데이트 (있는 경우)
    if (sale.leadId) {
      const lead = await tx.affiliateLead.findUnique({
        where: { id: sale.leadId },
        select: { metadata: true },
      });
      await tx.affiliateLead.update({
        where: { id: sale.leadId },
        data: {
          status: 'REFUNDED',
          metadata: {
            ...((lead?.metadata as any) || {}),
            refundSaleId: sale.id,
            refundProcessedAt: new Date().toISOString(),
          },
        },
      });
    }

    return { updatedSale: updated, refundEntries: createdRefundEntries };
  });

  return {
    success: true,
    sale: updatedSale,
    refundEntries,
  };
}

/**
 * 환불 취소 (환불 처리 취소)
 * - REFUND 엔트리 삭제
 * - AffiliateSale 상태를 원래 상태로 복구
 * [WO-PAY-08] 모든 DB 변경을 단일 트랜잭션으로 래핑
 */
export async function cancelRefund(
  saleId: number,
  processedBy: number
): Promise<{
  success: boolean;
  sale: any;
}> {
  const sale = await prisma.affiliateSale.findUnique({
    where: { id: saleId },
    include: {
      ledgerEntries: {
        where: {
          entryType: 'REFUND',
        },
      },
    },
  });

  if (!sale) {
    throw new Error('판매 정보를 찾을 수 없습니다.');
  }

  if (sale.status !== 'REFUNDED') {
    throw new Error('환불 처리되지 않은 판매입니다.');
  }

  // [WO-PAY-08] 모든 변경을 단일 트랜잭션으로 실행
  const updatedSale = await prisma.$transaction(async (tx) => {
    // REFUND 엔트리 삭제
    await tx.commissionLedger.deleteMany({
      where: {
        saleId: sale.id,
        entryType: 'REFUND',
      },
    });

    // AffiliateSale 상태 복구 (원래 상태로)
    const originalStatus = sale.confirmedAt ? 'CONFIRMED' : 'PENDING';
    const updated = await tx.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: originalStatus,
        refundedAt: null,
        cancellationReason: null,
        metadata: {
          ...((sale.metadata as any) || {}),
          refundCancelledBy: processedBy,
          refundCancelledAt: new Date().toISOString(),
        },
      },
    });

    // Lead 상태 복구 (있는 경우)
    if (sale.leadId) {
      const originalLeadStatus = sale.confirmedAt ? 'PURCHASED' : 'NEW';
      await tx.affiliateLead.update({
        where: { id: sale.leadId },
        data: {
          status: originalLeadStatus,
        },
      });
    }

    return updated;
  });

  return {
    success: true,
    sale: updatedSale,
  };
}
