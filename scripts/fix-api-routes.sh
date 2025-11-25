#!/bin/bash

# API 라우트 파일들을 찾아서 dynamic export 추가

echo "🔧 API 라우트에 dynamic export 추가 중..."

count=0

# app/api 디렉토리의 모든 route.ts 파일 찾기
find app/api -name "route.ts" -type f | while read file; do
  # 파일 상단에 이미 'export const dynamic' 이 있는지 확인
  if ! grep -q "export const dynamic" "$file"; then
    # 파일의 첫 번째 줄에 추가 (import 문 전에)
    # 임시 파일 생성
    temp_file="${file}.tmp"

    # 파일 내용 읽기
    content=$(cat "$file")

    # 새 내용 작성
    echo "export const dynamic = 'force-dynamic';" > "$temp_file"
    echo "" >> "$temp_file"
    echo "$content" >> "$temp_file"

    # 원본 파일로 교체
    mv "$temp_file" "$file"

    count=$((count + 1))
    echo "✅ $file"
  fi
done

echo ""
echo "🎉 완료! $count 개의 파일을 수정했습니다."
