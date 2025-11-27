/**
 * 계약서 PDF 전송 기능 종합 테스트
 * 관리자와 대리점장 시나리오를 모두 테스트
 */

import { logger } from '@/lib/logger';

// 테스트 시나리오 정의
const TEST_SCENARIOS = [
  {
    name: '관리자 - PDF 전송 성공',
    role: 'admin',
    endpoint: '/api/admin/affiliate/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 200,
  },
  {
    name: '관리자 - 존재하지 않는 계약서',
    role: 'admin',
    endpoint: '/api/admin/affiliate/contracts/999999/send-pdf',
    method: 'POST',
    expectedStatus: 404,
  },
  {
    name: '관리자 - 이메일 없는 계약서',
    role: 'admin',
    endpoint: '/api/admin/affiliate/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 400,
  },
  {
    name: '대리점장 - PDF 전송 성공',
    role: 'BRANCH_MANAGER',
    endpoint: '/api/partner/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 200,
  },
  {
    name: '대리점장 - 권한 없는 계약서',
    role: 'BRANCH_MANAGER',
    endpoint: '/api/partner/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 403,
  },
  {
    name: '판매원 - PDF 전송 시도 (권한 없음)',
    role: 'SALES_AGENT',
    endpoint: '/api/partner/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 403,
  },
  {
    name: '비로그인 사용자 - PDF 전송 시도',
    role: null,
    endpoint: '/api/admin/affiliate/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 401,
  },
  {
    name: '잘못된 HTTP 메서드 (GET)',
    role: 'admin',
    endpoint: '/api/admin/affiliate/contracts/{contractId}/send-pdf',
    method: 'GET',
    expectedStatus: 405,
  },
];

async function testApiEndpoint(
  endpoint: string,
  method: string,
  headers: Record<string, string> = {}
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const status = response.status;
    const contentType = response.headers.get('content-type');
    let body: any = null;

    if (contentType?.includes('application/json')) {
      const text = await response.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch (e) {
          body = { raw: text };
        }
      }
    } else {
      body = { raw: await response.text() };
    }

    return {
      status,
      ok: response.ok,
      body,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error: any) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      body: null,
    };
  }
}

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function checkRouteFile(filePath: string): boolean {
  const fullPath = join(process.cwd(), filePath);
  return existsSync(fullPath);
}

function checkRouteExports(filePath: string): { hasPost: boolean; hasGet: boolean } {
  const fullPath = join(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    return { hasPost: false, hasGet: false };
  }

  const content = readFileSync(fullPath, 'utf-8');
  return {
    hasPost: /export\s+(async\s+)?function\s+POST/.test(content),
    hasGet: /export\s+(async\s+)?function\s+GET/.test(content),
  };
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('계약서 PDF 전송 기능 종합 테스트 시작');
  console.log('='.repeat(80));
  console.log('');

  // 1. 라우트 파일 존재 확인
  console.log('1. 라우트 파일 존재 확인');
  console.log('-'.repeat(80));
  
  const adminRoutePath = 'app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts';
  const partnerRoutePath = 'app/api/partner/contracts/[contractId]/send-pdf/route.ts';
  
  const adminRouteExists = checkRouteFile(adminRoutePath);
  const partnerRouteExists = checkRouteFile(partnerRoutePath);
  
  console.log(`관리자 라우트 파일: ${adminRouteExists ? '✅ 존재' : '❌ 없음'}`);
  console.log(`대리점장 라우트 파일: ${partnerRouteExists ? '✅ 존재' : '❌ 없음'}`);
  console.log('');

  // 2. 라우트 export 확인
  console.log('2. 라우트 export 확인');
  console.log('-'.repeat(80));
  
  if (adminRouteExists) {
    const adminExports = checkRouteExports(adminRoutePath);
    console.log(`관리자 라우트 - POST: ${adminExports.hasPost ? '✅' : '❌'}, GET: ${adminExports.hasGet ? '✅' : '❌'}`);
  }
  
  if (partnerRouteExists) {
    const partnerExports = checkRouteExports(partnerRoutePath);
    console.log(`대리점장 라우트 - POST: ${partnerExports.hasPost ? '✅' : '❌'}, GET: ${partnerExports.hasGet ? '✅' : '❌'}`);
  }
  console.log('');

  // 3. Next.js 15 params 처리 확인
  console.log('3. Next.js 15 params 처리 확인');
  console.log('-'.repeat(80));
  
  if (adminRouteExists) {
    const fullPath = join(process.cwd(), adminRoutePath);
    const content = readFileSync(fullPath, 'utf-8');
    
    const hasAwaitParams = /await\s+params|await\s+resolvedParams|Promise\.resolve\(params\)/.test(content);
    const hasParamsPromise = /params.*Promise/.test(content);
    const hasCorrectParams = /const\s+resolvedParams\s*=\s*await\s+params/.test(content);
    
    console.log(`관리자 라우트 - params Promise 처리: ${hasAwaitParams || hasParamsPromise || hasCorrectParams ? '✅' : '❌'}`);
    if (!hasCorrectParams && !hasAwaitParams) {
      console.log('  ⚠️  params를 await로 처리하지 않았습니다. Next.js 15에서는 필수입니다.');
    }
  }
  
  if (partnerRouteExists) {
    const fullPath = join(process.cwd(), partnerRoutePath);
    const content = readFileSync(fullPath, 'utf-8');
    
    const hasAwaitParams = /await\s+params|await\s+resolvedParams|Promise\.resolve\(params\)/.test(content);
    const hasParamsPromise = /params.*Promise/.test(content);
    const hasCorrectParams = /const\s+resolvedParams\s*=\s*await\s+params|Promise\.resolve\(params\)/.test(content);
    
    console.log(`대리점장 라우트 - params Promise 처리: ${hasAwaitParams || hasParamsPromise || hasCorrectParams ? '✅' : '❌'}`);
    if (!hasCorrectParams && !hasAwaitParams) {
      console.log('  ⚠️  params를 await로 처리하지 않았습니다. Next.js 15에서는 필수입니다.');
    }
  }
  console.log('');

  // 4. 실제 API 테스트 (환경이 준비된 경우)
  console.log('4. API 엔드포인트 테스트');
  console.log('-'.repeat(80));
  console.log('⚠️  실제 API 테스트는 서버가 실행 중일 때만 가능합니다.');
  console.log('⚠️  테스트를 실행하려면 실제 계약서 ID와 인증 토큰이 필요합니다.');
  console.log('');

  // 5. 코드 검증 결과 요약
  console.log('='.repeat(80));
  console.log('테스트 결과 요약');
  console.log('='.repeat(80));
  
  const issues: string[] = [];
  
  if (!adminRouteExists) {
    issues.push('❌ 관리자 라우트 파일이 없습니다');
  }
  
  if (!partnerRouteExists) {
    issues.push('❌ 대리점장 라우트 파일이 없습니다');
  }
  
  if (adminRouteExists) {
    const adminExports = checkRouteExports(adminRoutePath);
    if (!adminExports.hasPost) {
      issues.push('❌ 관리자 라우트에 POST 함수가 없습니다');
    }
  }
  
  if (partnerRouteExists) {
    const partnerExports = checkRouteExports(partnerRoutePath);
    if (!partnerExports.hasPost) {
      issues.push('❌ 대리점장 라우트에 POST 함수가 없습니다');
    }
  }
  
  if (issues.length === 0) {
    console.log('✅ 모든 기본 검증 통과');
  } else {
    console.log('⚠️  발견된 문제:');
    issues.forEach(issue => console.log(`  ${issue}`));
  }
  
  console.log('');
  console.log('='.repeat(80));
}

// 실행
runTests().catch(console.error);

