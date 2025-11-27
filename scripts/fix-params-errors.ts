/**
 * Next.js 15 params 에러 수정 스크립트
 * catch 블록에서 params를 직접 사용하는 부분 수정
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filesToFix = [
  'app/api/admin/affiliate/contracts/[contractId]/route.ts',
  'app/api/admin/affiliate/contracts/[contractId]/reject/route.ts',
  'app/api/admin/affiliate/contracts/[contractId]/approve/route.ts',
];

filesToFix.forEach(filePath => {
  const fullPath = join(process.cwd(), filePath);
  try {
    let content = readFileSync(fullPath, 'utf-8');
    let modified = false;

    // catch 블록에서 params.contractId를 사용하는 경우 수정
    // 먼저 함수 시작 부분에서 resolvedParams를 찾거나 생성
    const hasResolvedParams = /const\s+resolvedParams\s*=\s*await\s+params|const\s+\{\s*contractId/.test(content);
    
    if (!hasResolvedParams) {
      // 함수 시작 부분에 resolvedParams 추가
      const functionMatch = content.match(/(export\s+async\s+function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?)(try\s*\{)/);
      if (functionMatch) {
        const beforeTry = functionMatch[1];
        const afterTry = functionMatch[2];
        const paramsMatch = beforeTry.match(/\{\s*params\s*\}:\s*\{\s*params:\s*Promise<[^>]+>\s*\}/);
        if (paramsMatch) {
          const newContent = beforeTry.replace(
            /(\{\s*params\s*\}:\s*\{\s*params:\s*Promise<[^>]+>\s*\})/,
            '$1\n    const resolvedParams = await params;'
          ) + afterTry;
          content = content.replace(functionMatch[0], newContent);
          modified = true;
        }
      }
    }

    // catch 블록에서 params.contractId를 resolvedParams.contractId로 변경
    const catchBlockRegex = /(catch\s*\([^)]*\)\s*\{[\s\S]*?)(params\.contractId)/g;
    if (catchBlockRegex.test(content)) {
      content = content.replace(/params\.contractId/g, 'resolvedParams.contractId');
      modified = true;
    }

    if (modified) {
      writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`⏭️  Skipped (no changes needed): ${filePath}`);
    }
  } catch (error: any) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log('\n✅ All files processed!');

