#!/bin/bash

# Pre-migration validation script
# Ensures environment is ready before running migration

set -e

echo "🔍 Pre-Migration Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

errors=0
warnings=0

# Check 1: Git status
echo "✓ Checking git status..."
if ! git diff --quiet; then
  echo "⚠️  WARNING: You have unstaged changes"
  git status --short
  warnings=$((warnings + 1))
  echo ""
fi

if ! git diff --cached --quiet; then
  echo "⚠️  WARNING: You have staged changes"
  git diff --cached --name-only
  warnings=$((warnings + 1))
  echo ""
fi

current_branch=$(git branch --show-current)
if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
  echo "⚠️  WARNING: You are on $current_branch branch"
  echo "   Consider creating a feature branch: git checkout -b feat/migrate-console-to-winston"
  warnings=$((warnings + 1))
  echo ""
fi

# Check 2: Dependencies
echo "✓ Checking dependencies..."
if ! command -v node &> /dev/null; then
  echo "❌ ERROR: Node.js is not installed"
  errors=$((errors + 1))
fi

if ! command -v pnpm &> /dev/null; then
  echo "❌ ERROR: pnpm is not installed"
  errors=$((errors + 1))
fi

if ! grep -q "jscodeshift" package.json; then
  echo "⚠️  WARNING: jscodeshift not found in package.json"
  echo "   Run: bash scripts/setup-jscodeshift.sh"
  warnings=$((warnings + 1))
fi

if ! grep -q "winston" package.json; then
  echo "⚠️  WARNING: winston not found in package.json"
  echo "   Run: bash scripts/setup-jscodeshift.sh"
  warnings=$((warnings + 1))
fi

# Check 3: Logger file exists
echo "✓ Checking logger-v2..."
if [[ ! -f "lib/logger-v2.ts" ]]; then
  echo "❌ ERROR: lib/logger-v2.ts not found"
  echo "   This file is required for migration"
  errors=$((errors + 1))
fi

# Check 4: Migration scripts exist
echo "✓ Checking migration scripts..."
if [[ ! -f "scripts/migrate-console-to-winston.js" ]]; then
  echo "❌ ERROR: scripts/migrate-console-to-winston.js not found"
  errors=$((errors + 1))
fi

if [[ ! -f "scripts/run-migration.sh" ]]; then
  echo "❌ ERROR: scripts/run-migration.sh not found"
  errors=$((errors + 1))
fi

# Check 5: Target directories exist
echo "✓ Checking target directories..."
if [[ ! -d "app/api/payment" ]]; then
  echo "⚠️  WARNING: app/api/payment directory not found"
  warnings=$((warnings + 1))
fi

# Check 6: TypeScript compiler
echo "✓ Checking TypeScript..."
if ! pnpm tsc --version &> /dev/null; then
  echo "⚠️  WARNING: TypeScript compiler not available"
  warnings=$((warnings + 1))
fi

# Check 7: Tests exist
echo "✓ Checking test setup..."
if [[ ! -d "__tests__" ]] && [[ ! -d "tests" ]] && [[ ! -f "jest.config.js" ]]; then
  echo "⚠️  WARNING: No test setup found"
  echo "   Consider setting up tests before migration"
  warnings=$((warnings + 1))
fi

# Check 8: Logs directory
echo "✓ Checking logs directory..."
if [[ ! -d "logs" ]]; then
  echo "📁 Creating logs directory..."
  mkdir -p logs
  echo "✅ logs/ directory created"
fi

# Check 9: Count console statements
echo "✓ Counting console statements..."
console_count=$(grep -r "console\." . \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=scripts \
  --exclude-dir=logs \
  2>/dev/null | wc -l || echo "0")
echo "   Found $console_count console statements (excluding scripts/)"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $errors -gt 0 ]]; then
  echo "❌ VALIDATION FAILED"
  echo "   Errors: $errors"
  echo "   Warnings: $warnings"
  echo ""
  echo "Please fix the errors above before running migration."
  exit 1
elif [[ $warnings -gt 0 ]]; then
  echo "⚠️  VALIDATION PASSED WITH WARNINGS"
  echo "   Warnings: $warnings"
  echo ""
  echo "You can proceed, but consider addressing the warnings."
  echo ""
  read -p "Continue anyway? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Migration cancelled."
    exit 0
  fi
else
  echo "✅ VALIDATION PASSED"
  echo ""
  echo "Your environment is ready for migration!"
fi

echo ""
echo "Next steps:"
echo "1. Run dry-run: bash scripts/run-migration.sh --dry"
echo "2. Review output carefully"
echo "3. Apply migration: bash scripts/run-migration.sh"
echo ""
