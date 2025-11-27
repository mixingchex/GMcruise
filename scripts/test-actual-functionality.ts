import 'dotenv/config';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

interface FunctionalityTest {
  name: string;
  test: () => Promise<{ success: boolean; message: string; details?: any }>;
}

const tests: FunctionalityTest[] = [];

// 테스트 1: 실제 데이터 CRUD 작업
tests.push({
  name: '체크리스트 CRUD 작업',
  test: async () => {
    try {
      const user = await prisma.user.findFirst({ where: { role: 'user' } });
      if (!user) {
        return { success: false, message: '테스트 사용자가 없습니다.' };
      }

      // CREATE
      const newItem = await prisma.checklistItem.create({
        data: {
          userId: user.id,
          text: '테스트 체크리스트 항목',
          completed: false,
        },
      });

      // READ
      const readItem = await prisma.checklistItem.findUnique({
        where: { id: newItem.id },
      });

      if (!readItem) {
        return { success: false, message: '생성한 항목을 읽을 수 없습니다.' };
      }

      // UPDATE
      const updatedItem = await prisma.checklistItem.update({
        where: { id: newItem.id },
        data: { completed: true },
      });

      if (!updatedItem.completed) {
        return { success: false, message: '업데이트가 작동하지 않습니다.' };
      }

      // DELETE
      await prisma.checklistItem.delete({
        where: { id: newItem.id },
      });

      const deletedItem = await prisma.checklistItem.findUnique({
        where: { id: newItem.id },
      });

      if (deletedItem) {
        return { success: false, message: '삭제가 작동하지 않습니다.' };
      }

      return {
        success: true,
        message: '체크리스트 CRUD 작업 정상',
        details: { created: true, read: true, updated: true, deleted: true },
      };
    } catch (error: any) {
      return { success: false, message: `오류: ${error.message}` };
    }
  },
});

// 테스트 2: 관계형 데이터 조회
tests.push({
  name: '관계형 데이터 조회',
  test: async () => {
    try {
      // User → UserTrip 관계
      const user = await prisma.user.findFirst({
        where: { role: 'user' },
        include: {
          UserTrip: {
            take: 1,
          },
        },
      });

      if (!user) {
        return { success: false, message: '사용자가 없습니다.' };
      }

      // AffiliateProfile → AffiliateSale 관계
      const profile = await prisma.affiliateProfile.findFirst({
        include: {
          AffiliateSale_AffiliateSale_agentIdToAffiliateProfile: {
            take: 1,
          },
        },
      });

      return {
        success: true,
        message: '관계형 데이터 조회 정상',
        details: {
          userHasTrips: user.UserTrip.length > 0,
          profileHasSales: profile ? profile.AffiliateSale_AffiliateSale_agentIdToAffiliateProfile.length > 0 : false,
        },
      };
    } catch (error: any) {
      return { success: false, message: `오류: ${error.message}` };
    }
  },
});

// 테스트 3: 복잡한 쿼리 (집계)
tests.push({
  name: '집계 쿼리 작업',
  test: async () => {
    try {
      // 사용자 수 집계
      const userCount = await prisma.user.count();

      // 여행 수 집계
      const tripCount = await prisma.userTrip.count();

      // 그룹별 집계
      const tripsByStatus = await prisma.userTrip.groupBy({
        by: ['status'],
        _count: true,
      });

      return {
        success: true,
        message: '집계 쿼리 작업 정상',
        details: {
          userCount,
          tripCount,
          tripsByStatus: tripsByStatus.length,
        },
      };
    } catch (error: any) {
      return { success: false, message: `오류: ${error.message}` };
    }
  },
});

// 테스트 4: 트랜잭션 작업
tests.push({
  name: '트랜잭션 작업',
  test: async () => {
    try {
      const user = await prisma.user.findFirst({ where: { role: 'user' } });
      if (!user) {
        return { success: false, message: '테스트 사용자가 없습니다.' };
      }

      // 트랜잭션으로 여러 작업 수행
      const result = await prisma.$transaction(async (tx) => {
        // 1. 체크리스트 항목 생성
        const item1 = await tx.checklistItem.create({
          data: {
            userId: user.id,
            text: '트랜잭션 테스트 항목 1',
            completed: false,
          },
        });

        const item2 = await tx.checklistItem.create({
          data: {
            userId: user.id,
            text: '트랜잭션 테스트 항목 2',
            completed: false,
          },
        });

        return { item1: item1.id, item2: item2.id };
      });

      // 생성된 항목들 삭제
      await prisma.checklistItem.deleteMany({
        where: {
          id: { in: [result.item1, result.item2] },
        },
      });

      return {
        success: true,
        message: '트랜잭션 작업 정상',
        details: { created: 2, deleted: 2 },
      };
    } catch (error: any) {
      return { success: false, message: `오류: ${error.message}` };
    }
  },
});

// 테스트 5: JSON 필드 작업
tests.push({
  name: 'JSON 필드 작업',
  test: async () => {
    try {
      // SystemConfig의 JSON 필드 확인
      const config = await prisma.systemConfig.findFirst();
      if (config && config.metadata) {
        return {
          success: true,
          message: 'JSON 필드 작업 정상',
          details: { hasMetadata: true },
        };
      }

      // MarketingInsight의 JSON 필드 확인
      const insight = await prisma.marketingInsight.findFirst();
      if (insight && insight.data) {
        return {
          success: true,
          message: 'JSON 필드 작업 정상',
          details: { hasData: true },
        };
      }

      return {
        success: true,
        message: 'JSON 필드 작업 정상 (데이터 없음)',
      };
    } catch (error: any) {
      return { success: false, message: `오류: ${error.message}` };
    }
  },
});

// 테스트 6: 날짜 필터링
tests.push({
  name: '날짜 필터링 작업',
  test: async () => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 최근 7일 내 생성된 사용자
      const recentUsers = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        take: 5,
      });

      return {
        success: true,
        message: '날짜 필터링 작업 정상',
        details: { recentUsers: recentUsers.length },
      };
    } catch (error: any) {
      return { success: false, message: `오류: ${error.message}` };
    }
  },
});

// 테스트 7: 정렬 및 페이지네이션
tests.push({
  name: '정렬 및 페이지네이션',
  test: async () => {
    try {
      // 최신순 정렬
      const recentTrips = await prisma.userTrip.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        skip: 0,
      });

      // 두 번째 페이지
      const secondPage = await prisma.userTrip.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        skip: 5,
      });

      return {
        success: true,
        message: '정렬 및 페이지네이션 정상',
        details: {
          firstPage: recentTrips.length,
          secondPage: secondPage.length,
        },
      };
    } catch (error: any) {
      return { success: false, message: `오류: ${error.message}` };
    }
  },
});

// 테스트 8: 복합 조건 쿼리
tests.push({
  name: '복합 조건 쿼리',
  test: async () => {
    try {
      // 여러 조건을 가진 쿼리
      const complexQuery = await prisma.user.findMany({
        where: {
          AND: [
            { role: 'user' },
            { isHibernated: false },
          ],
        },
        take: 10,
      });

      return {
        success: true,
        message: '복합 조건 쿼리 정상',
        details: { resultCount: complexQuery.length },
      };
    } catch (error: any) {
      return { success: false, message: `오류: ${error.message}` };
    }
  },
});

async function main() {
  logger.log('🔬 실제 기능 동작 테스트 시작\n');
  logger.log('='.repeat(60));

  const results: Array<{ test: string; result: { success: boolean; message: string; details?: any } }> = [];

  for (const test of tests) {
    try {
      logger.log(`\n🧪 [${test.name}]`);
      const result = await test.test();
      results.push({ test: test.name, result });
      
      const status = result.success ? '✅' : '❌';
      logger.log(`   ${status} ${result.message}`);
      if (result.details) {
        logger.log(`   상세: ${JSON.stringify(result.details, null, 2)}`);
      }
    } catch (error: any) {
      logger.error(`   ❌ 예외 발생: ${error.message}`);
      results.push({
        test: test.name,
        result: {
          success: false,
          message: `예외 발생: ${error.message}`,
        },
      });
    }
  }

  logger.log('\n' + '='.repeat(60));
  logger.log('\n📊 기능 테스트 결과 요약\n');

  const successCount = results.filter(r => r.result.success).length;
  const errorCount = results.filter(r => !r.result.success).length;

  logger.log(`✅ 성공: ${successCount}개`);
  logger.log(`❌ 실패: ${errorCount}개`);
  logger.log(`📋 총계: ${results.length}개\n`);

  if (errorCount > 0) {
    logger.log('\n❌ 실패한 테스트:\n');
    results.filter(r => !r.result.success).forEach(({ test, result }) => {
      logger.log(`  - ${test}: ${result.message}`);
    });
  }

  logger.log('\n' + '='.repeat(60));
  logger.log('\n✅ 실제 기능 동작 테스트 완료!\n');

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());

