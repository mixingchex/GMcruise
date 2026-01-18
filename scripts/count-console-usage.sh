#!/bin/bash

echo "📊 Console Usage Statistics"
echo "================================"
echo ""

# Count total console statements
total=$(grep -r "console\." --include="*.ts" --include="*.tsx" . | wc -l)
echo "Total console statements: $total"

# Count by directory
echo ""
echo "By directory:"
echo "  API routes:    $(grep -r "console\." --include="*.ts" app/api/ 2>/dev/null | wc -l)"
echo "  Libraries:     $(grep -r "console\." --include="*.ts" lib/ 2>/dev/null | wc -l)"
echo "  Components:    $(grep -r "console\." --include="*.tsx" components/ 2>/dev/null | wc -l)"
echo "  Pages:         $(grep -r "console\." --include="*.tsx" app/ 2>/dev/null | wc -l)"
echo "  Scripts:       $(grep -r "console\." --include="*.ts" scripts/ 2>/dev/null | wc -l)"

# Count by type
echo ""
echo "By type:"
echo "  console.log:   $(grep -r "console\.log" --include="*.ts" --include="*.tsx" . | wc -l)"
echo "  console.error: $(grep -r "console\.error" --include="*.ts" --include="*.tsx" . | wc -l)"
echo "  console.warn:  $(grep -r "console\.warn" --include="*.ts" --include="*.tsx" . | wc -l)"
echo "  console.debug: $(grep -r "console\.debug" --include="*.ts" --include="*.tsx" . | wc -l)"

echo ""
echo "Target: <100 by Week 8"
echo "================================"
