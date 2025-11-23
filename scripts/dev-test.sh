#!/usr/bin/env bash
set -eu

# 테스트 환경 개발 서버 실행 스크립트
# DATABASE_URL_TEST 환경 변수를 DATABASE_URL로 복사하여 서버를 실행합니다.

# .env 파일에서 환경 변수 로드 (export가 없는 경우에도 작동)
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep '=' | xargs)
fi

echo "────────────────────────────────────────────"
echo "  🧪 테스트 환경 개발 서버 시작"
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

echo "✅ DATABASE_URL_TEST를 DATABASE_URL로 설정"
echo "   연결 대상: ${DATABASE_URL_TEST%%@*}" # 사용자 정보만 표시 (비밀번호 숨김)
echo ""

# 1) 기존 next/node 잔여 프로세스 정리(있어도 없어도 조용히)
pkill -f "next dev"       >/dev/null 2>&1 || true
pkill -f "next-server"    >/dev/null 2>&1 || true
pkill -f "node .*next"    >/dev/null 2>&1 || true

# 2) 기준 포트 (원하면 .env.local 에 BASE_PORT=3000 둘 수 있음)
BASE_PORT="${BASE_PORT:-3000}"
P="$BASE_PORT"

# 3) 사용 중이 아닌 포트 찾기
is_in_use () {
  # ss 가 포트 열려있으면 한 줄 이상을 출력 -> 사용 중 판단
  ss -ltn 2>/dev/null | awk '{print $4}' | grep -q ":$1\$"
}

while is_in_use "$P"; do
  P=$((P+1))
done

export PORT="$P"

echo "────────────────────────────────────────────"
echo "  ✅ Free port found: $PORT"
echo "  ▶️  Starting Next.js (TEST MODE) on http://localhost:$PORT"
echo "  📦 Using DATABASE_URL_TEST"
echo "────────────────────────────────────────────"

# 4) 실제 실행
exec npm exec next dev . --hostname 0.0.0.0 -p "$PORT"

