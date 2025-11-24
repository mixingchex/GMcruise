#!/bin/bash
# 지니가이드 3일 체험 관련 파일 변경 감지 스크립트

echo "🔍 지니가이드 3일 체험 관련 파일 변경 확인 중..."
echo ""

# 보호 대상 파일 목록
PROTECTED_FILES=(
  "app/login-test/page.tsx"
  "app/api/auth/login/route.ts"
)

TAG="v1.0.0-trial-stable"
HAS_CHANGES=false

for file in "${PROTECTED_FILES[@]}"; do
  if [ -f "$file" ]; then
    # 태그 버전과 현재 버전 비교
    if git diff "$TAG" -- "$file" | grep -q "^+"; then
      echo "⚠️  변경 감지: $file"
      HAS_CHANGES=true
    else
      echo "✅ 변경 없음: $file"
    fi
  else
    echo "❌ 파일 없음: $file"
  fi
done

echo ""
if [ "$HAS_CHANGES" = true ]; then
  echo "⚠️  경고: 보호 대상 파일이 변경되었습니다!"
  echo "📖 TRIAL_SYSTEM_PROTECTION.md 파일을 확인하세요."
  exit 1
else
  echo "✅ 모든 보호 대상 파일이 안전합니다."
  exit 0
fi










