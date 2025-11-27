import 'dotenv/config';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

interface CheckResult {
  category: string;
  feature: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  details?: any;
}

const results: CheckResult[] = [];

function addResult(category: string, feature: string, status: '✅' | '❌' | '⚠️', message: string, details?: any) {
  results.push({ category, feature, status, message, details });
}

async function checkCruiseGuideGenie() {
  logger.log('\n📱 크루즈가이드 지니 기능 점검 시작...\n');

  // 1. AI 챗 기능
  try {
    const chatSessions = await prisma.chatBotSession.findMany({ take: 1 });
    addResult('크루즈가이드 지니', 'AI 챗 세션 조회', '✅', 'ChatBotSession 테이블 접근 정상', { count: chatSessions.length });
  } catch (error: any) {
    addResult('크루즈가이드 지니', 'AI 챗 세션 조회', '❌', `오류: ${error.message}`);
  }

  // 2. 체크리스트 기능
  try {
    const checklistItems = await prisma.checklistItem.findMany({ take: 1 });
    addResult('크루즈가이드 지니', '체크리스트 조회', '✅', 'ChecklistItem 테이블 접근 정상', { count: checklistItems.length });
  } catch (error: any) {
    addResult('크루즈가이드 지니', '체크리스트 조회', '❌', `오류: ${error.message}`);
  }

  // 3. 여행 등록 기능
  try {
    const userTrips = await prisma.userTrip.findMany({ take: 1 });
    addResult('크루즈가이드 지니', '여행 등록 조회', '✅', 'UserTrip 테이블 접근 정상', { count: userTrips.length });
  } catch (error: any) {
    addResult('크루즈가이드 지니', '여행 등록 조회', '❌', `오류: ${error.message}`);
  }

  // 4. 가계부 기능
  try {
    const expenses = await prisma.expense.findMany({ take: 1 });
    addResult('크루즈가이드 지니', '가계부 조회', '✅', 'Expense 테이블 접근 정상', { count: expenses.length });
  } catch (error: any) {
    addResult('크루즈가이드 지니', '가계부 조회', '❌', `오류: ${error.message}`);
  }
}

async function checkCruiseMall() {
  logger.log('\n🛒 크루즈몰 기능 점검 시작...\n');

  // 1. 커뮤니티 기능
  try {
    const posts = await prisma.communityPost.findMany({ take: 1 });
    addResult('크루즈몰', '커뮤니티 게시글 조회', '✅', 'CommunityPost 테이블 접근 정상', { count: posts.length });
  } catch (error: any) {
    addResult('크루즈몰', '커뮤니티 게시글 조회', '❌', `오류: ${error.message}`);
  }

  try {
    const reviews = await prisma.cruiseReview.findMany({ take: 1 });
    addResult('크루즈몰', '리뷰 조회', '✅', 'CruiseReview 테이블 접근 정상', { count: reviews.length });
  } catch (error: any) {
    addResult('크루즈몰', '리뷰 조회', '❌', `오류: ${error.message}`);
  }

  // 2. 크루즈뉴스 기능
  try {
    const newsPosts = await prisma.communityPost.findMany({
      where: { category: 'news' },
      take: 1,
    });
    addResult('크루즈몰', '크루즈뉴스 조회', '✅', '크루즈뉴스 게시글 조회 정상', { count: newsPosts.length });
  } catch (error: any) {
    addResult('크루즈몰', '크루즈뉴스 조회', '❌', `오류: ${error.message}`);
  }

  // 3. 상품 구매 기능
  try {
    const products = await prisma.cruiseProduct.findMany({ take: 1 });
    addResult('크루즈몰', '상품 조회', '✅', 'CruiseProduct 테이블 접근 정상', { count: products.length });
  } catch (error: any) {
    addResult('크루즈몰', '상품 조회', '❌', `오류: ${error.message}`);
  }

  try {
    const inquiries = await prisma.productInquiry.findMany({ take: 1 });
    addResult('크루즈몰', '상품 문의 조회', '✅', 'ProductInquiry 테이블 접근 정상', { count: inquiries.length });
  } catch (error: any) {
    addResult('크루즈몰', '상품 문의 조회', '❌', `오류: ${error.message}`);
  }
}

async function checkAdminPanel() {
  logger.log('\n👨‍💼 관리자 패널 기능 점검 시작...\n');

  // 1. 관리자 사용자 확인
  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' },
      take: 1,
    });
    addResult('관리자 패널', '관리자 사용자 조회', '✅', '관리자 사용자 조회 정상', { count: adminUsers.length });
  } catch (error: any) {
    addResult('관리자 패널', '관리자 사용자 조회', '❌', `오류: ${error.message}`);
  }

  // 2. 고객 관리
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'user' },
      take: 1,
    });
    addResult('관리자 패널', '고객 조회', '✅', '고객 조회 정상', { count: customers.length });
  } catch (error: any) {
    addResult('관리자 패널', '고객 조회', '❌', `오류: ${error.message}`);
  }

  // 3. 정산 관리
  try {
    const settlements = await prisma.monthlySettlement.findMany({ take: 1 });
    addResult('관리자 패널', '정산 조회', '✅', 'MonthlySettlement 테이블 접근 정상', { count: settlements.length });
  } catch (error: any) {
    addResult('관리자 패널', '정산 조회', '❌', `오류: ${error.message}`);
  }

  // 4. 어필리에이트 관리
  try {
    const profiles = await prisma.affiliateProfile.findMany({ take: 1 });
    addResult('관리자 패널', '어필리에이트 프로필 조회', '✅', 'AffiliateProfile 테이블 접근 정상', { count: profiles.length });
  } catch (error: any) {
    addResult('관리자 패널', '어필리에이트 프로필 조회', '❌', `오류: ${error.message}`);
  }
}

async function checkPartnerDashboard() {
  logger.log('\n🤝 파트너 대시보드 기능 점검 시작...\n');

  // 1. 판매원 프로필 확인
  try {
    const salesAgents = await prisma.affiliateProfile.findMany({
      where: { type: 'SALES_AGENT' },
      take: 1,
    });
    addResult('파트너 대시보드', '판매원 프로필 조회', '✅', '판매원 프로필 조회 정상', { count: salesAgents.length });
  } catch (error: any) {
    addResult('파트너 대시보드', '판매원 프로필 조회', '❌', `오류: ${error.message}`);
  }

  // 2. 대리점장 프로필 확인
  try {
    const branchManagers = await prisma.affiliateProfile.findMany({
      where: { type: 'BRANCH_MANAGER' },
      take: 1,
    });
    addResult('파트너 대시보드', '대리점장 프로필 조회', '✅', '대리점장 프로필 조회 정상', { count: branchManagers.length });
  } catch (error: any) {
    addResult('파트너 대시보드', '대리점장 프로필 조회', '❌', `오류: ${error.message}`);
  }

  // 3. 판매 내역 조회
  try {
    const sales = await prisma.affiliateSale.findMany({ take: 1 });
    addResult('파트너 대시보드', '판매 내역 조회', '✅', 'AffiliateSale 테이블 접근 정상', { count: sales.length });
  } catch (error: any) {
    addResult('파트너 대시보드', '판매 내역 조회', '❌', `오류: ${error.message}`);
  }

  // 4. 고객 리드 조회
  try {
    const leads = await prisma.affiliateLead.findMany({ take: 1 });
    addResult('파트너 대시보드', '고객 리드 조회', '✅', 'AffiliateLead 테이블 접근 정상', { count: leads.length });
  } catch (error: any) {
    addResult('파트너 대시보드', '고객 리드 조회', '❌', `오류: ${error.message}`);
  }

  // 5. 커미션 원장 조회
  try {
    const ledgerEntries = await prisma.commissionLedger.findMany({ take: 1 });
    addResult('파트너 대시보드', '커미션 원장 조회', '✅', 'CommissionLedger 테이블 접근 정상', { count: ledgerEntries.length });
  } catch (error: any) {
    addResult('파트너 대시보드', '커미션 원장 조회', '❌', `오류: ${error.message}`);
  }
}

async function checkDatabaseConnections() {
  logger.log('\n🔌 데이터베이스 연결 점검 시작...\n');

  try {
    await prisma.$queryRaw`SELECT 1`;
    addResult('데이터베이스', '연결 상태', '✅', '데이터베이스 연결 정상');
  } catch (error: any) {
    addResult('데이터베이스', '연결 상태', '❌', `연결 실패: ${error.message}`);
  }

  try {
    const userCount = await prisma.user.count();
    addResult('데이터베이스', 'User 테이블', '✅', `User 테이블 접근 정상 (${userCount}개 레코드)`);
  } catch (error: any) {
    addResult('데이터베이스', 'User 테이블', '❌', `오류: ${error.message}`);
  }
}

async function main() {
  logger.log('🚀 크루즈가이드 지니 전체 시스템 점검 시작\n');
  logger.log('=' .repeat(60));

  try {
    await checkDatabaseConnections();
    await checkCruiseGuideGenie();
    await checkCruiseMall();
    await checkAdminPanel();
    await checkPartnerDashboard();

    logger.log('\n' + '='.repeat(60));
    logger.log('\n📊 점검 결과 요약\n');

    const successCount = results.filter(r => r.status === '✅').length;
    const warningCount = results.filter(r => r.status === '⚠️').length;
    const errorCount = results.filter(r => r.status === '❌').length;

    logger.log(`✅ 성공: ${successCount}개`);
    logger.log(`⚠️  경고: ${warningCount}개`);
    logger.log(`❌ 오류: ${errorCount}개`);
    logger.log(`📋 총계: ${results.length}개\n`);

    // 카테고리별 결과 출력
    const categories = [...new Set(results.map(r => r.category))];
    for (const category of categories) {
      logger.log(`\n[${category}]`);
      const categoryResults = results.filter(r => r.category === category);
      for (const result of categoryResults) {
        logger.log(`  ${result.status} ${result.feature}: ${result.message}`);
        if (result.details) {
          logger.log(`     상세: ${JSON.stringify(result.details)}`);
        }
      }
    }

    // 오류가 있으면 상세 출력
    if (errorCount > 0) {
      logger.log('\n\n❌ 발견된 오류:\n');
      results.filter(r => r.status === '❌').forEach(result => {
        logger.log(`  - [${result.category}] ${result.feature}: ${result.message}`);
      });
    }

    logger.log('\n' + '='.repeat(60));
    logger.log('\n✅ 전체 시스템 점검 완료!\n');

    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    logger.error('❌ 시스템 점검 중 치명적 오류:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

