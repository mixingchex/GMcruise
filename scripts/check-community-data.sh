#!/bin/bash
# 커뮤니티 게시글/댓글 데이터 확인 스크립트

echo "🔍 커뮤니티 데이터 확인 중..."
echo ""

# DATABASE_URL만 안전하게 추출 (.env 파일의 여러 줄 값 처리)
if [ -f .env ]; then
  # DATABASE_URL=로 시작하는 줄만 추출하고, = 뒤의 값 전체를 가져옴
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | sed 's/^DATABASE_URL=//' | sed 's/^"//' | sed 's/"$//')
  export DATABASE_URL
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL 환경 변수가 설정되지 않았습니다."
  echo "💡 .env 파일에서 DATABASE_URL을 확인해주세요."
  exit 1
fi

echo "📊 CommunityPost 데이터:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total, COUNT(CASE WHEN \"isDeleted\" = false THEN 1 END) as active, COUNT(CASE WHEN \"isDeleted\" = true THEN 1 END) as deleted FROM \"CommunityPost\";" 2>/dev/null || echo "데이터베이스 접근 불가"

echo ""
echo "📊 CommunityComment 데이터:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total FROM \"CommunityComment\";" 2>/dev/null || echo "데이터베이스 접근 불가"

echo ""
echo "📊 카테고리별 게시글 수:"
psql "$DATABASE_URL" -c "SELECT category, COUNT(*) as count FROM \"CommunityPost\" WHERE \"isDeleted\" = false GROUP BY category ORDER BY count DESC;" 2>/dev/null || echo "데이터베이스 접근 불가"

echo ""
echo "✅ 확인 완료!"

