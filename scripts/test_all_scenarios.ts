// scripts/test_all_scenarios.ts
// 3가지 판매 시나리오 통합 테스트

async function testAllScenarios() {
  try {
    console.log('🧪 3가지 판매 시나리오 통합 테스트 시작...\n');

    const testCases = [
      {
        name: '시나리오 1: 본사 직접 판매 (HQ Direct)',
        description: 'affiliateCode, partnerId 모두 없음',
        data: {
          imp_uid: `TEST_IMP_${Date.now()}_HQ`,
          merchant_uid: `ORDER_HQ_${Date.now()}`,
          status: 'paid',
          amount: 5000000,
          productCode: 'SAMPLE-015',
          customerName: '본사고객',
          customerPhone: '010-1111-2222',
          customerEmail: 'hq-customer@example.com',
          metadata: {
            roomSelections: [
              {
                roomType: 'Interior',
                adult: 2,
              },
            ],
          },
        },
        expected: {
          managerId: null,
          agentId: null,
          branchCommission: 300000, // 저장은 되지만 ledger에는 들어가지 않음
          salesCommission: 0,
          overrideCommission: 0,
          hqNet: 1000000, // 전액 본사
          description: '본사가 전액 수익',
        },
      },
      {
        name: '시나리오 2: 대리점장 직접 판매 (Branch Manager Direct)',
        description: '대리점장만 판매 (boss1)',
        data: {
          imp_uid: `TEST_IMP_${Date.now()}_MGR`,
          merchant_uid: `ORDER_MGR_${Date.now()}`,
          status: 'paid',
          amount: 5000000,
          productCode: 'SAMPLE-015',
          customerName: '대리점고객',
          customerPhone: '010-3333-4444',
          customerEmail: 'branch-customer@example.com',
          metadata: {
            partnerId: 'boss1', // 대리점장 mallUserId
            roomSelections: [
              {
                roomType: 'Interior',
                adult: 2,
              },
            ],
          },
        },
        expected: {
          managerId: 'boss1',
          agentId: null,
          branchCommission: 300000,
          salesCommission: 0,
          overrideCommission: 0,
          description: '대리점장 수당 300,000원 + 본사 나머지',
        },
      },
      {
        name: '시나리오 3: 대리점 팀 판매 (Agent Sale with Override)',
        description: '판매원(user1)이 대리점장(boss1) 소속으로 판매',
        data: {
          imp_uid: `TEST_IMP_${Date.now()}_TEAM`,
          merchant_uid: `ORDER_TEAM_${Date.now()}`,
          status: 'paid',
          amount: 5000000,
          productCode: 'SAMPLE-015',
          customerName: '팀판매고객',
          customerPhone: '010-5555-6666',
          customerEmail: 'team-customer@example.com',
          metadata: {
            partnerId: 'user1', // 판매원 mallUserId
            roomSelections: [
              {
                roomType: 'Interior',
                adult: 2,
              },
            ],
          },
        },
        expected: {
          managerId: 'boss1',
          agentId: 'user1',
          branchCommission: 300000, // 저장은 되지만 ledger에는 0
          salesCommission: 200000,
          overrideCommission: 100000,
          description: '판매원 200,000원 + 대리점장 오버라이드 100,000원 + 본사 나머지',
        },
      },
    ];

    for (const testCase of testCases) {
      console.log('='.repeat(80));
      console.log(`📝 ${testCase.name}`);
      console.log(`   ${testCase.description}`);
      console.log(`   예상: ${testCase.expected.description}`);
      console.log('─'.repeat(80));

      // Webhook 호출
      const response = await fetch('http://localhost:3000/api/payment/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        console.log('✅ Webhook 성공!');
        console.log(`   판매 ID: ${result.saleId}`);

        // 짧은 대기 후 데이터 검증
        await new Promise(resolve => setTimeout(resolve, 500));

        // 직접 DB에서 조회
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        try {
          const sale = await prisma.affiliateSale.findUnique({
            where: { id: result.saleId },
            select: {
              id: true,
              managerId: true,
              agentId: true,
              branchCommission: true,
              salesCommission: true,
              overrideCommission: true,
              AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile: {
                select: {
                  User: { select: { mallUserId: true } },
                },
              },
              AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
                select: {
                  User: { select: { mallUserId: true } },
                },
              },
            },
          });

          if (sale) {
            const managerUserId = sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile?.User?.mallUserId || null;
            const agentUserId = sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.User?.mallUserId || null;

            console.log('\n💰 수당 내역:');
            console.log(`   대리점 수당: ${(sale.branchCommission || 0).toLocaleString()}원`);
            console.log(`   판매원 수당: ${(sale.salesCommission || 0).toLocaleString()}원`);
            console.log(`   오버라이드: ${(sale.overrideCommission || 0).toLocaleString()}원`);
            console.log(`\n🔍 파트너 정보:`);
            console.log(`   managerId: ${managerUserId || 'null'} (ID: ${sale.managerId || 'null'})`);
            console.log(`   agentId: ${agentUserId || 'null'} (ID: ${sale.agentId || 'null'})`);

            // 검증
            console.log('\n✅ 검증 결과:');

            let passed = true;

            if (testCase.expected.managerId === null) {
              if (sale.managerId === null) {
                console.log('   ✅ managerId가 null (정확)');
              } else {
                console.log(`   ❌ managerId가 ${sale.managerId} (예상: null)`);
                passed = false;
              }
            } else {
              if (managerUserId === testCase.expected.managerId) {
                console.log(`   ✅ managerId가 ${testCase.expected.managerId} (정확)`);
              } else {
                console.log(`   ❌ managerId가 ${managerUserId} (예상: ${testCase.expected.managerId})`);
                passed = false;
              }
            }

            if (testCase.expected.agentId === null) {
              if (sale.agentId === null) {
                console.log('   ✅ agentId가 null (정확)');
              } else {
                console.log(`   ❌ agentId가 ${sale.agentId} (예상: null)`);
                passed = false;
              }
            } else {
              if (agentUserId === testCase.expected.agentId) {
                console.log(`   ✅ agentId가 ${testCase.expected.agentId} (정확)`);
              } else {
                console.log(`   ❌ agentId가 ${agentUserId} (예상: ${testCase.expected.agentId})`);
                passed = false;
              }
            }

            if (sale.salesCommission === testCase.expected.salesCommission) {
              console.log(`   ✅ 판매원 수당: ${(sale.salesCommission || 0).toLocaleString()}원 (정확)`);
            } else {
              console.log(`   ❌ 판매원 수당: ${(sale.salesCommission || 0).toLocaleString()}원 (예상: ${testCase.expected.salesCommission.toLocaleString()}원)`);
              passed = false;
            }

            if (sale.overrideCommission === testCase.expected.overrideCommission) {
              console.log(`   ✅ 오버라이드: ${(sale.overrideCommission || 0).toLocaleString()}원 (정확)`);
            } else {
              console.log(`   ❌ 오버라이드: ${(sale.overrideCommission || 0).toLocaleString()}원 (예상: ${testCase.expected.overrideCommission.toLocaleString()}원)`);
              passed = false;
            }

            if (passed) {
              console.log('\n   🎉 모든 검증 통과!');
            } else {
              console.log('\n   ⚠️  일부 검증 실패');
            }
          }

          await prisma.$disconnect();
        } catch (dbError) {
          console.error('   ❌ DB 조회 실패:', dbError);
        }

      } else {
        console.log('❌ Webhook 실패:', result.message || result.error);
      }

      console.log('\n');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('='.repeat(80));
    console.log('🎉 모든 시나리오 테스트 완료!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testAllScenarios();
