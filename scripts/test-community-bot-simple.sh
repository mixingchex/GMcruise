#!/bin/bash
# 커뮤니티 봇 간단 테스트 스크립트

echo "🧪 커뮤니티 봇 테스트 시작..."
echo ""

# 서버가 실행 중인지 확인
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "❌ 서버가 실행되지 않았습니다!"
  echo ""
  echo "먼저 개발 서버를 시작하세요:"
  echo "  npm run dev"
  echo ""
  echo "또는 다른 터미널에서 실행하세요."
  exit 1
fi

echo "✅ 서버 연결 확인 완료"
echo ""

API_URL="http://localhost:3000"

echo "1️⃣ GET 요청 테스트 (실제 저장 안 함, 개발 환경에서만 작동)..."
echo "요청 URL: $API_URL/api/cron/community-bot"
echo ""

response=$(curl -s -X GET "$API_URL/api/cron/community-bot")
echo "응답:"
echo "$response" | jq . 2>/dev/null || echo "$response"
echo ""

if echo "$response" | grep -q '"ok":true'; then
  echo "✅ GET 테스트 성공!"
else
  echo "❌ GET 테스트 실패 또는 프로덕션 환경"
  echo "   (프로덕션 환경에서는 GET 메서드가 비활성화되어 있습니다)"
fi

echo ""
echo "2️⃣ POST 요청 테스트 (실제 저장)를 하려면:"
echo "   ./scripts/test-community-bot.sh"
echo "   또는"
echo "   curl -X POST http://localhost:3000/api/cron/community-bot \\"
echo "     -H 'Authorization: Bearer your-secret-key-here'"
echo ""










