#!/usr/bin/env node
/**
 * 관리자 패널 메뉴 항목과 실제 페이지 파일 존재 여부 확인 스크립트
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 관리자 패널 메뉴 항목 목록
const menuItems = [
  '/admin/apis',
  '/admin/dashboard',
  '/admin/pwa-stats',
  '/admin/messages',
  '/admin/team-dashboard-messages',
  '/admin/scheduled-messages',
  '/admin/customer-groups',
  '/admin/manual-passport-request',
  '/admin/passport-request',
  '/admin/data-analysis',
  '/admin/feedback',
  '/admin/documents',
  '/admin/assign-trip',
  '/admin/mall',
  '/admin/images',
  '/admin/products',
  '/admin/inquiries',
  '/admin/mall-analytics',
  '/admin/affiliate/products',
  '/admin/affiliate/profiles',
  '/admin/affiliate/contracts',
  '/admin/affiliate/payment-pages',
  '/admin/affiliate/mall',
  '/admin/affiliate/sales-confirmation/pending',
  '/admin/affiliate/adjustments',
  '/admin/affiliate/documents',
  '/admin/affiliate/statements',
  '/admin/affiliate/refunds',
  '/admin/system/status',
  '/admin/system/google-drive',
  '/admin/seo',
  '/admin/affiliate/links',
  '/admin/affiliate/test-simulation',
  '/admin/affiliate/team-dashboard',
  '/admin/affiliate/settlements',
  '/admin/affiliate/agent-dashboard',
  '/admin/pages',
  '/admin/landing-pages',
  '/admin/chat-bot',
  '/admin/community',
  '/admin/community-bot',
  '/admin/cruisedot-news',
  '/admin/marketing/dashboard',
  '/admin/funnel',
  '/admin/settings',
  '/admin/customers',
  '/admin/admin-panel-admins',
];

// 고객 관리 메뉴 항목
const customerMenuItems = [
  '/admin/customers',
  '/admin/affiliate/customers',
  '/admin/marketing/customers',
];

const allMenuItems = [...menuItems, ...customerMenuItems];

function checkPageExists(route) {
  // 쿼리 파라미터 제거
  const cleanRoute = route.split('?')[0];
  
  // 경로 변환: /admin/xxx -> app/admin/xxx/page.tsx
  const projectRoot = path.resolve(__dirname, '..');
  const pagePath = path.join(projectRoot, 'app', cleanRoute, 'page.tsx');
  const pagePathAlt = path.join(projectRoot, 'app', cleanRoute, 'page.ts');
  
  return fs.existsSync(pagePath) || fs.existsSync(pagePathAlt);
}

console.log('🔍 관리자 패널 페이지 존재 여부 확인 중...\n');

const missing = [];
const existing = [];

allMenuItems.forEach(route => {
  const exists = checkPageExists(route);
  if (exists) {
    existing.push(route);
    console.log(`✅ ${route}`);
  } else {
    missing.push(route);
    console.log(`❌ ${route} - 페이지 파일 없음`);
  }
});

console.log(`\n📊 결과:`);
console.log(`✅ 존재: ${existing.length}개`);
console.log(`❌ 없음: ${missing.length}개`);

if (missing.length > 0) {
  console.log(`\n⚠️  다음 페이지들이 없습니다:`);
  missing.forEach(route => console.log(`   - ${route}`));
  process.exit(1);
} else {
  console.log(`\n✨ 모든 페이지가 존재합니다!`);
  process.exit(0);
}

