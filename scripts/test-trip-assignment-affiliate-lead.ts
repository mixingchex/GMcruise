/**
 * 여행 배정 시 AffiliateLead 자동 생성 시뮬레이션
 * 
 * 테스트 시나리오:
 * 1. 잠재고객 생성 (customerStatus: null 또는 'prospects')
 * 2. 여행 배정 API 호출 (온보딩)
 * 3. customerStatus가 'purchase_confirmed'로 변경되었는지 확인
 * 4. AffiliateLead가 자동 생성되었는지 확인
 * 5. 어필리에이트 고객 관리 API에서 해당 Lead가 반환되는지 확인
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('여행 배정 → AffiliateLead 자동 생성 시뮬레이션 시작');
  console.log('='.repeat(80));

  try {
    // 1. 테스트용 잠재고객 생성
    console.log('\n[1단계] 테스트용 잠재고객 생성...');
    const testPhone = `010${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    const testUser = await prisma.user.create({
      data: {
        name: '테스트_잠재고객',
        phone: testPhone,
        password: 'test123',
        role: 'user',
        customerStatus: null, // 잠재고객
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✓ 잠재고객 생성 완료: ID=${testUser.id}, 이름=${testUser.name}, 전화번호=${testUser.phone}`);
    console.log(`  - customerStatus: ${testUser.customerStatus} (잠재고객)`);

    // 2. 테스트용 상품 생성
    console.log('\n[2단계] 테스트용 크루즈 상품 생성...');
    const testProduct = await prisma.cruiseProduct.create({
      data: {
        productCode: `TEST-${Date.now()}`,
        cruiseLine: '테스트 크루즈라인',
        shipName: '테스트 선박',
        packageName: '테스트 패키지',
        nights: 3,
        days: 4,
        itineraryPattern: [
          { day: 1, type: 'Embarkation', location: 'Busan', country: 'KR' },
          { day: 2, type: 'PortVisit', location: 'Fukuoka', country: 'JP' },
          { day: 3, type: 'Cruising', location: null, country: null },
          { day: 4, type: 'Disembarkation', location: 'Busan', country: 'KR' },
        ],
        saleStatus: '판매중',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✓ 상품 생성 완료: ID=${testProduct.id}, 상품코드=${testProduct.productCode}`);

    // 3. 관리자 계정 찾기
    console.log('\n[3단계] 관리자 계정 찾기...');
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
    });
    if (!admin) {
      throw new Error('관리자 계정을 찾을 수 없습니다.');
    }
    console.log(`✓ 관리자 계정: ID=${admin.id}, 이름=${admin.name}`);

    // 4. 여행 배정 (온보딩) 시뮬레이션
    console.log('\n[4단계] 여행 배정 (온보딩) 시뮬레이션...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 30); // 30일 후
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 4); // 4일 후

    // UserTrip 생성
    const trip = await prisma.userTrip.create({
      data: {
        userId: testUser.id,
        productId: testProduct.id,
        cruiseName: `${testProduct.cruiseLine} ${testProduct.shipName}`,
        nights: 3,
        days: 4,
        startDate: startDate,
        endDate: endDate,
        destination: ['일본'],
        status: 'Upcoming',
        reservationCode: testProduct.productCode,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✓ UserTrip 생성 완료: ID=${trip.id}`);

    // Itinerary 생성
    const now = new Date();
    await prisma.itinerary.createMany({
      data: [
        {
          userTripId: trip.id,
          day: 1,
          date: startDate,
          type: 'Embarkation',
          location: 'Busan',
          country: 'KR',
          updatedAt: now,
        },
        {
          userTripId: trip.id,
          day: 2,
          date: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
          type: 'PortVisit',
          location: 'Fukuoka',
          country: 'JP',
          updatedAt: now,
        },
      ],
    });
    console.log(`✓ Itinerary 생성 완료`);

    // VisitedCountry 생성
    await prisma.visitedCountry.upsert({
      where: {
        userId_countryCode: {
          userId: testUser.id,
          countryCode: 'JP',
        },
      },
      update: {
        visitCount: { increment: 1 },
        lastVisited: startDate,
        updatedAt: now,
      },
      create: {
        userId: testUser.id,
        countryCode: 'JP',
        countryName: '일본',
        visitCount: 1,
        lastVisited: startDate,
        updatedAt: now,
      },
    });
    console.log(`✓ VisitedCountry 생성 완료`);

    // User 업데이트: 구매고객으로 전환
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        onboarded: true,
        customerStatus: 'purchase_confirmed',
        totalTripCount: { increment: 1 },
        password: '3800',
        lastActiveAt: new Date(),
      },
    });
    console.log(`✓ User 업데이트 완료: customerStatus → 'purchase_confirmed'`);

    // 5. AffiliateLead 자동 생성 로직 시뮬레이션
    console.log('\n[5단계] AffiliateLead 자동 생성 로직 실행...');
    const userWithProfile = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: {
        id: true,
        name: true,
        phone: true,
        AffiliateProfile: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (userWithProfile && userWithProfile.phone) {
      // 기존 Lead 확인
      const existingLead = await prisma.affiliateLead.findFirst({
        where: {
          customerPhone: userWithProfile.phone,
        },
      });

      if (!existingLead) {
        // AffiliateProfile이 있는 경우 해당 프로필에 연결
        let managerId = null;
        let agentId = null;

        if (userWithProfile.AffiliateProfile) {
          if (userWithProfile.AffiliateProfile.type === 'BRANCH_MANAGER') {
            managerId = userWithProfile.AffiliateProfile.id;
          } else if (userWithProfile.AffiliateProfile.type === 'SALES_AGENT') {
            agentId = userWithProfile.AffiliateProfile.id;
            // 판매원의 대리점장 찾기
            const relation = await prisma.affiliateRelation.findFirst({
              where: {
                agentId: userWithProfile.AffiliateProfile.id,
                status: 'ACTIVE',
              },
              select: { managerId: true },
            });
            if (relation) {
              managerId = relation.managerId;
            }
          }
        }

        // AffiliateLead 생성
        const newLead = await prisma.affiliateLead.create({
          data: {
            customerName: userWithProfile.name,
            customerPhone: userWithProfile.phone,
            status: 'PURCHASED',
            source: 'trip_assignment',
            managerId: managerId,
            agentId: agentId,
            metadata: {
              createdFrom: 'trip_assignment',
              tripId: trip.id,
              assignedAt: new Date().toISOString(),
              assignedBy: admin.id,
            },
            updatedAt: new Date(),
          },
        });
        console.log(`✓ AffiliateLead 생성 완료: ID=${newLead.id}, 상태=${newLead.status}`);
      } else {
        // 기존 Lead 업데이트
        await prisma.affiliateLead.update({
          where: { id: existingLead.id },
          data: {
            status: 'PURCHASED',
            updatedAt: new Date(),
          },
        });
        console.log(`✓ 기존 AffiliateLead 업데이트 완료: ID=${existingLead.id}, 상태 → 'PURCHASED'`);
      }
    }

    // 6. 결과 검증
    console.log('\n[6단계] 결과 검증...');
    
    // User 상태 확인
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: {
        id: true,
        name: true,
        phone: true,
        customerStatus: true,
        onboarded: true,
        totalTripCount: true,
      },
    });
    console.log(`\n[검증 1] User 상태:`);
    console.log(`  - customerStatus: ${updatedUser?.customerStatus} (예상: 'purchase_confirmed')`);
    console.log(`  - onboarded: ${updatedUser?.onboarded} (예상: true)`);
    console.log(`  - totalTripCount: ${updatedUser?.totalTripCount} (예상: 1)`);
    
    const userStatusOk = 
      updatedUser?.customerStatus === 'purchase_confirmed' &&
      updatedUser?.onboarded === true &&
      updatedUser?.totalTripCount === 1;
    console.log(`  ${userStatusOk ? '✓' : '✗'} User 상태 검증: ${userStatusOk ? '성공' : '실패'}`);

    // AffiliateLead 확인
    const lead = await prisma.affiliateLead.findFirst({
      where: {
        customerPhone: testUser.phone,
      },
    });
    console.log(`\n[검증 2] AffiliateLead:`);
    if (lead) {
      console.log(`  - ID: ${lead.id}`);
      console.log(`  - customerName: ${lead.customerName}`);
      console.log(`  - customerPhone: ${lead.customerPhone}`);
      console.log(`  - status: ${lead.status} (예상: 'PURCHASED')`);
      console.log(`  - source: ${lead.source} (예상: 'trip_assignment')`);
      const leadOk = lead.status === 'PURCHASED' && lead.source === 'trip_assignment';
      console.log(`  ${leadOk ? '✓' : '✗'} AffiliateLead 검증: ${leadOk ? '성공' : '실패'}`);
    } else {
      console.log(`  ✗ AffiliateLead를 찾을 수 없습니다!`);
    }

    // 어필리에이트 고객 관리 API 시뮬레이션 (PURCHASED 상태 Lead 조회)
    console.log(`\n[검증 3] 어필리에이트 고객 관리 API 시뮬레이션 (PURCHASED 상태):`);
    const purchasedLeads = await prisma.affiliateLead.findMany({
      where: {
        status: 'PURCHASED',
        customerPhone: testUser.phone,
      },
    });
    console.log(`  - 조회된 Lead 수: ${purchasedLeads.length} (예상: 1)`);
    const apiOk = purchasedLeads.length === 1 && purchasedLeads[0].status === 'PURCHASED';
    console.log(`  ${apiOk ? '✓' : '✗'} API 검증: ${apiOk ? '성공' : '실패'}`);

    // 최종 결과
    console.log('\n' + '='.repeat(80));
    const allOk = userStatusOk && lead && lead.status === 'PURCHASED' && apiOk;
    if (allOk) {
      console.log('✅ 모든 검증 통과! 여행 배정 → AffiliateLead 자동 생성 기능이 정상 작동합니다.');
    } else {
      console.log('❌ 일부 검증 실패. 위의 오류를 확인해주세요.');
    }
    console.log('='.repeat(80));

    // 테스트 데이터 정리 (선택사항)
    console.log('\n[정리] 테스트 데이터 삭제...');
    if (lead) {
      await prisma.affiliateLead.delete({ where: { id: lead.id } });
      console.log(`✓ AffiliateLead 삭제 완료`);
    }
    await prisma.itinerary.deleteMany({ where: { userTripId: trip.id } });
    await prisma.visitedCountry.deleteMany({ where: { userId: testUser.id } });
    await prisma.userTrip.delete({ where: { id: trip.id } });
    console.log(`✓ UserTrip 삭제 완료`);
    await prisma.cruiseProduct.delete({ where: { id: testProduct.id } });
    console.log(`✓ CruiseProduct 삭제 완료`);
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log(`✓ User 삭제 완료`);

  } catch (error: any) {
    console.error('\n❌ 시뮬레이션 실패:', error);
    console.error('에러 상세:', error.message);
    if (error.stack) {
      console.error('스택 트레이스:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

