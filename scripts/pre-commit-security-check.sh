#!/bin/bash

# Pre-commit Security Validator
# Detects hardcoded secrets, passwords, and security issues

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

EXIT_CODE=0
ISSUES_FOUND=0

echo "🔒 Running Security Checks..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -v '^__tests__/' | grep -E '\.(ts|tsx|js|jsx|json|env)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No relevant files to check"
  exit 0
fi

echo ""
echo "📁 Checking ${#STAGED_FILES[@]} files..."
echo ""

# Security patterns to detect
declare -A SECURITY_PATTERNS=(
  ["Hardcoded Password"]='(password|passwd|pwd)\s*[:=]\s*["\x27][^"\x27\s]{8,}["\x27]'
  ["API Key"]='(api[_-]?key|apikey)\s*[:=]\s*["\x27][^"\x27\s]{20,}["\x27]'
  ["Secret Key"]='(secret[_-]?key|secretkey)\s*[:=]\s*["\x27][^"\x27\s]{20,}["\x27]'
  ["Private Key"]='-----BEGIN (RSA |EC )?PRIVATE KEY-----'
  ["AWS Key"]='AKIA[0-9A-Z]{16}'
  ["JWT Token"]='eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.'
  ["Database URL"]='(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@'
  ["Generic Secret"]='(secret|token|auth)\s*[:=]\s*["\x27][A-Za-z0-9+/=]{32,}["\x27]'
)

# Check each file
for FILE in $STAGED_FILES; do
  if [ ! -f "$FILE" ]; then
    continue
  fi

  FILE_ISSUES=0
  
  for PATTERN_NAME in "${!SECURITY_PATTERNS[@]}"; do
    PATTERN="${SECURITY_PATTERNS[$PATTERN_NAME]}"
    
    # Use grep with Perl regex
    MATCHES=$(grep -nPi "$PATTERN" "$FILE" 2>/dev/null || true)
    
    if [ -n "$MATCHES" ]; then
      if [ $FILE_ISSUES -eq 0 ]; then
        echo -e "${RED}❌ Security Issues in: $FILE${NC}"
      fi
      
      echo -e "${YELLOW}   ⚠️  $PATTERN_NAME detected:${NC}"
      echo "$MATCHES" | while IFS= read -r line; do
        LINE_NUM=$(echo "$line" | cut -d':' -f1)
        CONTENT=$(echo "$line" | cut -d':' -f2-)
        echo "      Line $LINE_NUM: $(echo "$CONTENT" | sed 's/^[[:space:]]*//' | cut -c1-80)"
      done
      echo ""
      
      ((FILE_ISSUES++))
      ((ISSUES_FOUND++))
      EXIT_CODE=1
    fi
  done
done

# Check for common insecure patterns
echo "🔍 Checking for insecure patterns..."

for FILE in $STAGED_FILES; do
  if [ ! -f "$FILE" ]; then
    continue
  fi

  # Check for disabled security features
  if grep -qE '(ssl.*false|verify.*false|rejectUnauthorized.*false)' "$FILE" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: SSL/TLS verification disabled in $FILE${NC}"
    grep -nE '(ssl.*false|verify.*false|rejectUnauthorized.*false)' "$FILE"
    echo ""
  fi

  # Check for eval usage
  if grep -qE '\beval\s*\(' "$FILE" 2>/dev/null; then
    echo -e "${RED}❌ Dangerous: eval() usage in $FILE${NC}"
    grep -nE '\beval\s*\(' "$FILE"
    echo ""
    ((ISSUES_FOUND++))
    EXIT_CODE=1
  fi

  # Check for SQL injection risks
  if grep -qE '(query|execute)\s*\([^)]*\+[^)]*\)' "$FILE" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Potential SQL Injection risk in $FILE${NC}"
    echo "   Review query string concatenation"
    echo ""
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Security Check Passed${NC}"
  echo "   No security issues detected"
else
  echo -e "${RED}❌ Security Check Failed${NC}"
  echo "   Found $ISSUES_FOUND security issue(s)"
  echo ""
  echo "⚠️  Action Required:"
  echo "   1. Remove hardcoded secrets/passwords"
  echo "   2. Use environment variables (.env)"
  echo "   3. Add sensitive values to .gitignore"
  echo "   4. Consider using a secrets manager"
  echo ""
  echo "   If this is a false positive (test data, examples),"
  echo "   add a comment: // SECURITY: test data only"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $EXIT_CODE
