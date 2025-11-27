#!/bin/bash

# Phase 2: 함수 본문에서 params 사용 부분 수정

echo "Fixing params usage in function bodies..."

# 패턴: const id = parseInt(params.id) → const { id: idStr } = await params; const id = parseInt(idStr)
find app/api/admin -name "route.ts" -type f | while read file; do
  if grep -q "const.*=.*parseInt(params\.id)" "$file" 2>/dev/null; then
    echo "Fixing $file (id)..."
    sed -i 's/const id = parseInt(params\.id)/const { id: idStr } = await params; const id = parseInt(idStr)/g' "$file"
    sed -i 's/const flowId = parseInt(params\.id)/const { id: idStr } = await params; const flowId = parseInt(idStr)/g' "$file"
  fi

  if grep -q "const.*=.*parseInt(params\.userId)" "$file" 2>/dev/null; then
    echo "Fixing $file (userId)..."
    sed -i 's/const userId = parseInt(params\.userId)/const { userId: userIdStr } = await params; const userId = parseInt(userIdStr)/g' "$file"
  fi

  if grep -q "const.*=.*parseInt(params\.productCode)" "$file" 2>/dev/null; then
    echo "Fixing $file (productCode)..."
    sed -i 's/const productCode = parseInt(params\.productCode)/const { productCode: productCodeStr } = await params; const productCode = productCodeStr/g' "$file"
  fi

  if grep -q "const.*=.*params\.productCode" "$file" 2>/dev/null; then
    echo "Fixing $file (productCode string)..."
    sed -i 's/const productCode = params\.productCode/const { productCode } = await params/g' "$file"
  fi

  if grep -q "const.*=.*parseInt(params\.adminId)" "$file" 2>/dev/null; then
    echo "Fixing $file (adminId)..."
    sed -i 's/const adminId = parseInt(params\.adminId)/const { adminId: adminIdStr } = await params; const adminId = parseInt(adminIdStr)/g' "$file"
  fi

  if grep -q "const.*=.*parseInt(params\.triggerId)" "$file" 2>/dev/null; then
    echo "Fixing $file (triggerId)..."
    sed -i 's/const triggerId = parseInt(params\.triggerId)/const { triggerId: triggerIdStr } = await params; const triggerId = parseInt(triggerIdStr)/g' "$file"
  fi

  # noteId와 userId 둘 다 있는 경우
  if grep -q "const.*=.*parseInt(params\.noteId)" "$file" 2>/dev/null; then
    echo "Fixing $file (noteId)..."
    sed -i 's/const noteId = parseInt(params\.noteId)/const { userId: userIdStr, noteId: noteIdStr } = await params; const userId = parseInt(userIdStr); const noteId = parseInt(noteIdStr)/g' "$file"
    sed -i 's/const userId = parseInt(params\.userId)/\/\/ userId already extracted/g' "$file"
  fi
done

echo "✓ Phase 2 complete!"
