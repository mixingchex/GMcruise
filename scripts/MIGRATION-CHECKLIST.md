# Console to Winston Migration Checklist

## Phase 1 Week 1: Tier 1 Migration

### Pre-Migration (Do Once)

- [ ] **Read Documentation**
  - [ ] Read `scripts/MIGRATION-README.md`
  - [ ] Review `scripts/MIGRATION-COMMANDS.md`
  - [ ] Understand transformation logic in `scripts/migrate-console-to-winston.js`

- [ ] **Setup Environment**
  ```bash
  # Make scripts executable
  chmod +x scripts/*.sh

  # Install dependencies
  pnpm migrate:console:setup
  # OR manually:
  # pnpm add -D jscodeshift @types/jscodeshift
  # pnpm add winston @types/winston
  ```

- [ ] **Validate Setup**
  ```bash
  # Run pre-migration checks
  pnpm migrate:console:check

  # Test transformation
  pnpm migrate:console:test
  ```

- [ ] **Analyze Current State**
  ```bash
  # Count console statements
  pnpm migrate:console:count

  # Expected: ~82,188 statements across ~976 files
  ```

- [ ] **Create Feature Branch**
  ```bash
  git checkout -b feat/migrate-console-to-winston-tier1
  ```

### Day 1: Analysis & Dry Run

- [ ] **Analyze Tier 1 Files**
  ```bash
  # Check payment APIs
  grep -rl "console\." app/api/payment/

  # Count statements per file
  grep -r "console\." app/api/payment/ | cut -d: -f1 | sort | uniq -c
  ```

- [ ] **Run Dry Run - Full Preview**
  ```bash
  pnpm migrate:console:tier1-dry
  ```

- [ ] **Review Dry Run Output**
  - [ ] No syntax errors reported
  - [ ] Import statements added correctly
  - [ ] All console methods mapped properly
  - [ ] File count matches expectation (~10 files)

- [ ] **Spot Check Individual Files**
  ```bash
  # Test on payment webhook (most critical)
  npx jscodeshift -t scripts/migrate-console-to-winston.js \
    app/api/payment/webhook/route.ts \
    --dry --print --parser=tsx
  ```

- [ ] **Review with Team**
  - [ ] Show dry-run output to team lead
  - [ ] Get approval for Tier 1 migration
  - [ ] Schedule deployment window

### Day 2: Execute Tier 1 Migration

- [ ] **Pre-Execution Checks**
  ```bash
  # Ensure no uncommitted changes
  git status

  # Run validation
  pnpm migrate:console:check

  # Backup branch
  git branch backup-before-migration
  ```

- [ ] **Execute Migration**
  ```bash
  pnpm migrate:console:tier1
  # OR
  bash scripts/run-migration.sh
  ```

- [ ] **Immediate Validation**
  ```bash
  # Check what changed
  git status
  git diff --stat

  # Count modified files
  git diff --name-only | wc -l
  # Expected: ~10 files
  ```

### Day 2-3: Testing & Validation

- [ ] **Code Review**
  ```bash
  # Review changes file by file
  git diff app/api/payment/webhook/route.ts
  git diff app/api/auth/login/route.ts
  ```

- [ ] **Type Check**
  ```bash
  pnpm typecheck
  # Must pass with no errors
  ```

- [ ] **Build Test**
  ```bash
  pnpm build
  # Must complete successfully
  ```

- [ ] **Unit Tests**
  ```bash
  pnpm test:unit
  # All tests must pass
  ```

- [ ] **Critical Flow Tests**
  ```bash
  pnpm test:critical
  # Payment, affiliate, reservation tests must pass
  ```

- [ ] **Manual Testing - Payment Flows**
  - [ ] Test payment webhook processing
  - [ ] Test checkout flow
  - [ ] Test payment status check
  - [ ] Test refund flow (if applicable)
  - [ ] Verify logs are written to `logs/` directory

- [ ] **Manual Testing - Auth Flow**
  - [ ] Test login
  - [ ] Test logout
  - [ ] Test session management
  - [ ] Verify auth logs

- [ ] **Log Verification**
  ```bash
  # Check log files created
  ls -lh logs/

  # Expected:
  # - logs/error.log
  # - logs/combined.log

  # Review log format
  tail -n 50 logs/combined.log
  ```

### Day 3-4: Deployment Preparation

- [ ] **Performance Check**
  - [ ] No significant performance degradation
  - [ ] Log file sizes reasonable
  - [ ] No memory leaks

- [ ] **Security Review**
  - [ ] No sensitive data in logs
  - [ ] Log files have proper permissions
  - [ ] Error messages don't expose secrets

- [ ] **Documentation Update**
  - [ ] Update README if needed
  - [ ] Document new logging patterns
  - [ ] Update team wiki

- [ ] **Final Pre-Commit Checks**
  ```bash
  # Run all checks
  pnpm typecheck
  pnpm lint
  pnpm test
  pnpm build
  ```

- [ ] **Commit Changes**
  ```bash
  git add .
  git commit -m "feat: migrate Tier 1 (Payment + Auth) console to Winston logger

  - Migrated 10 files in app/api/payment and app/api/auth
  - Converted console.* to logger.* methods
  - Added logger-v2 imports
  - All tests passing
  - Manual testing complete

  Part of Phase 1 Week 1: Console to Winston migration
  Target: 82,188 console statements across 976 files"
  ```

- [ ] **Push to Remote**
  ```bash
  git push origin feat/migrate-console-to-winston-tier1
  ```

### Day 5: Code Review & Merge

- [ ] **Create Pull Request**
  - [ ] Clear title and description
  - [ ] Link to migration plan
  - [ ] Add reviewers
  - [ ] Add labels (e.g., "refactor", "high-priority")

- [ ] **Address Review Comments**
  - [ ] Fix any issues found
  - [ ] Update based on feedback

- [ ] **Pre-Merge Final Checks**
  - [ ] All CI checks passing
  - [ ] All tests passing
  - [ ] No merge conflicts

- [ ] **Merge to Main**
  ```bash
  # After PR approval
  git checkout main
  git pull origin main
  git merge feat/migrate-console-to-winston-tier1
  git push origin main
  ```

### Post-Deployment Monitoring

- [ ] **Monitor Production Logs**
  - [ ] Check log files are being created
  - [ ] Verify log rotation working
  - [ ] No error spikes

- [ ] **Monitor Application Health**
  - [ ] Payment processing working
  - [ ] Auth flows working
  - [ ] No performance degradation
  - [ ] Error rates normal

- [ ] **Verify Logging Functionality**
  - [ ] Error logs capturing errors
  - [ ] Info logs capturing expected events
  - [ ] Log format is correct
  - [ ] Timestamps are accurate

### Rollback Plan (If Needed)

- [ ] **Immediate Rollback**
  ```bash
  # If critical issue found
  git revert HEAD
  git push origin main
  ```

- [ ] **Full Rollback**
  ```bash
  # Reset to pre-migration state
  git checkout backup-before-migration
  git checkout -b rollback-migration
  git push origin rollback-migration
  # Create PR to merge rollback branch
  ```

## Tier 2: Affiliate & Reservation APIs

After Tier 1 is stable in production for 1 week:

- [ ] **Update migration script for Tier 2**
- [ ] **Run analysis on Tier 2 files**
- [ ] **Execute Tier 2 migration**
- [ ] **Follow same validation process**

## Tier 3+: Remaining Files

Plan for phased rollout:
- Week 2: Tier 2 (Affiliate & Reservation)
- Week 3: Tier 3 (UI Components)
- Week 4: Tier 4 (Utilities)
- Week 5: Tier 5 (Remaining files)
- Week 6: Cleanup and validation

## Success Metrics

- [ ] **Code Quality**
  - [ ] All console.* converted to logger.*
  - [ ] All imports added correctly
  - [ ] No TypeScript errors
  - [ ] All tests passing

- [ ] **Functionality**
  - [ ] All payment flows working
  - [ ] All auth flows working
  - [ ] Logs being written correctly
  - [ ] No regression bugs

- [ ] **Performance**
  - [ ] No performance degradation
  - [ ] Log file sizes manageable
  - [ ] No memory issues

- [ ] **Production Stability**
  - [ ] 7 days in production with no issues
  - [ ] Error rates normal
  - [ ] User experience unchanged

## Notes

- Always test payment flows manually before deploying
- Keep backup branch until stable in production
- Monitor logs closely for first 48 hours
- Document any issues encountered
- Update this checklist based on learnings

## Contact

**Migration Owner**: [Your Name]
**Date Started**: YYYY-MM-DD
**Target Completion**: YYYY-MM-DD + 6 weeks

**Status Updates**:
- Day 1: ___________
- Day 2: ___________
- Day 3: ___________
- Day 4: ___________
- Day 5: ___________
- Post-deployment: ___________
