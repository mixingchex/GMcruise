#!/bin/bash

# Commit Message Validator
# Enforces Conventional Commits format

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Skip if merge commit or revert
if echo "$COMMIT_MSG" | grep -qE '^(Merge|Revert)'; then
  exit 0
fi

# Conventional Commits pattern
# Format: type(scope): description
PATTERN='^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert)(\([a-z0-9-]+\))?: .{1,72}$'

if ! echo "$COMMIT_MSG" | head -1 | grep -qE "$PATTERN"; then
  echo -e "${RED}❌ Invalid commit message format${NC}"
  echo ""
  echo "Current message:"
  echo "  $COMMIT_MSG"
  echo ""
  echo "Expected format:"
  echo "  <type>(<scope>): <subject>"
  echo ""
  echo "Types:"
  echo "  feat:     New feature"
  echo "  fix:      Bug fix"
  echo "  docs:     Documentation changes"
  echo "  style:    Code style changes (formatting, etc.)"
  echo "  refactor: Code refactoring"
  echo "  perf:     Performance improvements"
  echo "  test:     Adding or updating tests"
  echo "  chore:    Maintenance tasks"
  echo "  build:    Build system changes"
  echo "  ci:       CI/CD changes"
  echo ""
  echo "Examples:"
  echo "  feat(auth): add social login support"
  echo "  fix(payment): resolve webhook timeout issue"
  echo "  docs: update API documentation"
  echo "  refactor(affiliate): simplify commission calculation"
  echo ""
  exit 1
fi

# Check subject length
SUBJECT=$(echo "$COMMIT_MSG" | head -1)
SUBJECT_LENGTH=${#SUBJECT}

if [ $SUBJECT_LENGTH -gt 72 ]; then
  echo -e "${YELLOW}⚠️  Warning: Commit message is too long ($SUBJECT_LENGTH chars)${NC}"
  echo "   Consider keeping it under 72 characters"
  echo ""
fi

# Check for imperative mood (basic check)
if echo "$SUBJECT" | grep -qE '(added|fixed|updated|changed|removed)'; then
  echo -e "${YELLOW}⚠️  Tip: Use imperative mood (add, fix, update)${NC}"
  echo "   Instead of: 'added feature', use 'add feature'"
  echo ""
fi

exit 0
