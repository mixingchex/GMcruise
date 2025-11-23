/**
 * 기존 고객 데이터에 대한 초기 여정 기록 생성 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/migrate-customer-journey.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CustomerGroup = 'landing-page' | 'trial' | 'mall' | 'purchase' | 'refund' | null;

async function getCurrentCustomerGroup(userId: number): Promise<CustomerGroup> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      customerStatus: true,
      customerSource: true,
      testModeStartedAt: true,
      role: true,
      mallUserId: true,
      Reservation: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!user) return null;

  // 1. 환불고객 (최우선)
  if (user.customerStatus === 'refunded') {
    return 'refund';
  }

  // 2. 구매고객
  if (user.customerStatus === 'purchase_confirmed' || (user.Reservation && user.Reservation.length > 0)) {
    return 'purchase';
  }

  // 3. 3일 체험 고객
  if (user.customerSource === 'test-guide' || user.testModeStartedAt) {
    return 'trial';
  }

  // 4. 크루즈몰 고객
  if (user.role === 'community' || user.mallUserId) {
    return 'mall';
  }

  // 5. 랜딩페이지 고객
  if (user.customerSource === 'landing-page') {
    return 'landing-page';
  }

  return null;
}

async function migrateCustomerJourneys() {
  console.log('🚀 기존 고객 여정 기록 마이그레이션 시작...\n');

  try {
    // 관리자 제외한 모든 고객 조회
    const customers = await prisma.user.findMany({
      where: {
        role: { not: 'admin' },
      },
      select: {
        id: true,
        name: true,
        customerStatus: true,
        customerSource: true,
        testModeStartedAt: true,
        role: true,
        mallUserId: true,
        createdAt: true,
        Reservation: {
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`📊 총 ${customers.length}명의 고객 발견\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    const groupCounts: Record<string, number> = {};

    for (const customer of customers) {
      // 현재 그룹 확인
      const currentGroup = await getCurrentCustomerGroup(customer.id);

      if (!currentGroup) {
        skippedCount++;
        continue;
      }

      // 이미 여정 기록이 있는지 확인
      const existingJourney = await prisma.customerJourney.findFirst({
        where: { userId: customer.id },
      });

      if (existingJourney) {
        skippedCount++;
        continue;
      }

      // 초기 여정 기록 생성
      let triggerType: 'reservation_created' | 'certificate_issued' | 'refund_processed' | 'manual' | 'auto' = 'auto';
      let triggerDescription = '기존 데이터 마이그레이션';
      let triggerId: number | null = null;

      // 구매고객인 경우 첫 번째 예약 ID 사용
      if (currentGroup === 'purchase' && customer.Reservation && customer.Reservation.length > 0) {
        triggerType = 'reservation_created';
        triggerId = customer.Reservation[0]?.id || null;
        triggerDescription = '기존 예약 데이터 마이그레이션';
      } else if (currentGroup === 'refund') {
        triggerType = 'refund_processed';
        triggerDescription = '기존 환불 데이터 마이그레이션';
      } else if (currentGroup === 'purchase' && customer.customerStatus === 'purchase_confirmed') {
        triggerType = 'certificate_issued';
        triggerDescription = '기존 인증서 데이터 마이그레이션';
      }

      await prisma.customerJourney.create({
        data: {
          userId: customer.id,
          fromGroup: null, // 초기 상태
          toGroup: currentGroup,
          triggerType,
          triggerId,
          triggerDescription,
          metadata: {
            migratedAt: new Date().toISOString(),
            originalCustomerStatus: customer.customerStatus,
            originalCustomerSource: customer.customerSource,
          },
          createdAt: customer.createdAt, // 고객 생성일을 여정 기록일로 사용
        },
      });

      groupCounts[currentGroup] = (groupCounts[currentGroup] || 0) + 1;
      migratedCount++;

      if (migratedCount % 100 === 0) {
        console.log(`  진행 중... ${migratedCount}명 처리됨`);
      }
    }

    console.log('\n✅ 마이그레이션 완료!\n');
    console.log('📈 통계:');
    console.log(`  - 총 처리: ${customers.length}명`);
    console.log(`  - 마이그레이션: ${migratedCount}명`);
    console.log(`  - 건너뜀: ${skippedCount}명 (이미 기록 있음 또는 그룹 없음)\n`);
    console.log('📊 그룹별 분포:');
    Object.entries(groupCounts).forEach(([group, count]) => {
      const groupLabels: Record<string, string> = {
        'landing-page': '마케팅 랜딩페이지',
        'trial': '3일 체험',
        'mall': '크루즈몰',
        'purchase': '구매고객',
        'refund': '환불고객',
      };
      console.log(`  - ${groupLabels[group] || group}: ${count}명`);
    });
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
migrateCustomerJourneys()
  .then(() => {
    console.log('\n🎉 모든 작업이 완료되었습니다!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

