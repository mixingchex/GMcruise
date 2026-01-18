/**
 * 래퍼 로거 테스트
 *
 * 사용법:
 *   npx tsx scripts/test-wrapper-logger.ts                    # Winston 비활성화
 *   USE_WINSTON=true npx tsx scripts/test-wrapper-logger.ts  # Winston 활성화
 */
import { log, error, warn, debug } from '@/lib/logger-wrapper';

console.log('=== Wrapper Logger Test ===');
console.log('USE_WINSTON:', process.env.USE_WINSTON || 'false');
console.log('Expected behavior:', process.env.USE_WINSTON === 'true' ? 'Winston logger' : 'console.*');
console.log('');

// 테스트 1: log (console.log 대체)
console.log('Test 1: log()');
log('[Test] This is a log message', { test: true, timestamp: new Date().toISOString() });
console.log('');

// 테스트 2: error (console.error 대체)
console.log('Test 2: error()');
error('[Test] This is an error message', new Error('Test error'));
console.log('');

// 테스트 3: warn (console.warn 대체)
console.log('Test 3: warn()');
warn('[Test] This is a warning message', { severity: 'medium' });
console.log('');

// 테스트 4: debug (console.debug 대체)
console.log('Test 4: debug()');
debug('[Test] This is a debug message', { verbose: true });
console.log('');

// 테스트 5: 여러 인자
console.log('Test 5: Multiple arguments');
log('[Test]', 'Multiple', 'arguments:', { a: 1, b: 2 });
console.log('');

// 테스트 6: 객체 로깅
console.log('Test 6: Object logging');
log('[Test] Complex object:', {
  user: { id: 1, name: 'Test User' },
  payment: { amount: 10000, currency: 'KRW' },
  metadata: { source: 'test', timestamp: Date.now() }
});
console.log('');

console.log('=== Test Complete ===');
console.log('');

if (process.env.USE_WINSTON === 'true') {
  console.log('✅ Winston is ENABLED');
  console.log('Check logs:');
  console.log('  - logs/combined.log (all logs)');
  console.log('  - logs/error.log (errors only)');
  console.log('');
  console.log('Run: tail -f logs/combined.log');
} else {
  console.log('✅ Winston is DISABLED (default)');
  console.log('Using console.* for output (safe mode)');
}
