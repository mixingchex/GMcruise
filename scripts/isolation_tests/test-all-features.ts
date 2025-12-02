// scripts/isolation_tests/test-all-features.ts
// 전체 기능 격리 테스트 스크립트

import * as dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTest(
  category: string,
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      category,
      name,
      status: 'PASS',
      message: 'OK',
      duration: Date.now() - start,
    });
    console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
  } catch (error: any) {
    results.push({
      category,
      name,
      status: 'FAIL',
      message: error.message || String(error),
      duration: Date.now() - start,
    });
    console.log(`  ❌ ${name}: ${error.message?.substring(0, 100)}`);
  }
}

// ============================================
// 1. Gemini API 연결 기능 테스트
// ============================================
async function testGeminiFeatures() {
  console.log('\n📱 [1] Gemini API 연결 기능 테스트');
  console.log('─'.repeat(50));

  // 1-1. 기본 Gemini API 호출
  await runTest('Gemini', 'Gemini API 기본 호출', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '안녕하세요' }],
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API failed');
  });

  // 1-2. 채팅 API
  await runTest('Gemini', '채팅 API (/api/chat)', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '크루즈 여행 추천해줘' }],
      }),
    });
    if (!res.ok && res.status !== 401) {
      const text = await res.text();
      throw new Error(`Status ${res.status}: ${text.substring(0, 100)}`);
    }
  });

  // 1-3. AI Ask API
  await runTest('Gemini', 'AI Ask API (/api/ai/ask)', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: '오키나와 날씨 어때?',
      }),
    });
    if (!res.ok && res.status !== 401) {
      const text = await res.text();
      throw new Error(`Status ${res.status}: ${text.substring(0, 100)}`);
    }
  });

  // 1-4. 번역/발음 API
  await runTest('Gemini', '발음 API (/api/translation/pronunciation)', async () => {
    const res = await fetch(`${BASE_URL}/api/translation/pronunciation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello',
        targetLang: 'ko',
      }),
    });
    // 401이나 200 둘 다 정상
    if (!res.ok && res.status !== 401 && res.status !== 400) {
      throw new Error(`Status ${res.status}`);
    }
  });
}

// ============================================
// 2. 인증 시스템 테스트
// ============================================
async function testAuthSystem() {
  console.log('\n🔐 [2] 인증 시스템 테스트');
  console.log('─'.repeat(50));

  // 2-1. 세션 API
  await runTest('Auth', '세션 API (/api/session)', async () => {
    const res = await fetch(`${BASE_URL}/api/session`);
    if (!res.ok && res.status !== 401) {
      throw new Error(`Status ${res.status}`);
    }
  });

  // 2-2. Whoami API
  await runTest('Auth', 'Whoami API (/api/whoami)', async () => {
    const res = await fetch(`${BASE_URL}/api/whoami`);
    if (!res.ok && res.status !== 401) {
      throw new Error(`Status ${res.status}`);
    }
  });

  // 2-3. 관리자 로그인 페이지 로드
  await runTest('Auth', '관리자 로그인 페이지', async () => {
    const res = await fetch(`${BASE_URL}/admin`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // 2-4. 크루즈몰 로그인 페이지
  await runTest('Auth', '크루즈몰 로그인 페이지', async () => {
    const res = await fetch(`${BASE_URL}/mall/login`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });
}

// ============================================
// 3. 주요 페이지 로드 테스트
// ============================================
async function testPageLoads() {
  console.log('\n📄 [3] 주요 페이지 로드 테스트');
  console.log('─'.repeat(50));

  const pages = [
    { name: '메인 페이지', path: '/' },
    { name: '채팅 페이지', path: '/chat' },
    { name: '상품 목록', path: '/products' },
    { name: '일정표', path: '/schedule' },
    { name: '도구', path: '/tools' },
    { name: '번역기', path: '/translator' },
    { name: '지갑', path: '/wallet' },
    { name: 'FAQ', path: '/support/faq' },
    { name: '공지사항', path: '/support/notice' },
    { name: '이벤트', path: '/events' },
    { name: '유튜브', path: '/youtube' },
    { name: '보험', path: '/insurance' },
    { name: '체크리스트', path: '/checklist' },
    { name: '로그인', path: '/login' },
    { name: '회원가입', path: '/signup' },
  ];

  for (const page of pages) {
    await runTest('Page', page.name, async () => {
      const res = await fetch(`${BASE_URL}${page.path}`);
      if (!res.ok && res.status !== 307 && res.status !== 302) {
        throw new Error(`Status ${res.status}`);
      }
    });
  }
}

// ============================================
// 4. API 엔드포인트 테스트
// ============================================
async function testAPIEndpoints() {
  console.log('\n🔌 [4] API 엔드포인트 테스트');
  console.log('─'.repeat(50));

  const apis = [
    { name: 'Health Check', path: '/api/health', method: 'GET' },
    { name: '공개 상품 목록', path: '/api/public/products', method: 'GET' },
    { name: 'D-Day', path: '/api/dday/today', method: 'GET' },
    { name: '환율 (USD)', path: '/api/exchange/USD', method: 'GET' },
  ];

  for (const api of apis) {
    await runTest('API', api.name, async () => {
      const res = await fetch(`${BASE_URL}${api.path}`, { method: api.method });
      if (!res.ok && res.status !== 401) {
        const text = await res.text().catch(() => '');
        throw new Error(`Status ${res.status}: ${text.substring(0, 50)}`);
      }
    });
  }
}

// ============================================
// 5. 데이터베이스 연결 테스트
// ============================================
async function testDatabase() {
  console.log('\n💾 [5] 데이터베이스 연결 테스트');
  console.log('─'.repeat(50));

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    await runTest('DB', '데이터베이스 연결', async () => {
      await prisma.$connect();
    });

    await runTest('DB', 'User 테이블 조회', async () => {
      const count = await prisma.user.count();
      if (count < 0) throw new Error('Invalid count');
      console.log(`     → ${count} users`);
    });

    await runTest('DB', 'Trip 테이블 조회', async () => {
      const count = await prisma.trip.count();
      console.log(`     → ${count} trips`);
    });

    await runTest('DB', 'AffiliateProfile 테이블 조회', async () => {
      const count = await prisma.affiliateProfile.count();
      console.log(`     → ${count} profiles`);
    });

    await runTest('DB', '관리자 계정 (role=admin) 확인', async () => {
      const admins = await prisma.user.findMany({
        where: { role: 'admin' },
        select: { id: true, name: true, mallUserId: true },
        take: 5,
      });
      console.log(`     → ${admins.length} admins found`);
      if (admins.length === 0) throw new Error('No admin users');
    });
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// 6. Google Drive 연결 테스트
// ============================================
async function testGoogleDrive() {
  console.log('\n☁️ [6] Google Drive 연결 테스트');
  console.log('─'.repeat(50));

  await runTest('Drive', 'Google Drive 인증', async () => {
    const { google } = await import('googleapis');
    const privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;

    if (!privateKey || !clientEmail) {
      throw new Error('Google credentials not set');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const response = await drive.about.get({ fields: 'user' });
    console.log(`     → ${response.data.user?.displayName}`);
  });
}

// ============================================
// 7. 크루즈몰 기능 테스트
// ============================================
async function testMallFeatures() {
  console.log('\n🛒 [7] 크루즈몰 기능 테스트');
  console.log('─'.repeat(50));

  const mallPages = [
    { name: '몰 메인', path: '/mall/login' },
    { name: '몰 회원가입', path: '/mall/signup' },
    { name: '비밀번호 찾기', path: '/mall/find-password' },
  ];

  for (const page of mallPages) {
    await runTest('Mall', page.name, async () => {
      const res = await fetch(`${BASE_URL}${page.path}`);
      if (!res.ok && res.status !== 307) {
        throw new Error(`Status ${res.status}`);
      }
    });
  }
}

// ============================================
// 8. 파트너 대시보드 테스트
// ============================================
async function testPartnerFeatures() {
  console.log('\n👥 [8] 파트너 기능 테스트');
  console.log('─'.repeat(50));

  await runTest('Partner', '파트너 메인 페이지', async () => {
    const res = await fetch(`${BASE_URL}/partner`);
    if (!res.ok && res.status !== 307 && res.status !== 302) {
      throw new Error(`Status ${res.status}`);
    }
  });
}

// ============================================
// 메인 실행
// ============================================
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 크루즈가이드 전체 기능 테스트');
  console.log('═'.repeat(60));

  const startTime = Date.now();

  // 서버 연결 확인
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!healthRes.ok) {
      console.log('\n❌ 서버가 응답하지 않습니다. npm run dev를 먼저 실행하세요.');
      process.exit(1);
    }
  } catch (e) {
    console.log('\n❌ 서버에 연결할 수 없습니다. npm run dev를 먼저 실행하세요.');
    process.exit(1);
  }

  // 테스트 실행
  await testGeminiFeatures();
  await testAuthSystem();
  await testPageLoads();
  await testAPIEndpoints();
  await testDatabase();
  await testGoogleDrive();
  await testMallFeatures();
  await testPartnerFeatures();

  // 결과 요약
  console.log('\n' + '═'.repeat(60));
  console.log('📊 테스트 결과 요약');
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\n  총 테스트: ${total}`);
  console.log(`  ✅ 통과: ${passed}`);
  console.log(`  ❌ 실패: ${failed}`);
  console.log(`  ⏱️ 소요시간: ${((Date.now() - startTime) / 1000).toFixed(1)}초`);

  if (failed > 0) {
    console.log('\n❌ 실패한 테스트 목록:');
    console.log('─'.repeat(50));
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`  [${r.category}] ${r.name}`);
        console.log(`     → ${r.message.substring(0, 100)}`);
      });
  }

  console.log('\n');

  // 카테고리별 요약
  const categories = [...new Set(results.map((r) => r.category))];
  console.log('📋 카테고리별 결과:');
  console.log('─'.repeat(50));
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.status === 'PASS').length;
    const catFailed = catResults.filter((r) => r.status === 'FAIL').length;
    const status = catFailed === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${cat}: ${catPassed}/${catResults.length} 통과`);
  }

  console.log('\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
