#!/bin/bash

echo "🚀 Console → Logger Wrapper 마이그레이션 시작"
echo ""
echo "⚠️  주의: 이 스크립트는 console.log를 logger wrapper로 변환합니다"
echo "변환 후 USE_WINSTON=false 상태에서는 기존과 동일하게 작동합니다"
echo ""

# Dry run 옵션 확인
DRY_RUN=""
if [ "$1" == "--dry" ]; then
  DRY_RUN="--dry --print"
  echo "📋 DRY RUN 모드 (실제 파일 변경 없음)"
else
  echo "⚠️  실제 파일이 변경됩니다!"
  echo "계속하려면 Enter를 누르세요 (취소: Ctrl+C)"
  read
fi

echo ""
echo "📦 Tier 1: Payment APIs (126개 console 문)"
npx jscodeshift -t scripts/migrate-console-to-winston.js \
  "app/api/payment/**/*.ts" \
  --parser=tsx \
  --ignore-pattern="**/node_modules/**" \
  $DRY_RUN

echo ""
echo "✅ 마이그레이션 완료!"
echo ""
echo "다음 단계:"
echo "1. git status로 변경사항 확인"
echo "2. npm run build로 빌드 테스트"
echo "3. USE_WINSTON=false로 기존 동작 확인"
echo "4. USE_WINSTON=true로 Winston 동작 확인"
