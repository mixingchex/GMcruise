#!/bin/bash

# Count console statements across the project
# Helps track migration progress

echo "📊 Console Statement Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Exclude scripts directory and node_modules
EXCLUDE_PATTERN="--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=scripts"

# Count by type
echo "By method type:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
console_log=$(grep -r "console\.log" . $EXCLUDE_PATTERN | wc -l)
console_error=$(grep -r "console\.error" . $EXCLUDE_PATTERN | wc -l)
console_warn=$(grep -r "console\.warn" . $EXCLUDE_PATTERN | wc -l)
console_debug=$(grep -r "console\.debug" . $EXCLUDE_PATTERN | wc -l)
console_info=$(grep -r "console\.info" . $EXCLUDE_PATTERN | wc -l)

total=$((console_log + console_error + console_warn + console_debug + console_info))

echo "console.log():   $console_log"
echo "console.error(): $console_error"
echo "console.warn():  $console_warn"
echo "console.debug(): $console_debug"
echo "console.info():  $console_info"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total:           $total"
echo ""

# Count files with console statements
echo "Files with console statements:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
files_with_console=$(grep -rl "console\." . $EXCLUDE_PATTERN | wc -l)
echo "Total files: $files_with_console"
echo ""

# Top 10 files with most console statements
echo "Top 10 files with most console statements:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -r "console\." . $EXCLUDE_PATTERN | cut -d: -f1 | sort | uniq -c | sort -rn | head -10
echo ""

# By directory
echo "By directory (Tier 1 targets):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -d "app/api/payment" ]]; then
  payment_count=$(grep -r "console\." app/api/payment | wc -l)
  payment_files=$(grep -rl "console\." app/api/payment | wc -l)
  echo "Payment APIs:    $payment_count statements in $payment_files files"
fi

if [[ -f "app/api/auth/login/route.ts" ]]; then
  auth_count=$(grep "console\." app/api/auth/login/route.ts | wc -l)
  echo "Auth API:        $auth_count statements in 1 file"
fi

if [[ -d "app/api/affiliate" ]]; then
  affiliate_count=$(grep -r "console\." app/api/affiliate | wc -l)
  affiliate_files=$(grep -rl "console\." app/api/affiliate | wc -l)
  echo "Affiliate APIs:  $affiliate_count statements in $affiliate_files files"
fi

if [[ -d "app/api/reservation" ]]; then
  reservation_count=$(grep -r "console\." app/api/reservation | wc -l)
  reservation_files=$(grep -rl "console\." app/api/reservation | wc -l)
  echo "Reservation APIs: $reservation_count statements in $reservation_files files"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Migration targets (excluding scripts/):"
echo "Total statements: $total"
echo "Total files: $files_with_console"
echo ""
