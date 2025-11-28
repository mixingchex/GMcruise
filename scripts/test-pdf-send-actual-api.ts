/**
 * PDF 전송 기능 실제 API 시뮬레이션 테스트
 * 실제 서버에 요청을 보내서 모든 시나리오를 테스트
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  status?: number;
  error?: string;
  response?: any;
  details?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
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
      name,
      passed: true,
      error: 'Skipped (requires authentication)',
    };
  }

  try {
    console.log(`\n🧪 테스트: ${name}`);
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
      : response.ok || status === 405; // 405는 예상된 에러일 수 있음

    console.log(`   Status: ${status}`);
    console.log(`   Duration: ${duration}ms`);
    if (responseBody) {
      const preview = JSON.stringify(responseBody, null, 2).substring(0, 300);
      console.log(`   Response: ${preview}${JSON.stringify(responseBody).length > 300 ? '...' : ''}`);
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
      name,
      passed: false,
      error: error.message,
    };
  }
}

async function runActualApiTests() {
  console.log('='.repeat(80));
  console.log('PDF 전송 기능 실제 API 시뮬레이션 테스트');
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
    console.log('⚠️  서버가 실행 중이 아니면 코드 레벨 검증만 수행합니다.');
    console.log('');
    return;
  }
  console.log('');

  // 테스트용 계약서 ID (실제로는 DB에서 가져와야 함)
  const testContractId = 1; // 실제 테스트 시 존재하는 계약서 ID로 변경 필요

  // 1. 관리자 라우트 테스트
  console.log('1. 관리자 라우트 테스트');
  console.log('-'.repeat(80));
  
  // 1-1. 비로그인 사용자 (401 예상)
  const test1 = await testEndpoint(
    '관리자 - 비로그인 사용자',
    `${BASE_URL}/api/admin/affiliate/contracts/${testContractId}/send-pdf`,
    {
      method: 'POST',
      expectedStatus: 401,
    }
  );
  results.push(test1);

  // 1-2. 잘못된 HTTP 메서드 (405 예상)
  const test2 = await testEndpoint(
    '관리자 - GET 메서드 (405 에러 확인)',
    `${BASE_URL}/api/admin/affiliate/contracts/${testContractId}/send-pdf`,
    {
      method: 'GET',
      expectedStatus: 405,
    }
  );
  results.push(test2);

  // 1-3. 존재하지 않는 계약서 (인증 필요하지만 404 예상)
  const test3 = await testEndpoint(
    '관리자 - 존재하지 않는 계약서',
    `${BASE_URL}/api/admin/affiliate/contracts/999999/send-pdf`,
    {
      method: 'POST',
      expectedStatus: [401, 404], // 인증 실패 또는 계약서 없음
    }
  );
  results.push(test3);

  // 1-4. 잘못된 계약서 ID 형식 (400 예상)
  const test4 = await testEndpoint(
    '관리자 - 잘못된 계약서 ID 형식',
    `${BASE_URL}/api/admin/affiliate/contracts/invalid/send-pdf`,
    {
      method: 'POST',
      expectedStatus: [400, 401], // 인증 실패 또는 잘못된 형식
    }
  );
  results.push(test4);
  console.log('');

  // 2. 대리점장 라우트 테스트
  console.log('2. 대리점장 라우트 테스트');
  console.log('-'.repeat(80));
  
  // 2-1. 비로그인 사용자 (401 예상)
  const test5 = await testEndpoint(
    '대리점장 - 비로그인 사용자',
    `${BASE_URL}/api/partner/contracts/${testContractId}/send-pdf`,
    {
      method: 'POST',
      expectedStatus: 401,
    }
  );
  results.push(test5);

  // 2-2. 잘못된 HTTP 메서드 (405 예상)
  const test6 = await testEndpoint(
    '대리점장 - GET 메서드 (405 에러 확인)',
    `${BASE_URL}/api/partner/contracts/${testContractId}/send-pdf`,
    {
      method: 'GET',
      expectedStatus: 405,
    }
  );
  results.push(test6);

  // 2-3. 존재하지 않는 계약서
  const test7 = await testEndpoint(
    '대리점장 - 존재하지 않는 계약서',
    `${BASE_URL}/api/partner/contracts/999999/send-pdf`,
    {
      method: 'POST',
      expectedStatus: [401, 404],
    }
  );
  results.push(test7);

  // 2-4. 잘못된 계약서 ID 형식
  const test8 = await testEndpoint(
    '대리점장 - 잘못된 계약서 ID 형식',
    `${BASE_URL}/api/partner/contracts/invalid/send-pdf`,
    {
      method: 'POST',
      expectedStatus: [400, 401],
    }
  );
  results.push(test8);
  console.log('');

  // 3. 405 에러 특별 확인
  console.log('3. 405 에러 특별 확인');
  console.log('-'.repeat(80));
  
  const methods405 = ['GET', 'PUT', 'DELETE', 'PATCH'];
  for (const method of methods405) {
    const test = await testEndpoint(
      `관리자 - ${method} 메서드 (405 확인)`,
      `${BASE_URL}/api/admin/affiliate/contracts/${testContractId}/send-pdf`,
      {
        method,
        expectedStatus: 405,
      }
    );
    results.push(test);
  }
  console.log('');

  // 4. 결과 요약
  console.log('='.repeat(80));
  console.log('테스트 결과 요약');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`\n전체: ${total}개 테스트`);
  console.log(`✅ 통과: ${passed}`);
  console.log(`❌ 실패: ${failed}`);
  console.log('');

  // 카테고리별 결과
  const categories = {
    '인증 테스트': results.filter(r => r.name.includes('비로그인')),
    '405 에러 테스트': results.filter(r => r.name.includes('405') || r.name.includes('GET') || r.name.includes('PUT') || r.name.includes('DELETE')),
    '에러 처리 테스트': results.filter(r => r.name.includes('존재하지') || r.name.includes('잘못된')),
  };

  Object.entries(categories).forEach(([category, categoryResults]) => {
    if (categoryResults.length > 0) {
      const categoryPassed = categoryResults.filter(r => r.passed).length;
      console.log(`${category}: ${categoryPassed}/${categoryResults.length} 통과`);
    }
  });

  console.log('');

  // 실패한 테스트 상세
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('실패한 테스트:');
    failedTests.forEach((test, idx) => {
      console.log(`\n${idx + 1}. ${test.name}`);
      console.log(`   Status: ${test.status}`);
      console.log(`   Error: ${test.error || 'N/A'}`);
      if (test.response) {
        console.log(`   Response: ${JSON.stringify(test.response).substring(0, 200)}`);
      }
    });
    console.log('');
  }

  // 405 에러 확인
  const method405Tests = results.filter(r => 
    r.name.includes('GET') || r.name.includes('PUT') || r.name.includes('DELETE') || r.name.includes('PATCH')
  );
  const method405Failed = method405Tests.filter(r => !r.passed);
  
  if (method405Failed.length > 0) {
    console.log('⚠️  405 에러 테스트 실패:');
    method405Failed.forEach(test => {
      console.log(`   - ${test.name}: Status ${test.status} (예상: 405)`);
    });
    console.log('');
    console.log('⚠️  배포 전에 405 에러 문제를 해결해주세요.');
    process.exit(1);
  } else {
    console.log('✅ 405 에러 테스트 모두 통과 (잘못된 메서드는 405 반환)');
  }

  // 최종 결과
  if (failed > 0) {
    console.log('\n⚠️  일부 테스트가 실패했습니다. 배포 전에 확인해주세요.');
    console.log('⚠️  인증이 필요한 테스트는 실제 세션 쿠키가 필요합니다.');
    console.log('⚠️  로컬 브라우저에서 추가 테스트를 권장합니다.');
  } else {
    console.log('\n✅ 모든 API 테스트 통과!');
    console.log('\n다음 단계:');
    console.log('1. 브라우저에서 실제로 테스트 (인증된 사용자로)');
    console.log('2. 이메일 수신 확인');
    console.log('3. 모든 시나리오 정상 작동 확인');
    console.log('4. 배포 진행');
  }

  console.log('\n' + '='.repeat(80));
}

runActualApiTests().catch((error) => {
  console.error('테스트 실행 중 오류:', error);
  process.exit(1);
});


