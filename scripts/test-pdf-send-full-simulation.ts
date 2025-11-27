/**
 * PDF 전송 기능 완전한 시뮬레이션 테스트
 * 모든 시나리오를 코드 레벨에서 검증
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function addResult(category: string, name: string, passed: boolean, error?: string, details?: string) {
  results.push({ category, name, passed, error, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   에러: ${error}`);
  }
  if (details) {
    console.log(`   상세: ${details}`);
  }
}

async function runFullSimulation() {
  console.log('='.repeat(80));
  console.log('PDF 전송 기능 완전한 시뮬레이션 테스트');
  console.log('='.repeat(80));
  console.log('');

  // 1. 라우트 파일 존재 확인
  console.log('1. 라우트 파일 존재 확인');
  console.log('-'.repeat(80));
  
  const adminRoutePath = 'app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts';
  const partnerRoutePath = 'app/api/partner/contracts/[contractId]/send-pdf/route.ts';
  
  const adminRouteExists = existsSync(join(process.cwd(), adminRoutePath));
  const partnerRouteExists = existsSync(join(process.cwd(), partnerRoutePath));
  
  addResult('파일 구조', '관리자 라우트 파일 존재', adminRouteExists);
  addResult('파일 구조', '대리점장 라우트 파일 존재', partnerRouteExists);
  
  if (!adminRouteExists || !partnerRouteExists) {
    console.log('\n❌ 라우트 파일이 없습니다. 테스트를 중단합니다.');
    return;
  }
  console.log('');

  // 2. 코드 구조 검증
  console.log('2. 코드 구조 검증');
  console.log('-'.repeat(80));
  
  const adminContent = readFileSync(join(process.cwd(), adminRoutePath), 'utf-8');
  const partnerContent = readFileSync(join(process.cwd(), partnerRoutePath), 'utf-8');
  
  // 관리자 라우트 검증
  const adminHasPost = /export\s+async\s+function\s+POST/.test(adminContent);
  addResult('코드 구조', '관리자 라우트 - POST 함수 export', adminHasPost);
  
  const adminHasAwaitParams = /const\s+resolvedParams\s*=\s*await\s+params/.test(adminContent);
  addResult('코드 구조', '관리자 라우트 - params await 처리', adminHasAwaitParams, 
    adminHasAwaitParams ? undefined : 'await params를 사용해야 합니다');
  
  const adminHasContentType = /Content-Type.*application\/json/.test(adminContent);
  addResult('코드 구조', '관리자 라우트 - Content-Type 헤더', adminHasContentType);
  
  const adminHasTryCatch = /try\s*\{/.test(adminContent);
  addResult('코드 구조', '관리자 라우트 - 에러 처리 (try-catch)', adminHasTryCatch);
  
  // 대리점장 라우트 검증
  const partnerHasPost = /export\s+async\s+function\s+POST/.test(partnerContent);
  addResult('코드 구조', '대리점장 라우트 - POST 함수 export', partnerHasPost);
  
  const partnerHasAwaitParams = /const\s+resolvedParams\s*=\s*await\s+params/.test(partnerContent);
  addResult('코드 구조', '대리점장 라우트 - params await 처리', partnerHasAwaitParams,
    partnerHasAwaitParams ? undefined : 'await params를 사용해야 합니다');
  
  const partnerHasContentType = /Content-Type.*application\/json/.test(partnerContent);
  addResult('코드 구조', '대리점장 라우트 - Content-Type 헤더', partnerHasContentType);
  
  const partnerHasTryCatch = /try\s*\{/.test(partnerContent);
  addResult('코드 구조', '대리점장 라우트 - 에러 처리 (try-catch)', partnerHasTryCatch);
  console.log('');

  // 3. 클라이언트 코드 검증
  console.log('3. 클라이언트 코드 검증');
  console.log('-'.repeat(80));
  
  const adminClientPath = 'app/admin/affiliate/contracts/page.tsx';
  const partnerDashboardPath = 'app/partner/[partnerId]/dashboard/PartnerDashboard.tsx';
  const partnerContractPath = 'app/partner/[partnerId]/contract/MyContractClient.tsx';
  
  if (existsSync(join(process.cwd(), adminClientPath))) {
    const adminClientContent = readFileSync(join(process.cwd(), adminClientPath), 'utf-8');
    
    const adminClientHasPost = /method:\s*['"]POST['"]/.test(adminClientContent);
    addResult('클라이언트', '관리자 패널 - POST 메서드 명시', adminClientHasPost);
    
    const adminClientHasCredentials = /credentials:\s*['"]include['"]/.test(adminClientContent);
    addResult('클라이언트', '관리자 패널 - credentials 설정', adminClientHasCredentials);
    
    const adminClientHasTimeout = /AbortController|timeout/i.test(adminClientContent);
    addResult('클라이언트', '관리자 패널 - 타임아웃 처리', adminClientHasTimeout);
    
    const adminClientHasErrorHandling = /Empty response|서버에서 응답이 없습니다/.test(adminClientContent);
    addResult('클라이언트', '관리자 패널 - 빈 응답 처리', adminClientHasErrorHandling);
  }
  
  if (existsSync(join(process.cwd(), partnerDashboardPath))) {
    const partnerDashboardContent = readFileSync(join(process.cwd(), partnerDashboardPath), 'utf-8');
    
    const partnerHasPost = /method:\s*['"]POST['"]/.test(partnerDashboardContent);
    addResult('클라이언트', '대리점장 대시보드 - POST 메서드 명시', partnerHasPost);
    
    const partnerHasCredentials = /credentials:\s*['"]include['"]/.test(partnerDashboardContent);
    addResult('클라이언트', '대리점장 대시보드 - credentials 설정', partnerHasCredentials);
  }
  
  if (existsSync(join(process.cwd(), partnerContractPath))) {
    const partnerContractContent = readFileSync(join(process.cwd(), partnerContractPath), 'utf-8');
    
    const partnerContractHasPost = /method:\s*['"]POST['"]/.test(partnerContractContent);
    addResult('클라이언트', '대리점장 계약서 페이지 - POST 메서드 명시', partnerContractHasPost);
    
    const partnerContractHasCredentials = /credentials:\s*['"]include['"]/.test(partnerContractContent);
    addResult('클라이언트', '대리점장 계약서 페이지 - credentials 설정', partnerContractHasCredentials);
  }
  console.log('');

  // 4. 시나리오별 검증
  console.log('4. 시나리오별 검증');
  console.log('-'.repeat(80));
  
  // 시나리오 1: 관리자 - 정상 요청
  const adminHasAuth = /getSessionUser/.test(adminContent);
  const adminHasRoleCheck = /requireAdmin|role.*admin/.test(adminContent);
  const adminHasContractCheck = /affiliateContract\.findUnique|prisma\.affiliateContract\.findUnique/.test(adminContent);
  const adminHasEmailCheck = /recipientEmail|contract\.email/.test(adminContent);
  const adminHasPdfSend = /sendContractPDFByEmail/.test(adminContent);
  
  addResult('시나리오', '관리자 - 인증 확인', adminHasAuth);
  addResult('시나리오', '관리자 - 권한 확인', adminHasRoleCheck);
  addResult('시나리오', '관리자 - 계약서 조회', adminHasContractCheck);
  addResult('시나리오', '관리자 - 이메일 확인', adminHasEmailCheck);
  addResult('시나리오', '관리자 - PDF 전송 함수 호출', adminHasPdfSend);
  
  // 시나리오 2: 대리점장 - 정상 요청
  const partnerHasAuth = /requirePartnerContext/.test(partnerContent);
  const partnerHasRoleCheck = /BRANCH_MANAGER|profile\.type/.test(partnerContent);
  const partnerHasContractCheck = /affiliateContract\.findUnique|prisma\.affiliateContract\.findUnique/.test(partnerContent);
  const partnerHasOwnershipCheck = /isInvitedContract|isOwnContract/.test(partnerContent);
  const partnerHasEmailCheck = /recipientEmail|email/.test(partnerContent);
  const partnerHasPdfSend = /sendContractPDFByEmail/.test(partnerContent);
  
  addResult('시나리오', '대리점장 - 인증 확인', partnerHasAuth);
  addResult('시나리오', '대리점장 - 권한 확인 (대리점장만)', partnerHasRoleCheck);
  addResult('시나리오', '대리점장 - 계약서 조회', partnerHasContractCheck);
  addResult('시나리오', '대리점장 - 소유권 확인', partnerHasOwnershipCheck);
  addResult('시나리오', '대리점장 - 이메일 확인', partnerHasEmailCheck);
  addResult('시나리오', '대리점장 - PDF 전송 함수 호출', partnerHasPdfSend);
  
  // 시나리오 3: 에러 처리
  const adminHas404 = /status:\s*404/.test(adminContent);
  const adminHas400 = /status:\s*400/.test(adminContent);
  const adminHas401 = /status:\s*401/.test(adminContent);
  const adminHas403 = /status:\s*403/.test(adminContent);
  const adminHas500 = /status:\s*500/.test(adminContent);
  
  addResult('에러 처리', '관리자 - 404 에러 처리', adminHas404);
  addResult('에러 처리', '관리자 - 400 에러 처리', adminHas400);
  addResult('에러 처리', '관리자 - 401 에러 처리', adminHas401);
  addResult('에러 처리', '관리자 - 403 에러 처리', adminHas403);
  addResult('에러 처리', '관리자 - 500 에러 처리', adminHas500);
  
  const partnerHas404 = /status:\s*404/.test(partnerContent);
  const partnerHas400 = /status:\s*400/.test(partnerContent);
  const partnerHas403 = /status:\s*403/.test(partnerContent);
  const partnerHas500 = /status:\s*500/.test(partnerContent);
  
  addResult('에러 처리', '대리점장 - 404 에러 처리', partnerHas404);
  addResult('에러 처리', '대리점장 - 400 에러 처리', partnerHas400);
  addResult('에러 처리', '대리점장 - 403 에러 처리', partnerHas403);
  addResult('에러 처리', '대리점장 - 500 에러 처리', partnerHas500);
  console.log('');

  // 5. 405 에러 방지 검증
  console.log('5. 405 에러 방지 검증');
  console.log('-'.repeat(80));
  
  // POST 함수가 export되어 있는지 확인
  const adminOnlyPost = (adminContent.match(/export\s+async\s+function\s+(POST|GET|PUT|DELETE)/g) || []).length === 1;
  const adminExportsPost = /export\s+async\s+function\s+POST/.test(adminContent);
  
  addResult('405 방지', '관리자 라우트 - POST만 export', adminOnlyPost && adminExportsPost,
    adminOnlyPost ? undefined : '다른 HTTP 메서드가 export되어 있으면 405 에러 가능');
  
  const partnerOnlyPost = (partnerContent.match(/export\s+async\s+function\s+(POST|GET|PUT|DELETE)/g) || []).length === 1;
  const partnerExportsPost = /export\s+async\s+function\s+POST/.test(partnerContent);
  
  addResult('405 방지', '대리점장 라우트 - POST만 export', partnerOnlyPost && partnerExportsPost,
    partnerOnlyPost ? undefined : '다른 HTTP 메서드가 export되어 있으면 405 에러 가능');
  
  // params 처리 확인 (Next.js 15 필수)
  addResult('405 방지', '관리자 라우트 - Next.js 15 params 처리', adminHasAwaitParams,
    adminHasAwaitParams ? undefined : 'params를 await로 처리하지 않으면 라우팅 문제 발생 가능');
  
  addResult('405 방지', '대리점장 라우트 - Next.js 15 params 처리', partnerHasAwaitParams,
    partnerHasAwaitParams ? undefined : 'params를 await로 처리하지 않으면 라우팅 문제 발생 가능');
  console.log('');

  // 6. 결과 요약
  console.log('='.repeat(80));
  console.log('테스트 결과 요약');
  console.log('='.repeat(80));
  
  const categories = [...new Set(results.map(r => r.category))];
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.passed).length;
    const total = categoryResults.length;
    console.log(`\n${category}: ${passed}/${total} 통과`);
    
    const failed = categoryResults.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log('  실패한 항목:');
      failed.forEach(r => {
        console.log(`    ❌ ${r.name}`);
        if (r.error) console.log(`       ${r.error}`);
      });
    }
  });
  
  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(80));
  console.log(`전체 결과: ${totalPassed}/${total} 통과, ${totalFailed} 실패`);
  console.log('='.repeat(80));
  
  if (totalFailed > 0) {
    console.log('\n❌ 배포 전에 위 문제들을 수정해주세요.');
    console.log('\n수정이 필요한 항목:');
    results
      .filter(r => !r.passed)
      .forEach((r, idx) => {
        console.log(`${idx + 1}. ${r.name}`);
        if (r.error) console.log(`   → ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log('\n✅ 모든 검증 테스트 통과!');
    console.log('\n다음 단계:');
    console.log('1. 로컬 서버 실행: npm run dev');
    console.log('2. 브라우저에서 실제로 테스트:');
    console.log('   - 관리자 패널에서 PDF 전송 테스트');
    console.log('   - 대리점장 대시보드에서 PDF 전송 테스트');
    console.log('3. 모든 시나리오가 정상 작동하는지 확인');
    console.log('4. 배포 진행');
    process.exit(0);
  }
}

runFullSimulation().catch((error) => {
  console.error('테스트 실행 중 오류:', error);
  process.exit(1);
});

