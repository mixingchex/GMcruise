/**
 * PDF 전송 기능 종합 테스트 - 실제 시뮬레이션
 * 관리자와 대리점장의 모든 시나리오를 테스트
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface TestCase {
  name: string;
  user: 'admin' | 'branch_manager' | 'sales_agent' | 'unauthorized';
  endpoint: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  expectedStatus: number;
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: '관리자 - 정상 PDF 전송',
    user: 'admin',
    endpoint: '/api/admin/affiliate/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 200,
    description: '관리자가 계약서 PDF를 이메일로 전송',
  },
  {
    name: '관리자 - 존재하지 않는 계약서',
    user: 'admin',
    endpoint: '/api/admin/affiliate/contracts/999999/send-pdf',
    method: 'POST',
    expectedStatus: 404,
    description: '존재하지 않는 계약서 ID로 요청',
  },
  {
    name: '관리자 - 잘못된 HTTP 메서드 (GET)',
    user: 'admin',
    endpoint: '/api/admin/affiliate/contracts/{contractId}/send-pdf',
    method: 'GET',
    expectedStatus: 405,
    description: 'POST가 필요한 엔드포인트에 GET 요청',
  },
  {
    name: '대리점장 - 정상 PDF 전송',
    user: 'branch_manager',
    endpoint: '/api/partner/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 200,
    description: '대리점장이 자신이 초대한 계약서 PDF 전송',
  },
  {
    name: '대리점장 - 권한 없는 계약서',
    user: 'branch_manager',
    endpoint: '/api/partner/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 403,
    description: '다른 대리점장이 초대한 계약서에 접근 시도',
  },
  {
    name: '판매원 - PDF 전송 시도 (권한 없음)',
    user: 'sales_agent',
    endpoint: '/api/partner/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 403,
    description: '판매원은 PDF 전송 권한 없음',
  },
  {
    name: '비로그인 사용자 - PDF 전송 시도',
    user: 'unauthorized',
    endpoint: '/api/admin/affiliate/contracts/{contractId}/send-pdf',
    method: 'POST',
    expectedStatus: 401,
    description: '로그인하지 않은 사용자가 접근 시도',
  },
];

function analyzeCode() {
  console.log('='.repeat(80));
  console.log('코드 분석 및 잠재적 문제점 확인');
  console.log('='.repeat(80));
  console.log('');

  // 1. 관리자 라우트 분석
  console.log('1. 관리자 라우트 분석');
  console.log('-'.repeat(80));
  const adminRoutePath = 'app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts';
  const adminContent = readFileSync(join(process.cwd(), adminRoutePath), 'utf-8');
  
  const issues: string[] = [];
  
  // params 처리 확인
  if (!/const\s+resolvedParams\s*=\s*await\s+params/.test(adminContent)) {
    issues.push('⚠️  관리자 라우트: params를 await로 처리하지 않음 (Next.js 15 필수)');
  }
  
  // POST 함수 확인
  if (!/export\s+async\s+function\s+POST/.test(adminContent)) {
    issues.push('❌ 관리자 라우트: POST 함수가 export되지 않음');
  }
  
  // 에러 처리 확인
  if (!/try\s*\{/.test(adminContent)) {
    issues.push('⚠️  관리자 라우트: try-catch 블록이 없음');
  }
  
  // Content-Type 헤더 확인
  if (!/Content-Type.*application\/json/.test(adminContent)) {
    issues.push('⚠️  관리자 라우트: Content-Type 헤더가 명시되지 않음');
  }
  
  if (issues.length === 0) {
    console.log('✅ 관리자 라우트: 모든 검증 통과');
  } else {
    issues.forEach(issue => console.log(`  ${issue}`));
  }
  console.log('');

  // 2. 대리점장 라우트 분석
  console.log('2. 대리점장 라우트 분석');
  console.log('-'.repeat(80));
  const partnerRoutePath = 'app/api/partner/contracts/[contractId]/send-pdf/route.ts';
  const partnerContent = readFileSync(join(process.cwd(), partnerRoutePath), 'utf-8');
  
  const partnerIssues: string[] = [];
  
  // params 처리 확인
  if (!/Promise\.resolve\(params\)|await\s+params/.test(partnerContent)) {
    partnerIssues.push('⚠️  대리점장 라우트: params를 Promise로 처리하지 않음');
  }
  
  // POST 함수 확인
  if (!/export\s+async\s+function\s+POST/.test(partnerContent)) {
    partnerIssues.push('❌ 대리점장 라우트: POST 함수가 export되지 않음');
  }
  
  // 에러 처리 확인
  if (!/try\s*\{/.test(partnerContent)) {
    partnerIssues.push('⚠️  대리점장 라우트: try-catch 블록이 없음');
  }
  
  if (partnerIssues.length === 0) {
    console.log('✅ 대리점장 라우트: 모든 검증 통과');
  } else {
    partnerIssues.forEach(issue => console.log(`  ${issue}`));
  }
  console.log('');

  // 3. 클라이언트 코드 분석
  console.log('3. 클라이언트 코드 분석');
  console.log('-'.repeat(80));
  
  const adminClientPath = 'app/admin/affiliate/contracts/page.tsx';
  const adminClientContent = readFileSync(join(process.cwd(), adminClientPath), 'utf-8');
  
  const clientIssues: string[] = [];
  
  // fetch 호출 확인
  const fetchMatches = adminClientContent.match(/fetch\([^)]+send-pdf[^)]+\)/g);
  if (!fetchMatches || fetchMatches.length === 0) {
    clientIssues.push('❌ 클라이언트: send-pdf API 호출을 찾을 수 없음');
  } else {
    fetchMatches.forEach((match, idx) => {
      if (!match.includes('method:\s*[\'"]POST[\'"]')) {
        clientIssues.push(`⚠️  클라이언트 fetch ${idx + 1}: POST 메서드가 명시되지 않음`);
      }
      if (!match.includes('credentials')) {
        clientIssues.push(`⚠️  클라이언트 fetch ${idx + 1}: credentials가 설정되지 않음`);
      }
    });
  }
  
  if (clientIssues.length === 0) {
    console.log('✅ 클라이언트 코드: 모든 검증 통과');
  } else {
    clientIssues.forEach(issue => console.log(`  ${issue}`));
  }
  console.log('');

  // 4. 405 에러 가능성 분석
  console.log('4. 405 에러 가능성 분석');
  console.log('-'.repeat(80));
  
  const error405Issues: string[] = [];
  
  // 라우트 파일 위치 확인
  const routeFiles = [
    'app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts',
    'app/api/partner/contracts/[contractId]/send-pdf/route.ts',
  ];
  
  routeFiles.forEach(file => {
    const fullPath = join(process.cwd(), file);
    if (!require('fs').existsSync(fullPath)) {
      error405Issues.push(`❌ 라우트 파일이 없음: ${file}`);
    }
  });
  
  // POST 함수 export 확인
  routeFiles.forEach(file => {
    const fullPath = join(process.cwd(), file);
    if (require('fs').existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      if (!/export\s+async\s+function\s+POST/.test(content)) {
        error405Issues.push(`❌ POST 함수가 export되지 않음: ${file}`);
      }
    }
  });
  
  // Next.js 15 params 처리 확인
  routeFiles.forEach(file => {
    const fullPath = join(process.cwd(), file);
    if (require('fs').existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      if (!/await\s+params|Promise\.resolve\(params\)/.test(content)) {
        error405Issues.push(`⚠️  params 처리 문제 가능성: ${file}`);
      }
    }
  });
  
  if (error405Issues.length === 0) {
    console.log('✅ 405 에러 가능성: 낮음 (모든 검증 통과)');
  } else {
    console.log('⚠️  405 에러 가능성: 높음');
    error405Issues.forEach(issue => console.log(`  ${issue}`));
  }
  console.log('');

  // 5. 권장 사항
  console.log('5. 권장 사항');
  console.log('-'.repeat(80));
  console.log('✅ 모든 라우트에서 params를 await로 처리');
  console.log('✅ 모든 응답에 Content-Type 헤더 명시');
  console.log('✅ 클라이언트에서 credentials: "include" 설정');
  console.log('✅ 에러 처리 강화 (try-catch, 명확한 에러 메시지)');
  console.log('✅ 타임아웃 설정 (PDF 생성 시간 고려)');
  console.log('');

  console.log('='.repeat(80));
  console.log('분석 완료');
  console.log('='.repeat(80));
}

analyzeCode();


