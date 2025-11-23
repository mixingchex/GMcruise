import prisma from '../lib/prisma';
// @ts-expect-error - crypto는 Node.js 환경에서 사용 가능
import { randomBytes } from 'crypto';

/**
 * 어필리에이트 테스트 데이터 생성
 * - boss1 대리점장 (이름: 전혜선)
 * - user1 판매원 (이름: 송)
 * - AffiliateRelation 생성 (boss1이 user1의 매니저)
 * - AffiliateLead 생성 (고객 데이터)
 * - AffiliateSale 생성 (판매 데이터)
 * - CommissionLedger 생성 (수수료 원장)
 */

async function generateAffiliateCode(name: string, id: number) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12);
  const suffix = randomBytes(2).toString('hex');
  return `AFF-${slug || 'partner'}-${suffix}-${id}`.toUpperCase();
}

async function main() {
  console.log('🚀 어필리에이트 테스트 데이터 생성 시작...\n');

  try {
    // 1. boss1 대리점장 생성/업데이트
    console.log('1️⃣ 대리점장 boss1 (전혜선) 생성/업데이트 중...');
    let boss1User = await prisma.user.findFirst({
      where: { 
        OR: [
          { phone: { startsWith: 'boss1' } },
          { email: 'boss1@test.local' },
          { mallUserId: 'boss1' }
        ]
      },
    });

    if (!boss1User) {
      boss1User = await prisma.user.create({
        data: {
          phone: 'boss1-전혜선',
          email: 'boss1@test.local',
          name: '전혜선',
          password: '1101',
          role: 'community',
          mallUserId: 'boss1',
          mallNickname: '전혜선',
          onboarded: true,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ User 생성 완료 (ID: ${boss1User.id}, 이름: ${boss1User.name})`);
    } else {
      boss1User = await prisma.user.update({
        where: { id: boss1User.id },
        data: {
          name: '전혜선',
          phone: 'boss1-전혜선',
          email: 'boss1@test.local',
          mallNickname: '전혜선',
        },
      });
      console.log(`   ✅ User 업데이트 완료 (ID: ${boss1User.id}, 이름: ${boss1User.name})`);
    }

    let boss1Profile = await prisma.affiliateProfile.findUnique({
      where: { userId: boss1User.id },
    });

    if (!boss1Profile) {
      const boss1Code = await generateAffiliateCode('전혜선', boss1User.id);
      boss1Profile = await prisma.affiliateProfile.create({
        data: {
          userId: boss1User.id,
          affiliateCode: boss1Code,
          type: 'BRANCH_MANAGER',
          status: 'ACTIVE',
          displayName: '전혜선',
          nickname: '전혜선',
          branchLabel: '서울지점',
          contactPhone: '010-0000-0001',
          contactEmail: 'boss1@test.local',
          contractStatus: 'SIGNED',
          contractSignedAt: new Date(),
          onboardedAt: new Date(),
          published: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateProfile 생성 완료 (ID: ${boss1Profile.id}, Code: ${boss1Code})\n`);
    } else {
      const boss1Code = await generateAffiliateCode('전혜선', boss1User.id);
      boss1Profile = await prisma.affiliateProfile.update({
        where: { id: boss1Profile.id },
        data: {
          affiliateCode: boss1Code,
          displayName: '전혜선',
          nickname: '전혜선',
          branchLabel: '서울지점',
          status: 'ACTIVE',
          contractStatus: 'SIGNED',
        },
      });
      console.log(`   ✅ AffiliateProfile 업데이트 완료 (ID: ${boss1Profile.id}, Code: ${boss1Code})\n`);
    }

    // 2. user1 판매원 생성/업데이트
    console.log('2️⃣ 판매원 user1 (송) 생성/업데이트 중...');
    let user1User = await prisma.user.findFirst({
      where: { 
        OR: [
          { phone: { startsWith: 'user1' } },
          { email: 'user1@test.local' },
          { mallUserId: 'user1' }
        ]
      },
    });

    if (!user1User) {
      user1User = await prisma.user.create({
        data: {
          phone: 'user1-송',
          email: 'user1@test.local',
          name: '송',
          password: '1101',
          role: 'community',
          mallUserId: 'user1',
          mallNickname: '송',
          onboarded: true,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ User 생성 완료 (ID: ${user1User.id}, 이름: ${user1User.name})`);
    } else {
      user1User = await prisma.user.update({
        where: { id: user1User.id },
        data: {
          name: '송',
          phone: 'user1-송',
          email: 'user1@test.local',
          mallNickname: '송',
        },
      });
      console.log(`   ✅ User 업데이트 완료 (ID: ${user1User.id}, 이름: ${user1User.name})`);
    }

    let user1Profile = await prisma.affiliateProfile.findUnique({
      where: { userId: user1User.id },
    });

    if (!user1Profile) {
      const user1Code = await generateAffiliateCode('송', user1User.id);
      user1Profile = await prisma.affiliateProfile.create({
        data: {
          userId: user1User.id,
          affiliateCode: user1Code,
          type: 'SALES_AGENT',
          status: 'ACTIVE',
          displayName: '송',
          nickname: '송',
          contactPhone: '010-0000-0002',
          contactEmail: 'user1@test.local',
          contractStatus: 'SIGNED',
          contractSignedAt: new Date(),
          onboardedAt: new Date(),
          published: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateProfile 생성 완료 (ID: ${user1Profile.id}, Code: ${user1Code})\n`);
    } else {
      const user1Code = await generateAffiliateCode('송', user1User.id);
      user1Profile = await prisma.affiliateProfile.update({
        where: { id: user1Profile.id },
        data: {
          affiliateCode: user1Code,
          displayName: '송',
          nickname: '송',
          status: 'ACTIVE',
          contractStatus: 'SIGNED',
        },
      });
      console.log(`   ✅ AffiliateProfile 업데이트 완료 (ID: ${user1Profile.id}, Code: ${user1Code})\n`);
    }

    // 3. AffiliateRelation 생성 (boss1이 user1의 매니저)
    console.log('3️⃣ AffiliateRelation 생성 중 (boss1 → user1)...');
    const existingRelation = await prisma.affiliateRelation.findUnique({
      where: {
        managerId_agentId: {
          managerId: boss1Profile.id,
          agentId: user1Profile.id,
        },
      },
    });

    if (!existingRelation) {
      await prisma.affiliateRelation.create({
        data: {
          managerId: boss1Profile.id,
          agentId: user1Profile.id,
          status: 'ACTIVE',
          connectedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateRelation 생성 완료\n`);
    } else {
      await prisma.affiliateRelation.update({
        where: { id: existingRelation.id },
        data: {
          status: 'ACTIVE',
          connectedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateRelation 업데이트 완료\n`);
    }

    // 4. AffiliateLead 생성 (고객 데이터)
    console.log('4️⃣ AffiliateLead 생성 중 (고객 데이터)...');
    const customerNames = ['김철수', '이영희', '박민수', '최지영', '정수진'];
    const customerPhones = ['010-1111-1111', '010-2222-2222', '010-3333-3333', '010-4444-4444', '010-5555-5555'];
    const statuses = ['CONTACTED', 'INTERESTED', 'QUOTED', 'PURCHASED'] as const;

    let createdLeads = 0;
    for (let i = 0; i < customerNames.length; i++) {
      const status = statuses[i % statuses.length];
      const existingLead = await prisma.affiliateLead.findFirst({
        where: { customerPhone: customerPhones[i] },
      });

      let lead;
      if (existingLead) {
        lead = await prisma.affiliateLead.update({
          where: { id: existingLead.id },
          data: {
            customerName: customerNames[i],
            managerId: boss1Profile.id,
            agentId: user1Profile.id,
            status,
            updatedAt: new Date(),
          },
        });
      } else {
        lead = await prisma.affiliateLead.create({
          data: {
            customerName: customerNames[i],
            customerPhone: customerPhones[i],
            managerId: boss1Profile.id,
            agentId: user1Profile.id,
            status,
            createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // 하루씩 차이
            updatedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
          },
        });
      }
      createdLeads++;
    }
    console.log(`   ✅ ${createdLeads}개의 AffiliateLead 생성 완료\n`);

    // 5. AffiliateSale 생성 (판매 데이터)
    console.log('5️⃣ AffiliateSale 생성 중 (판매 데이터)...');
    // PURCHASED 상태가 없으면 QUOTED 상태로 변경
    const quotedLeads = await prisma.affiliateLead.findMany({
      where: {
        status: 'QUOTED',
        agentId: user1Profile.id,
      },
      take: 3,
    });
    
    // QUOTED 상태를 PURCHASED로 변경
    for (const lead of quotedLeads) {
      await prisma.affiliateLead.update({
        where: { id: lead.id },
        data: { status: 'PURCHASED' },
      });
    }
    
    const purchasedLeads = await prisma.affiliateLead.findMany({
      where: {
        status: 'PURCHASED',
        agentId: user1Profile.id,
      },
      take: 3,
    });

    let createdSales = 0;
    for (const lead of purchasedLeads) {
      const existingSale = await prisma.affiliateSale.findFirst({
        where: { leadId: lead.id },
      });

      let sale;
      if (existingSale) {
        sale = await prisma.affiliateSale.update({
          where: { id: existingSale.id },
          data: {
            managerId: boss1Profile.id,
            agentId: user1Profile.id,
            saleAmount: 5000000 + Math.floor(Math.random() * 2000000),
            headcount: 2,
            status: 'CONFIRMED',
            saleDate: new Date(),
            confirmedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      } else {
        sale = await prisma.affiliateSale.create({
          data: {
            leadId: lead.id,
            managerId: boss1Profile.id,
            agentId: user1Profile.id,
            productCode: 'CRUISE-001',
            saleAmount: 5000000 + Math.floor(Math.random() * 2000000),
            headcount: 2,
            status: 'CONFIRMED',
            saleDate: new Date(),
            confirmedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      createdSales++;
    }
    console.log(`   ✅ ${createdSales}개의 AffiliateSale 생성 완료\n`);

    // 6. CommissionLedger 생성 (수수료 원장)
    console.log('6️⃣ CommissionLedger 생성 중 (수수료 원장)...');
    const sales = await prisma.affiliateSale.findMany({
      where: {
        agentId: user1Profile.id,
        status: 'CONFIRMED',
      },
    });

    let createdLedgers = 0;
    for (const sale of sales) {
      const netRevenue = sale.saleAmount * 0.9; // 10% 할인 가정
      const branchGross = netRevenue * 0.05; // 5% 지점 수수료
      const overrideGross = netRevenue * 0.02; // 2% 오버라이드 수수료
      const agentGross = netRevenue * 0.03; // 3% 판매원 수수료

      const existingLedger = await prisma.commissionLedger.findFirst({
        where: { saleId: sale.id },
      });

      if (existingLedger) {
        await prisma.commissionLedger.update({
          where: { id: existingLedger.id },
          data: {
            amount: Math.round(agentGross),
            withholdingAmount: Math.round(agentGross * 0.033),
            isSettled: false,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.commissionLedger.create({
          data: {
            saleId: sale.id,
            profileId: user1Profile.id,
            amount: Math.round(agentGross), // 수수료 금액 (정수로 변환)
            withholdingAmount: Math.round(agentGross * 0.033), // 원천징수액
            isSettled: false,
            entryType: 'SALE',
            createdAt: sale.confirmedAt || new Date(),
            updatedAt: sale.confirmedAt || new Date(),
          },
        });
      }
      createdLedgers++;
    }
    console.log(`   ✅ ${createdLedgers}개의 CommissionLedger 생성 완료\n`);

    // 7. CommissionAdjustment 생성 (수당 조정 승인용)
    console.log('7️⃣ CommissionAdjustment 생성 중 (수당 조정 승인용)...');
    const ledgers = await prisma.commissionLedger.findMany({
      where: {
        profileId: user1Profile.id,
        isSettled: false,
      },
      take: 5, // 더 많이 가져오기
    });
    console.log(`   📊 찾은 Ledger 개수: ${ledgers.length}`);

    let createdAdjustments = 0;
    const adjustmentStatuses = ['REQUESTED', 'APPROVED', 'REJECTED'] as const;
    const adjustmentReasons = [
      '고객 추가 서비스 제공으로 인한 수수료 조정 요청',
      '판매 실적 보정 요청',
      '특별 프로모션 수수료 조정',
    ];

    // 각 ledger에 대해 여러 개의 adjustment 생성 (다양한 상태)
    for (let i = 0; i < ledgers.length; i++) {
      const ledger = ledgers[i];
      if (!ledger) continue;
      
      // 각 ledger에 대해 1-2개의 adjustment 생성
      const adjustmentsToCreate = i === 0 ? 2 : 1; // 첫 번째 ledger는 2개, 나머지는 1개
      
      for (let j = 0; j < adjustmentsToCreate; j++) {
        const statusIndex = (i * 2 + j) % adjustmentStatuses.length;
        const status = adjustmentStatuses[statusIndex];
        const amount = Math.round(ledger.amount * (0.1 + j * 0.05)); // 10%, 15% 조정

        const existingAdjustment = await prisma.commissionAdjustment.findFirst({
          where: { 
            ledgerId: ledger.id,
            status: status, // 같은 상태의 adjustment가 있는지 확인
          },
        });

        if (existingAdjustment) {
          // 기존 Adjustment 업데이트
          try {
            await prisma.commissionAdjustment.update({
              where: { id: existingAdjustment.id },
              data: {
                status,
                amount,
                reason: adjustmentReasons[statusIndex] || adjustmentReasons[0],
                approvedById: status === 'APPROVED' || status === 'REJECTED' ? boss1User.id : null,
                decidedAt: status !== 'REQUESTED' ? new Date(Date.now() - ((i * 2 + j) * 24 * 60 * 60 * 1000) + 3600000) : null,
                metadata: {
                  originalAmount: ledger.amount,
                  adjustmentPercentage: 10 + j * 5,
                },
              },
            });
            createdAdjustments++;
            console.log(`   ✅ CommissionAdjustment 업데이트: ledgerId=${ledger.id}, status=${status}`);
          } catch (error: any) {
            console.error(`   ❌ CommissionAdjustment 업데이트 실패 (ledgerId=${ledger.id}):`, error?.message);
          }
        } else {
          // 새 Adjustment 생성
          try {
            await prisma.commissionAdjustment.create({
              data: {
                ledgerId: ledger.id,
                requestedById: user1User.id,
                approvedById: status === 'APPROVED' || status === 'REJECTED' ? boss1User.id : null,
                status,
                amount,
                reason: adjustmentReasons[statusIndex] || adjustmentReasons[0],
                requestedAt: new Date(Date.now() - ((i * 2 + j) * 24 * 60 * 60 * 1000)), // 2일씩 차이
                decidedAt: status !== 'REQUESTED' ? new Date(Date.now() - ((i * 2 + j) * 24 * 60 * 60 * 1000) + 3600000) : null,
                metadata: {
                  originalAmount: ledger.amount,
                  adjustmentPercentage: 10 + j * 5,
                },
              },
            });
            createdAdjustments++;
            console.log(`   ✅ CommissionAdjustment 생성: ledgerId=${ledger.id}, status=${status}`);
          } catch (error: any) {
            console.error(`   ❌ CommissionAdjustment 생성 실패 (ledgerId=${ledger.id}):`, error?.message);
          }
        }
      }
    }
    console.log(`   ✅ ${createdAdjustments}개의 CommissionAdjustment 생성 완료\n`);

    // 8. MonthlySettlement 생성 (지급명세서 관리용)
    console.log('8️⃣ MonthlySettlement 생성 중 (지급명세서 관리용)...');
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const settlementStatuses = ['DRAFT', 'LOCKED', 'APPROVED'] as const;
    let createdSettlements = 0;

    for (let i = 0; i < 3; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const status = settlementStatuses[i % settlementStatuses.length];

      const existingSettlement = await prisma.monthlySettlement.findFirst({
        where: {
          periodStart: {
            gte: new Date(month.getFullYear(), month.getMonth(), 1),
            lt: new Date(month.getFullYear(), month.getMonth() + 1, 1),
          },
        },
      });

      if (!existingSettlement) {
        await prisma.monthlySettlement.create({
          data: {
            periodStart: new Date(month.getFullYear(), month.getMonth(), 1),
            periodEnd: monthEnd,
            targetRole: 'SALES_AGENT',
            status,
            approvedById: status === 'APPROVED' ? boss1User.id : null,
            approvedAt: status === 'APPROVED' ? new Date() : null,
            lockedAt: status === 'LOCKED' || status === 'APPROVED' ? new Date() : null,
            paymentDate: status === 'APPROVED' ? new Date(month.getFullYear(), month.getMonth() + 1, 15) : null,
            summary: {
              totalSales: 2 + i,
              totalCommission: 150000 + (i * 50000),
              totalWithholding: 4950 + (i * 1650),
              netPayment: 145050 + (i * 48350),
            },
            notes: `${month.getFullYear()}년 ${month.getMonth() + 1}월 정산`,
            createdAt: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)),
            updatedAt: new Date(),
          },
        });
        createdSettlements++;
      }
    }
    console.log(`   ✅ ${createdSettlements}개의 MonthlySettlement 생성 완료\n`);

    // 9. 환불 처리용 AffiliateSale 생성
    console.log('9️⃣ 환불 처리용 AffiliateSale 생성 중...');
    const refundLeads = await prisma.affiliateLead.findMany({
      where: {
        status: 'PURCHASED',
        agentId: user1Profile.id,
      },
      take: 1,
    });

    let createdRefunds = 0;
    for (const lead of refundLeads) {
      const existingRefundSale = await prisma.affiliateSale.findFirst({
        where: {
          leadId: lead.id,
          status: 'REFUNDED',
        },
      });

      if (!existingRefundSale) {
        // 먼저 일반 판매가 있는지 확인
        const existingSale = await prisma.affiliateSale.findFirst({
          where: { leadId: lead.id },
        });

        if (existingSale) {
          // 기존 판매를 환불 상태로 변경
          await prisma.affiliateSale.update({
            where: { id: existingSale.id },
            data: {
              status: 'REFUNDED',
              refundedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5일 전
              cancellationReason: '고객 요청에 의한 환불',
              updatedAt: new Date(),
            },
          });
          createdRefunds++;
        } else {
          // 새로운 환불 판매 생성
          await prisma.affiliateSale.create({
            data: {
              leadId: lead.id,
              managerId: boss1Profile.id,
              agentId: user1Profile.id,
              productCode: 'CRUISE-002',
              saleAmount: 6000000,
              headcount: 2,
              status: 'REFUNDED',
              saleDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
              confirmedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
              refundedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
              cancellationReason: '고객 요청에 의한 환불',
              updatedAt: new Date(),
            },
          });
          createdRefunds++;
        }
      }
    }
    console.log(`   ✅ ${createdRefunds}개의 환불 처리 데이터 생성 완료\n`);

    console.log('✅ 어필리에이트 테스트 데이터 생성 완료!\n');
    console.log('📋 생성된 데이터 요약:');
    console.log(`   대리점장: ${boss1User.name} (boss1@test.local)`);
    console.log(`   판매원: ${user1User.name} (user1@test.local)`);
    console.log(`   고객(Leads): ${createdLeads}개`);
    console.log(`   판매(Sales): ${createdSales}개`);
    console.log(`   수수료 원장(Ledgers): ${createdLedgers}개`);
    console.log(`   수당 조정(Adjustments): ${createdAdjustments}개`);
    console.log(`   월별 정산(Settlements): ${createdSettlements}개`);
    console.log(`   환불 처리(Refunds): ${createdRefunds}개\n`);
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

