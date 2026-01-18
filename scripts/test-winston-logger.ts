import logger from '@/lib/logger-v2';

logger.info('Winston logger test', {
  test: true,
  timestamp: new Date().toISOString()
});

logger.error('Test error', {
  error: 'This is a test error',
  stack: new Error().stack
});

console.log('✅ Winston logger is working!');
