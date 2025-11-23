#!/usr/bin/env bash
set -eu

# 테스트 데이터베이스 설정 스크립트
# DATABASE_URL_TEST 환경 변수를 사용하여 Prisma 스키마를 새 DB에 푸시합니다.

# .env 파일에서 환경 변수 로드 (export가 없는 경우에도 작동)
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep '=' | xargs)
fi

echo "────────────────────────────────────────────"
echo "  📦 테스트 데이터베이스 설정 시작"
echo "────────────────────────────────────────────"

# DATABASE_URL_TEST 환경 변수 확인
if [ -z "${DATABASE_URL_TEST:-}" ]; then
  echo "❌ 오류: DATABASE_URL_TEST 환경 변수가 설정되지 않았습니다."
  echo ""
  echo "💡 .env 파일에 DATABASE_URL_TEST 변수를 추가하세요:"
  echo "   DATABASE_URL_TEST=\"postgresql://user:password@localhost:5432/test_dbname\""
  exit 1
fi

# 기존 DATABASE_URL 백업
ORIGINAL_DATABASE_URL="${DATABASE_URL:-}"

# DATABASE_URL을 DATABASE_URL_TEST로 임시 변경
export DATABASE_URL="$DATABASE_URL_TEST"

echo "✅ DATABASE_URL_TEST 연결 확인"
echo "   연결 대상: ${DATABASE_URL_TEST%%@*}" # 사용자 정보만 표시 (비밀번호 숨김)
echo ""

# Prisma 스키마 푸시 실행
echo "📤 Prisma 스키마를 테스트 데이터베이스에 푸시 중..."
npx prisma db push --accept-data-loss --skip-generate

echo ""
echo "────────────────────────────────────────────"
echo "  ✅ 테스트 데이터베이스 설정 완료!"
echo "────────────────────────────────────────────"

# DATABASE_URL 복원 (원래 값이 있었다면)
if [ -n "$ORIGINAL_DATABASE_URL" ]; then
  export DATABASE_URL="$ORIGINAL_DATABASE_URL"
fi

