/**
 * Payment API Live Test Script
 *
 * 실제 개발 서버에 요청을 보내서 테스트
 *
 * 사전 조건:
 * 1. npm run dev 실행 중이어야 함
 * 2. .env 파일에 WELCOMEPAY_MID, WELCOMEPAY_SIGNKEY 설정되어 있어야 함
 *
 * 실행 방법:
 * npm run dev (별도 터미널)
 * tsx __tests__/payment-api-live-test.ts
 *
 * 주의: 이 파일은 Jest 테스트가 아닌 독립 실행 스크립트입니다.
 * Jest 테스트 러너로 실행하지 마세요.
 * testMatch 패턴에서 제외하려면 jest.config.cjs에서 제외 패턴을 추가하세요.
 */

// top-level await 사용을 위해 모듈로 선언
export {};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

// Jest 전역 'test' 함수와의 충돌을 방지하기 위해 함수명을 runTest로 변경
async function runTest(name: string, fn: () => Promise<void>) {
  console.log(`\n[TEST] ${name}`);
  try {
    await fn();
    console.log(`PASS`);
    results.push({ name, passed: true });
  } catch (err: any) {
    console.error(`FAIL: ${err.message}`);
    results.push({ name, passed: false, error: err.message });
  }
}

// Test 1: Health Check - API가 살아있는지 확인
await runTest('Server Health Check', async () => {
  const response = await fetch(`${BASE_URL}/api/health`);
  if (!response.ok && response.status !== 404) {
    throw new Error(`Server not responding: ${response.status}`);
  }
  console.log('  서버 응답 확인됨');
});

// Test 2: Payment Request API - 필수 필드 누락 시 400 에러
await runTest('Payment Request - Missing Fields (400)', async () => {
  const response = await fetch(`${BASE_URL}/api/payment/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productCode: 'CR001',
      // amount, buyerName, buyerTel 누락
    }),
  });

  const data = await response.json();
  console.log('  응답:', data);

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (!data.error || !data.error.includes('필수')) {
    throw new Error('Expected error message about required fields');
  }
});

// Test 3: Payment Request API - 정상 요청 (Payment 생성 확인)
await runTest('Payment Request - Valid Request (200)', async () => {
  const response = await fetch(`${BASE_URL}/api/payment/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productCode: 'TEST_PRODUCT',
      productName: '테스트 상품',
      amount: 100000,
      buyerName: '테스트유저',
      buyerTel: '01012345678',
      buyerEmail: 'test@example.com',
    }),
  });

  const data = await response.json();
  console.log('  응답:', data);

  if (!response.ok) {
    throw new Error(`Expected 200, got ${response.status}: ${data.error}`);
  }

  if (!data.orderId) {
    throw new Error('Expected orderId in response');
  }

  if (!data.checkoutUrl || !data.checkoutUrl.includes('/payment/checkout')) {
    throw new Error('Expected checkoutUrl with /payment/checkout');
  }

  console.log('  orderId:', data.orderId);
  console.log('  checkoutUrl:', data.checkoutUrl);

  // 다음 테스트를 위해 orderId 저장
  (globalThis as any).__TEST_ORDER_ID__ = data.orderId;
});

// Test 4: Payment Signature API - 서명 생성 확인
await runTest('Payment Signature - Generate Signature (200)', async () => {
  const response = await fetch(`${BASE_URL}/api/payment/signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'TEST_ORDER_123',
      price: 100000,
      isMobile: false,
    }),
  });

  const data = await response.json();
  console.log('  응답:', data);

  if (!response.ok) {
    throw new Error(`Expected 200, got ${response.status}: ${data.error}`);
  }

  if (!data.signature || !data.mKey || !data.timestamp) {
    throw new Error('Expected signature, mKey, timestamp in response');
  }

  console.log('  signature length:', data.signature.length);
  console.log('  mKey length:', data.mKey.length);
  console.log('  timestamp:', data.timestamp);
});

// Test 5: Payment Prepare API - 결제 정보 조회
await runTest('Payment Prepare - Get Payment Info (200)', async () => {
  const orderId = (globalThis as any).__TEST_ORDER_ID__;

  if (!orderId) {
    console.log('  이전 테스트에서 orderId 없음, 스킵');
    return;
  }

  const response = await fetch(`${BASE_URL}/api/payment/prepare?orderId=${orderId}&isMobile=false`);
  const data = await response.json();
  console.log('  응답:', data);

  if (!response.ok) {
    throw new Error(`Expected 200, got ${response.status}: ${data.error}`);
  }

  if (!data.payment || !data.formData || !data.paymentUrl) {
    throw new Error('Expected payment, formData, paymentUrl in response');
  }

  console.log('  payment.orderId:', data.payment.orderId);
  console.log('  formData fields:', Object.keys(data.formData).length);
  console.log('  paymentUrl:', data.paymentUrl);
});

// Test 6: Payment Signature API - Missing Fields (400)
await runTest('Payment Signature - Missing Fields (400)', async () => {
  const response = await fetch(`${BASE_URL}/api/payment/signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // orderId, price 누락
    }),
  });

  const data = await response.json();
  console.log('  응답:', data);

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }
});

// Test 7: Logger 함수 작동 확인 (간접 테스트 - 로그 출력 여부는 수동 확인)
await runTest('Logger Functions Working', async () => {
  // Payment API를 호출했을 때 서버 로그가 출력되는지 확인
  // 실제로는 서버 콘솔을 보고 확인해야 함
  const response = await fetch(`${BASE_URL}/api/payment/signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'LOGGER_TEST',
      price: 50000,
      isMobile: true,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API call failed: ${data.error}`);
  }

  console.log('  API 호출 성공 (서버 로그 확인 필요)');
  console.log('  서버 콘솔에서 [Payment Signature] 로그 확인하세요');
});

// 결과 요약
console.log('\n' + '='.repeat(60));
console.log('Test Results Summary');
console.log('='.repeat(60));

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

results.forEach(r => {
  const icon = r.passed ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${r.name}`);
  if (r.error) {
    console.log(`   Error: ${r.error}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`총 ${results.length}개 테스트 중 ${passed}개 통과, ${failed}개 실패`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\n일부 테스트 실패');
  console.log('\n문제 해결 방법:');
  console.log('1. npm run dev가 실행 중인지 확인');
  console.log('2. .env 파일에 WELCOMEPAY_MID, WELCOMEPAY_SIGNKEY 설정 확인');
  console.log('3. 데이터베이스 연결 확인 (Prisma)');
  console.log('4. 서버 콘솔에서 에러 로그 확인');
  process.exit(1);
} else {
  console.log('\n모든 테스트 통과!');
  console.log('\n다음 단계:');
  console.log('1. 서버 콘솔에서 로그 출력 확인');
  console.log('2. [Payment Request] 로그가 있는지 확인');
  console.log('3. [Payment Signature] 로그가 있는지 확인');
  console.log('4. 에러 발생 시 error() 함수가 작동하는지 확인');
  console.log('\n수동 테스트:');
  console.log('브라우저에서 http://localhost:3000/payment/checkout?orderId=xxx 접속');
  console.log('실제 결제창이 로드되는지 확인');
}
