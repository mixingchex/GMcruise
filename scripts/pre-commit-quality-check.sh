#!/bin/bash

# Pre-commit Quality Validator
# Fast quality checks focused on critical issues

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

EXIT_CODE=0
WARNINGS=0

echo "🔍 Running Quality Checks..."

# Get staged TypeScript/JavaScript files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No code files to check"
  exit 0
fi

FILE_COUNT=$(echo "$STAGED_FILES" | wc -l)
echo "📁 Checking $FILE_COUNT file(s)..."
echo ""

# Check for debug code
echo "🐛 Checking for debug code..."
DEBUG_FOUND=0

for FILE in $STAGED_FILES; do
  if [ ! -f "$FILE" ]; then
    continue
  fi

  # Check for console statements (but allow console.error and logger)
  CONSOLE_LINES=$(grep -nE 'console\.(log|debug|info|warn|table|dir)' "$FILE" 2>/dev/null || true)
  if [ -n "$CONSOLE_LINES" ]; then
    if [ $DEBUG_FOUND -eq 0 ]; then
      echo -e "${YELLOW}⚠️  Debug code detected:${NC}"
      echo ""
    fi
    echo "   $FILE:"
    echo "$CONSOLE_LINES" | head -3 | sed 's/^/      /'
    LINE_COUNT=$(echo "$CONSOLE_LINES" | wc -l)
    if [ "$LINE_COUNT" -gt 3 ]; then
      echo "      ... and $((LINE_COUNT - 3)) more"
    fi
    echo ""
    ((DEBUG_FOUND++))
    ((WARNINGS++))
  fi

  # Check for debugger statements
  if grep -qE '\bdebugger\b' "$FILE" 2>/dev/null; then
    echo -e "${RED}❌ Debugger statement in $FILE${NC}"
    grep -nE '\bdebugger\b' "$FILE"
    echo ""
    EXIT_CODE=1
  fi

  # Check for TODO/FIXME in new code
  TODO_LINES=$(grep -nE '//\s*(TODO|FIXME|XXX|HACK)' "$FILE" 2>/dev/null || true)
  if [ -n "$TODO_LINES" ]; then
    echo -e "${BLUE}ℹ️  TODO comments in $FILE:${NC}"
    echo "$TODO_LINES" | head -2 | sed 's/^/      /'
    echo ""
  fi
done

if [ $DEBUG_FOUND -gt 0 ]; then
  echo -e "${YELLOW}   Tip: Use logger from @/lib/logger-v2 instead${NC}"
  echo ""
fi

# Check for common code smells
echo "👃 Checking for code smells..."

for FILE in $STAGED_FILES; do
  if [ ! -f "$FILE" ]; then
    continue
  fi

  # Check for any type usage
  ANY_COUNT=$(grep -cE ':\s*any\b' "$FILE" 2>/dev/null || echo "0")
  if [ "$ANY_COUNT" -gt 3 ]; then
    echo -e "${YELLOW}⚠️  Excessive 'any' types in $FILE ($ANY_COUNT occurrences)${NC}"
    echo "   Consider adding proper type definitions"
    echo ""
    ((WARNINGS++))
  fi

  # Check for long functions (very basic check)
  if [ -f "$FILE" ]; then
    FUNC_LINES=$(awk '/^(export )?(async )?function |^(export )?(const|let) \w+ = (\(.*\)|async \(.*\)) =>/ {start=NR} start && /^}/ {if (NR-start > 80) print start":"NR; start=0}' "$FILE" || true)
    if [ -n "$FUNC_LINES" ]; then
      echo -e "${YELLOW}⚠️  Long function(s) in $FILE (>80 lines)${NC}"
      echo "$FUNC_LINES" | sed 's/^/      Lines /'
      echo ""
      ((WARNINGS++))
    fi
  fi

  # Check for deeply nested code
  MAX_INDENT=$(grep -oE '^ +' "$FILE" 2>/dev/null | awk '{print length}' | sort -rn | head -1 || echo "0")
  if [ "$MAX_INDENT" -gt 24 ]; then
    echo -e "${YELLOW}⚠️  Deep nesting in $FILE (indent: $MAX_INDENT spaces)${NC}"
    echo "   Consider extracting to helper functions"
    echo ""
    ((WARNINGS++))
  fi
done

# Check for test file existence
echo "🧪 Checking test coverage..."

for FILE in $STAGED_FILES; do
  # Skip test files themselves
  if [[ "$FILE" =~ \.(test|spec)\.(ts|tsx|js|jsx)$ ]]; then
    continue
  fi

  # Skip non-critical files
  if [[ "$FILE" =~ ^(app|lib|src)/ ]]; then
    # Check if test file exists
    BASE_NAME=$(echo "$FILE" | sed 's/\.\(ts\|tsx\|js\|jsx\)$//')
    TEST_FILE1="${BASE_NAME}.test.ts"
    TEST_FILE2="${BASE_NAME}.spec.ts"
    TEST_FILE3="__tests__/${FILE}"

    if [ ! -f "$TEST_FILE1" ] && [ ! -f "$TEST_FILE2" ] && [ ! -f "$TEST_FILE3" ]; then
      # Only warn for critical paths
      if [[ "$FILE" =~ (payment|affiliate|auth|reservation) ]]; then
        echo -e "${YELLOW}⚠️  No test file for critical code: $FILE${NC}"
        echo ""
      fi
    fi
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $EXIT_CODE -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Quality Check Passed${NC}"
    echo "   No issues found"
  else
    echo -e "${YELLOW}⚠️  Quality Check Passed with Warnings${NC}"
    echo "   Found $WARNINGS warning(s) - consider addressing before commit"
  fi
else
  echo -e "${RED}❌ Quality Check Failed${NC}"
  echo "   Critical issues must be fixed"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $EXIT_CODE
