#!/bin/bash

# Test pre-commit hooks without actually committing
# Usage: bash scripts/pre-commit-test.sh

echo "🧪 Testing Pre-Commit Hooks"
echo ""
echo "This will run all pre-commit checks without committing."
echo ""

# Stage all changes temporarily
git add -A

# Run the pre-commit hook
.husky/pre-commit

EXIT_CODE=$?

# Unstage changes
git reset HEAD

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Pre-commit hooks passed!"
  echo "   You can safely commit your changes."
else
  echo ""
  echo "❌ Pre-commit hooks failed"
  echo "   Fix the issues before committing."
fi

exit $EXIT_CODE
