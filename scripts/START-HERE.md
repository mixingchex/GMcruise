# Console to Winston Migration - START HERE

## What is this?

This is an automated migration system to convert 82,188 console statements to Winston logger across 976 files using Facebook's jscodeshift tool.

**Status**: ✅ Ready to Execute
**Risk**: ⚠️ HIGH - Touches payment-critical code
**Approach**: Incremental, tier-based migration over 6 weeks

## Quick Start (3 Commands)

```bash
# 1. Setup (installs dependencies, runs test)
pnpm migrate:console:setup

# 2. Preview changes (dry-run, no files modified)
pnpm migrate:console:tier1-dry

# 3. Execute Tier 1 (10 critical files)
pnpm migrate:console:tier1
```

## What Gets Changed

### Before
```typescript
console.log('[Payment] Processing...');
console.error('[Payment] Failed:', error);
```

### After
```typescript
import logger from '@/lib/logger-v2';

logger.info('[Payment] Processing...');
logger.error('[Payment] Failed:', error);
```

## Files You Need to Know

### Essential Reading (Read First)
1. **THIS FILE** - You're reading it ✓
2. **MIGRATION-SUMMARY.md** - Complete overview of the migration
3. **MIGRATION-CHECKLIST.md** - Day-by-day execution plan

### Reference Documentation
4. **MIGRATION-README.md** - Detailed guide with all features
5. **MIGRATION-COMMANDS.md** - Command reference and examples

### Scripts (Automated)
6. **setup-jscodeshift.sh** - First-time setup
7. **run-migration.sh** - Execute Tier 1 migration
8. **pre-migration-check.sh** - Environment validation
9. **count-console-statements.sh** - Progress tracking

### Technical (For Developers)
10. **migrate-console-to-winston.js** - jscodeshift transformer
11. **test-jscodeshift.ts** - Test file with examples

## Migration Tiers

| Tier | Files | Risk | Status |
|------|-------|------|--------|
| 1 | 10 | ⚠️ HIGH | Ready |
| 2 | ~50 | Medium | Planned |
| 3 | ~200 | Low | Planned |
| 4 | ~100 | Low | Planned |
| 5 | ~616 | Low | Planned |

## Your First Steps

### Step 1: Read Documentation (15 minutes)
```bash
# Read these files in order:
cat scripts/START-HERE.md          # ← You are here
cat scripts/MIGRATION-SUMMARY.md   # Overview
cat scripts/MIGRATION-CHECKLIST.md # Execution plan
```

### Step 2: Setup Environment (5 minutes)
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Install dependencies and test
pnpm migrate:console:setup
```

**Expected Output**: Test transformation preview

### Step 3: Validate (2 minutes)
```bash
pnpm migrate:console:check
```

**Expected Result**: ✅ VALIDATION PASSED

### Step 4: Analyze (2 minutes)
```bash
pnpm migrate:console:count
```

**Expected Output**: Count of console statements by type and location

### Step 5: Preview (5 minutes)
```bash
pnpm migrate:console:tier1-dry
```

**Expected Output**: Preview of changes to 10 files (no actual changes)

### Step 6: Execute (After Team Approval)
```bash
# Create feature branch
git checkout -b feat/migrate-console-to-winston-tier1

# Execute migration
pnpm migrate:console:tier1

# Validate
pnpm typecheck
pnpm test:critical
pnpm build
```

## Safety Features

- ✅ Dry-run mode (preview before applying)
- ✅ Confirmation prompts for critical code
- ✅ Pre-migration environment checks
- ✅ Automatic import deduplication
- ✅ No changes if no console statements found
- ✅ Tier-based incremental approach
- ✅ Comprehensive testing checklist

## NPM Scripts Available

```bash
pnpm migrate:console:setup        # Setup dependencies
pnpm migrate:console:check        # Pre-migration validation
pnpm migrate:console:count        # Count console statements
pnpm migrate:console:test         # Test on sample file
pnpm migrate:console:tier1-dry    # Preview Tier 1 (dry-run)
pnpm migrate:console:tier1        # Execute Tier 1
```

## When to Use What

### Before Migration
- `setup` - Install dependencies (first time)
- `check` - Validate environment
- `count` - See current state

### During Migration
- `tier1-dry` - Preview changes
- `tier1` - Execute migration
- `test` - Test on sample file

### After Migration
- `typecheck` - Validate TypeScript
- `test:critical` - Run critical tests
- `build` - Test build

## Need Help?

### Documentation
- **Overview**: `scripts/MIGRATION-SUMMARY.md`
- **Commands**: `scripts/MIGRATION-COMMANDS.md`
- **Checklist**: `scripts/MIGRATION-CHECKLIST.md`
- **Full Guide**: `scripts/MIGRATION-README.md`

### Common Issues
- **Parser errors**: Use `--parser=tsx` for TypeScript
- **Permission denied**: Run `chmod +x scripts/*.sh`
- **No changes**: Check file patterns and paths

### Rollback
```bash
# If not committed yet
git checkout .

# If already committed
git revert HEAD
```

## Testing Checklist

After migration:

- [ ] `pnpm typecheck` - No TypeScript errors
- [ ] `pnpm test:critical` - All critical tests pass
- [ ] `pnpm build` - Build succeeds
- [ ] Manual payment webhook test
- [ ] Manual auth login test
- [ ] Check logs/ directory created
- [ ] Verify log format in logs/combined.log

## Success Criteria

- [ ] All console.* converted to logger.*
- [ ] Import statements added correctly
- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] Payment flows working
- [ ] Logs being written correctly
- [ ] No performance degradation

## Timeline

- **Week 1**: Tier 1 (10 files) - Payment + Auth ← START HERE
- **Week 2**: Tier 2 (~50 files) - Affiliate + Reservation
- **Week 3**: Tier 3 (~200 files) - UI Components
- **Week 4**: Tier 4 (~100 files) - Utilities
- **Week 5-6**: Tier 5 (~616 files) - Remaining files

## What to Do Next

### If this is your first time:
1. Read `MIGRATION-SUMMARY.md`
2. Read `MIGRATION-CHECKLIST.md`
3. Run `pnpm migrate:console:setup`
4. Run `pnpm migrate:console:tier1-dry`

### If you've done the above:
1. Get team approval for Tier 1
2. Create feature branch
3. Run `pnpm migrate:console:tier1`
4. Test thoroughly
5. Create PR

### If Tier 1 is complete:
1. Monitor production for 1 week
2. Plan Tier 2 migration
3. Update checklist with learnings

## Important Notes

- Always test payment flows manually before deploying
- Keep backup branch until stable in production
- Monitor logs closely for first 48 hours
- Document any issues encountered
- Update team when starting each tier

---

**Ready to start?**

```bash
pnpm migrate:console:setup
```

Then read `MIGRATION-SUMMARY.md` for complete details.
