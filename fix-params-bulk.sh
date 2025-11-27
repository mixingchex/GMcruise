#!/bin/bash

# Next.js 15 params Promise 일괄 수정 스크립트

# 수정할 파일 목록
files=(
  "app/api/admin/chat-bot/questions/[id]/route.ts"
  "app/api/admin/chat-bot/templates/[id]/route.ts"
  "app/api/admin/chat-bot/flows/[id]/copy/route.ts"
  "app/api/admin/chat-bot/flows/[id]/route.ts"
  "app/api/admin/chat-bot/flows/[id]/nodes/route.ts"
  "app/api/admin/certificate-approvals/[id]/reject/route.ts"
  "app/api/admin/certificate-approvals/[id]/approve/route.ts"
  "app/api/admin/products/[productCode]/route.ts"
  "app/api/admin/customers/[userId]/journey/route.ts"
  "app/api/admin/customers/[userId]/purchase-info/route.ts"
  "app/api/admin/customers/[userId]/notes/route.ts"
  "app/api/admin/customers/[userId]/notes/[noteId]/route.ts"
  "app/api/admin/mall-customers/[userId]/route.ts"
  "app/api/admin/mall-customers/[userId]/lock/route.ts"
  "app/api/admin/mall-customers/[userId]/reset-password/route.ts"
  "app/api/admin/mall-admins/[adminId]/route.ts"
  "app/api/admin/test-customers/[userId]/reactivate/route.ts"
  "app/api/admin/purchase-customers/[userId]/trip-info/route.ts"
  "app/api/admin/rePurchase/[triggerId]/convert/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # 패턴 1: { params }: { params: { id: string } } → { params }: { params: Promise<{ id: string }> }
    sed -i 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' "$file"

    # 패턴 2: { params }: { params: { userId: string } } → { params }: { params: Promise<{ userId: string }> }
    sed -i 's/{ params }: { params: { userId: string } }/{ params }: { params: Promise<{ userId: string }> }/g' "$file"

    # 패턴 3: { params }: { params: { productCode: string } } → { params }: { params: Promise<{ productCode: string }> }
    sed -i 's/{ params }: { params: { productCode: string } }/{ params }: { params: Promise<{ productCode: string }> }/g' "$file"

    # 패턴 4: { params }: { params: { adminId: string } } → { params }: { params: Promise<{ adminId: string }> }
    sed -i 's/{ params }: { params: { adminId: string } }/{ params }: { params: Promise<{ adminId: string }> }/g' "$file"

    # 패턴 5: { params }: { params: { triggerId: string } } → { params }: { params: Promise<{ triggerId: string }> }
    sed -i 's/{ params }: { params: { triggerId: string } }/{ params }: { params: Promise<{ triggerId: string }> }/g' "$file"

    # 패턴 6: { userId: string; noteId: string } → { userId: string; noteId: string } (Promise 추가)
    sed -i 's/{ params }: { params: { userId: string; noteId: string } }/{ params }: { params: Promise<{ userId: string; noteId: string }> }/g' "$file"

    echo "✓ Updated: $file"
  else
    echo "✗ File not found: $file"
  fi
done

echo ""
echo "Phase 1 complete! Now need to add 'await params' in function bodies."
echo "This requires manual review or more complex sed patterns."
