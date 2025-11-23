#!/bin/bash
# 커뮤니티 게시글/댓글 데이터 확인 스크립트

echo "🔍 커뮤니티 데이터 확인 중..."
echo ""

# 환경 변수 로드
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL 환경 변수가 설정되지 않았습니다."
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

