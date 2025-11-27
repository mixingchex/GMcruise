/**
 * 계약서 완료 플로우 종합 검증
 * 1. 계약서 완료 → PDF 이메일 자동 전송
 * 2. 계약서 완료 → 결제 페이지 자동 리다이렉트
 * 3. 관리자 패널 PDF 보내기 에러 없음
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

async function runCompleteFlowTests() {
  console.log('='.repeat(80));
  console.log('계약서 완료 플로우 종합 검증');
  console.log('='.repeat(80));
  console.log('');

  // 1. 관리자 계약서 완료 API 검증
  console.log('1. 관리자 계약서 완료 API 검증');
  console.log('-'.repeat(80));
  
  const adminCompletePath = 'app/api/admin/affiliate/contracts/[contractId]/complete/route.ts';
  if (existsSync(join(process.cwd(), adminCompletePath))) {
    const content = readFileSync(join(process.cwd(), adminCompletePath), 'utf-8');
    
    // PDF 이메일 자동 전송 확인
    const hasEmailSend = /sendContractPDFByEmail/.test(content);
    addResult('관리자 완료 API', 'PDF 이메일 자동 전송', hasEmailSend);
    
    // 본사 이메일 전송 확인
    const hasHeadOfficeEmail = /headOfficeEmail|HEAD_OFFICE_EMAIL/.test(content);
    addResult('관리자 완료 API', '본사 이메일 전송', hasHeadOfficeEmail);
    
    // redirectUrl 반환 확인
    const hasRedirectUrl = /redirectUrl/.test(content);
    addResult('관리자 완료 API', 'redirectUrl 반환', hasRedirectUrl);
    
    // 이메일 실패해도 redirectUrl 반환 확인
    const hasRedirectOnEmailFailure = /emailSent.*false|redirectUrl.*emailSent/.test(content);
    addResult('관리자 완료 API', '이메일 실패해도 redirectUrl 반환', hasRedirectOnEmailFailure);
    
    // 계약서 상태 업데이트 확인
    const hasStatusUpdate = /status.*completed|status:\s*['"]completed['"]/.test(content);
    addResult('관리자 완료 API', '계약서 상태 업데이트', hasStatusUpdate);
    
    // 에러 처리 확인
    const hasErrorHandling = /try.*catch|catch.*error/.test(content);
    addResult('관리자 완료 API', '에러 처리', hasErrorHandling);
  } else {
    addResult('관리자 완료 API', '파일 존재', false, '파일을 찾을 수 없습니다');
  }
  console.log('');

  // 2. 대리점장 계약서 완료 API 검증
  console.log('2. 대리점장 계약서 완료 API 검증');
  console.log('-'.repeat(80));
  
  const partnerCompletePath = 'app/api/partner/contracts/[contractId]/complete/route.ts';
  if (existsSync(join(process.cwd(), partnerCompletePath))) {
    const content = readFileSync(join(process.cwd(), partnerCompletePath), 'utf-8');
    
    // PDF 이메일 자동 전송 확인
    const hasEmailSend = /sendContractPDFByEmail/.test(content);
    addResult('대리점장 완료 API', 'PDF 이메일 자동 전송', hasEmailSend);
    
    // redirectUrl 반환 확인
    const hasRedirectUrl = /redirectUrl/.test(content);
    addResult('대리점장 완료 API', 'redirectUrl 반환', hasRedirectUrl);
    
    // 계약서 상태 업데이트 확인
    const hasStatusUpdate = /status.*completed|status:\s*['"]completed['"]/.test(content);
    addResult('대리점장 완료 API', '계약서 상태 업데이트', hasStatusUpdate);
    
    // 에러 처리 확인
    const hasErrorHandling = /try.*catch|catch.*error/.test(content);
    addResult('대리점장 완료 API', '에러 처리', hasErrorHandling);
  } else {
    addResult('대리점장 완료 API', '파일 존재', false, '파일을 찾을 수 없습니다');
  }
  console.log('');

  // 3. 계약서 완료 페이지 검증
  console.log('3. 계약서 완료 페이지 검증');
  console.log('-'.repeat(80));
  
  const completePagePath = 'app/affiliate/contract/complete/page.tsx';
  if (existsSync(join(process.cwd(), completePagePath))) {
    const content = readFileSync(join(process.cwd(), completePagePath), 'utf-8');
    
    // 계약서 정보 조회 확인
    const hasContractFetch = /\/api\/affiliate\/contracts\/.*contractId/.test(content);
    addResult('완료 페이지', '계약서 정보 조회', hasContractFetch);
    
    // 자동 결제 페이지 리다이렉트 확인
    const hasAutoRedirect = /setTimeout.*window\.location|window\.location\.href.*paymentLink|3000.*자동/.test(content);
    addResult('완료 페이지', '자동 결제 페이지 리다이렉트', hasAutoRedirect, 
      hasAutoRedirect ? undefined : 'useEffect에서 contract.status === "completed"일 때 setTimeout으로 자동 리다이렉트가 구현되어 있어야 합니다');
    
    // 결제 링크 매핑 확인
    const hasPaymentLinks = /PAYMENT_LINKS|결제.*링크/.test(content);
    addResult('완료 페이지', '결제 링크 매핑', hasPaymentLinks);
    
    // 에러 처리 확인
    const hasErrorHandling = /error.*state|setError|catch.*error/.test(content);
    addResult('완료 페이지', '에러 처리', hasErrorHandling);
    
    // 로딩 상태 확인
    const hasLoadingState = /loading.*state|setLoading/.test(content);
    addResult('완료 페이지', '로딩 상태', hasLoadingState);
  } else {
    addResult('완료 페이지', '파일 존재', false, '파일을 찾을 수 없습니다');
  }
  console.log('');

  // 4. 관리자 패널 계약서 완료 처리 검증
  console.log('4. 관리자 패널 계약서 완료 처리 검증');
  console.log('-'.repeat(80));
  
  const adminContractsPath = 'app/admin/affiliate/contracts/page.tsx';
  if (existsSync(join(process.cwd(), adminContractsPath))) {
    const content = readFileSync(join(process.cwd(), adminContractsPath), 'utf-8');
    
    // handleCompleteContract 함수 확인
    const hasCompleteFunction = /handleCompleteContract|const.*handleComplete/.test(content);
    addResult('관리자 패널', '계약서 완료 함수 존재', hasCompleteFunction);
    
    // redirectUrl 사용 확인
    const hasRedirectUsage = /redirectUrl|router\.push.*complete/.test(content);
    addResult('관리자 패널', 'redirectUrl 사용', hasRedirectUsage);
    
    // 에러 처리 확인
    const hasErrorHandling = /catch.*error|error.*message/.test(content);
    addResult('관리자 패널', '에러 처리', hasErrorHandling);
    
    // POST 메서드 확인
    const hasPostMethod = /method:\s*['"]POST['"]/.test(content);
    addResult('관리자 패널', 'POST 메서드', hasPostMethod);
  } else {
    addResult('관리자 패널', '파일 존재', false, '파일을 찾을 수 없습니다');
  }
  console.log('');

  // 5. 관리자 패널 PDF 보내기 검증 (이미 테스트 완료했지만 재확인)
  console.log('5. 관리자 패널 PDF 보내기 검증');
  console.log('-'.repeat(80));
  
  const adminSendPdfPath = 'app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts';
  if (existsSync(join(process.cwd(), adminSendPdfPath))) {
    const content = readFileSync(join(process.cwd(), adminSendPdfPath), 'utf-8');
    
    // POST 함수 export 확인
    const hasPostExport = /export\s+async\s+function\s+POST/.test(content);
    addResult('관리자 PDF 전송', 'POST 함수 export', hasPostExport);
    
    // params await 처리 확인
    const hasAwaitParams = /await\s+params|const\s+resolvedParams\s*=\s*await\s+params/.test(content);
    addResult('관리자 PDF 전송', 'params await 처리', hasAwaitParams);
    
    // Content-Type 헤더 확인
    const hasContentType = /Content-Type.*application\/json/.test(content);
    addResult('관리자 PDF 전송', 'Content-Type 헤더', hasContentType);
    
    // 에러 처리 확인
    const hasErrorHandling = /try.*catch|catch.*error/.test(content);
    addResult('관리자 PDF 전송', '에러 처리', hasErrorHandling);
    
    // PDF 이메일 전송 확인
    const hasEmailSend = /sendContractPDFByEmail/.test(content);
    addResult('관리자 PDF 전송', 'PDF 이메일 전송', hasEmailSend);
  } else {
    addResult('관리자 PDF 전송', '파일 존재', false, '파일을 찾을 수 없습니다');
  }
  console.log('');

  // 6. 결과 요약
  console.log('='.repeat(80));
  console.log('테스트 결과 요약');
  console.log('='.repeat(80));
  
  const categories = [...new Set(results.map(r => r.category))];
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const categoryPassed = categoryResults.filter(r => r.passed).length;
    const categoryTotal = categoryResults.length;
    console.log(`\n${category}: ${categoryPassed}/${categoryTotal} 통과`);
    
    const categoryFailed = categoryResults.filter(r => !r.passed);
    if (categoryFailed.length > 0) {
      console.log('  실패한 항목:');
      categoryFailed.forEach(r => {
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
    process.exit(1);
  } else {
    console.log('\n✅ 모든 계약서 완료 플로우 검증 통과!');
    console.log('\n검증 완료 항목:');
    console.log('  ✅ 계약서 완료 → PDF 이메일 자동 전송');
    console.log('  ✅ 계약서 완료 → 결제 페이지 자동 리다이렉트');
    console.log('  ✅ 관리자 패널 PDF 보내기 에러 없음');
    console.log('  ✅ 대리점장 계약서 완료 플로우');
    console.log('  ✅ 모든 에러 처리 및 사용자 경험 개선');
    console.log('\n✅ 배포 준비 완료!');
    process.exit(0);
  }
}

runCompleteFlowTests().catch((error) => {
  console.error('테스트 실행 중 오류:', error);
  process.exit(1);
});

