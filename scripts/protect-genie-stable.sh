#!/bin/bash
# 크루즈가이드 지니 안정 버전 보호 스크립트
# 이 스크립트는 중요한 파일들이 변경되지 않았는지 확인합니다.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAG_NAME="v1.0.0-genie-stable"
PROTECTED_FILES=(
  "app/onboarding/page.tsx"
  "components/LogoutButton.tsx"
  "app/page.tsx"
  "app/login/page.tsx"
  "app/dormant/page.tsx"
  "app/api/auth/logout/route.ts"
)

echo "🔒 크루즈가이드 지니 안정 버전 보호 체크 시작..."
echo "태그: $TAG_NAME"
echo ""

# Git 태그 존재 확인
if ! git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  echo "❌ 경고: Git 태그 '$TAG_NAME'가 존재하지 않습니다!"
  echo "   백업 태그를 생성하세요: git tag -a $TAG_NAME -m '크루즈가이드 지니 안정 버전'"
  exit 1
fi

# 보호된 파일들 확인
CHANGED_FILES=()
for file in "${PROTECTED_FILES[@]}"; do
  filepath="$PROJECT_ROOT/$file"
  if [ ! -f "$filepath" ]; then
    echo "⚠️  경고: 파일이 존재하지 않습니다: $file"
    continue
  fi
  
  # 태그와 현재 버전 비교
  if ! git diff --quiet "$TAG_NAME" -- "$file" 2>/dev/null; then
    CHANGED_FILES+=("$file")
  fi
done

if [ ${#CHANGED_FILES[@]} -eq 0 ]; then
  echo "✅ 모든 보호된 파일이 안정 버전과 동일합니다."
  exit 0
else
  echo "❌ 경고: 다음 파일들이 안정 버전에서 변경되었습니다:"
  for file in "${CHANGED_FILES[@]}"; do
    echo "   - $file"
  done
  echo ""
  echo "⚠️  이 파일들은 크루즈가이드 지니의 핵심 기능과 관련이 있습니다."
  echo "   변경 사항을 검토하세요!"
  exit 1
fi










