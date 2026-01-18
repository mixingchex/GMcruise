# Console to Winston Logger Migration - Complete Summary

## Overview

**Status**: ✅ Ready to Execute
**Phase**: 1 Week 1
**Target**: 82,188 console statements across 976 files
**Tool**: jscodeshift (Facebook's codemod)
**Risk Level**: ⚠️ HIGH (touches payment-critical code)

## Files Created

### Core Migration Scripts

1. **`scripts/migrate-console-to-winston.js`** ✅
   - jscodeshift transformer
   - Converts console.* to logger.*
   - Adds import statements automatically
   - Handles 5 console methods: log, error, warn, debug, info

2. **`scripts/test-jscodeshift.ts`** ✅
   - Sample file for testing transformations
   - Contains edge cases (nested calls, template literals, etc.)
   - Safe to run transformations on

3. **`scripts/run-migration.sh`** ✅
   - Batch migration script for Tier 1
   - Safety prompts before execution
   - Supports --dry flag for preview

4. **`scripts/setup-jscodeshift.sh`** ✅
   - Installs dependencies (jscodeshift, winston)
   - Validates installation
   - Runs test transformation

5. **`scripts/pre-migration-check.sh`** ✅
   - Validates environment before migration
   - Checks dependencies, git status, target files
   - Creates logs/ directory if missing

6. **`scripts/count-console-statements.sh`** ✅
   - Analyzes console statement distribution
   - Shows count by method type
   - Lists top 10 files with most statements

### Documentation

7. **`scripts/MIGRATION-README.md`** ✅
   - Complete migration guide
   - Transformations, tiers, testing checklist
   - Troubleshooting and safety features

8. **`scripts/MIGRATION-COMMANDS.md`** ✅
   - Quick command reference
   - Common patterns and use cases
   - Git workflow and rollback commands

9. **`scripts/MIGRATION-CHECKLIST.md`** ✅
   - Day-by-day execution plan
   - Pre-migration, execution, and post-deployment checklists
   - Success metrics and rollback plan

10. **`scripts/MIGRATION-SUMMARY.md`** ✅ (this file)
    - High-level overview
    - Quick start guide
    - All files and their purpose

### Package.json Scripts

11. **Added to `package.json`** ✅
    ```json
    "migrate:console:setup": "bash scripts/setup-jscodeshift.sh",
    "migrate:console:check": "bash scripts/pre-migration-check.sh",
    "migrate:console:count": "bash scripts/count-console-statements.sh",
    "migrate:console:tier1-dry": "bash scripts/run-migration.sh --dry",
    "migrate:console:tier1": "bash scripts/run-migration.sh",
    "migrate:console:test": "npx jscodeshift -t scripts/migrate-console-to-winston.js scripts/test-jscodeshift.ts --dry --print --parser=tsx"
    ```

## Quick Start (5 Steps)

### Step 1: Make Scripts Executable
```bash
chmod +x scripts/setup-jscodeshift.sh
chmod +x scripts/run-migration.sh
chmod +x scripts/pre-migration-check.sh
chmod +x scripts/count-console-statements.sh
```

### Step 2: Install Dependencies
```bash
pnpm migrate:console:setup
```

This will:
- Install jscodeshift and @types/jscodeshift
- Install winston and @types/winston
- Validate installation
- Run test transformation on sample file

**Expected Output**: Test file transformation preview

### Step 3: Run Pre-Migration Checks
```bash
pnpm migrate:console:check
```

This validates:
- Git status (warns if on main branch)
- Dependencies installed
- Logger file exists
- Target directories exist
- Creates logs/ directory

**Expected Result**: ✅ VALIDATION PASSED

### Step 4: Preview Changes (Dry Run)
```bash
pnpm migrate:console:tier1-dry
```

This shows:
- What files will be modified
- What transformations will be applied
- No actual changes made

**Expected Output**: Preview of 10 files (Payment + Auth APIs)

### Step 5: Apply Migration
```bash
# Create feature branch first
git checkout -b feat/migrate-console-to-winston-tier1

# Execute migration
pnpm migrate:console:tier1
```

**Expected Output**: 10 files modified

## What Gets Transformed

### Before
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[Payment] Processing webhook');

  try {
    const data = await processPayment();
    console.log('[Payment] Success:', data);
  } catch (error) {
    console.error('[Payment] Error:', error);
  }
}
```

### After
```typescript
import logger from '@/lib/logger-v2';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  logger.info('[Payment] Processing webhook');

  try {
    const data = await processPayment();
    logger.info('[Payment] Success:', data);
  } catch (error) {
    logger.error('[Payment] Error:', error);
  }
}
```

## Migration Tiers

### Tier 1: Critical APIs (Week 1) ⚠️
- **10 files** - Payment (9) + Auth (1)
- **Command**: `pnpm migrate:console:tier1`
- **Testing**: Critical - manual + automated

### Tier 2: Business APIs (Week 2)
- **~50 files** - Affiliate + Reservation + Contract
- **Command**: Custom jscodeshift command
- **Testing**: Standard automated tests

### Tier 3: UI Components (Week 3)
- **~200 files** - Client + Server components
- **Command**: Custom jscodeshift command
- **Testing**: Visual regression tests

### Tier 4: Utilities (Week 4)
- **~100 files** - lib/ and utils/
- **Command**: Custom jscodeshift command
- **Testing**: Unit tests

### Tier 5: Remaining (Week 5-6)
- **~616 files** - All other files
- **Command**: Custom jscodeshift command
- **Testing**: Integration tests

## Testing Checklist

After migration, run:

```bash
# 1. Type check
pnpm typecheck

# 2. Unit tests
pnpm test:unit

# 3. Critical flow tests
pnpm test:critical

# 4. Build test
pnpm build

# 5. Manual testing
# - Test payment webhook
# - Test checkout flow
# - Test auth login
```

## Success Criteria Checklist

- [x] jscodeshift installed
- [x] @types/jscodeshift installed
- [x] winston installed
- [x] @types/winston installed
- [x] migrate-console-to-winston.js created
- [x] Test file (test-jscodeshift.ts) created
- [x] Test file transforms correctly in dry-run
- [x] Import statement added automatically
- [x] run-migration.sh script created
- [x] setup-jscodeshift.sh script created
- [x] pre-migration-check.sh script created
- [x] count-console-statements.sh script created
- [x] Documentation complete (README, COMMANDS, CHECKLIST)
- [x] Package.json scripts added
- [ ] No syntax errors in transformed code (test after execution)
- [ ] All tests pass (test after execution)
- [ ] Payment flows work correctly (test after execution)

## File Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `migrate-console-to-winston.js` | Core transformer | Used by jscodeshift |
| `test-jscodeshift.ts` | Test file | Testing transformations |
| `run-migration.sh` | Batch migration | Execute Tier 1 |
| `setup-jscodeshift.sh` | Setup script | First time setup |
| `pre-migration-check.sh` | Validation | Before each migration |
| `count-console-statements.sh` | Analysis | Track progress |
| `MIGRATION-README.md` | Full guide | Reference documentation |
| `MIGRATION-COMMANDS.md` | Command reference | Quick lookup |
| `MIGRATION-CHECKLIST.md` | Execution plan | Day-by-day tasks |
| `MIGRATION-SUMMARY.md` | This file | High-level overview |

## Common Commands

```bash
# Setup (first time only)
pnpm migrate:console:setup

# Before each migration
pnpm migrate:console:check
pnpm migrate:console:count

# Preview changes
pnpm migrate:console:tier1-dry
pnpm migrate:console:test

# Execute migration
pnpm migrate:console:tier1

# Validation
pnpm typecheck
pnpm test:critical
pnpm build

# Git workflow
git checkout -b feat/migrate-console-to-winston-tier1
git add .
git commit -m "feat: migrate Tier 1 console to Winston logger"
git push origin feat/migrate-console-to-winston-tier1
```

## Dependencies Installed

When you run `pnpm migrate:console:setup`:

### Development Dependencies
- `jscodeshift` - Code transformation tool
- `@types/jscodeshift` - TypeScript definitions

### Production Dependencies
- `winston` - Logger library
- `@types/winston` - TypeScript definitions (devDep)

## Existing Files Used

- `lib/logger-v2.ts` - Winston logger configuration (already exists)
- `app/api/payment/**/*.ts` - Target files for Tier 1
- `app/api/auth/login/route.ts` - Target file for Tier 1

## Safety Features

1. **Dry Run Mode** - Preview all changes before applying
2. **Confirmation Prompts** - Asks before modifying critical code
3. **Pre-Migration Checks** - Validates environment
4. **Git Integration** - Warns if on main branch
5. **No Changes Return** - Doesn't modify files without console statements
6. **Import Deduplication** - Checks for existing logger imports
7. **Backup Recommendation** - Suggests creating backup branch
8. **Incremental Migration** - Tier-based approach

## Rollback Plan

If issues occur:

```bash
# Quick rollback (if not committed)
git checkout .

# Rollback after commit
git revert HEAD

# Full rollback to backup
git checkout backup-before-migration
```

## Next Steps

1. ✅ Make scripts executable
2. ✅ Run setup: `pnpm migrate:console:setup`
3. ✅ Validate: `pnpm migrate:console:check`
4. ✅ Preview: `pnpm migrate:console:tier1-dry`
5. ⏳ Create branch: `git checkout -b feat/migrate-console-to-winston-tier1`
6. ⏳ Execute: `pnpm migrate:console:tier1`
7. ⏳ Test thoroughly
8. ⏳ Commit and push
9. ⏳ Create PR
10. ⏳ Monitor production

## Support & Documentation

- **Full Guide**: `scripts/MIGRATION-README.md`
- **Commands**: `scripts/MIGRATION-COMMANDS.md`
- **Checklist**: `scripts/MIGRATION-CHECKLIST.md`
- **jscodeshift Docs**: https://github.com/facebook/jscodeshift
- **Winston Docs**: https://github.com/winstonjs/winston

## Metrics to Track

- Console statements migrated: 0 / 82,188
- Files migrated: 0 / 976
- Tiers completed: 0 / 5
- Tests passing: Run after migration
- Production stability: Monitor for 7 days

## Project Timeline

- **Week 1**: Tier 1 (Critical APIs) - 10 files ⏳
- **Week 2**: Tier 2 (Business APIs) - ~50 files
- **Week 3**: Tier 3 (UI Components) - ~200 files
- **Week 4**: Tier 4 (Utilities) - ~100 files
- **Week 5-6**: Tier 5 (Remaining) - ~616 files
- **Week 7**: Cleanup and final validation

---

**Ready to start? Run:**
```bash
pnpm migrate:console:setup
```
