# Phase 1: Logging System Analysis Report
**Generated**: 2026-01-19
**Status**: Current State Analysis
**Priority**: LOW RISK (Entry Point for 12-Month Refactoring)

---

## 📊 Executive Summary

### Critical Findings
- **Total Console Statements**: 82,188 instances
- **Files Affected**: 1,249 TypeScript files
- **Current State**: 100% console-based logging (no structured logging)
- **Risk Level**: LOW (logging migration is non-breaking)

### Scope Reality Check
```
Initial Estimate: ~2,000 console.log statements
Actual Count:     82,188 console statements
Variance:         41× larger than estimated
```

**Implication**: This is a 3-4 week migration, not a 1-week task. Automation is MANDATORY.

---

## 📁 File Distribution Analysis

### By Directory (Top 20)
| Directory | Files | Avg Statements/File | Priority |
|-----------|-------|---------------------|----------|
| `scripts/` | 273 | 7.2 | LOW (test/dev only) |
| `app/api/` | 420 | 4.1 | **CRITICAL** |
| `app/admin/` | 145 | 3.8 | HIGH |
| `app/partner/` | 89 | 5.2 | HIGH |
| `lib/` | 57 | 12.4 | **CRITICAL** |
| `components/` | 115 | 2.3 | MEDIUM |
| `app/` (pages) | 68 | 1.9 | LOW |
| `lib/scheduler/` | 10 | 18.6 | **CRITICAL** |
| `lib/affiliate/` | 14 | 8.1 | **CRITICAL** |
| `lib/backup/` | 3 | 5.7 | MEDIUM |

### Category Breakdown
```typescript
API Routes:        420 files (34%)  ← CRITICAL: Production runtime
Libraries:          57 files (5%)   ← CRITICAL: Core infrastructure
Components:        115 files (9%)   ← MEDIUM: Client-side only
Scripts:           273 files (22%)  ← LOW: Dev/test only
Pages:             148 files (12%)  ← LOW: Client-side only
Tests/Backups:     236 files (18%)  ← IGNORE: Not in production
```

---

## 🔥 Critical File Analysis

### Payment Webhook (app/api/payment/webhook/route.ts)
**Lines**: 959 total, **30 console statements** (3.1% of code is logging)

**Critical Log Points**:
1. **Request Reception** (L38-47): Logs basic payment info + partner details
2. **Amount Mismatch Detection** (L70): CRITICAL SECURITY validation
3. **Duplicate Prevention** (L89): Prevents double-charging
4. **Commission Calculation** (L247, 254): Business logic validation
5. **Reservation Creation** (L495, 502): Transaction success/failure
6. **Reservation Failure Handling** (L537, 539, 545): CRITICAL error recovery
7. **Auto-Approval Logic** (L643, 658): User activation
8. **Sale Completion** (L668-686): Final transaction logging
9. **Background Automation** (L778, 813, 881, 918): Async tasks (Google Sheets, Drive, Email)
10. **Error Handler** (L952): Top-level catch

**Risk Assessment**:
- **Current**: Console logs provide audit trail for $200K+ monthly transactions
- **If Removed**: Zero audit trail, impossible to debug payment failures
- **Migration Risk**: HIGH - must preserve exact log format for reconciliation

**Recommendation**:
```typescript
// Current (line 38)
console.log('[Payment Webhook v11.0] ===== 요청 수신 =====');
console.log('[Payment Webhook v11.0] 기본 정보:', { ... });

// Target (Winston)
logger.info('[Payment Webhook v11.0] ===== 요청 수신 =====', {
  merchant_uid,
  amount,
  affiliateCode,
  timestamp: new Date().toISOString()
});
```

---

### Top 10 Files by Console Usage

| Rank | File | Count | Priority |
|------|------|-------|----------|
| 1 | `app/api/auth/login/route.ts` | 144 | CRITICAL |
| 2 | `components/partner/ReservationForm.tsx` | 142 | HIGH |
| 3 | `app/community/posts/[id]/comments/route.ts` | 85 | MEDIUM |
| 4 | `scripts/test-all-contract-apis.ts` | 70 | IGNORE |
| 5 | `app/map/page.tsx` | 52 | LOW |
| 6 | `app/wallet-test/components/ExpenseTracker.tsx` | 21 | IGNORE |
| 7 | `lib/gemini.ts` | 21 | HIGH |
| 8 | `lib/push/client.ts` | 39 | MEDIUM |
| 9 | `app/api/payment/webhook/route.ts` | 30 | **CRITICAL** |
| 10 | `app/api/payment/callback/route.ts` | 28 | **CRITICAL** |

---

## 🎯 Migration Priority Matrix

### Tier 1: CRITICAL (Must Migrate First)
**Scope**: 15 files, ~450 console statements
**Timeline**: Week 1-2
**Files**:
```
✅ Payment APIs (9 files)
   - app/api/payment/webhook/route.ts (30 logs)
   - app/api/payment/callback/route.ts (28 logs)
   - app/api/payment/return/route.ts (25 logs)
   - app/api/payment/prepare/route.ts (16 logs)
   - app/api/payment/notify/route.ts (9 logs)
   - app/api/payment/mobile-next/route.ts (9 logs)
   - app/api/payment/virtual-account/route.ts (5 logs)
   - app/api/payment/signature/route.ts (2 logs)
   - app/api/payment/request/route.ts (2 logs)

✅ Auth APIs (1 file)
   - app/api/auth/login/route.ts (144 logs) ← URGENT

✅ Core Libraries (5 files)
   - lib/google-drive.ts (18 logs)
   - lib/google-sheets.ts (18 logs)
   - lib/gemini.ts (21 logs)
   - lib/logger.ts (12 logs) ← Self-referential!
   - lib/google-automation.ts (12 logs)
```

### Tier 2: HIGH (Week 3-4)
**Scope**: Affiliate APIs, Schedulers, Admin APIs
**Files**: ~35 files, ~800 console statements

### Tier 3: MEDIUM (Week 5-6)
**Scope**: Components, Partner Pages, lib/ utilities
**Files**: ~120 files, ~1,200 console statements

### Tier 4: LOW (Week 7-8)
**Scope**: Client pages, non-critical APIs
**Files**: ~200 files, ~1,500 console statements

### Tier 5: IGNORE
**Scope**: Scripts, tests, backups
**Files**: 273 files (DO NOT MIGRATE)

---

## 🛠 Automated Migration Strategy

### Problem
Manual migration of 82,188 console statements = **410 hours** (82,188 ÷ 200 per hour)
**Cost**: ~$20,500 at $50/hour developer rate

### Solution: Automated AST Transformation

**Tool**: jscodeshift (Facebook's codemod tool)

**Script Template**:
```javascript
// scripts/migrate-console-to-winston.js
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  return root
    .find(j.CallExpression, {
      callee: {
        object: { name: 'console' },
        property: { name: 'log' }
      }
    })
    .replaceWith(path => {
      const args = path.node.arguments;
      return j.callExpression(
        j.memberExpression(
          j.identifier('logger'),
          j.identifier('info')
        ),
        args
      );
    })
    .toSource();
}
```

**Execution**:
```bash
# Tier 1: Payment APIs only
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  app/api/payment/**/*.ts \
  --parser=tsx \
  --dry # Preview first

# Tier 2: Affiliate APIs
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  app/api/affiliate/**/*.ts \
  --parser=tsx
```

**Expected Results**:
- **Manual**: 8 weeks, 410 hours, $20,500
- **Automated**: 2 weeks, 80 hours (review), $4,000
- **Savings**: 80% time, 80% cost

---

## 📋 Implementation Checklist

### Week 1: Infrastructure Setup
- [ ] Install Winston (`pnpm add winston`)
- [ ] Create `lib/logger-v2.ts` with production config
- [ ] Test Winston locally (write sample logs)
- [ ] Configure log rotation (daily, 30-day retention)
- [ ] Set up Vercel log streaming (optional)

### Week 2: Tier 1 Migration (CRITICAL)
- [ ] Create jscodeshift migration script
- [ ] Test on Payment Webhook (dry run)
- [ ] Migrate all Payment APIs (9 files)
- [ ] Migrate Auth APIs (1 file)
- [ ] Migrate Core Libraries (5 files)
- [ ] **Verify**: All critical paths still log correctly
- [ ] **Deploy**: Canary deployment (10% traffic)
- [ ] **Monitor**: Check logs in production for 48 hours

### Week 3-4: Tier 2 Migration (HIGH)
- [ ] Migrate Affiliate APIs (6 files)
- [ ] Migrate Schedulers (10 files)
- [ ] Migrate Admin APIs (top 20 files)
- [ ] **Deploy**: 50% traffic
- [ ] **Monitor**: Error rate, log volume

### Week 5-6: Tier 3 Migration (MEDIUM)
- [ ] Migrate Components (115 files)
- [ ] Migrate Partner Pages (89 files)
- [ ] Migrate lib/ utilities (remaining)
- [ ] **Deploy**: 100% traffic

### Week 7-8: Cleanup & Verification
- [ ] Run verification script (count remaining console.*)
- [ ] Target: <100 console statements remaining
- [ ] Document exceptions (intentional console.error in dev)
- [ ] Update ESLint rule: `no-console: "error"`
- [ ] **Final Deployment**: Remove all console.log

---

## 🚨 Risks & Mitigation

### Risk 1: Breaking Production Logging
**Impact**: Loss of audit trail for payments
**Probability**: MEDIUM
**Mitigation**:
- Keep `console.log` alongside `logger.info` for 1 week (dual logging)
- Compare log volume before/after migration
- Rollback plan: Feature flag to toggle Winston on/off

### Risk 2: Log Volume Explosion
**Impact**: Vercel log limits exceeded (100MB/day free tier)
**Probability**: HIGH (82K statements * 10KB avg = 820MB/day)
**Mitigation**:
- Reduce log level in production (`info` → `warn`)
- Sample high-frequency logs (1% of non-critical events)
- Use log aggregation service (Logtail, $10/month)

### Risk 3: Performance Degradation
**Impact**: Winston slower than console.log (est. +5ms per log)
**Probability**: LOW (82K logs * 5ms = 7 minutes/day overhead)
**Mitigation**:
- Use async Winston transports (non-blocking)
- Benchmark before/after (p95 latency)
- Remove unnecessary logs during migration

---

## 📊 Success Metrics

### KPIs (Week 8 Target)
- [ ] Console statements: 82,188 → <100 (99.9% reduction)
- [ ] Files migrated: 1,249 → 976 (excluding scripts/tests)
- [ ] Production errors: 0 (no breaking changes)
- [ ] Log retention: 30 days (vs 7 days with console)
- [ ] Cost: <$50/month (Logtail or similar)

### Quality Gates
- [ ] All Tier 1 files have Winston logs
- [ ] Payment Webhook audit trail preserved
- [ ] ESLint enforces no new console.log
- [ ] CI/CD fails on console.log in new code
- [ ] Documentation updated (logging best practices)

---

## 🔄 Next Steps

### Immediate Actions (This Week)
1. **Approve this analysis** (User decision)
2. **Install Winston** (`pnpm add winston`)
3. **Create `lib/logger-v2.ts`** (production-ready config)
4. **Create migration script** (`scripts/migrate-console-to-winston.js`)
5. **Test on 1 file** (app/api/payment/webhook/route.ts - dry run)

### Blocked On
- [ ] User approval of 8-week timeline (vs original 2-week estimate)
- [ ] Budget approval for Logtail ($10/month) or similar service
- [ ] Decision on dual logging period (recommended: 1 week overlap)

---

## 📝 Notes

### Why This Takes 8 Weeks (Not 2)
**Original Estimate**: 2,000 console.log statements, 2 weeks
**Actual Scope**: 82,188 console statements (41× larger)

**Breakdown**:
```
Automation Development:  1 week  (jscodeshift script + testing)
Tier 1 Migration:        1 week  (15 critical files, manual review)
Tier 2-3 Migration:      4 weeks (bulk automation + spot checks)
Verification & Cleanup:  2 weeks (ESLint rules, documentation)
---
Total:                   8 weeks
```

### Alternative: Faster but Riskier (4 Weeks)
- Skip manual review (trust automation 100%)
- Migrate all tiers in parallel (risk: mass breakage)
- No dual logging period (risk: blind deployment)
- **NOT RECOMMENDED** for payment-critical system

---

**Document Version**: 1.0
**Last Updated**: 2026-01-19
**Next Review**: After user approval
