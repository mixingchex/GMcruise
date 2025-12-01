// scripts/test_commission_payment.ts
// 수당 계산 테스트 (Webhook 직접 호출)

async function testCommissionPayment() {
  try {
    console.log('🧪 수당 계산 테스트 시작...\n');

    // 테스트 시나리오
    const testCases = [
      {
        name: 'user1 - SAMPLE-015 Interior',
        data: {
          imp_uid: `TEST_IMP_${Date.now()}_1`,
          merchant_uid: `ORDER_TEST_${Date.now()}_1`,
          status: 'paid',
          amount: 5000000,
          productCode: 'SAMPLE-015',
          customerName: '테스트고객1',
          customerPhone: '010-1111-1111',
          customerEmail: 'test1@example.com',
          metadata: {
            partnerId: 'user1',
            roomSelections: [
              {
                roomType: 'Interior',
                adult: 2,
                adult3rd: 0,
                child2to11: 0,
                infantUnder2: 0,
              },
            ],
          },
        },
        expected: {
          salesCommission: 250000,  // 25만원
          branchCommission: 150000, // 15만원
        },
      },
      {
        name: 'user1 - SAMPLE-015 Balcony',
        data: {
          imp_uid: `TEST_IMP_${Date.now()}_2`,
          merchant_uid: `ORDER_TEST_${Date.now()}_2`,
          status: 'paid',
          amount: 7000000,
          productCode: 'SAMPLE-015',
          customerName: '테스트고객2',
          customerPhone: '010-2222-2222',
          customerEmail: 'test2@example.com',
          metadata: {
            partnerId: 'user1',
            roomSelections: [
              {
                roomType: 'Balcony',
                adult: 2,
                adult3rd: 1,
                child2to11: 0,
                infantUnder2: 0,
              },
            ],
          },
        },
        expected: {
          salesCommission: 350000,  // 35만원
          branchCommission: 210000, // 21만원
        },
      },
      {
        name: 'user1 - SAMPLE-014 Suite',
        data: {
          imp_uid: `TEST_IMP_${Date.now()}_3`,
          merchant_uid: `ORDER_TEST_${Date.now()}_3`,
          status: 'paid',
          amount: 10000000,
          productCode: 'SAMPLE-014',
          customerName: '테스트고객3',
          customerPhone: '010-3333-3333',
          customerEmail: 'test3@example.com',
          metadata: {
            partnerId: 'user1',
            roomSelections: [
              {
                roomType: 'Suite',
                adult: 2,
                adult3rd: 2,
                child2to11: 1,
                infantUnder2: 0,
              },
            ],
          },
        },
        expected: {
          salesCommission: 500000,  // 50만원
          branchCommission: 300000, // 30만원
        },
      },
    ];

    let successCount = 0;
    let failCount = 0;

    for (const testCase of testCases) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 테스트: ${testCase.name}`);
      console.log('─'.repeat(60));

      try {
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

          // AffiliateSale 확인
          const saleCheck = await fetch(`http://localhost:3000/api/admin/affiliate/sales/${result.saleId}`, {
            credentials: 'include',
          });

          if (saleCheck.ok) {
            const saleData = await saleCheck.json();
            console.log('   상품: ' + testCase.data.productCode);
            console.log('   객실: ' + testCase.data.metadata.roomSelections[0].roomType);
            console.log('   판매액: ' + testCase.data.amount.toLocaleString() + '원');
            console.log('   판매원수당: ' + (saleData.sale?.salesCommission || 0).toLocaleString() + '원');
            console.log('   대리점수당: ' + (saleData.sale?.branchCommission || 0).toLocaleString() + '원');

            // 예상값 비교
            if (
              saleData.sale?.salesCommission === testCase.expected.salesCommission &&
              saleData.sale?.branchCommission === testCase.expected.branchCommission
            ) {
              console.log('   ✅ 수당 계산 정확!');
              successCount++;
            } else {
              console.log('   ❌ 수당 계산 오류!');
              console.log(`   예상 판매원수당: ${testCase.expected.salesCommission.toLocaleString()}원`);
              console.log(`   예상 대리점수당: ${testCase.expected.branchCommission.toLocaleString()}원`);
              failCount++;
            }
          }
        } else {
          console.log('❌ Webhook 실패:', result.message || result.error);
          failCount++;
        }
      } catch (error) {
        console.log('❌ 에러 발생:', error);
        failCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 테스트 결과');
    console.log('='.repeat(60));
    console.log(`✅ 성공: ${successCount}/${testCases.length}`);
    console.log(`❌ 실패: ${failCount}/${testCases.length}`);
    console.log();

    if (successCount === testCases.length) {
      console.log('🎉 모든 테스트 통과!');
      console.log('\n다음 단계:');
      console.log('1. http://localhost:3000/partner/3 접속 (user1 대시보드)');
      console.log('2. DB 관리 → 고객 목록에서 새 고객 확인');
      console.log('3. 판매 내역에서 수당 확인');
      console.log('4. 수당 정산 페이지에서 상세 내역 확인');
    } else {
      console.log('⚠️  일부 테스트 실패. 로그를 확인하세요.');
    }
    console.log();

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testCommissionPayment();
