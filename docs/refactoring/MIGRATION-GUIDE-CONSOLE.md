# Console.log Migration Guide

Quick reference for migrating from console.log to structured logging.

## Quick Replace Patterns

### 1. Simple Info Logging
```typescript
// ❌ Before
console.log('User logged in:', userId);

// ✅ After
import { logger } from '@/lib/logger-v2';
logger.info('User logged in', { userId });
```

### 2. Error Logging
```typescript
// ❌ Before
console.error('Payment failed:', error);

// ✅ After - Option 1 (temporary, allowed by ESLint)
console.error('[Payment Error]', error);

// ✅ After - Option 2 (preferred)
import { logger } from '@/lib/logger-v2';
logger.error('Payment failed', { error: error.message, stack: error.stack });
```

### 3. Debug Logging
```typescript
// ❌ Before
console.log('Debug - API response:', response);

// ✅ After
import { logger } from '@/lib/logger-v2';
logger.debug('API response received', { response });
```

### 4. Warning Logging
```typescript
// ❌ Before
console.warn('Deprecated function used');

// ✅ After
import { logger } from '@/lib/logger-v2';
logger.warn('Deprecated function used', {
  function: 'oldFunction',
  replacement: 'newFunction'
});
```

### 5. API Route Logging
```typescript
// ❌ Before
export async function POST(request: NextRequest) {
  console.log('Request received');
  const data = await request.json();
  console.log('Data:', data);
  // ...
}

// ✅ After
import { logger } from '@/lib/logger-v2';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info('API request received', {
    route: '/api/example',
    requestId
  });

  const data = await request.json();
  logger.debug('Request data parsed', { requestId, dataKeys: Object.keys(data) });

  try {
    // ... business logic
    logger.info('Request completed successfully', { requestId });
  } catch (error) {
    logger.error('Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
```

### 6. Component Logging
```typescript
// ❌ Before
useEffect(() => {
  console.log('Component mounted');
  console.log('Props:', props);
}, []);

// ✅ After
import { logger } from '@/lib/logger-v2';

useEffect(() => {
  logger.debug('Component mounted', {
    component: 'MyComponent',
    propsKeys: Object.keys(props)
  });
}, []);
```

### 7. Performance Logging
```typescript
// ❌ Before
const start = Date.now();
// ... operation
console.log('Operation took:', Date.now() - start, 'ms');

// ✅ After
import { logger } from '@/lib/logger-v2';

const start = Date.now();
// ... operation
const duration = Date.now() - start;
logger.info('Operation completed', {
  operation: 'dataProcessing',
  durationMs: duration
});
```

## When to Use Each Log Level

### logger.error()
- Exceptions and errors
- Failed API calls
- Database errors
- Payment failures
- Authentication failures

### logger.warn()
- Deprecated function usage
- Recoverable errors
- Performance issues
- Missing optional data
- Rate limit warnings

### logger.info()
- Successful operations
- User actions
- State changes
- Business events
- API request/response summaries

### logger.debug()
- Development debugging
- Detailed data inspection
- Flow tracing
- Performance metrics
- Internal state changes

## Best Practices

### 1. Include Context
```typescript
// ❌ Poor
logger.info('User updated');

// ✅ Good
logger.info('User profile updated', {
  userId,
  fields: ['email', 'name'],
  timestamp: new Date().toISOString()
});
```

### 2. Don't Log Sensitive Data
```typescript
// ❌ NEVER DO THIS
logger.info('User login', { password: userPassword });

// ✅ Do this
logger.info('User login attempt', {
  userId,
  method: 'password',
  success: true
});
```

### 3. Use Structured Data
```typescript
// ❌ String concatenation
logger.info(`User ${userId} purchased product ${productId}`);

// ✅ Structured object
logger.info('Product purchased', { userId, productId, amount });
```

### 4. Consistent Naming
```typescript
// Use consistent field names across your app
logger.info('Event', {
  userId,      // Always use camelCase
  productCode, // Be consistent
  timestamp: new Date().toISOString()
});
```

## Migration Checklist

For each file you migrate:

- [ ] Replace `console.log` with `logger.info` or `logger.debug`
- [ ] Replace `console.warn` with `logger.warn`
- [ ] Replace `console.error` with `logger.error` (or keep as console.error temporarily)
- [ ] Add import: `import { logger } from '@/lib/logger-v2';`
- [ ] Convert string messages to structured objects
- [ ] Remove sensitive data from logs
- [ ] Test that logging still works
- [ ] Run `npm run lint` to verify

## Common Patterns by File Type

### API Routes (`app/api/**/route.ts`)
Priority: HIGH
Focus on: Error handling, request/response logging

### Libraries (`lib/**/*.ts`)
Priority: HIGH
Focus on: Business logic, data processing

### Components (`components/**/*.tsx`)
Priority: MEDIUM
Focus on: User interactions, state changes

### Scripts (`scripts/**/*.ts`)
Priority: LOW (excluded from enforcement)
Can keep console.log for now

## Questions?

- Check existing migrated files for examples
- Review `docs/refactoring/phase1-week1-eslint-setup.md`
- Ask the refactoring team

---

**Remember**: The goal is better observability, not just finding & replacing!
