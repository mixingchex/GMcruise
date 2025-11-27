/**
 * 계약서 관련 클라이언트 코드 검증
 * - 대리점장 대시보드 계약서 보내기 기능
 * - 대리점장 계약서 페이지 계약서 보내기 기능
 * - 관리자 패널 계약서 보내기 기능
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

async function runClientCodeTests() {
  console.log('='.repeat(80));
  console.log('계약서 관련 클라이언트 코드 검증');
  console.log('='.repeat(80));
  console.log('');

  // 1. 대리점장 대시보드 검증
  console.log('1. 대리점장 대시보드 계약서 보내기 기능 검증');
  console.log('-'.repeat(80));
  
  const partnerDashboardPath = 'app/partner/[partnerId]/dashboard/PartnerDashboard.tsx';
  if (existsSync(join(process.cwd(), partnerDashboardPath))) {
    const content = readFileSync(join(process.cwd(), partnerDashboardPath), 'utf-8');
    
    // handleSendPdf 함수 존재 확인
    const hasHandleSendPdf = /handleSendPdf|const\s+handleSendPdf/.test(content);
    addResult('대리점장 대시보드', 'handleSendPdf 함수 존재', hasHandleSendPdf);
    
    // POST 메서드 명시
    const hasPostMethod = /method:\s*['"]POST['"]/.test(content);
    addResult('대리점장 대시보드', 'POST 메서드 명시', hasPostMethod);
    
    // credentials 설정
    const hasCredentials = /credentials:\s*['"]include['"]/.test(content);
    addResult('대리점장 대시보드', 'credentials 설정', hasCredentials);
    
    // 타임아웃 처리
    const hasTimeout = /AbortController|timeout|setTimeout/i.test(content);
    addResult('대리점장 대시보드', '타임아웃 처리', hasTimeout);
    
    // 빈 응답 처리
    const hasEmptyResponseCheck = /Empty response|서버에서 응답이 없습니다|!text\.trim\(\)/.test(content);
    addResult('대리점장 대시보드', '빈 응답 처리', hasEmptyResponseCheck);
    
    // JSON 파싱 에러 처리
    const hasJsonErrorHandling = /JSON\.parse|try.*catch.*JSON|parseError/.test(content);
    addResult('대리점장 대시보드', 'JSON 파싱 에러 처리', hasJsonErrorHandling);
    
    // 에러 메시지 표시
    const hasErrorMessage = /alert|toast|error.*message|에러|오류/.test(content);
    addResult('대리점장 대시보드', '에러 메시지 표시', hasErrorMessage);
    
    // 로딩 상태 관리
    const hasLoadingState = /sendingPdfContractId|loading|isLoading/.test(content);
    addResult('대리점장 대시보드', '로딩 상태 관리', hasLoadingState);
    
    // 올바른 API 엔드포인트 사용
    const hasCorrectEndpoint = /\/api\/partner\/contracts\/.*\/send-pdf/.test(content);
    addResult('대리점장 대시보드', '올바른 API 엔드포인트', hasCorrectEndpoint);
  } else {
    addResult('대리점장 대시보드', '파일 존재', false, '파일을 찾을 수 없습니다');
  }
  console.log('');

  // 2. 대리점장 계약서 페이지 검증
  console.log('2. 대리점장 계약서 페이지 계약서 보내기 기능 검증');
  console.log('-'.repeat(80));
  
  const partnerContractPath = 'app/partner/[partnerId]/contract/MyContractClient.tsx';
  if (existsSync(join(process.cwd(), partnerContractPath))) {
    const content = readFileSync(join(process.cwd(), partnerContractPath), 'utf-8');
    
    // handleSendPdf 함수 존재 확인
    const hasHandleSendPdf = /handleSendPdf|const\s+handleSendPdf/.test(content);
    addResult('대리점장 계약서 페이지', 'handleSendPdf 함수 존재', hasHandleSendPdf);
    
    // POST 메서드 명시
    const hasPostMethod = /method:\s*['"]POST['"]/.test(content);
    addResult('대리점장 계약서 페이지', 'POST 메서드 명시', hasPostMethod);
    
    // credentials 설정
    const hasCredentials = /credentials:\s*['"]include['"]/.test(content);
    addResult('대리점장 계약서 페이지', 'credentials 설정', hasCredentials);
    
    // 타임아웃 처리
    const hasTimeout = /AbortController|timeout|setTimeout/i.test(content);
    addResult('대리점장 계약서 페이지', '타임아웃 처리', hasTimeout);
    
    // 빈 응답 처리
    const hasEmptyResponseCheck = /Empty response|서버에서 응답이 없습니다|!text\.trim\(\)/.test(content);
    addResult('대리점장 계약서 페이지', '빈 응답 처리', hasEmptyResponseCheck);
    
    // JSON 파싱 에러 처리
    const hasJsonErrorHandling = /JSON\.parse|try.*catch.*JSON|parseError/.test(content);
    addResult('대리점장 계약서 페이지', 'JSON 파싱 에러 처리', hasJsonErrorHandling);
    
    // 에러 메시지 표시
    const hasErrorMessage = /alert|toast|error.*message|에러|오류/.test(content);
    addResult('대리점장 계약서 페이지', '에러 메시지 표시', hasErrorMessage);
    
    // 로딩 상태 관리
    const hasLoadingState = /sendingPdfContractId|loading|isLoading/.test(content);
    addResult('대리점장 계약서 페이지', '로딩 상태 관리', hasLoadingState);
    
    // 올바른 API 엔드포인트 사용
    const hasCorrectEndpoint = /\/api\/partner\/contracts\/.*\/send-pdf/.test(content);
    addResult('대리점장 계약서 페이지', '올바른 API 엔드포인트', hasCorrectEndpoint);
  } else {
    addResult('대리점장 계약서 페이지', '파일 존재', false, '파일을 찾을 수 없습니다');
  }
  console.log('');

  // 3. 관리자 패널 검증
  console.log('3. 관리자 패널 계약서 보내기 기능 검증');
  console.log('-'.repeat(80));
  
  const adminContractsPath = 'app/admin/affiliate/contracts/page.tsx';
  if (existsSync(join(process.cwd(), adminContractsPath))) {
    const content = readFileSync(join(process.cwd(), adminContractsPath), 'utf-8');
    
    // handleSendPDF 함수 존재 확인
    const hasHandleSendPDF = /handleSendPDF|const\s+handleSendPDF/.test(content);
    addResult('관리자 패널', 'handleSendPDF 함수 존재', hasHandleSendPDF);
    
    // POST 메서드 명시
    const hasPostMethod = /method:\s*['"]POST['"]/.test(content);
    addResult('관리자 패널', 'POST 메서드 명시', hasPostMethod);
    
    // credentials 설정
    const hasCredentials = /credentials:\s*['"]include['"]/.test(content);
    addResult('관리자 패널', 'credentials 설정', hasCredentials);
    
    // 타임아웃 처리
    const hasTimeout = /AbortController|timeout|setTimeout/i.test(content);
    addResult('관리자 패널', '타임아웃 처리', hasTimeout);
    
    // 빈 응답 처리
    const hasEmptyResponseCheck = /Empty response|서버에서 응답이 없습니다|!text\.trim\(\)/.test(content);
    addResult('관리자 패널', '빈 응답 처리', hasEmptyResponseCheck);
    
    // JSON 파싱 에러 처리
    const hasJsonErrorHandling = /JSON\.parse|try.*catch.*JSON|parseError/.test(content);
    addResult('관리자 패널', 'JSON 파싱 에러 처리', hasJsonErrorHandling);
    
    // 에러 메시지 표시
    const hasErrorMessage = /alert|toast|error.*message|에러|오류/.test(content);
    addResult('관리자 패널', '에러 메시지 표시', hasErrorMessage);
    
    // 로딩 상태 관리
    const hasLoadingState = /sendingPdfContractId|loading|isLoading/.test(content);
    addResult('관리자 패널', '로딩 상태 관리', hasLoadingState);
    
    // 올바른 API 엔드포인트 사용
    const hasCorrectEndpoint = /\/api\/admin\/affiliate\/contracts\/.*\/send-pdf/.test(content);
    addResult('관리자 패널', '올바른 API 엔드포인트', hasCorrectEndpoint);
  } else {
    addResult('관리자 패널', '파일 존재', false, '파일을 찾을 수 없습니다');
  }
  console.log('');

  // 4. 결과 요약
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
    console.log('\n✅ 모든 클라이언트 코드 검증 통과!');
    console.log('\n검증 완료 항목:');
    console.log('  ✅ 대리점장 대시보드 계약서 보내기 기능');
    console.log('  ✅ 대리점장 계약서 페이지 계약서 보내기 기능');
    console.log('  ✅ 관리자 패널 계약서 보내기 기능');
    console.log('  ✅ 에러 처리 및 사용자 경험 개선');
    process.exit(0);
  }
}

runClientCodeTests().catch((error) => {
  console.error('테스트 실행 중 오류:', error);
  process.exit(1);
});

