import prisma from '../lib/prisma';

async function upsertUser(email: string, phone: string, name: string, role: string) {
  const timestamp = new Date();
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      phone,
      updatedAt: timestamp,
    },
    create: {
      name,
      email,
      phone,
      password: 'sample-password',
      role,
      updatedAt: timestamp,
    },
  });
}

async function upsertAffiliateProfile(userId: number, type: string, displayName: string) {
  const timestamp = new Date();
  return prisma.affiliateProfile.upsert({
    where: { userId },
    update: {
      displayName,
      type,
      status: 'ACTIVE',
      updatedAt: timestamp,
    },
    create: {
      userId,
      displayName,
      type,
      status: 'ACTIVE',
      affiliateCode: `${type === 'SALES_AGENT' ? 'AGENT' : 'MANAGER'}-${userId}`,
      withholdingRate: type === 'SALES_AGENT' ? 3.3 : 3.3,
      updatedAt: timestamp,
    },
  });
}

async function main() {
  console.log('🧪 정산 테스트 데이터 생성 시작...\n');

  const managerUser = await upsertUser('sample.manager@cruisedot.local', '01000000001', '샘플 매니저', 'admin');
  const agentUser = await upsertUser('sample.agent@cruisedot.local', '01000000002', '샘플 판매원', 'user');

  const managerProfile = await upsertAffiliateProfile(managerUser.id, 'BRANCH_MANAGER', '샘플 매니저');
  const agentProfile = await upsertAffiliateProfile(agentUser.id, 'SALES_AGENT', '샘플 판매원');

  // 연결 관계 생성
  await prisma.affiliateRelation.upsert({
    where: {
      managerId_agentId: {
        managerId: managerProfile.id,
        agentId: agentProfile.id,
      },
    },
    update: {
      status: 'ACTIVE',
      updatedAt: new Date(),
    },
    create: {
      managerId: managerProfile.id,
      agentId: agentProfile.id,
      status: 'ACTIVE',
      connectedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const now = new Date();
  const effectiveFrom = new Date(now.getFullYear(), now.getMonth(), 1);

  const product = await prisma.affiliateProduct.upsert({
    where: {
      productCode_effectiveFrom: {
        productCode: 'SAMPLE-PRODUCT',
        effectiveFrom,
      },
    },
    update: {
      title: '샘플 크루즈 상품',
    },
    create: {
      productCode: 'SAMPLE-PRODUCT',
      title: '샘플 크루즈 상품',
      status: 'ACTIVE',
      effectiveFrom,
    },
  });

  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const settlement = await prisma.monthlySettlement.create({
    data: {
      periodStart,
      periodEnd,
      status: 'APPROVED',
      approvedById: managerUser.id,
      approvedAt: now,
      paymentDate: now,
      updatedAt: now,
    },
  });

  const sale = await prisma.affiliateSale.create({
    data: {
      productCode: product.productCode,
      affiliateProductId: product.id,
      managerId: managerProfile.id,
      agentId: agentProfile.id,
      saleAmount: 5000000,
      costAmount: 3200000,
      netRevenue: 1800000,
      headcount: 2,
      status: 'PAID',
      saleDate: now,
      confirmedAt: now,
      audioFileType: 'FIRST_CALL',
      audioFileGoogleDriveId: 'sample-drive-id',
      audioFileGoogleDriveUrl: 'https://drive.google.com/file/d/sample',
      updatedAt: now,
    },
  });

  const entries = [
    {
      entryType: 'HQ_NET',
      amount: 600000,
      withholdingAmount: 0,
      profileId: null,
    },
    {
      entryType: 'BRANCH_COMMISSION',
      amount: 400000,
      withholdingAmount: 13200,
      profileId: managerProfile.id,
    },
    {
      entryType: 'OVERRIDE_COMMISSION',
      amount: 200000,
      withholdingAmount: 6600,
      profileId: managerProfile.id,
    },
    {
      entryType: 'SALES_COMMISSION',
      amount: 500000,
      withholdingAmount: 16500,
      profileId: agentProfile.id,
    },
  ];

  for (const entry of entries) {
    await prisma.commissionLedger.create({
      data: {
        saleId: sale.id,
        entryType: entry.entryType,
        amount: entry.amount,
        withholdingAmount: entry.withholdingAmount,
        profileId: entry.profileId,
        settlementId: settlement.id,
        isSettled: true,
        updatedAt: new Date(),
      },
    });
  }

  console.log('✅ 샘플 정산 데이터 생성 완료!');
  console.log(`- settlementId: ${settlement.id}`);
  console.log(`- saleId: ${sale.id}`);
  console.log(`- managerProfileId: ${managerProfile.id}`);
  console.log(`- agentProfileId: ${agentProfile.id}`);
}

main()
  .catch((error) => {
    console.error('❌ 샘플 정산 데이터 생성 실패:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

