// scripts/check-env.js
// 환경 변수 확인 스크립트

const requiredEnvVars = [
  'DATABASE_URL',
  'GEMINI_API_KEY',
  'ADMIN_QUICK_PASSWORD',
];

const optionalEnvVars = [
  'KAKAO_REST_API_KEY',
  'KAKAO_ADMIN_KEY',
  'EMAIL_SMTP_PASSWORD',
  'NEXT_PUBLIC_BASE_URL',
  'SESSION_SECRET',
];

let hasErrors = false;

console.log('🔍 환경 변수 확인 중...\n');

// 필수 환경 변수 확인
console.log('필수 환경 변수:');
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`❌ 필수 환경 변수 누락: ${varName}`);
    hasErrors = true;
  } else {
    const value = process.env[varName];
    const masked = value.length > 10
      ? `${value.slice(0, 4)}...${value.slice(-4)}`
      : '***';
    console.log(`✅ ${varName}: ${masked}`);
  }
});

// 선택적 환경 변수 확인
console.log('\n선택적 환경 변수:');
optionalEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.warn(`⚠️  ${varName}: 미설정 (일부 기능 제한될 수 있음)`);
  } else {
    const value = process.env[varName];
    const masked = value.length > 10
      ? `${value.slice(0, 4)}...${value.slice(-4)}`
      : '***';
    console.log(`✅ ${varName}: ${masked}`);
  }
});

// 환경 정보
console.log('\n환경 정보:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || '미설정'}`);
console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV || '로컬'}`);
console.log(`NEXT_PUBLIC_BASE_URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'localhost:3030'}`);

if (hasErrors) {
  console.error('\n❌ 필수 환경 변수가 누락되었습니다!');
  console.error('📝 .env 파일을 확인하거나 Vercel Dashboard에서 환경 변수를 설정하세요.');
  process.exit(1);
} else {
  console.log('\n✅ 모든 필수 환경 변수가 설정되었습니다!');
  process.exit(0);
}
