/**
 * 래퍼 로거 마이그레이션 테스트 파일
 */

export function testFunction() {
  // 다양한 console 사용 패턴 테스트
  console.log('Simple log message');
  console.error('Error message', new Error('Test'));
  console.warn('Warning message');
  console.debug('Debug message');
  console.info('Info message (should become log)');

  // 객체와 함께
  console.log('[Test] With prefix:', { key: 'value' });

  // 여러 인자
  console.error('Multiple', 'arguments', 123, { test: true });

  // Template literal
  const userId = '123';
  console.log(`User ${userId} logged in`);

  // 조건부
  if (Math.random() > 0.5) {
    console.warn('Random warning');
  }

  // Try-catch
  try {
    throw new Error('Test');
  } catch (error) {
    console.error('Caught error:', error);
  }
}
