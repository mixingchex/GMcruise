#!/bin/bash

# Console to Winston Migration Script
# Phase 1 Week 1: Automated migration of console statements
#
# IMPORTANT: This script will modify files. Always review changes before committing.
# Use --dry flag to preview changes without modifying files.

set -e  # Exit on error

echo "🚀 Starting console.log → Winston logger migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if jscodeshift is installed
if ! command -v jscodeshift &> /dev/null; then
  echo "❌ Error: jscodeshift is not installed"
  echo "Run: pnpm add -D jscodeshift @types/jscodeshift"
  exit 1
fi

# Parse arguments
DRY_RUN=""
if [[ "$1" == "--dry" ]] || [[ "$1" == "-d" ]]; then
  DRY_RUN="--dry"
  echo "🔍 DRY RUN MODE - No files will be modified"
  echo ""
fi

# Tier 1: Payment APIs (CRITICAL - 9 files)
echo "📦 Tier 1: Payment APIs (CRITICAL)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -z "$DRY_RUN" ]]; then
  read -p "⚠️  WARNING: This will modify PAYMENT-CRITICAL code. Continue? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "❌ Migration cancelled"
    exit 0
  fi
fi

echo ""
echo "Processing payment APIs..."
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/api/payment/**/*.ts" \
  --parser=tsx \
  --ignore-pattern="**/node_modules/**" \
  $DRY_RUN

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Tier 1: Auth API (1 file)
echo "📦 Tier 1: Auth API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ -f "app/api/auth/login/route.ts" ]]; then
  npx jscodeshift -t scripts/migrate-console-to-winston.js \
    "app/api/auth/login/route.ts" \
    --parser=tsx \
    $DRY_RUN
else
  echo "⚠️  app/api/auth/login/route.ts not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ -n "$DRY_RUN" ]]; then
  echo "✅ Dry run complete!"
  echo ""
  echo "Next steps:"
  echo "1. Review the output above"
  echo "2. Run without --dry flag to apply changes"
  echo "3. Test payment flows thoroughly"
  echo "4. Commit changes"
else
  echo "✅ Tier 1 migration complete!"
  echo ""
  echo "Next steps:"
  echo "1. Review changes: git diff"
  echo "2. Test payment flows"
  echo "3. Run: pnpm test:critical"
  echo "4. Commit: git add . && git commit -m 'feat: migrate Tier 1 console to Winston logger'"
  echo ""
  echo "Tier 2 (Affiliate & Reservation APIs) can be migrated after validation."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
