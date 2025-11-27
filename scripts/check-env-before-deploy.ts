#!/usr/bin/env tsx
/**
 * 배포 전 필수 환경변수 검증 스크립트
 * 
 * 사용법:
 *   npm run check:env
 *   또는
 *   npx tsx scripts/check-env-before-deploy.ts
 */

const requiredEnvVars = [
  'GEMINI_API_KEY',
  'GOOGLE_DRIVE_CLIENT_ID',
  'GOOGLE_DRIVE_CLIENT_SECRET',
  'DATABASE_URL',
  'NEXT_PUBLIC_BASE_URL',
];

const optionalEnvVars = [
  'ALIGO_API_KEY', // 각 대리점장/판매원이 개별 설정하므로 선택사항
  'ALIGO_SENDER_PHONE', // 각 대리점장/판매원이 개별 설정하므로 선택사항
  'KAKAO_API_KEY', // 카카오톡 기능 제거로 더 이상 필요 없음
];

const missing: string[] = [];
const warnings: string[] = [];

console.log('🔍 환경변수 검증 시작...\n');

// 필수 환경변수 확인
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missing.push(varName);
    console.error(`❌ 누락: ${varName}`);
  } else {
    // 값이 있는 경우 마스킹하여 표시 (보안)
    const value = process.env[varName] || '';
    const masked = value.length > 10 
      ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
      : '***';
    console.log(`✅ 설정됨: ${varName} = ${masked}`);
  }
});

// 선택사항 환경변수 확인 (경고만)
optionalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    warnings.push(varName);
  }
});

console.log('\n' + '='.repeat(50));

if (missing.length > 0) {
  console.error('\n❌ 배포 불가: 필수 환경변수가 누락되었습니다.');
  console.error('\n누락된 환경변수:');
  missing.forEach(v => console.error(`  - ${v}`));
  console.error('\n.env 파일 또는 배포 환경에 다음 환경변수를 설정해주세요:');
  missing.forEach(v => console.error(`  ${v}=your_value_here`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('\n⚠️  경고: 다음 환경변수가 설정되지 않았습니다 (선택사항):');
  warnings.forEach(v => console.warn(`  - ${v}`));
  console.warn('\n참고: 이 환경변수들은 선택사항이지만, 관련 기능이 작동하지 않을 수 있습니다.');
}

console.log('\n✅ 모든 필수 환경변수가 설정되어 있습니다!');
console.log('\n📋 배포 전 추가 확인사항:');
console.log('  1. Google Drive 서비스 계정 권한 확인');
console.log('  2. Gemini API 키 유효성 확인');
console.log('  3. 데이터베이스 연결 테스트');
console.log('  4. 각 대리점장/판매원에게 알리고 설정 안내');
console.log('\n🚀 배포 준비 완료!');

process.exit(0);


