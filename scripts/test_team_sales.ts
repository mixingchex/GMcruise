// scripts/test_team_sales.ts
// 대리점 팀 판매 테스트 (판매원이 대리점장 소속일 때)

async function testTeamSales() {
  try {
    console.log('🧪 대리점 팀 판매 테스트 시작...\n');

    // 테스트 케이스: 판매원(user1)이 대리점장(boss1) 소속으로 판매
    const testCase = {
      name: '판매원(user1) → 대리점장(boss1) 소속',
      data: {
        imp_uid: `TEST_IMP_${Date.now()}_TEAM`,
        merchant_uid: `ORDER_TEAM_${Date.now()}`,
        status: 'paid',
        amount: 5000000,
        productCode: 'SAMPLE-015',
        customerName: '팀판매고객',
        customerPhone: '010-7777-8888',
        customerEmail: 'team-customer@example.com',
        metadata: {
          partnerId: 'user1',  // 판매원의 mallUserId
          roomSelections: [
            {
              roomType: 'Interior',
              adult: 2,
            },
          ],
        },
      },
      expected: {
        agentId: 'user1',
        managerId: 'boss1',
        salesCommission: 200000,
        overrideCommission: 100000,  // 대리점장이 받는 오버라이드
        description: '판매원 수당 200,000원 + 대리점장 오버라이드 100,000원',
      },
    };

    console.log('='.repeat(80));
    console.log(`📝 ${testCase.name}`);
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

      // 판매 내역 확인
      const saleCheckResponse = await fetch(
        `http://localhost:3000/api/admin/affiliate/sales/${result.saleId}`,
        {
          credentials: 'include',
        }
      );

      if (saleCheckResponse.ok) {
        const saleData = await saleCheckResponse.json();
        const sale = saleData.sale;

        console.log('\n💰 수당 내역:');
        console.log(`   판매액: ${testCase.data.amount.toLocaleString()}원`);
        console.log(`   대리점 수당: ${(sale?.branchCommission || 0).toLocaleString()}원`);
        console.log(`   판매원 수당: ${(sale?.salesCommission || 0).toLocaleString()}원`);
        console.log(`   오버라이드: ${(sale?.overrideCommission || 0).toLocaleString()}원`);
        console.log(`\n🔍 파트너 정보:`);
        console.log(`   managerId: ${sale?.managerId || 'null'}`);
        console.log(`   agentId: ${sale?.agentId || 'null'}`);

        // 검증
        console.log('\n✅ 검증 결과:');

        if (sale?.agentId && sale?.managerId) {
          console.log(`   ✅ 판매원과 대리점장 모두 설정됨`);
        } else {
          console.log(`   ❌ 판매원 또는 대리점장이 누락됨!`);
        }

        if (sale?.salesCommission === testCase.expected.salesCommission) {
          console.log(`   ✅ 판매원 수당: ${(sale?.salesCommission || 0).toLocaleString()}원 (정확)`);
        } else {
          console.log(`   ❌ 판매원 수당 불일치: 예상 ${testCase.expected.salesCommission.toLocaleString()}원, 실제 ${(sale?.salesCommission || 0).toLocaleString()}원`);
        }

        if (sale?.overrideCommission === testCase.expected.overrideCommission) {
          console.log(`   ✅ 오버라이드: ${(sale?.overrideCommission || 0).toLocaleString()}원 (정확)`);
        } else {
          console.log(`   ❌ 오버라이드 불일치: 예상 ${testCase.expected.overrideCommission.toLocaleString()}원, 실제 ${(sale?.overrideCommission || 0).toLocaleString()}원`);
        }

        console.log('\n📊 대리점장 최종 수당:');
        const managerTotal = (sale?.branchCommission || 0) + (sale?.overrideCommission || 0);
        console.log(`   오버라이드만: ${(sale?.overrideCommission || 0).toLocaleString()}원`);
        console.log(`   (대리점장이 직접 판매했다면: ${(sale?.branchCommission || 0).toLocaleString()}원)`);

      } else {
        console.log('   ⚠️  판매 정보 조회 실패 (API 404)');
      }
    } else {
      console.log('❌ Webhook 실패:', result.message || result.error);
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testTeamSales();
