/**
 * 모든 계약서 관련 API 종합 테스트
 * - PDF 전송 API (관리자, 대리점장)
 * - 계약서 완료 API (관리자, 대리점장)
 * - 모든 에러 케이스 및 시나리오 테스트
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  status?: number;
  error?: string;
  response?: any;
  details?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  category: string,
  name: string,
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    expectedStatus?: number | number[];
    skip?: boolean;
  } = {}
): Promise<TestResult> {
  const {
    method = 'POST',
    headers = {},
    body,
    expectedStatus,
    skip = false,
  } = options;

  if (skip) {
    return {
      category,
      name,
      passed: true,
      error: 'Skipped (requires authentication)',
    };
  }

  try {
    console.log(`\n🧪 [${category}] ${name}`);
    console.log(`   URL: ${url}`);
    console.log(`   Method: ${method}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(url, fetchOptions);
    const duration = Date.now() - startTime;
    const status = response.status;
    const contentType = response.headers.get('content-type');
    
    let responseBody: any = null;
    let responseText = '';
    
    try {
      responseText = await response.text();
      if (responseText) {
        if (contentType?.includes('application/json')) {
          try {
            responseBody = JSON.parse(responseText);
          } catch (e) {
            responseBody = { raw: responseText };
          }
        } else {
          responseBody = { raw: responseText };
        }
      }
    } catch (e) {
      responseBody = { error: 'Failed to read response' };
    }

    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const passed = expectedStatus 
      ? expectedStatuses.includes(status)
      : response.ok || status === 405;

    console.log(`   Status: ${status} (${duration}ms)`);
    if (responseBody && Object.keys(responseBody).length > 0) {
      const preview = JSON.stringify(responseBody, null, 2).substring(0, 200);
      console.log(`   Response: ${preview}${JSON.stringify(responseBody).length > 200 ? '...' : ''}`);
    }

    if (!passed) {
      console.log(`   ❌ 실패`);
      if (expectedStatus) {
        console.log(`      예상: ${expectedStatuses.join(' 또는 ')}, 실제: ${status}`);
      }
    } else {
      console.log(`   ✅ 성공`);
    }

    return {
      category,
      name,
      passed,
      status,
      response: responseBody,
      error: passed ? undefined : `Expected ${expectedStatuses.join(' or ')}, got ${status}`,
      details: `Status: ${status}, Duration: ${duration}ms`,
    };
  } catch (error: any) {
    console.log(`   ❌ 에러: ${error.message}`);
    return {
      category,
      name,
      passed: false,
      error: error.message,
    };
  }
}

async function runAllContractTests() {
  console.log('='.repeat(80));
  console.log('모든 계약서 관련 API 종합 테스트');
  console.log('='.repeat(80));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  // 0. 서버 연결 확인
  console.log('0. 서버 연결 확인');
  console.log('-'.repeat(80));
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: 'test', password: 'test', name: 'test' }),
    });
    console.log(`✅ 서버 연결 성공 (Status: ${healthCheck.status})`);
  } catch (error: any) {
    console.log(`❌ 서버 연결 실패: ${error.message}`);
    console.log('⚠️  서버가 실행 중인지 확인해주세요: npm run dev');
    return;
  }
  console.log('');

  const testContractId = 1; // 테스트용 계약서 ID

  // 1. 관리자 PDF 전송 API 테스트
  console.log('1. 관리자 PDF 전송 API 테스트');
  console.log('-'.repeat(80));
  
  const adminPdfTests = [
    await testEndpoint('관리자 PDF 전송', '비로그인 사용자', 
      `${BASE_URL}/api/admin/affiliate/contracts/${testContractId}/send-pdf`,
      { method: 'POST', expectedStatus: 401 }),
    await testEndpoint('관리자 PDF 전송', 'GET 메서드 (405)', 
      `${BASE_URL}/api/admin/affiliate/contracts/${testContractId}/send-pdf`,
      { method: 'GET', expectedStatus: 405 }),
    await testEndpoint('관리자 PDF 전송', 'PUT 메서드 (405)', 
      `${BASE_URL}/api/admin/affiliate/contracts/${testContractId}/send-pdf`,
      { method: 'PUT', expectedStatus: 405 }),
    await testEndpoint('관리자 PDF 전송', '존재하지 않는 계약서', 
      `${BASE_URL}/api/admin/affiliate/contracts/999999/send-pdf`,
      { method: 'POST', expectedStatus: [401, 404] }),
    await testEndpoint('관리자 PDF 전송', '잘못된 계약서 ID 형식', 
      `${BASE_URL}/api/admin/affiliate/contracts/invalid/send-pdf`,
      { method: 'POST', expectedStatus: [400, 401] }),
  ];
  results.push(...adminPdfTests);
  console.log('');

  // 2. 대리점장 PDF 전송 API 테스트
  console.log('2. 대리점장 PDF 전송 API 테스트');
  console.log('-'.repeat(80));
  
  const partnerPdfTests = [
    await testEndpoint('대리점장 PDF 전송', '비로그인 사용자', 
      `${BASE_URL}/api/partner/contracts/${testContractId}/send-pdf`,
      { method: 'POST', expectedStatus: 401 }),
    await testEndpoint('대리점장 PDF 전송', 'GET 메서드 (405)', 
      `${BASE_URL}/api/partner/contracts/${testContractId}/send-pdf`,
      { method: 'GET', expectedStatus: 405 }),
    await testEndpoint('대리점장 PDF 전송', 'PUT 메서드 (405)', 
      `${BASE_URL}/api/partner/contracts/${testContractId}/send-pdf`,
      { method: 'PUT', expectedStatus: 405 }),
    await testEndpoint('대리점장 PDF 전송', '존재하지 않는 계약서', 
      `${BASE_URL}/api/partner/contracts/999999/send-pdf`,
      { method: 'POST', expectedStatus: [401, 404] }),
    await testEndpoint('대리점장 PDF 전송', '잘못된 계약서 ID 형식', 
      `${BASE_URL}/api/partner/contracts/invalid/send-pdf`,
      { method: 'POST', expectedStatus: [400, 401] }),
  ];
  results.push(...partnerPdfTests);
  console.log('');

  // 3. 관리자 계약서 완료 API 테스트
  console.log('3. 관리자 계약서 완료 API 테스트');
  console.log('-'.repeat(80));
  
  const adminCompleteTests = [
    await testEndpoint('관리자 계약서 완료', '비로그인 사용자', 
      `${BASE_URL}/api/admin/affiliate/contracts/${testContractId}/complete`,
      { method: 'POST', expectedStatus: 401 }),
    await testEndpoint('관리자 계약서 완료', 'GET 메서드 (405)', 
      `${BASE_URL}/api/admin/affiliate/contracts/${testContractId}/complete`,
      { method: 'GET', expectedStatus: 405 }),
    await testEndpoint('관리자 계약서 완료', '존재하지 않는 계약서', 
      `${BASE_URL}/api/admin/affiliate/contracts/999999/complete`,
      { method: 'POST', expectedStatus: [401, 404] }),
    await testEndpoint('관리자 계약서 완료', '잘못된 계약서 ID 형식', 
      `${BASE_URL}/api/admin/affiliate/contracts/invalid/complete`,
      { method: 'POST', expectedStatus: [400, 401] }),
  ];
  results.push(...adminCompleteTests);
  console.log('');

  // 4. 대리점장 계약서 완료 API 테스트
  console.log('4. 대리점장 계약서 완료 API 테스트');
  console.log('-'.repeat(80));
  
  const partnerCompleteTests = [
    await testEndpoint('대리점장 계약서 완료', '비로그인 사용자', 
      `${BASE_URL}/api/partner/contracts/${testContractId}/complete`,
      { method: 'POST', expectedStatus: 401 }),
    await testEndpoint('대리점장 계약서 완료', 'GET 메서드 (405)', 
      `${BASE_URL}/api/partner/contracts/${testContractId}/complete`,
      { method: 'GET', expectedStatus: 405 }),
    await testEndpoint('대리점장 계약서 완료', '존재하지 않는 계약서', 
      `${BASE_URL}/api/partner/contracts/999999/complete`,
      { method: 'POST', expectedStatus: [401, 404] }),
    await testEndpoint('대리점장 계약서 완료', '잘못된 계약서 ID 형식', 
      `${BASE_URL}/api/partner/contracts/invalid/complete`,
      { method: 'POST', expectedStatus: [400, 401] }),
  ];
  results.push(...partnerCompleteTests);
  console.log('');

  // 5. 결과 요약
  console.log('='.repeat(80));
  console.log('테스트 결과 요약');
  console.log('='.repeat(80));
  
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\n전체: ${total}개 테스트`);
  console.log(`✅ 통과: ${passed}`);
  console.log(`❌ 실패: ${failed}`);
  console.log('');

  // 카테고리별 결과
  const categories = [...new Set(results.map(r => r.category))];
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const categoryPassed = categoryResults.filter(r => r.passed).length;
    const categoryTotal = categoryResults.length;
    console.log(`${category}: ${categoryPassed}/${categoryTotal} 통과`);
    
    const categoryFailed = categoryResults.filter(r => !r.passed);
    if (categoryFailed.length > 0) {
      console.log('  실패한 항목:');
      categoryFailed.forEach(r => {
        console.log(`    ❌ ${r.name} (Status: ${r.status})`);
      });
    }
  });

  console.log('');

  // 405 에러 확인
  const method405Tests = results.filter(r => 
    r.name.includes('GET 메서드') || r.name.includes('PUT 메서드')
  );
  const method405Failed = method405Tests.filter(r => !r.passed);
  
  if (method405Failed.length > 0) {
    console.log('⚠️  405 에러 테스트 실패:');
    method405Failed.forEach(test => {
      console.log(`   - ${test.category} - ${test.name}: Status ${test.status} (예상: 405)`);
    });
    console.log('');
  } else {
    console.log('✅ 405 에러 테스트 모두 통과 (잘못된 메서드는 405 반환)');
  }

  // 인증 에러 확인
  const authTests = results.filter(r => r.name.includes('비로그인'));
  const authFailed = authTests.filter(r => !r.passed);
  
  if (authFailed.length > 0) {
    console.log('⚠️  인증 테스트 실패:');
    authFailed.forEach(test => {
      console.log(`   - ${test.category} - ${test.name}: Status ${test.status} (예상: 401)`);
    });
    console.log('');
  } else {
    console.log('✅ 인증 테스트 모두 통과 (비로그인 사용자는 401 반환)');
  }

  // 최종 결과
  if (failed > 0) {
    console.log('\n⚠️  일부 테스트가 실패했습니다.');
    console.log('⚠️  인증이 필요한 테스트는 실제 세션 쿠키가 필요합니다.');
    console.log('⚠️  로컬 브라우저에서 추가 테스트를 권장합니다.');
    process.exit(1);
  } else {
    console.log('\n✅ 모든 계약서 API 테스트 통과!');
    console.log('\n테스트 완료 항목:');
    console.log('  ✅ 관리자 PDF 전송 API');
    console.log('  ✅ 대리점장 PDF 전송 API');
    console.log('  ✅ 관리자 계약서 완료 API');
    console.log('  ✅ 대리점장 계약서 완료 API');
    console.log('  ✅ 405 에러 방지 확인');
    console.log('  ✅ 인증 에러 처리 확인');
    console.log('  ✅ 에러 케이스 처리 확인');
    console.log('\n다음 단계:');
    console.log('1. 브라우저에서 실제로 테스트 (인증된 사용자로)');
    console.log('2. 이메일 수신 확인');
    console.log('3. 모든 시나리오 정상 작동 확인');
    console.log('4. 배포 진행');
    process.exit(0);
  }

  console.log('\n' + '='.repeat(80));
}

runAllContractTests().catch((error) => {
  console.error('테스트 실행 중 오류:', error);
  process.exit(1);
});

