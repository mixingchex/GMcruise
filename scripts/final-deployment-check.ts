/**
 * 최종 배포 전 점검 스크립트
 * 계약서 관련 모든 기능 최종 확인
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: CheckResult[] = [];

function addResult(category: string, name: string, passed: boolean, error?: string) {
  results.push({ category, name, passed, error });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   에러: ${error}`);
  }
}

async function runFinalCheck() {
  console.log('='.repeat(80));
  console.log('최종 배포 전 점검 - 계약서 관련 기능');
  console.log('='.repeat(80));
  console.log('');

  // 1. 핵심 API 파일 존재 확인
  console.log('1. 핵심 API 파일 존재 확인');
  console.log('-'.repeat(80));
  
  const criticalFiles = [
    'app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts',
    'app/api/admin/affiliate/contracts/[contractId]/complete/route.ts',
    'app/api/partner/contracts/[contractId]/send-pdf/route.ts',
    'app/api/partner/contracts/[contractId]/complete/route.ts',
    'app/api/affiliate/contracts/upload/route.ts',
    'app/api/affiliate/contracts/[contractId]/route.ts',
  ];

  criticalFiles.forEach(file => {
    const exists = existsSync(join(process.cwd(), file));
    addResult('파일 존재', file.split('/').pop() || file, exists, exists ? undefined : '파일이 없습니다');
  });
  console.log('');

  // 2. Next.js 15 params 처리 확인
  console.log('2. Next.js 15 params 처리 확인');
  console.log('-'.repeat(80));
  
  const apiFiles = [
    'app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts',
    'app/api/admin/affiliate/contracts/[contractId]/complete/route.ts',
    'app/api/partner/contracts/[contractId]/send-pdf/route.ts',
    'app/api/partner/contracts/[contractId]/complete/route.ts',
  ];

  apiFiles.forEach(file => {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
    const hasAwaitParams = /await\s+params|await\s+Promise\.resolve\(params\)|const\s+resolvedParams\s*=\s*await/.test(content);
    const noDirectParams = !/params\.contractId(?!\s*=\s*await)/.test(content);
    const passed = hasAwaitParams && noDirectParams;
      addResult('params 처리', file.split('/').pop() || file, passed, 
        passed ? undefined : 'params를 await로 처리해야 합니다');
    }
  });
  console.log('');

  // 3. Content-Type 헤더 확인
  console.log('3. Content-Type 헤더 확인');
  console.log('-'.repeat(80));
  
  apiFiles.forEach(file => {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      const hasContentType = /Content-Type.*application\/json/.test(content);
      addResult('Content-Type', file.split('/').pop() || file, hasContentType,
        hasContentType ? undefined : 'Content-Type 헤더가 명시되어야 합니다');
    }
  });
  console.log('');

  // 4. 에러 처리 확인
  console.log('4. 에러 처리 확인');
  console.log('-'.repeat(80));
  
  apiFiles.forEach(file => {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      const hasTryCatch = /try\s*\{/.test(content) && /catch\s*\(/.test(content);
      addResult('에러 처리', file.split('/').pop() || file, hasTryCatch,
        hasTryCatch ? undefined : 'try-catch 블록이 필요합니다');
    }
  });
  console.log('');

  // 5. PDF 이메일 전송 확인
  console.log('5. PDF 이메일 전송 확인');
  console.log('-'.repeat(80));
  
  const emailFiles = [
    'app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts',
    'app/api/admin/affiliate/contracts/[contractId]/complete/route.ts',
    'app/api/partner/contracts/[contractId]/send-pdf/route.ts',
    'app/api/partner/contracts/[contractId]/complete/route.ts',
  ];

  emailFiles.forEach(file => {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      const hasEmailSend = /sendContractPDFByEmail/.test(content);
      addResult('이메일 전송', file.split('/').pop() || file, hasEmailSend,
        hasEmailSend ? undefined : 'sendContractPDFByEmail 함수 호출이 필요합니다');
    }
  });
  console.log('');

  // 6. 결과 요약
  console.log('='.repeat(80));
  console.log('최종 점검 결과');
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
    process.exit(1);
  } else {
    console.log('\n✅ 모든 점검 통과!');
    console.log('\n✅ 배포 준비 완료!');
    console.log('\n확인 완료 항목:');
    console.log('  ✅ 모든 핵심 API 파일 존재');
    console.log('  ✅ Next.js 15 params 처리');
    console.log('  ✅ Content-Type 헤더 명시');
    console.log('  ✅ 에러 처리 완료');
    console.log('  ✅ PDF 이메일 전송 구현');
    process.exit(0);
  }
}

runFinalCheck().catch((error) => {
  console.error('점검 실행 중 오류:', error);
  process.exit(1);
});

