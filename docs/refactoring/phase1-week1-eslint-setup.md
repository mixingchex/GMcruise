# Phase 1 Week 1: ESLint no-console Rule Setup

## Overview
This document tracks the setup of ESLint enforcement for the no-console rule as part of the 12-month refactoring project.

## Completed Tasks

### 1. ESLint Configuration Updated ✅
**File**: `.eslintrc.json`

Added the following rules:
```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "no-console": ["warn", { "allow": ["error"] }],
    "@typescript-eslint/no-explicit-any": "warn",
    "complexity": ["warn", { "max": 15 }],
    "max-depth": ["warn", 4],
    "max-lines-per-function": ["warn", { "max": 100 }]
  }
}
```

**Key Points**:
- Rule level: `warn` (not `error` - gradual enforcement)
- Exception: `console.error` is allowed (useful for error tracking)
- Additional code quality rules added

### 2. ESLint Ignore Patterns Created ✅
**File**: `.eslintignore`

Excluded directories:
- `scripts/**/*` - Intentional console.log allowed for development
- Test files - `**/*.test.ts`, `**/*.spec.ts`, `__tests__/**`
- Build outputs - `.next/`, `node_modules/`, `build/`, `dist/`
- Backups - `**/*.backup`, `_backup/`

### 3. Progress Tracking Script ✅
**File**: `scripts/count-console-usage.sh`

Usage:
```bash
chmod +x scripts/count-console-usage.sh
./scripts/count-console-usage.sh
```

Output includes:
- Total console statements
- Breakdown by directory
- Breakdown by type (log, error, warn, debug)

### 4. Baseline Count Saved ✅
**File**: `docs/refactoring/console-baseline-week1.txt`

**Initial Stats**:
- **Total**: 11,242 console statements
- **Files affected**: 1,246 files
- **Production code estimate**: ~8,400 statements

Top priorities identified:
1. `app/api/auth/login/route.ts` - 144 statements
2. `components/partner/ReservationForm.tsx` - 142 statements
3. Scripts and test files - ~2,800 statements (excluded from enforcement)

### 5. Pre-commit Hook Prepared ✅
**File**: `.husky/pre-commit`
**File**: `.husky/_/husky.sh`

Status: Created but NOT ENFORCING yet
- Currently only warns about console statements
- Will not block commits (exit 0)
- Can be activated in Week 8

## Weekly Targets

| Week | Target | Reduction |
|------|--------|-----------|
| 1-2  | Baseline + Setup | 0% |
| 3-4  | <8,000 | 28% |
| 5-6  | <4,000 | 64% |
| 7    | <1,000 | 88% |
| 8    | <500 (switch to ERROR) | 95% |
| 12   | <100 | 99% |

## Migration Priority

### Phase 1: API Routes (Week 3-4)
Focus on `app/api/` directory
- Start with authentication routes
- Move to payment routes
- Then affiliate/partner routes

### Phase 2: Libraries (Week 5-6)
Focus on `lib/` directory
- Utility functions
- Scheduler functions
- Business logic

### Phase 3: Components (Week 7)
Focus on `components/` directory
- Admin components
- Partner components
- Public components

### Phase 4: Error Mode (Week 8)
Switch from `warn` to `error`
```json
"no-console": ["error", { "allow": ["error"] }]
```

## How to Use

### For Developers

1. **Check your code**:
```bash
npm run lint
# or
npx eslint . --ext .ts,.tsx
```

2. **See console usage stats**:
```bash
./scripts/count-console-usage.sh
```

3. **Replace console.log**:
```typescript
// ❌ OLD
console.log('User data:', userData);

// ✅ NEW
import { logger } from '@/lib/logger-v2';
logger.info('User data loaded', { userData });
```

4. **For debugging (temporary)**:
```typescript
// During development only - remove before commit
console.error('[DEBUG]', data); // Allowed by ESLint
```

### For Code Reviewers

Check for:
- [ ] No new console.log/warn/debug added
- [ ] Existing console replaced with logger
- [ ] Error handling uses logger.error or console.error

## Next Steps

**Week 2 Tasks**:
1. Set up logger-v2 if not already available
2. Create migration guide for common patterns
3. Start migrating auth routes
4. Track progress with weekly counts

**Week 3 Tasks**:
1. Migrate top 10 offending files
2. Reduce count to <9,000
3. Update progress report

## Resources

- Logger documentation: `docs/logging/logger-v2.md` (if exists)
- ESLint docs: https://eslint.org/docs/rules/no-console
- Project refactoring plan: `docs/refactoring/phase1-logging-analysis.md`

## Questions?

Contact the refactoring team or check the project documentation.

---

**Status**: ✅ Week 1 Complete
**Last Updated**: 2026-01-19
**Next Review**: Week 2
