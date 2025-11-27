// scripts/test-redis-connection.ts
// Upstash Redis 연결 테스트 스크립트

import { config } from 'dotenv';
import { resolve } from 'path';

// .env 파일 로드
config({ path: resolve(process.cwd(), '.env') });

import { Redis } from '@upstash/redis';

const restUrl = process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisUrl = process.env.REDIS_URL;

console.log('\n=== Upstash Redis 연결 진단 ===\n');

// 1. 환경 변수 확인
console.log('1️⃣ 환경 변수 확인:');
console.log('   UPSTASH_REDIS_REST_URL:', restUrl ? `✅ 설정됨 (${restUrl.substring(0, 40)}...)` : '❌ 설정되지 않음');
console.log('   UPSTASH_REDIS_REST_TOKEN:', restToken ? `✅ 설정됨 (길이: ${restToken.length}자)` : '❌ 설정되지 않음');
console.log('   REDIS_URL:', redisUrl ? `⚠️  설정됨 (로컬 Redis 사용 시 충돌 가능)` : '✅ 설정되지 않음');

// 2. URL 형식 검증
console.log('\n2️⃣ URL 형식 검증:');
if (restUrl) {
  if (restUrl.startsWith('https://')) {
    console.log('   ✅ URL 형식 올바름 (https://로 시작)');
  } else {
    console.log('   ❌ URL 형식 오류: https://로 시작해야 합니다');
    console.log('   현재:', restUrl.substring(0, 50));
  }
  
  // URL 길이 확인
  if (restUrl.length < 20) {
    console.log('   ⚠️  URL이 너무 짧습니다 (잘못된 값일 수 있음)');
  }
} else {
  console.log('   ⚠️  URL이 설정되지 않음');
}

// 3. 토큰 형식 검증
console.log('\n3️⃣ 토큰 형식 검증:');
if (restToken) {
  // Upstash 토큰은 보통 40-100자 정도
  if (restToken.length < 20) {
    console.log('   ⚠️  토큰이 너무 짧습니다 (잘못된 값일 수 있음)');
  } else if (restToken.length > 200) {
    console.log('   ⚠️  토큰이 너무 깁니다 (잘못된 값일 수 있음)');
  } else {
    console.log('   ✅ 토큰 길이 정상');
  }
  
  // 공백 확인
  if (restToken.includes(' ') || restToken.includes('\n') || restToken.includes('\t')) {
    console.log('   ❌ 토큰에 공백이 포함되어 있습니다!');
    console.log('   💡 .env 파일에서 토큰 앞뒤 공백을 제거하세요');
  } else {
    console.log('   ✅ 토큰에 공백 없음');
  }
  
  // 토큰 시작/끝 확인
  if (restToken.startsWith(' ') || restToken.endsWith(' ')) {
    console.log('   ❌ 토큰 앞뒤에 공백이 있습니다!');
    console.log('   💡 .env 파일에서 토큰을 따옴표로 감싸거나 공백을 제거하세요');
  }
} else {
  console.log('   ⚠️  토큰이 설정되지 않음');
}

// 4. 실제 연결 테스트
console.log('\n4️⃣ 실제 연결 테스트:');
if (!restUrl || !restToken) {
  console.log('   ⚠️  환경 변수가 설정되지 않아 연결 테스트를 건너뜁니다');
  console.log('\n💡 해결 방법:');
  console.log('   1. .env 파일에 다음을 추가하세요:');
  console.log('      UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io');
  console.log('      UPSTASH_REDIS_REST_TOKEN=your-token-here');
  console.log('   2. Upstash 콘솔에서 REST URL과 Token을 복사하세요');
  console.log('   3. 서버를 재시작하세요');
  process.exit(1);
}

try {
  const redis = new Redis({
    url: restUrl,
    token: restToken,
  });

  console.log('   🔄 연결 시도 중...');
  
  // Ping 테스트
  const pingResult = await Promise.race([
    redis.ping(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
    )
  ]);
  
  console.log('   ✅ 연결 성공!');
  console.log('   Ping 결과:', pingResult);
  
  // 간단한 읽기/쓰기 테스트
  console.log('\n5️⃣ 읽기/쓰기 테스트:');
  const testKey = 'test:connection:' + Date.now();
  const testValue = 'Hello Upstash!';
  
  await redis.set(testKey, testValue, { ex: 10 }); // 10초 TTL
  console.log('   ✅ 쓰기 성공');
  
  const readValue = await redis.get(testKey);
  if (readValue === testValue) {
    console.log('   ✅ 읽기 성공');
  } else {
    console.log('   ❌ 읽기 실패: 값이 일치하지 않음');
  }
  
  await redis.del(testKey);
  console.log('   ✅ 삭제 성공');
  
  console.log('\n🎉 모든 테스트 통과! Upstash Redis가 정상적으로 작동합니다.\n');
  
} catch (error: any) {
  console.log('   ❌ 연결 실패!');
  console.log('\n📋 에러 상세 정보:');
  console.log('   메시지:', error?.message || '알 수 없는 오류');
  console.log('   상태 코드:', error?.status || error?.statusCode || 'N/A');
  console.log('   응답:', error?.response || error?.data || 'N/A');
  
  // 에러 타입별 해결 방법
  console.log('\n🔧 에러별 해결 방법:');
  
  if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
    console.log('   ❌ 401 Unauthorized (인증 실패)');
    console.log('   💡 해결 방법:');
    console.log('      1. Upstash 콘솔에서 토큰을 다시 확인하세요');
    console.log('      2. 토큰이 만료되었을 수 있습니다. 새로 생성하세요');
    console.log('      3. .env 파일에서 토큰 앞뒤 공백을 제거하세요');
    console.log('      4. 토큰이 전체 복사되었는지 확인하세요');
  } else if (error?.status === 404 || error?.message?.includes('404')) {
    console.log('   ❌ 404 Not Found (URL 오류)');
    console.log('   💡 해결 방법:');
    console.log('      1. Upstash 콘솔에서 REST URL을 다시 확인하세요');
    console.log('      2. URL이 https://로 시작하는지 확인하세요');
    console.log('      3. URL에 오타가 없는지 확인하세요');
  } else if (error?.message?.includes('timeout')) {
    console.log('   ❌ Connection Timeout (네트워크 문제)');
    console.log('   💡 해결 방법:');
    console.log('      1. 인터넷 연결을 확인하세요');
    console.log('      2. 방화벽이 Upstash를 차단하지 않는지 확인하세요');
    console.log('      3. 잠시 후 다시 시도하세요');
  } else {
    console.log('   ❌ 기타 오류');
    console.log('   💡 해결 방법:');
    console.log('      1. Upstash 콘솔에서 Redis 인스턴스 상태를 확인하세요');
    console.log('      2. 환경 변수가 올바르게 설정되었는지 확인하세요');
    console.log('      3. 서버를 재시작하세요');
  }
  
  console.log('\n📝 확인 사항:');
  console.log('   1. .env 파일 위치: 프로젝트 루트 디렉토리');
  console.log('   2. 환경 변수 형식:');
  console.log('      UPSTASH_REDIS_REST_URL=https://xxx.upstash.io');
  console.log('      UPSTASH_REDIS_REST_TOKEN=xxx');
  console.log('   3. 따옴표 사용: 일반적으로 필요 없음 (공백이 있으면 따옴표 사용)');
  console.log('   4. 서버 재시작: 환경 변수 변경 후 반드시 재시작 필요\n');
  
  process.exit(1);
}

