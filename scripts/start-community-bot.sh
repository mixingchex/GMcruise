#!/bin/bash
# 커뮤니티 봇 자동 실행 스크립트 (5분마다)
# 사용법: ./scripts/start-community-bot.sh

CRON_SECRET="${CRON_SECRET:-your-secret-key-here}"
API_URL="${API_URL:-http://localhost:3000}"

echo "🤖 커뮤니티 봇 시작..."
echo "API URL: $API_URL"
echo "5분마다 게시글과 댓글을 자동 생성합니다."
echo "중지하려면 Ctrl+C를 누르세요."
echo ""

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 봇 실행 중..."
  
  response=$(curl -s -X POST "$API_URL/api/cron/community-bot" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q '"ok":true'; then
    echo "✅ 성공: $response"
  else
    echo "❌ 실패: $response"
  fi
  
  echo "다음 실행까지 5분 대기..."
  sleep 300  # 5분 = 300초
done










