#!/bin/bash
# Neon → Supabase 데이터 마이그레이션 스크립트
# 사용법:
#   export OLD_DATABASE_URL="postgresql://...neon..."
#   export DIRECT_URL="postgresql://...supabase...direct..."
#   bash scripts/migrate-to-supabase.sh

set -e

echo "========================================"
echo "  Neon → Supabase 마이그레이션"
echo "========================================"
echo ""

# 사전 확인
if [ -z "$OLD_DATABASE_URL" ]; then
  echo "❌ OLD_DATABASE_URL 환경변수를 설정하세요"
  echo "   export OLD_DATABASE_URL='현재 Neon DB URL'"
  exit 1
fi

if [ -z "$DIRECT_URL" ]; then
  echo "❌ DIRECT_URL 환경변수를 설정하세요 (Supabase Direct URL)"
  echo "   export DIRECT_URL='postgresql://postgres.xxx:PASSWORD@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'"
  exit 1
fi

# pg_dump 설치 확인
if ! command -v pg_dump &> /dev/null; then
  echo "❌ pg_dump가 없습니다. PostgreSQL 클라이언트를 설치하세요:"
  echo "   Ubuntu: sudo apt-get install postgresql-client"
  echo "   Mac: brew install postgresql"
  exit 1
fi

# 1. 백업 생성
BACKUP_FILE="backups/neon_backup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p backups
echo "📦 [1/4] Neon DB 덤프 중..."
echo "   저장 위치: $BACKUP_FILE"
pg_dump "$OLD_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --schema=public \
  -f "$BACKUP_FILE"
BACKUP_SIZE=$(wc -c < "$BACKUP_FILE")
echo "✅ 덤프 완료 (크기: ${BACKUP_SIZE} bytes)"

# 2. Prisma 스키마를 Supabase에 적용
echo ""
echo "🔧 [2/4] Supabase에 Prisma 스키마 적용 중..."
DATABASE_URL="$DIRECT_URL" npx prisma db push --accept-data-loss 2>&1 | tail -5
echo "✅ 스키마 적용 완료"

# 3. 데이터 복원
echo ""
echo "📤 [3/4] Supabase에 데이터 복원 중..."
echo "   (시간이 걸릴 수 있습니다...)"
psql "$DIRECT_URL" \
  --quiet \
  -f "$BACKUP_FILE" \
  2>&1 | grep -v "^SET\|^--\|^$" | tail -10
echo "✅ 데이터 복원 완료"

# 4. 검증
echo ""
echo "🔍 [4/4] 연결 테스트..."
USER_COUNT=$(psql "$DIRECT_URL" -t -c 'SELECT COUNT(*) FROM "User";' 2>/dev/null | tr -d ' ' || echo "0")
echo "   User 테이블 레코드 수: ${USER_COUNT}"

echo ""
echo "========================================"
echo "  ✅ 마이그레이션 완료!"
echo "========================================"
echo ""
echo "다음 단계:"
echo "  1. .env 파일의 DATABASE_URL을 Supabase pooler URL로 교체"
echo "  2. .env 파일에 DIRECT_URL 추가"
echo "  3. npm run dev 로 로컬 테스트"
echo "  4. Vercel 환경변수 업데이트"
echo ""
echo "백업 파일: $BACKUP_FILE (보관하세요)"
