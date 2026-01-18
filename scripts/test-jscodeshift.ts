// Sample file to test jscodeshift transformation
// This file intentionally uses console.* for testing migration

export function testFunction() {
  console.log('This is a test log');
  console.error('This is a test error');
  console.warn('This is a test warning');
  console.debug('This is a test debug');
  console.info('This is a test info');

  console.log('Multiple args:', { key: 'value' }, 123);

  const data = { user: 'test' };
  console.log('[Test] Prefixed log:', data);
}

export async function paymentWebhookSimulation() {
  try {
    console.log('[Payment] Processing webhook');

    const result = await processPayment();

    if (!result.success) {
      console.error('[Payment] Webhook processing failed:', result.error);
      return;
    }

    console.log('[Payment] Webhook processed successfully:', result.data);
  } catch (error) {
    console.error('[Payment] Exception in webhook:', error);
  }
}

function processPayment() {
  console.debug('[Payment] Debug: Starting payment processing');
  console.warn('[Payment] Warning: This is a test warning');

  return Promise.resolve({
    success: true,
    data: { orderId: '12345' }
  });
}

// Edge cases
export const EdgeCases = {
  nestedConsole: () => {
    if (true) {
      console.log('Nested log');
      if (false) {
        console.error('Double nested error');
      }
    }
  },

  templateLiterals: () => {
    const userId = 123;
    const action = 'login';
    console.log(`[Auth] User ${userId} performed ${action}`);
  },

  objectSpread: () => {
    const context = { requestId: 'abc', userId: 456 };
    console.log('[API]', { ...context, action: 'request' });
  }
};
