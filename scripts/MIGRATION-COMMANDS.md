# Migration Commands Quick Reference

## Setup

```bash
# Install all dependencies and run test
bash scripts/setup-jscodeshift.sh

# Make scripts executable
chmod +x scripts/setup-jscodeshift.sh
chmod +x scripts/run-migration.sh
chmod +x scripts/count-console-statements.sh
```

## Analysis

```bash
# Count console statements across project
bash scripts/count-console-statements.sh

# Find files with console statements in payment APIs
grep -rl "console\." app/api/payment/

# Count console statements in specific file
grep "console\." app/api/payment/webhook/route.ts | wc -l
```

## Testing (Dry Run)

```bash
# Test on sample file
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  scripts/test-jscodeshift.ts \
  --dry --print --parser=tsx

# Test on single production file
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  app/api/payment/webhook/route.ts \
  --dry --print --parser=tsx

# Test on entire payment directory
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/api/payment/**/*.ts" \
  --dry --parser=tsx

# Preview Tier 1 changes
bash scripts/run-migration.sh --dry
```

## Migration (Apply Changes)

```bash
# Migrate Tier 1 (Payment + Auth)
bash scripts/run-migration.sh

# Migrate specific file
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  app/api/payment/webhook/route.ts \
  --parser=tsx

# Migrate specific directory
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/api/payment/**/*.ts" \
  --parser=tsx

# Migrate multiple directories (Tier 2)
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/api/{affiliate,reservation}/**/*.ts" \
  --parser=tsx
```

## Validation

```bash
# Type check
pnpm typecheck

# Run tests
pnpm test

# Run critical tests
pnpm test:critical

# Build test
pnpm build

# Check for remaining console statements
grep -r "console\." app/api/payment/
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feat/migrate-console-to-winston-tier1

# Check status
git status

# Review changes
git diff

# Stage changes
git add .

# Commit
git commit -m "feat: migrate Tier 1 (Payment + Auth) console to Winston logger"

# Push
git push origin feat/migrate-console-to-winston-tier1
```

## Rollback

```bash
# Discard unstaged changes
git checkout .

# Discard all changes (including staged)
git reset --hard HEAD

# Revert last commit
git revert HEAD

# Reset to specific commit
git reset --hard <commit-hash>
```

## Advanced Usage

### Custom Patterns

```bash
# Only .ts files
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/**/*.ts" \
  --parser=tsx \
  --ignore-pattern="**/*.tsx"

# Specific file types
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/**/*.{ts,tsx}" \
  --parser=tsx

# Exclude specific directories
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/**/*.ts" \
  --parser=tsx \
  --ignore-pattern="**/node_modules/**" \
  --ignore-pattern="**/.next/**"
```

### Debugging

```bash
# Verbose output
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  file.ts \
  --parser=tsx \
  --dry \
  --print \
  --verbose=2

# Run with Node debugger
node --inspect-brk node_modules/.bin/jscodeshift \
  -t scripts/migrate-console-to-winston.js \
  file.ts
```

### Statistics

```bash
# Show statistics
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/api/payment/**/*.ts" \
  --parser=tsx \
  --dry \
  --silent

# Count files that would be modified
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/**/*.ts" \
  --parser=tsx \
  --dry \
  --silent \
  | grep "modified" | wc -l
```

## Common Issues

### Issue: "Parser does not support TypeScript"
**Solution:** Add `--parser=tsx`

```bash
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  file.ts \
  --parser=tsx
```

### Issue: "Permission denied"
**Solution:** Make script executable

```bash
chmod +x scripts/run-migration.sh
```

### Issue: "jscodeshift: command not found"
**Solution:** Use npx or install globally

```bash
npx jscodeshift --version
# or
pnpm add -g jscodeshift
```

### Issue: No files modified
**Solution:** Check file patterns and paths

```bash
# List files matching pattern
ls app/api/payment/**/*.ts

# Test with absolute path
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  $(pwd)/app/api/payment/webhook/route.ts \
  --parser=tsx
```

## Package.json Scripts

Add these to `package.json` for convenience:

```json
{
  "scripts": {
    "migrate:setup": "bash scripts/setup-jscodeshift.sh",
    "migrate:count": "bash scripts/count-console-statements.sh",
    "migrate:tier1-dry": "bash scripts/run-migration.sh --dry",
    "migrate:tier1": "bash scripts/run-migration.sh",
    "migrate:test": "npx jscodeshift -t scripts/migrate-console-to-winston.js scripts/test-jscodeshift.ts --dry --print --parser=tsx"
  }
}
```

## Quick Start Workflow

```bash
# 1. Setup (first time only)
bash scripts/setup-jscodeshift.sh

# 2. Count current console statements
bash scripts/count-console-statements.sh

# 3. Preview Tier 1 changes
bash scripts/run-migration.sh --dry

# 4. Apply Tier 1 migration
bash scripts/run-migration.sh

# 5. Validate
pnpm typecheck
pnpm test:critical

# 6. Review and commit
git diff
git add .
git commit -m "feat: migrate Tier 1 console to Winston logger"
```
