#!/bin/bash
# Neon Point-in-Time Recovery를 사용한 DB 복원 스크립트
# 사용법: ./scripts/restore-neon-pitr.sh

set -e

echo "🔄 Neon Point-in-Time Recovery를 사용한 DB 복원"
echo "================================================"
echo ""

# .env 파일에서 DATABASE_URL 확인
if [ ! -f .env ]; then
    echo "❌ 오류: .env 파일을 찾을 수 없습니다."
    exit 1
fi

DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
    echo "❌ 오류: .env 파일에서 DATABASE_URL을 찾을 수 없습니다."
    exit 1
fi

echo "현재 DATABASE_URL:"
echo "$DATABASE_URL" | sed 's/:[^:]*@/:***@/'  # 비밀번호 마스킹
echo ""

# Neon CLI 설치 확인
if ! command -v neonctl &> /dev/null; then
    echo "📦 Neon CLI가 설치되어 있지 않습니다."
    echo "설치 중..."
    npm install -g neonctl
    echo "✅ 설치 완료"
    echo ""
fi

# Neon CLI 로그인 확인
echo "🔐 Neon CLI 인증 확인 중..."
if ! neonctl auth status &> /dev/null; then
    echo "로그인이 필요합니다. 브라우저가 열립니다..."
    neonctl auth
else
    echo "✅ 이미 로그인되어 있습니다."
fi
echo ""

# 프로젝트 정보 추출 (DATABASE_URL에서)
# 예: postgresql://user:pass@ep-xxx-xxx.region.aws.neon.tech/dbname
PROJECT_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*@[^/]*\/\([^?]*\).*/\1/p' || echo "")
BRANCH_NAME="restore-20251120-0928"
PITR_TIME="2025-11-20T09:28:00Z"

echo "📋 복원 정보:"
echo "   브랜치 이름: $BRANCH_NAME"
echo "   복원 시점: $PITR_TIME (2025-11-20 09:28:00)"
echo ""

read -p "계속하시겠습니까? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "복원이 취소되었습니다."
    exit 0
fi

echo ""
echo "🔍 프로젝트 목록 확인 중..."
PROJECTS=$(neonctl projects list --output json 2>/dev/null || echo "[]")

if [ "$PROJECTS" = "[]" ] || [ -z "$PROJECTS" ]; then
    echo "⚠️  프로젝트를 자동으로 찾을 수 없습니다."
    echo ""
    echo "수동으로 프로젝트 ID를 입력하거나, Neon 대시보드에서 직접 복원하세요:"
    echo "1. https://console.neon.tech 접속"
    echo "2. 프로젝트 선택"
    echo "3. Branches → Create Branch"
    echo "4. Point-in-Time Recovery 선택"
    echo "5. 날짜/시간: 2025-11-20 09:28:00"
    echo "6. 브랜치 이름: $BRANCH_NAME"
    echo "7. 생성 후 연결 문자열을 .env 파일에 업데이트"
    echo ""
    exit 0
fi

# 프로젝트 목록 표시
echo "발견된 프로젝트:"
echo "$PROJECTS" | grep -o '"name":"[^"]*"' | sed 's/"name":"\(.*\)"/  - \1/' || echo "  (프로젝트 목록 파싱 실패)"
echo ""

# 첫 번째 프로젝트 사용 (또는 사용자 입력 요청)
read -p "프로젝트 ID를 입력하세요 (또는 Enter로 대시보드에서 수동 복원): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo ""
    echo "📖 Neon 대시보드에서 수동 복원 방법:"
    echo "================================================"
    echo "1. https://console.neon.tech 접속"
    echo "2. 프로젝트 선택"
    echo "3. 왼쪽 메뉴에서 'Branches' 클릭"
    echo "4. 'Create Branch' 버튼 클릭"
    echo "5. 'Point-in-Time Recovery' 옵션 선택"
    echo "6. 날짜/시간 입력: 2025-11-20 09:28:00"
    echo "7. 브랜치 이름: $BRANCH_NAME"
    echo "8. 'Create Branch' 클릭"
    echo ""
    echo "9. 생성된 브랜치의 연결 문자열 복사"
    echo "10. .env 파일의 DATABASE_URL 업데이트"
    echo ""
    echo "또는 다음 명령어로 자동 복원:"
    echo "  neonctl branches create --project-id <PROJECT_ID> --name $BRANCH_NAME --point-in-time $PITR_TIME"
    echo ""
    exit 0
fi

echo ""
echo "🔄 Point-in-Time Recovery 브랜치 생성 중..."
echo "   프로젝트 ID: $PROJECT_ID"
echo "   브랜치 이름: $BRANCH_NAME"
echo "   복원 시점: $PITR_TIME"
echo ""

# 브랜치 생성
BRANCH_INFO=$(neonctl branches create \
    --project-id "$PROJECT_ID" \
    --name "$BRANCH_NAME" \
    --point-in-time "$PITR_TIME" \
    --output json 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ 브랜치 생성 실패:"
    echo "$BRANCH_INFO"
    echo ""
    echo "수동으로 대시보드에서 복원하세요."
    exit 1
fi

echo "✅ 브랜치 생성 완료!"
echo ""

# 연결 문자열 가져오기
echo "🔗 연결 문자열 가져오는 중..."
CONNECTION_STRING=$(neonctl connection-string \
    --project-id "$PROJECT_ID" \
    --branch "$BRANCH_NAME" \
    --output json 2>/dev/null | grep -o '"connectionString":"[^"]*"' | sed 's/"connectionString":"\(.*\)"/\1/' || echo "")

if [ -z "$CONNECTION_STRING" ]; then
    echo "⚠️  연결 문자열을 자동으로 가져올 수 없습니다."
    echo ""
    echo "다음 명령어로 연결 문자열을 확인하세요:"
    echo "  neonctl connection-string --project-id $PROJECT_ID --branch $BRANCH_NAME"
    echo ""
    echo "또는 Neon 대시보드에서 확인:"
    echo "  https://console.neon.tech"
    echo ""
else
    echo "✅ 연결 문자열:"
    echo "$CONNECTION_STRING" | sed 's/:[^:]*@/:***@/'  # 비밀번호 마스킹
    echo ""
    
    read -p ".env 파일의 DATABASE_URL을 업데이트하시겠습니까? (yes/no): " update_env
    
    if [ "$update_env" = "yes" ]; then
        # .env 파일 백업
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        echo "✅ .env 파일 백업 완료"
        
        # DATABASE_URL 업데이트
        if grep -q "^DATABASE_URL=" .env; then
            sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$CONNECTION_STRING\"|" .env
            echo "✅ .env 파일의 DATABASE_URL 업데이트 완료"
        else
            echo "DATABASE_URL=\"$CONNECTION_STRING\"" >> .env
            echo "✅ .env 파일에 DATABASE_URL 추가 완료"
        fi
        echo ""
        echo "⚠️  중요: 애플리케이션을 재시작하세요!"
    else
        echo ""
        echo "수동으로 .env 파일을 업데이트하세요:"
        echo "  DATABASE_URL=\"$CONNECTION_STRING\""
    fi
fi

echo ""
echo "✅ 복원 완료!"
echo ""
echo "다음 단계:"
echo "1. Prisma 클라이언트 재생성: npx prisma generate"
echo "2. 마이그레이션 상태 확인: npx prisma migrate status"
echo "3. 애플리케이션 재시작"
echo ""








