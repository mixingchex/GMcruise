// scripts/simulate-admin-panel.ts
// 관리자 패널 전체 기능 시뮬레이션 스크립트

import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

// 콘솔 출력 함수
const log = (message: string) => {
  console.log(message);
  logger.log(message);
};

const logError = (message: string, error?: any) => {
  console.error(message, error);
  logger.error(message, error);
};

const execAsync = promisify(exec);

interface TestResult {
  category: string;
  feature: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  details?: any;
  time?: number;
}

const results: TestResult[] = [];

async function testFeature(
  category: string,
  feature: string,
  testFn: () => Promise<any>
): Promise<void> {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const time = Date.now() - startTime;
    results.push({
      category,
      feature,
      status: '✅',
      message: '정상 작동',
      details: result,
      time,
    });
      log(`✅ [${category}] ${feature}: 성공 (${time}ms)`);
    } catch (error: any) {
      const time = Date.now() - startTime;
      results.push({
        category,
        feature,
        status: '❌',
        message: error.message || '오류 발생',
        details: error.stack,
        time,
      });
      logError(`❌ [${category}] ${feature}: 실패 - ${error.message}`);
  }
}

// 1. APIS 기능 테스트
async function testAPIs() {
  log('\n📡 APIS 기능 테스트 시작...');

  // 대시보드 API
  await testFeature('APIS', '대시보드 API', async () => {
    const stats = await prisma.dashboardStats.findFirst({
      orderBy: { date: 'desc' },
    });
    return { hasStats: !!stats };
  });

  // 고객 목록 API
  await testFeature('APIS', '고객 목록 API', async () => {
    const count = await prisma.user.count({
      where: { role: { not: 'admin' } },
    });
    return { customerCount: count };
  });

  // 통계 업데이트 API
  await testFeature('APIS', '통계 업데이트 API', async () => {
    // 스크립트가 존재하는지 확인
    const scriptPath = path.join(process.cwd(), 'scripts', 'update-dashboard-stats.ts');
    const exists = await fs.access(scriptPath).then(() => true).catch(() => false);
    return { scriptExists: exists };
  });
}

// 2. 고객관리 기능 테스트
async function testCustomerManagement() {
  log('\n👥 고객관리 기능 테스트 시작...');

  // 고객 조회
  await testFeature('고객관리', '고객 목록 조회', async () => {
    const customers = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      take: 10,
      select: {
        id: true,
        name: true,
        phone: true,
        customerStatus: true,
        customerSource: true,
      },
    });
    return { count: customers.length };
  });

  // 고객 검색 (전화번호)
  await testFeature('고객관리', '전화번호 검색', async () => {
    const customer = await prisma.user.findFirst({
      where: {
        role: { not: 'admin' },
        phone: { not: null },
      },
      select: { id: true, phone: true },
    });
    if (customer?.phone) {
      const found = await prisma.user.findFirst({
        where: { phone: customer.phone },
      });
      return { found: !!found };
    }
    return { found: false, reason: '테스트 데이터 없음' };
  });

  // 고객 그룹 필터링
  await testFeature('고객관리', '고객 그룹 필터링', async () => {
    const groups = {
      all: await prisma.user.count({ where: { role: { not: 'admin' } } }),
      mall: await prisma.user.count({
        where: { role: 'community', customerSource: 'mall-signup' },
      }),
      purchase: await prisma.user.count({
        where: {
          OR: [
            { customerStatus: 'purchase_confirmed' },
            { customerSource: 'cruise-guide' },
          ],
        },
      }),
    };
    return groups;
  });

  // 엑셀 다운로드 기능 확인
  await testFeature('고객관리', '엑셀 다운로드 API', async () => {
    const apiPath = path.join(
      process.cwd(),
      'app',
      'api',
      'admin',
      'customers',
      'export',
      'route.ts'
    );
    const exists = await fs.access(apiPath).then(() => true).catch(() => false);
    return { apiExists: exists };
  });
}

// 3. 어필리에이트 기능 테스트
async function testAffiliate() {
  log('\n🤝 어필리에이트 기능 테스트 시작...');

  // 어필리에이트 프로필 조회
  await testFeature('어필리에이트', '프로필 조회', async () => {
    const profiles = await prisma.affiliateProfile.findMany({
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        displayName: true,
        branchLabel: true,
      },
    });
    return { count: profiles.length };
  });

  // 어필리에이트 리드 조회
  await testFeature('어필리에이트', '리드 조회', async () => {
    const leads = await prisma.affiliateLead.findMany({
      take: 10,
      select: {
        id: true,
        status: true,
        customerPhone: true,
      },
    });
    return { count: leads.length };
  });

  // 어필리에이트 판매 조회
  await testFeature('어필리에이트', '판매 조회', async () => {
    const sales = await prisma.affiliateSale.findMany({
      take: 10,
      select: {
        id: true,
        status: true,
        saleAmount: true,
        saleDate: true,
      },
    });
    return { count: sales.length, totalAmount: sales.reduce((sum, s) => sum + (s.saleAmount || 0), 0) };
  });

  // 수수료 원장 조회
  await testFeature('어필리에이트', '수수료 원장 조회', async () => {
    const ledger = await prisma.commissionLedger.findMany({
      take: 10,
      select: {
        id: true,
        isSettled: true,
        amount: true,
      },
    });
    const settled = ledger.filter(l => l.isSettled).length;
    const pending = ledger.filter(l => !l.isSettled).length;
    return { total: ledger.length, settled, pending };
  });
}

// 4. 정산 기능 테스트
async function testSettlement() {
  log('\n💰 정산 기능 테스트 시작...');

  // 정산 대시보드 데이터
  await testFeature('정산', '정산 대시보드 데이터', async () => {
    const [totalCommission, settledCommission, pendingCommission] = await Promise.all([
      prisma.commissionLedger.aggregate({
        _sum: { amount: true },
      }),
      prisma.commissionLedger.aggregate({
        where: { isSettled: true },
        _sum: { amount: true },
      }),
      prisma.commissionLedger.aggregate({
        where: { isSettled: false },
        _sum: { amount: true },
      }),
    ]);
    return {
      total: totalCommission._sum.amount || 0,
      settled: settledCommission._sum.amount || 0,
      pending: pendingCommission._sum.amount || 0,
    };
  });

  // 판매원별 정산 조회
  await testFeature('정산', '판매원별 정산 조회', async () => {
    const agentSettlements = await prisma.commissionLedger.groupBy({
      by: ['profileId'],
      where: { isSettled: false },
      _sum: { amount: true },
      _count: { id: true },
    });
    return { agentCount: agentSettlements.length };
  });

  // 대리점장별 정산 조회
  await testFeature('정산', '대리점장별 정산 조회', async () => {
    // 대리점장 프로필 조회
    const managers = await prisma.affiliateProfile.findMany({
      where: { type: 'BRANCH_MANAGER' },
      select: { id: true },
      take: 10,
    });
    return { managerCount: managers.length };
  });
}

// 5. 메시지 기능 테스트
async function testMessages() {
  log('\n💬 메시지 기능 테스트 시작...');

  // 메시지 조회
  await testFeature('메시지', '관리자 메시지 조회', async () => {
    const messages = await prisma.adminMessage.findMany({
      take: 10,
      select: {
        id: true,
        messageType: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { count: messages.length };
  });

  // 예약 메시지 조회
  await testFeature('메시지', '예약 메시지 조회', async () => {
    const scheduled = await prisma.scheduledMessage.findMany({
      take: 10,
      select: {
        id: true,
        isActive: true,
        startDate: true,
        createdAt: true,
      },
    });
    return { count: scheduled.length };
  });
}

// 6. 여권 관리 기능 테스트
async function testPassport() {
  log('\n🛂 여권 관리 기능 테스트 시작...');

  // 여권 요청 조회
  await testFeature('여권', '여권 요청 로그 조회', async () => {
    const requests = await prisma.passportRequestLog.findMany({
      take: 10,
      select: {
        id: true,
        status: true,
        sentAt: true,
      },
      orderBy: { sentAt: 'desc' },
    });
    return { count: requests.length };
  });

  // 여권 제출 조회
  await testFeature('여권', '여권 제출 조회', async () => {
    const submissions = await prisma.passportSubmission.findMany({
      take: 10,
      select: {
        id: true,
        isSubmitted: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { count: submissions.length };
  });

  // 여행자 정보 조회
  await testFeature('여권', '여행자 정보 조회', async () => {
    const travelers = await prisma.traveler.findMany({
      take: 10,
      select: {
        id: true,
        passportNo: true,
        expiryDate: true,
      },
    });
    const withPassport = travelers.filter(t => t.passportNo && t.passportNo.trim() !== '').length;
    return { total: travelers.length, withPassport };
  });

  // 예약별 여권 상태
  await testFeature('여권', '예약별 여권 상태', async () => {
    const reservations = await prisma.reservation.findMany({
      take: 10,
      include: {
        Traveler: {
          select: {
            passportNo: true,
            expiryDate: true,
          },
        },
      },
    });
    const stats = reservations.map(res => ({
      reservationId: res.id,
      totalTravelers: res.totalPeople || 0,
      travelersWithPassport: res.Traveler?.filter(
        t => t.passportNo && t.passportNo.trim() !== ''
      ).length || 0,
    }));
    return { reservationCount: reservations.length, stats };
  });
}

// 7. 구글 드라이브 백업 기능 테스트
async function testGoogleDrive() {
  log('\n☁️ 구글 드라이브 백업 기능 테스트 시작...');

  // 환경 변수 확인
  await testFeature('구글 드라이브', '환경 변수 확인', async () => {
    const required = [
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY',
      'GOOGLE_DRIVE_SHARED_DRIVE_ID',
    ];
    const missing = required.filter(key => !process.env[key]);
    return {
      configured: missing.length === 0,
      missing,
    };
  });

  // Google Drive API 라이브러리 확인
  await testFeature('구글 드라이브', 'API 라이브러리 확인', async () => {
    const libPath = path.join(process.cwd(), 'lib', 'google-drive.ts');
    const exists = await fs.access(libPath).then(() => true).catch(() => false);
    return { libraryExists: exists };
  });

  // 폴더 설정 확인
  await testFeature('구글 드라이브', '폴더 설정 확인', async () => {
    const requiredFolders = [
      'GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID',
      'GOOGLE_DRIVE_PASSPORTS_FOLDER_ID',
    ];
    const configured = requiredFolders.filter(key => process.env[key]).length;
    return { configured, total: requiredFolders.length };
  });
}

// 8. 엑셀 다운로드/업로드 기능 테스트
async function testExcel() {
  log('\n📊 엑셀 다운로드/업로드 기능 테스트 시작...');

  // 엑셀 다운로드 API 확인
  await testFeature('엑셀', '다운로드 API 확인', async () => {
    const apiPath = path.join(
      process.cwd(),
      'app',
      'api',
      'admin',
      'customers',
      'export',
      'route.ts'
    );
    const exists = await fs.access(apiPath).then(() => true).catch(() => false);
    if (exists) {
      const content = await fs.readFile(apiPath, 'utf-8');
      const hasXLSX = content.includes('xlsx') || content.includes('XLSX');
      return { apiExists: true, hasXLSXLibrary: hasXLSX };
    }
    return { apiExists: false };
  });

  // XLSX 라이브러리 확인
  await testFeature('엑셀', 'XLSX 라이브러리 확인', async () => {
    try {
      const packageJson = await fs.readFile(
        path.join(process.cwd(), 'package.json'),
        'utf-8'
      );
      const pkg = JSON.parse(packageJson);
      const hasXLSX = !!pkg.dependencies?.xlsx || !!pkg.devDependencies?.xlsx;
      return { installed: hasXLSX };
    } catch {
      return { installed: false };
    }
  });
}

// 9. 데이터베이스 인덱스 확인
async function testDatabaseIndexes() {
  log('\n🗄️ 데이터베이스 인덱스 확인 시작...');

  // User 테이블 인덱스 확인
  await testFeature('데이터베이스', 'User 테이블 인덱스', async () => {
    // Prisma 스키마에서 인덱스 확인
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    const userIndexes = (schema.match(/model User[\s\S]*?^}/m)?.[0] || '').match(/@@index/g) || [];
    return { indexCount: userIndexes.length };
  });

  // AffiliateLead 테이블 인덱스 확인
  await testFeature('데이터베이스', 'AffiliateLead 테이블 인덱스', async () => {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    const leadIndexes = (schema.match(/model AffiliateLead[\s\S]*?^}/m)?.[0] || '').match(/@@index/g) || [];
    return { indexCount: leadIndexes.length };
  });
}

// 10. Redis 캐싱 확인
async function testRedis() {
  log('\n⚡ Redis 캐싱 확인 시작...');

  // Redis 라이브러리 확인
  await testFeature('Redis', '라이브러리 확인', async () => {
    const libPath = path.join(process.cwd(), 'lib', 'redis.ts');
    const exists = await fs.access(libPath).then(() => true).catch(() => false);
    return { libraryExists: exists };
  });

  // 환경 변수 확인
  await testFeature('Redis', '환경 변수 확인', async () => {
    const hasRedisUrl = !!process.env.REDIS_URL;
    const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    return { hasRedisUrl, hasUpstash, configured: hasRedisUrl || hasUpstash };
  });

  // 대시보드 API 캐싱 확인
  await testFeature('Redis', '대시보드 API 캐싱', async () => {
    const apiPath = path.join(process.cwd(), 'app', 'api', 'admin', 'dashboard', 'route.ts');
    const exists = await fs.access(apiPath).then(() => true).catch(() => false);
    if (exists) {
      const content = await fs.readFile(apiPath, 'utf-8');
      const hasCache = content.includes('getCache') || content.includes('setCache');
      return { apiExists: true, hasCaching: hasCache };
    }
    return { apiExists: false };
  });
}

// 11. Cron 작업 확인
async function testCron() {
  log('\n⏰ Cron 작업 확인 시작...');

  // Cron API 확인
  await testFeature('Cron', 'Cron 관리 API', async () => {
    const apiPath = path.join(
      process.cwd(),
      'app',
      'api',
      'admin',
      'system',
      'cron',
      'route.ts'
    );
    const exists = await fs.access(apiPath).then(() => true).catch(() => false);
    return { apiExists: exists };
  });

  // 통계 업데이트 스크립트 확인
  await testFeature('Cron', '통계 업데이트 스크립트', async () => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'update-dashboard-stats.ts');
    const exists = await fs.access(scriptPath).then(() => true).catch(() => false);
    return { scriptExists: exists };
  });
}

// 12. 버튼 및 UI 기능 확인
async function testUI() {
  log('\n🎨 UI 기능 확인 시작...');

  // 고객 관리 페이지 확인
  await testFeature('UI', '고객 관리 페이지', async () => {
    const pagePath = path.join(process.cwd(), 'app', 'admin', 'customers', 'page.tsx');
    const exists = await fs.access(pagePath).then(() => true).catch(() => false);
    if (exists) {
      const content = await fs.readFile(pagePath, 'utf-8');
      const hasExport = content.includes('export') || content.includes('다운로드');
      const hasSearch = content.includes('검색') || content.includes('search');
      const hasFilter = content.includes('필터') || content.includes('filter');
      return { pageExists: true, hasExport, hasSearch, hasFilter };
    }
    return { pageExists: false };
  });

  // 대시보드 페이지 확인
  await testFeature('UI', '대시보드 페이지', async () => {
    const pagePath = path.join(process.cwd(), 'app', 'admin', 'dashboard', 'page.tsx');
    const exists = await fs.access(pagePath).then(() => true).catch(() => false);
    return { pageExists: exists };
  });
}

// 중복 기능 및 혼란스러운 기능 체크
async function checkDuplicates() {
  log('\n🔍 중복 기능 및 혼란스러운 기능 체크 시작...');

  // 고객 관리 관련 페이지들
  await testFeature('중복 체크', '고객 관리 페이지 중복', async () => {
    const customerPages = [
      'app/admin/customers',
      'app/admin/cruise-guide-customers',
      'app/admin/mall-customers',
      'app/admin/test-customers',
    ];
    const existing = [];
    for (const page of customerPages) {
      const pagePath = path.join(process.cwd(), page, 'page.tsx');
      const exists = await fs.access(pagePath).then(() => true).catch(() => false);
      if (exists) existing.push(page);
    }
    return { total: customerPages.length, existing: existing.length, pages: existing };
  });

  // 메시지 관련 페이지들
  await testFeature('중복 체크', '메시지 관리 페이지 중복', async () => {
    const messagePages = [
      'app/admin/messages',
      'app/admin/scheduled-messages',
      'app/admin/broadcast',
      'app/admin/team-dashboard-messages',
    ];
    const existing = [];
    for (const page of messagePages) {
      const pagePath = path.join(process.cwd(), page, 'page.tsx');
      const exists = await fs.access(pagePath).then(() => true).catch(() => false);
      if (exists) existing.push(page);
    }
    return { total: messagePages.length, existing: existing.length, pages: existing };
  });
}

// 메인 실행 함수
async function main() {
  log('🚀 관리자 패널 전체 기능 시뮬레이션 시작...\n');

  try {
    // 데이터베이스 연결 확인
    await prisma.$connect();
    log('✅ 데이터베이스 연결 성공\n');

    // 각 기능 테스트 실행
    await testAPIs();
    await testCustomerManagement();
    await testAffiliate();
    await testSettlement();
    await testMessages();
    await testPassport();
    await testGoogleDrive();
    await testExcel();
    await testDatabaseIndexes();
    await testRedis();
    await testCron();
    await testUI();
    await checkDuplicates();

    // 결과 요약
    log('\n' + '='.repeat(80));
    log('📊 시뮬레이션 결과 요약');
    log('='.repeat(80));

    const categories = new Map<string, { success: number; fail: number; warning: number }>();
    results.forEach(result => {
      const cat = result.category;
      if (!categories.has(cat)) {
        categories.set(cat, { success: 0, fail: 0, warning: 0 });
      }
      const stats = categories.get(cat)!;
      if (result.status === '✅') stats.success++;
      else if (result.status === '❌') stats.fail++;
      else if (result.status === '⚠️') stats.warning++;
    });

    categories.forEach((stats, category) => {
      const total = stats.success + stats.fail + stats.warning;
      const successRate = ((stats.success / total) * 100).toFixed(1);
      log(`\n[${category}]`);
      log(`  ✅ 성공: ${stats.success}개`);
      log(`  ❌ 실패: ${stats.fail}개`);
      log(`  ⚠️  경고: ${stats.warning}개`);
      log(`  📈 성공률: ${successRate}%`);
    });

    const totalSuccess = results.filter(r => r.status === '✅').length;
    const totalFail = results.filter(r => r.status === '❌').length;
    const totalWarning = results.filter(r => r.status === '⚠️').length;
    const totalTests = results.length;
    const overallSuccessRate = ((totalSuccess / totalTests) * 100).toFixed(1);

    log('\n' + '='.repeat(80));
    log('📈 전체 통계');
    log('='.repeat(80));
    log(`총 테스트: ${totalTests}개`);
    log(`✅ 성공: ${totalSuccess}개`);
    log(`❌ 실패: ${totalFail}개`);
    log(`⚠️  경고: ${totalWarning}개`);
    log(`📊 전체 성공률: ${overallSuccessRate}%`);

    // 실패한 테스트 상세
    const failures = results.filter(r => r.status === '❌');
    if (failures.length > 0) {
      log('\n' + '='.repeat(80));
      log('❌ 실패한 테스트 상세');
      log('='.repeat(80));
      failures.forEach(failure => {
        log(`\n[${failure.category}] ${failure.feature}`);
        log(`  메시지: ${failure.message}`);
        if (failure.details) {
          log(`  상세: ${JSON.stringify(failure.details, null, 2).substring(0, 200)}...`);
        }
      });
    }

    // 개선 권장 사항
    log('\n' + '='.repeat(80));
    log('💡 개선 권장 사항');
    log('='.repeat(80));

    if (failures.length > 0) {
      log('\n1. 실패한 기능들을 우선적으로 수정하세요.');
    }

    const slowTests = results.filter(r => r.time && r.time > 1000);
    if (slowTests.length > 0) {
      log('\n2. 응답 시간이 1초 이상인 기능들:');
      slowTests.forEach(test => {
        log(`   - [${test.category}] ${test.feature}: ${test.time}ms`);
      });
      log('   → 캐싱 또는 쿼리 최적화를 고려하세요.');
    }

    const duplicateChecks = results.filter(r => r.category === '중복 체크');
    if (duplicateChecks.length > 0) {
      log('\n3. 중복 기능 확인:');
      duplicateChecks.forEach(check => {
        if (check.details && typeof check.details === 'object') {
          log(`   - ${check.feature}: ${JSON.stringify(check.details)}`);
        }
      });
    }

    log('\n✅ 시뮬레이션 완료!\n');

    // 결과를 파일로 저장
    const reportPath = path.join(process.cwd(), '관리자_패널_시뮬레이션_결과.md');
    const report = generateMarkdownReport(results, categories, {
      totalTests,
      totalSuccess,
      totalFail,
      totalWarning,
      overallSuccessRate,
    });
    await fs.writeFile(reportPath, report, 'utf-8');
    log(`📄 상세 보고서가 저장되었습니다: ${reportPath}\n`);

  } catch (error: any) {
    logError('시뮬레이션 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function generateMarkdownReport(
  results: TestResult[],
  categories: Map<string, { success: number; fail: number; warning: number }>,
  stats: {
    totalTests: number;
    totalSuccess: number;
    totalFail: number;
    totalWarning: number;
    overallSuccessRate: string;
  }
): string {
  let report = `# 관리자 패널 전체 기능 시뮬레이션 결과\n\n`;
  report += `**생성일시**: ${new Date().toLocaleString('ko-KR')}\n\n`;
  report += `## 📊 전체 통계\n\n`;
  report += `- 총 테스트: ${stats.totalTests}개\n`;
  report += `- ✅ 성공: ${stats.totalSuccess}개\n`;
  report += `- ❌ 실패: ${stats.totalFail}개\n`;
  report += `- ⚠️  경고: ${stats.totalWarning}개\n`;
  report += `- 📈 전체 성공률: ${stats.overallSuccessRate}%\n\n`;

  report += `## 📋 카테고리별 결과\n\n`;
  categories.forEach((catStats, category) => {
    const total = catStats.success + catStats.fail + catStats.warning;
    const successRate = ((catStats.success / total) * 100).toFixed(1);
    report += `### ${category}\n\n`;
    report += `- ✅ 성공: ${catStats.success}개\n`;
    report += `- ❌ 실패: ${catStats.fail}개\n`;
    report += `- ⚠️  경고: ${catStats.warning}개\n`;
    report += `- 📈 성공률: ${successRate}%\n\n`;
  });

  report += `## 🔍 상세 결과\n\n`;
  report += `| 카테고리 | 기능 | 상태 | 메시지 | 응답시간 |\n`;
  report += `|---------|------|------|--------|----------|\n`;
  results.forEach(result => {
    const time = result.time ? `${result.time}ms` : '-';
    report += `| ${result.category} | ${result.feature} | ${result.status} | ${result.message} | ${time} |\n`;
  });

  const failures = results.filter(r => r.status === '❌');
  if (failures.length > 0) {
    report += `\n## ❌ 실패한 테스트 상세\n\n`;
    failures.forEach(failure => {
      report += `### [${failure.category}] ${failure.feature}\n\n`;
      report += `- **메시지**: ${failure.message}\n`;
      if (failure.details) {
        report += `- **상세**: \`\`\`\n${JSON.stringify(failure.details, null, 2).substring(0, 500)}\n\`\`\`\n\n`;
      }
    });
  }

  return report;
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };

