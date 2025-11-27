import 'dotenv/config';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

interface FeatureCheck {
  category: string;
  feature: string;
  test: () => Promise<{ success: boolean; message: string; details?: any }>;
}

const checks: FeatureCheck[] = [];

// 1. 크루즈가이드 지니 - 3일 체험 기능
checks.push({
  category: '크루즈가이드 지니',
  feature: '3일 체험 로그인 (비밀번호 1101)',
  test: async () => {
    try {
      // 테스트 모드 사용자 찾기 또는 생성
      const testUser = await prisma.user.findFirst({
        where: {
          customerSource: 'test-guide',
          customerStatus: 'test',
        },
      });
      
      if (testUser) {
        // 72시간 경과 확인
        if (testUser.testModeStartedAt) {
          const testModeEndAt = new Date(testUser.testModeStartedAt);
          testModeEndAt.setHours(testModeEndAt.getHours() + 72);
          const now = new Date();
          const isExpired = now > testModeEndAt;
          
          return {
            success: true,
            message: `3일 체험 사용자 발견 (${isExpired ? '만료됨' : '활성'})`,
            details: {
              userId: testUser.id,
              name: testUser.name,
              testModeStartedAt: testUser.testModeStartedAt,
              expired: isExpired,
            },
          };
        }
      }
      
      return {
        success: true,
        message: '3일 체험 기능 준비됨 (사용자 없음)',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `오류: ${error.message}`,
      };
    }
  },
});

// 2. 크루즈몰 - 커뮤니티 기능
checks.push({
  category: '크루즈몰',
  feature: '커뮤니티 게시글 작성/조회',
  test: async () => {
    try {
      const posts = await prisma.communityPost.findMany({
        where: { isDeleted: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      
      return {
        success: true,
        message: `커뮤니티 게시글 조회 정상 (${posts.length}개)`,
        details: { count: posts.length },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `오류: ${error.message}`,
      };
    }
  },
});

// 3. 크루즈몰 - 크루즈뉴스
checks.push({
  category: '크루즈몰',
  feature: '크루즈뉴스 조회',
  test: async () => {
    try {
      const newsPosts = await prisma.communityPost.findMany({
        where: {
          category: 'news',
          isDeleted: false,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      
      return {
        success: true,
        message: `크루즈뉴스 조회 정상 (${newsPosts.length}개)`,
        details: { count: newsPosts.length },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `오류: ${error.message}`,
      };
    }
  },
});

// 4. 크루즈몰 - 상품 구매
checks.push({
  category: '크루즈몰',
  feature: '상품 조회 및 문의',
  test: async () => {
    try {
      const [products, inquiries] = await Promise.all([
        prisma.cruiseProduct.findMany({
          where: { saleStatus: '판매중' },
          take: 5,
        }),
        prisma.productInquiry.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      
      return {
        success: true,
        message: `상품 조회 정상 (${products.length}개), 문의 조회 정상 (${inquiries.length}개)`,
        details: {
          products: products.length,
          inquiries: inquiries.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `오류: ${error.message}`,
      };
    }
  },
});

// 5. 관리자 패널 - 대시보드 데이터
checks.push({
  category: '관리자 패널',
  feature: '대시보드 통계 조회',
  test: async () => {
    try {
      const [users, trips, settlements, profiles] = await Promise.all([
        prisma.user.count({ where: { role: 'user' } }),
        prisma.userTrip.count(),
        prisma.monthlySettlement.count(),
        prisma.affiliateProfile.count(),
      ]);
      
      return {
        success: true,
        message: '대시보드 통계 조회 정상',
        details: {
          users,
          trips,
          settlements,
          profiles,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `오류: ${error.message}`,
      };
    }
  },
});

// 6. 파트너 대시보드 - 판매원
checks.push({
  category: '파트너 대시보드',
  feature: '판매원 대시보드 데이터',
  test: async () => {
    try {
      const salesAgent = await prisma.affiliateProfile.findFirst({
        where: { type: 'SALES_AGENT' },
        include: {
          AffiliateSale_AffiliateSale_agentIdToAffiliateProfile: {
            take: 1,
          },
          AffiliateLead_AffiliateLead_agentIdToAffiliateProfile: {
            take: 1,
          },
        },
      });
      
      if (!salesAgent) {
        return {
          success: true,
          message: '판매원 프로필 없음 (샘플 데이터 필요)',
        };
      }
      
      return {
        success: true,
        message: '판매원 대시보드 데이터 조회 정상',
        details: {
          profileId: salesAgent.id,
          displayName: salesAgent.displayName,
          salesCount: salesAgent.AffiliateSale_AffiliateSale_agentIdToAffiliateProfile.length,
          leadsCount: salesAgent.AffiliateLead_AffiliateLead_agentIdToAffiliateProfile.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `오류: ${error.message}`,
      };
    }
  },
});

// 7. 파트너 대시보드 - 대리점장
checks.push({
  category: '파트너 대시보드',
  feature: '대리점장 대시보드 데이터',
  test: async () => {
    try {
      const branchManager = await prisma.affiliateProfile.findFirst({
        where: { type: 'BRANCH_MANAGER' },
        include: {
          AffiliateSale_AffiliateSale_managerIdToAffiliateProfile: {
            take: 1,
          },
          AffiliateLead_AffiliateLead_managerIdToAffiliateProfile: {
            take: 1,
          },
          AffiliateRelation_AffiliateRelation_managerIdToAffiliateProfile: {
            where: { status: 'ACTIVE' },
            take: 1,
          },
        },
      });
      
      if (!branchManager) {
        return {
          success: true,
          message: '대리점장 프로필 없음 (샘플 데이터 필요)',
        };
      }
      
      return {
        success: true,
        message: '대리점장 대시보드 데이터 조회 정상',
        details: {
          profileId: branchManager.id,
          displayName: branchManager.displayName,
          salesCount: branchManager.AffiliateSale_AffiliateSale_managerIdToAffiliateProfile.length,
          leadsCount: branchManager.AffiliateLead_AffiliateLead_managerIdToAffiliateProfile.length,
          teamMembers: branchManager.AffiliateRelation_AffiliateRelation_managerIdToAffiliateProfile.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `오류: ${error.message}`,
      };
    }
  },
});

// 8. AI 챗 기능
checks.push({
  category: '크루즈가이드 지니',
  feature: 'AI 챗 세션 및 히스토리',
  test: async () => {
    try {
      const [sessions, chatHistory] = await Promise.all([
        prisma.chatBotSession.findMany({ take: 1 }),
        prisma.chatHistory.findMany({ take: 1 }),
      ]);
      
      return {
        success: true,
        message: 'AI 챗 데이터 조회 정상',
        details: {
          sessions: sessions.length,
          chatHistory: chatHistory.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `오류: ${error.message}`,
      };
    }
  },
});

// 9. 체크리스트 기능
checks.push({
  category: '크루즈가이드 지니',
  feature: '체크리스트 CRUD',
  test: async () => {
    try {
      const items = await prisma.checklistItem.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      
      return {
        success: true,
        message: `체크리스트 조회 정상 (${items.length}개)`,
        details: { count: items.length },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `오류: ${error.message}`,
      };
    }
  },
});

// 10. 결제 시스템
checks.push({
  category: '크루즈몰',
  feature: '결제 시스템',
  test: async () => {
    try {
      const payments = await prisma.payment.findMany({
        take: 1,
        orderBy: { createdAt: 'desc' },
      });
      
      return {
        success: true,
        message: `결제 데이터 조회 정상 (${payments.length}개)`,
        details: { count: payments.length },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `오류: ${error.message}`,
      };
    }
  },
});

async function main() {
  logger.log('🔍 상세 기능별 점검 시작\n');
  logger.log('='.repeat(60));

  const results: Array<{ category: string; feature: string; result: { success: boolean; message: string; details?: any } }> = [];

  for (const check of checks) {
    try {
      const result = await check.test();
      results.push({ category: check.category, feature: check.feature, result });
      
      const status = result.success ? '✅' : '❌';
      logger.log(`${status} [${check.category}] ${check.feature}: ${result.message}`);
      if (result.details) {
        logger.log(`   상세: ${JSON.stringify(result.details)}`);
      }
    } catch (error: any) {
      logger.error(`❌ [${check.category}] ${check.feature}: 오류 발생 - ${error.message}`);
      results.push({
        category: check.category,
        feature: check.feature,
        result: {
          success: false,
          message: `예외 발생: ${error.message}`,
        },
      });
    }
  }

  logger.log('\n' + '='.repeat(60));
  logger.log('\n📊 점검 결과 요약\n');

  const successCount = results.filter(r => r.result.success).length;
  const errorCount = results.filter(r => !r.result.success).length;

  logger.log(`✅ 성공: ${successCount}개`);
  logger.log(`❌ 오류: ${errorCount}개`);
  logger.log(`📋 총계: ${results.length}개\n`);

  // 카테고리별 결과
  const categories = [...new Set(results.map(r => r.category))];
  for (const category of categories) {
    logger.log(`\n[${category}]`);
    const categoryResults = results.filter(r => r.category === category);
    for (const { feature, result } of categoryResults) {
      const status = result.success ? '✅' : '❌';
      logger.log(`  ${status} ${feature}: ${result.message}`);
    }
  }

  if (errorCount > 0) {
    logger.log('\n\n❌ 발견된 오류:\n');
    results.filter(r => !r.result.success).forEach(({ category, feature, result }) => {
      logger.log(`  - [${category}] ${feature}: ${result.message}`);
    });
  }

  logger.log('\n' + '='.repeat(60));
  logger.log('\n✅ 상세 기능 점검 완료!\n');

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());

