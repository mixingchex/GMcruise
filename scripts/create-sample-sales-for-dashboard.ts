// scripts/create-sample-sales-for-dashboard.ts
// 판매원 대시보드 결제/정산 테스트용 샘플 판매 데이터 생성 스크립트

import prisma from '../lib/prisma';

/**
 * 판매원 대시보드 결제/정산 테스트용 샘플 데이터 생성
 * - 현재 로그인한 판매원에게 5개의 샘플 판매 데이터 생성
 * - 다양한 상태 (PENDING, PENDING_APPROVAL, APPROVED, REJECTED, CONFIRMED)
 * - 다양한 판매 금액과 날짜
 */

async function main() {
  console.log('🚀 판매원 대시보드 결제/정산 테스트용 샘플 데이터 생성 시작...\n');

  try {
    // 1. 판매원 프로필 찾기 (SALES_AGENT 타입)
    console.log('1️⃣ 판매원 프로필 찾는 중...');
    const salesAgentProfiles = await prisma.affiliateProfile.findMany({
      where: {
        type: 'SALES_AGENT',
        status: 'ACTIVE',
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      take: 1,
    });

    if (salesAgentProfiles.length === 0) {
      console.log('   ⚠️  판매원 프로필을 찾을 수 없습니다.');
      console.log('   💡 먼저 scripts/create-affiliate-test-data.ts를 실행하여 판매원을 생성해주세요.\n');
      return;
    }

    const agentProfile = salesAgentProfiles[0];
    console.log(`   ✅ 판매원 프로필 찾음: ${agentProfile.displayName || agentProfile.User?.name} (ID: ${agentProfile.id})\n`);

    // 2. 대리점장 프로필 찾기 (BRANCH_MANAGER 타입)
    console.log('2️⃣ 대리점장 프로필 찾는 중...');
    let managerProfile: { id: number; displayName: string | null } | null = null;
    const relation = await prisma.affiliateRelation.findFirst({
      where: {
        agentId: agentProfile.id,
        status: 'ACTIVE',
      },
    });

    if (relation) {
      // managerId로 대리점장 프로필 찾기
      managerProfile = await prisma.affiliateProfile.findUnique({
        where: { id: relation.managerId },
      });
      if (managerProfile) {
        console.log(`   ✅ 대리점장 프로필 찾음: ${managerProfile.displayName || 'Unknown'} (ID: ${managerProfile.id})\n`);
      }
    }
    
    if (!managerProfile) {
      // 대리점장이 없으면 찾기
      const managerProfiles = await prisma.affiliateProfile.findMany({
        where: {
          type: 'BRANCH_MANAGER',
          status: 'ACTIVE',
        },
        take: 1,
      });

      if (managerProfiles.length > 0) {
        managerProfile = managerProfiles[0] as { id: number; displayName: string | null };
        if (managerProfile) {
          console.log(`   ✅ 대리점장 프로필 찾음: ${managerProfile.displayName || 'Unknown'} (ID: ${managerProfile.id})\n`);
        }
      } else {
        console.log('   ⚠️  대리점장 프로필을 찾을 수 없습니다. managerId는 null로 설정됩니다.\n');
      }
    }

    // 3. 샘플 판매 데이터 생성
    console.log('3️⃣ 샘플 판매 데이터 생성 중...');
    const now = new Date();
    const sampleSales = [
      {
        productCode: 'CRZ-ALSK-7N',
        saleAmount: 7180000,
        status: 'APPROVED' as const,
        saleDate: new Date(now.getFullYear(), now.getMonth() - 1, 2, 13, 21, 11),
        submittedAt: new Date(now.getFullYear(), now.getMonth() - 1, 2, 13, 21, 11),
        approvedAt: new Date(now.getFullYear(), now.getMonth() - 1, 3, 10, 0, 0),
        headcount: 4,
      },
      {
        productCode: 'CRZ-MED-9N',
        saleAmount: 5840000,
        status: 'PENDING_APPROVAL' as const,
        saleDate: new Date(now.getFullYear(), now.getMonth() - 1, 18, 9, 53, 44),
        submittedAt: new Date(now.getFullYear(), now.getMonth() - 1, 18, 9, 53, 44),
        headcount: 2,
      },
      {
        productCode: 'CRZ-CARIB-5N',
        saleAmount: 4500000,
        status: 'PENDING' as const,
        saleDate: new Date(now.getFullYear(), now.getMonth(), 5, 14, 30, 0),
        headcount: 2,
      },
      {
        productCode: 'CRZ-JAPAN-4N',
        saleAmount: 3200000,
        status: 'REJECTED' as const,
        saleDate: new Date(now.getFullYear(), now.getMonth() - 2, 15, 11, 20, 0),
        submittedAt: new Date(now.getFullYear(), now.getMonth() - 2, 15, 11, 20, 0),
        rejectionReason: '녹음 파일이 불완전합니다. 다시 제출해주세요.',
        headcount: 2,
      },
      {
        productCode: 'CRZ-EUROPE-12N',
        saleAmount: 9800000,
        status: 'CONFIRMED' as const,
        saleDate: new Date(now.getFullYear(), now.getMonth() - 1, 25, 16, 45, 0),
        submittedAt: new Date(now.getFullYear(), now.getMonth() - 1, 25, 16, 45, 0),
        approvedAt: new Date(now.getFullYear(), now.getMonth() - 1, 26, 9, 30, 0),
        headcount: 4,
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < sampleSales.length; i++) {
      const saleData = sampleSales[i];
      
      // 기존 판매 데이터 확인 (productCode와 saleDate로 중복 체크)
      const existingSale = await prisma.affiliateSale.findFirst({
        where: {
          agentId: agentProfile.id,
          productCode: saleData.productCode,
          saleDate: saleData.saleDate,
        },
      });

      if (existingSale) {
        // 기존 데이터 업데이트
        await prisma.affiliateSale.update({
          where: { id: existingSale.id },
          data: {
            saleAmount: saleData.saleAmount,
            status: saleData.status,
            submittedAt: saleData.submittedAt || null,
            approvedAt: saleData.approvedAt || null,
            rejectionReason: saleData.rejectionReason || null,
            headcount: saleData.headcount,
            managerId: managerProfile?.id || null,
            updatedAt: new Date(),
          },
        });
        updatedCount++;
        console.log(`   ✅ 판매 데이터 업데이트: ${saleData.productCode} (${saleData.status})`);
      } else {
        // 새 판매 데이터 생성
        await prisma.affiliateSale.create({
          data: {
            agentId: agentProfile.id,
            managerId: managerProfile?.id || null,
            productCode: saleData.productCode,
            saleAmount: saleData.saleAmount,
            status: saleData.status,
            saleDate: saleData.saleDate,
            submittedAt: saleData.submittedAt || null,
            approvedAt: saleData.approvedAt || null,
            rejectionReason: saleData.rejectionReason || null,
            headcount: saleData.headcount,
            createdAt: saleData.saleDate,
            updatedAt: new Date(),
          },
        });
        createdCount++;
        console.log(`   ✅ 판매 데이터 생성: ${saleData.productCode} (${saleData.status})`);
      }
    }

    console.log(`\n   📊 생성 완료: ${createdCount}개 생성, ${updatedCount}개 업데이트\n`);

    // 4. 생성된 데이터 요약 출력
    console.log('4️⃣ 생성된 판매 데이터 요약:');
    console.log('='.repeat(60));
    const allSales = await prisma.affiliateSale.findMany({
      where: {
        agentId: agentProfile.id,
      },
      orderBy: {
        saleDate: 'desc',
      },
    });

    const statusSummary = {
      PENDING: { count: 0, amount: 0 },
      PENDING_APPROVAL: { count: 0, amount: 0 },
      APPROVED: { count: 0, amount: 0 },
      REJECTED: { count: 0, amount: 0 },
      CONFIRMED: { count: 0, amount: 0 },
    };

    allSales.forEach((sale) => {
      const status = sale.status as keyof typeof statusSummary;
      if (statusSummary[status]) {
        statusSummary[status].count++;
        statusSummary[status].amount += sale.saleAmount;
      }
    });

    console.log(`   총 판매 건수: ${allSales.length}건`);
    console.log(`   총 판매 금액: ${allSales.reduce((sum, sale) => sum + sale.saleAmount, 0).toLocaleString()}원\n`);
    
    console.log('   상태별 통계:');
    Object.entries(statusSummary).forEach(([status, data]) => {
      if (data.count > 0) {
        console.log(`     ${status}: ${data.count}건, ${data.amount.toLocaleString()}원`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ 판매원 대시보드 결제/정산 테스트용 샘플 데이터 생성 완료!\n');
    console.log('📋 다음 단계:');
    console.log(`   1. 판매원으로 로그인: ${agentProfile.User?.phone || '판매원 전화번호'}`);
    console.log(`   2. 대시보드 접속: /partner/${agentProfile.User?.mallUserId || 'partnerId'}/payment`);
    console.log(`   3. 판매 목록에서 ${allSales.length}개의 샘플 데이터 확인\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ 스크립트 실행 실패:', e);
    // @ts-ignore - process는 Node.js 환경에서 사용 가능
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

