import prisma from '../lib/prisma';

async function main() {
  const settlement = await prisma.monthlySettlement.findFirst({
    orderBy: { id: 'desc' },
    include: {
      CommissionLedger: {
        include: {
          AffiliateProfile: {
            select: {
              id: true,
              affiliateCode: true,
              displayName: true,
              type: true,
              withholdingRate: true,
            },
          },
          AffiliateSale: {
            select: {
              productCode: true,
              saleDate: true,
              confirmedAt: true,
              AffiliateProduct: { select: { title: true } },
            },
          },
        },
        orderBy: [{ profileId: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!settlement) {
    console.log('⚠️  정산 데이터가 없습니다.');
    return;
  }

  type StatementSummary = {
    profileId: number;
    displayName: string;
    type: string;
    affiliateCode: string;
    withholdingRate: number;
    grossAmount: number;
    withholdingAmount: number;
    netAmount: number;
    entryCount: number;
    details: {
      entryId: number;
      entryType: string;
      amount: number;
      withholdingAmount: number;
      saleProduct: string;
    }[];
  };

  const statements = new Map<number, StatementSummary>();

  for (const entry of settlement.CommissionLedger) {
    const profile = entry.AffiliateProfile;
    const key = profile?.id ?? 0;

    if (!statements.has(key)) {
      statements.set(key, {
        profileId: key,
        displayName: profile?.displayName ?? '본사/HQ',
        type: profile?.type ?? 'HQ',
        affiliateCode: profile?.affiliateCode ?? 'N/A',
        withholdingRate: profile?.withholdingRate ?? 0,
        grossAmount: 0,
        withholdingAmount: 0,
        netAmount: 0,
        entryCount: 0,
        details: [],
      });
    }

    const summary = statements.get(key)!;
    summary.grossAmount += Number(entry.amount);
    summary.withholdingAmount += Number(entry.withholdingAmount ?? 0);
    summary.netAmount = summary.grossAmount - summary.withholdingAmount;
    summary.entryCount += 1;
    summary.details.push({
      entryId: entry.id,
      entryType: entry.entryType,
      amount: Number(entry.amount),
      withholdingAmount: Number(entry.withholdingAmount ?? 0),
      saleProduct:
        entry.AffiliateSale?.AffiliateProduct?.title ??
        entry.AffiliateSale?.productCode ??
        'N/A',
    });
  }

  console.log('🧾 Settlement Summary');
  console.log(
    `- ID: ${settlement.id}, 기간: ${settlement.periodStart.toISOString()} ~ ${settlement.periodEnd.toISOString()}`
  );
  console.log(`- 상태: ${settlement.status}, 원장 엔트리: ${settlement.CommissionLedger.length}`);

  statements.forEach((value) => {
    console.log(
      `\n[프로필 ${value.profileId}] ${value.displayName} (${value.type}, code: ${value.affiliateCode})`
    );
    console.log(
      `  총액: ${value.grossAmount.toLocaleString()}원, 원천징수: ${value.withholdingAmount.toLocaleString()}원, 실지급: ${value.netAmount.toLocaleString()}원`
    );
    value.details.forEach((detail) => {
      console.log(
        `   - ${detail.entryType}: ${detail.amount.toLocaleString()}원 (원천징수 ${detail.withholdingAmount.toLocaleString()}원) / 상품: ${detail.saleProduct}`
      );
    });
  });
}

main()
  .catch((error) => {
    console.error('❌ Settlement 테스트 중 오류:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

