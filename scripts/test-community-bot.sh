#!/bin/bash
# 커뮤니티 봇 테스트 스크립트

echo "🧪 커뮤니티 봇 테스트 시작..."
echo ""

API_URL="${API_URL:-http://localhost:3000}"

echo "1️⃣ GET 요청 테스트 (실제 저장 안 함)..."
response=$(curl -s -X GET "$API_URL/api/cron/community-bot")
echo "응답: $response"
echo ""

if echo "$response" | grep -q '"ok":true'; then
  echo "✅ GET 테스트 성공!"
else
  echo "❌ GET 테스트 실패"
  exit 1
fi

echo ""
echo "2️⃣ POST 요청 테스트 (실제 저장)..."
read -p "CRON_SECRET을 입력하세요 (기본값: your-secret-key-here): " cron_secret
cron_secret=${cron_secret:-your-secret-key-here}

response=$(curl -s -X POST "$API_URL/api/cron/community-bot" \
  -H "Authorization: Bearer $cron_secret" \
  -H "Content-Type: application/json")

echo "응답: $response"
echo ""

if echo "$response" | grep -q '"ok":true'; then
  echo "✅ POST 테스트 성공! 게시글과 댓글이 생성되었습니다."
else
  echo "❌ POST 테스트 실패"
  echo "응답: $response"
  exit 1
fi

echo ""
echo "3️⃣ 데이터 확인..."
node scripts/check-community-data-safe.js

echo ""
echo "✅ 모든 테스트 완료!"










