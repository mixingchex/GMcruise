# Console to Winston Logger Migration

**Phase 1 Week 1** of 12-month refactoring project

## Overview

Automated migration of 82,188 console statements across 976 files using jscodeshift.

### Risk Level
⚠️ **HIGH** - This touches payment-critical code

### Target
- **Total console statements**: 82,188
- **Total files**: 976 (excluding scripts/)
- **Tool**: jscodeshift (Facebook's codemod tool)

## Quick Start

### 1. Install Dependencies

```bash
bash scripts/setup-jscodeshift.sh
```

This will:
- Install jscodeshift and types
- Validate installation
- Run test transformation on sample file

### 2. Preview Changes (Dry Run)

```bash
# Preview Tier 1 (Payment + Auth APIs)
bash scripts/run-migration.sh --dry

# Preview single file
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  app/api/payment/webhook/route.ts \
  --dry --print --parser=tsx
```

### 3. Apply Migration

```bash
# Apply to Tier 1 only (RECOMMENDED for first run)
bash scripts/run-migration.sh

# Custom file pattern
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/api/payment/**/*.ts" \
  --parser=tsx
```

## Transformations

| Before | After |
|--------|-------|
| `console.log()` | `logger.info()` |
| `console.error()` | `logger.error()` |
| `console.warn()` | `logger.warn()` |
| `console.debug()` | `logger.debug()` |
| `console.info()` | `logger.info()` |

### Import Statement

Automatically adds:
```typescript
import logger from '@/lib/logger-v2';
```

## Files

### Main Transformer
`scripts/migrate-console-to-winston.js`
- jscodeshift codemod
- Handles all console.* methods
- Preserves arguments and context
- Adds imports automatically

### Test File
`scripts/test-jscodeshift.ts`
- Sample file for testing transformations
- Contains edge cases
- Use for validation before production migration

### Migration Script
`scripts/run-migration.sh`
- Batch migration helper
- Tier 1: Payment + Auth APIs
- Safety prompts
- Dry-run support

### Setup Script
`scripts/setup-jscodeshift.sh`
- Installs dependencies
- Validates setup
- Runs test transformation

## Migration Tiers

### Tier 1: Critical APIs (Priority 1) ⚠️
**10 files** - MUST be tested thoroughly

- Payment APIs (9 files):
  - `app/api/payment/**/*.ts`
  - webhook, checkout, check-status, etc.
- Auth API (1 file):
  - `app/api/auth/login/route.ts`

**Command:**
```bash
bash scripts/run-migration.sh
```

### Tier 2: Business Logic APIs (Priority 2)
**~50 files**

- Affiliate APIs
- Reservation APIs
- Contract APIs

**Command:**
```bash
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/api/{affiliate,reservation,contract}/**/*.ts" \
  --parser=tsx --dry
```

### Tier 3: UI Components (Priority 3)
**~200 files**

- Client components
- Server components
- Layouts

**Command:**
```bash
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/**/*.tsx" \
  --parser=tsx --dry
```

### Tier 4: Utilities & Lib (Priority 4)
**~100 files**

- `lib/**/*.ts`
- `utils/**/*.ts`

### Tier 5: Remaining Files (Priority 5)
**~616 files**

- All other files

## Testing Checklist

After migration, test the following:

### Tier 1 Critical Tests ✅
- [ ] Payment webhook processing
- [ ] Checkout flow
- [ ] Payment status check
- [ ] Login flow
- [ ] Session management

### Commands
```bash
# Type check
pnpm typecheck

# Unit tests
pnpm test:unit

# Critical flow tests
pnpm test:critical

# Build test
pnpm build
```

## Safety Features

### Dry Run
Always preview changes first:
```bash
bash scripts/run-migration.sh --dry
```

### Confirmation Prompts
Script will ask for confirmation before modifying critical files.

### No Changes Return
If no console statements found, returns `null` (no file modification).

### Import Deduplication
Checks if `logger` import already exists before adding.

## Edge Cases Handled

### Multiple Arguments
```typescript
// Before
console.log('User action:', action, { userId, timestamp });

// After
logger.info('User action:', action, { userId, timestamp });
```

### Template Literals
```typescript
// Before
console.log(`[Auth] User ${userId} logged in`);

// After
logger.info(`[Auth] User ${userId} logged in`);
```

### Nested Calls
```typescript
// Before
if (error) {
  console.error('Failed:', error);
}

// After
if (error) {
  logger.error('Failed:', error);
}
```

### Object Spread
```typescript
// Before
console.log('[API]', { ...context, action: 'request' });

// After
logger.info('[API]', { ...context, action: 'request' });
```

## Troubleshooting

### Parser Errors
Use `--parser=tsx` for TypeScript/React files:
```bash
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  file.tsx \
  --parser=tsx
```

### No Changes Detected
Check if file already uses logger or has no console statements:
```bash
grep -n "console\." file.ts
```

### Import Path Issues
Ensure `@/lib/logger-v2` exists and is accessible.

### Permission Denied
Make scripts executable:
```bash
chmod +x scripts/run-migration.sh
chmod +x scripts/setup-jscodeshift.sh
```

## Validation Steps

### Before Migration
1. Backup database
2. Create feature branch: `git checkout -b feat/migrate-console-to-winston`
3. Ensure all tests pass

### During Migration
1. Run dry-run first
2. Review output carefully
3. Start with Tier 1 only
4. Test thoroughly before next tier

### After Migration
1. Review changes: `git diff`
2. Run type check: `pnpm typecheck`
3. Run tests: `pnpm test:critical`
4. Test payment flows manually
5. Commit: `git commit -m "feat: migrate Tier 1 console to Winston logger"`

## Rollback

If issues occur:
```bash
# Discard changes
git checkout .

# Or revert commit
git revert HEAD
```

## Progress Tracking

| Tier | Files | Status | Date |
|------|-------|--------|------|
| Tier 1 | 10 | 🔄 Pending | - |
| Tier 2 | ~50 | ⏳ Waiting | - |
| Tier 3 | ~200 | ⏳ Waiting | - |
| Tier 4 | ~100 | ⏳ Waiting | - |
| Tier 5 | ~616 | ⏳ Waiting | - |

## Success Criteria

- [x] jscodeshift installed
- [x] migrate-console-to-winston.js created
- [x] Test file transforms correctly (dry-run)
- [x] Import statement added automatically
- [x] run-migration.sh script created
- [ ] No syntax errors in transformed code
- [ ] All tests pass
- [ ] Payment flows work correctly

## Resources

- [jscodeshift GitHub](https://github.com/facebook/jscodeshift)
- [jscodeshift Documentation](https://github.com/facebook/jscodeshift/wiki)
- [AST Explorer](https://astexplorer.net/) - Test transformations online

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the test file output
3. Run with `--dry --print` to see transformation output
4. Check jscodeshift documentation
