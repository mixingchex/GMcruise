#!/bin/bash
# .env 파일의 DATABASE_URL 업데이트 스크립트
# 사용법: ./scripts/update-database-url.sh "<새로운_연결_문자열>"

set -e

NEW_URL=$1

if [ -z "$NEW_URL" ]; then
    echo "사용법: $0 \"<새로운_DATABASE_URL>\""
    echo ""
    echo "예시:"
    echo "  $0 \"postgresql://user:pass@host/db?sslmode=require\""
    exit 1
fi

if [ ! -f .env ]; then
    echo "❌ 오류: .env 파일을 찾을 수 없습니다."
    exit 1
fi

# 백업
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
cp .env "$BACKUP_FILE"
echo "✅ .env 파일 백업 완료: $BACKUP_FILE"

# DATABASE_URL 업데이트
if grep -q "^DATABASE_URL=" .env; then
    # 기존 DATABASE_URL이 있으면 교체
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$NEW_URL\"|" .env
    echo "✅ .env 파일의 DATABASE_URL 업데이트 완료"
else
    # 없으면 추가
    echo "DATABASE_URL=\"$NEW_URL\"" >> .env
    echo "✅ .env 파일에 DATABASE_URL 추가 완료"
fi

echo ""
echo "업데이트된 DATABASE_URL:"
grep "^DATABASE_URL=" .env | sed 's/:[^:]*@/:***@/'  # 비밀번호 마스킹
echo ""
echo "다음 단계:"
echo "1. npx prisma generate"
echo "2. npx prisma migrate status"
echo "3. 애플리케이션 재시작"








