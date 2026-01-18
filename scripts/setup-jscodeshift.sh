#!/bin/bash

# Setup jscodeshift for console → Winston migration
# This script installs dependencies and validates the setup

set -e

echo "🔧 Setting up jscodeshift for migration automation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
echo ""
echo "Installing jscodeshift and types..."
pnpm add -D jscodeshift @types/jscodeshift

echo ""
echo "Installing Winston logger..."
pnpm add winston
pnpm add -D @types/winston

echo ""
echo "✅ All dependencies installed"
echo ""

# Step 2: Validate installation
echo "🔍 Step 2: Validating installation..."
if command -v jscodeshift &> /dev/null; then
  echo "✅ jscodeshift command available"
  jscodeshift --version
else
  echo "⚠️  jscodeshift command not found in PATH"
  echo "   You can still use: npx jscodeshift"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 3: Test transformation on sample file
echo "🧪 Step 3: Testing transformation on sample file..."
echo ""
echo "Running dry-run on scripts/test-jscodeshift.ts..."
echo ""

npx jscodeshift -t scripts/migrate-console-to-winston.js \
  scripts/test-jscodeshift.ts \
  --dry \
  --print \
  --parser=tsx

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review the test output above"
echo "2. Run actual migration with: bash scripts/run-migration.sh --dry"
echo "3. Apply migration: bash scripts/run-migration.sh"
echo ""
echo "Documentation:"
echo "- Transformer: scripts/migrate-console-to-winston.js"
echo "- Test file: scripts/test-jscodeshift.ts"
echo "- Migration script: scripts/run-migration.sh"
echo ""
