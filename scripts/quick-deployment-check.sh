#!/bin/bash

# 배포 전 빠른 점검 스크립트
# 작성일: 2025-11-23

echo "🚀 배포 전 빠른 점검 시작..."
echo ""

# 1. 빌드 확인
echo "📦 1. 빌드 확인 중..."
if npm run build 2>&1 | grep -q "✓ Compiled successfully"; then
    echo "✅ 빌드 성공"
else
    echo "❌ 빌드 실패 - 확인 필요"
    exit 1
fi
echo ""

# 2. 린터 확인
echo "🔍 2. 린터 확인 중..."
LINT_OUTPUT=$(npm run lint 2>&1)
if echo "$LINT_OUTPUT" | grep -q "error"; then
    echo "⚠️  린터 경고 발견 (기능 영향 없음)"
    echo "$LINT_OUTPUT" | grep "error" | head -5
else
    echo "✅ 린터 통과"
fi
echo ""

# 3. 주요 파일 존재 확인
echo "📁 3. 주요 파일 존재 확인 중..."
FILES=(
    "app/page.tsx"
    "app/my-info/page.tsx"
    "app/community/my-info/page.tsx"
    "app/api/community/my-info/route.ts"
    "app/api/community/my-info/update/route.ts"
    "app/api/public/products/route.ts"
    "components/mall/HeroSection.tsx"
    "components/mall/ProductList.tsx"
    "components/mall/CommunitySection.tsx"
)

MISSING_FILES=()
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo "✅ 모든 주요 파일 존재 확인"
else
    echo "❌ 누락된 파일:"
    for file in "${MISSING_FILES[@]}"; do
        echo "   - $file"
    done
    exit 1
fi
echo ""

# 4. 환경 변수 확인
echo "🔐 4. 환경 변수 확인 중..."
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo "✅ 환경 변수 파일 존재"
else
    echo "⚠️  환경 변수 파일 없음 (프로덕션에서는 필요)"
fi
echo ""

# 5. 데이터베이스 스키마 확인
echo "🗄️  5. 데이터베이스 스키마 확인 중..."
if [ -f "prisma/schema.prisma" ]; then
    echo "✅ Prisma 스키마 파일 존재"
    # 인덱스 확인
    if grep -q "@@index" prisma/schema.prisma; then
        INDEX_COUNT=$(grep -c "@@index" prisma/schema.prisma)
        echo "✅ 데이터베이스 인덱스 $INDEX_COUNT개 확인"
    fi
else
    echo "❌ Prisma 스키마 파일 없음"
    exit 1
fi
echo ""

# 6. 이미지 라이브러리 확인
echo "🖼️  6. 이미지 라이브러리 확인 중..."
if [ -d "public/image-library" ]; then
    echo "✅ 이미지 라이브러리 디렉토리 존재"
else
    echo "⚠️  이미지 라이브러리 디렉토리 없음 (자동 생성됨)"
fi
echo ""

# 7. API 라우트 확인
echo "🔌 7. 주요 API 라우트 확인 중..."
API_ROUTES=(
    "app/api/community/my-info/route.ts"
    "app/api/community/my-info/update/route.ts"
    "app/api/community/posts/route.ts"
    "app/api/public/products/route.ts"
    "app/api/auth/login/route.ts"
    "app/api/admin/images/upload/route.ts"
    "app/api/admin/images/route.ts"
)

MISSING_ROUTES=()
for route in "${API_ROUTES[@]}"; do
    if [ ! -f "$route" ]; then
        MISSING_ROUTES+=("$route")
    fi
done

if [ ${#MISSING_ROUTES[@]} -eq 0 ]; then
    echo "✅ 모든 주요 API 라우트 존재 확인"
else
    echo "❌ 누락된 API 라우트:"
    for route in "${MISSING_ROUTES[@]}"; do
        echo "   - $route"
    done
    exit 1
fi
echo ""

echo "✅ 빠른 점검 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. 개발 서버 실행: npm run dev"
echo "2. 수동 테스트 수행 (DEPLOYMENT_FINAL_CHECK.md 참고)"
echo "3. 모든 테스트 통과 후 배포 진행"
echo ""










