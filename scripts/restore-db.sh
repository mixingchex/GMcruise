#!/bin/bash
# PostgreSQL DB 복원 스크립트
# 사용법: ./scripts/restore-db.sh <덤프파일경로>

set -e

DUMP_FILE=$1

if [ -z "$DUMP_FILE" ]; then
    echo "사용법: $0 <덤프파일경로>"
    echo "예시: $0 /path/to/db_backup_20251120.sql"
    exit 1
fi

if [ ! -f "$DUMP_FILE" ]; then
    echo "오류: 덤프 파일을 찾을 수 없습니다: $DUMP_FILE"
    exit 1
fi

# .env 파일에서 DATABASE_URL 읽기
if [ ! -f .env ]; then
    echo "오류: .env 파일을 찾을 수 없습니다."
    exit 1
fi

# DATABASE_URL 파싱
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
    echo "오류: .env 파일에서 DATABASE_URL을 찾을 수 없습니다."
    exit 1
fi

echo "=== PostgreSQL DB 복원 시작 ==="
echo "덤프 파일: $DUMP_FILE"
echo "데이터베이스: $DATABASE_URL"
echo ""
echo "⚠️  경고: 이 작업은 현재 DB의 모든 데이터를 덮어씁니다!"
read -p "계속하시겠습니까? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "복원이 취소되었습니다."
    exit 0
fi

# PostgreSQL 연결 정보 추출
# DATABASE_URL 형식: postgresql://user:password@host:port/database
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# 포트가 없으면 기본값 5432 사용
if [ -z "$DB_PORT" ]; then
    DB_PORT=5432
fi

echo ""
echo "DB 연결 정보:"
echo "  호스트: $DB_HOST"
echo "  포트: $DB_PORT"
echo "  데이터베이스: $DB_NAME"
echo "  사용자: $DB_USER"
echo ""

# 덤프 파일 형식 확인 (.sql 또는 .dump)
if [[ "$DUMP_FILE" == *.dump ]]; then
    echo "pg_restore를 사용하여 복원합니다..."
    PGPASSWORD=$DB_PASS pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --clean --if-exists --no-owner --no-acl "$DUMP_FILE"
else
    echo "psql을 사용하여 복원합니다..."
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$DUMP_FILE"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DB 복원이 완료되었습니다!"
    echo ""
    echo "다음 단계:"
    echo "1. Prisma 클라이언트 재생성: npx prisma generate"
    echo "2. 마이그레이션 상태 확인: npx prisma migrate status"
else
    echo ""
    echo "❌ DB 복원 중 오류가 발생했습니다."
    exit 1
fi








