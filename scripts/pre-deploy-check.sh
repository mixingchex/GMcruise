#!/bin/bash
# scripts/pre-deploy-check.sh
# 배포 전 자동 체크 스크립트

echo "🚀 배포 전 체크 시작..."
echo "================================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 에러 카운터
ERROR_COUNT=0

# 1. 환경 변수 확인
echo -e "\n1️⃣  환경 변수 확인..."
node scripts/check-env.js
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 환경 변수 체크 실패${NC}"
  ((ERROR_COUNT++))
else
  echo -e "${GREEN}✅ 환경 변수 확인 완료${NC}"
fi

# 2. TypeScript 타입 체크
echo -e "\n2️⃣  TypeScript 타입 체크..."
npx tsc --noEmit 2>&1 | head -20
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 타입 에러 발견${NC}"
  echo -e "${YELLOW}⚠️  모든 타입 에러를 먼저 수정하세요${NC}"
  ((ERROR_COUNT++))
else
  echo -e "${GREEN}✅ 타입 체크 통과${NC}"
fi

# 3. 빌드 테스트
echo -e "\n3️⃣  프로덕션 빌드 테스트..."
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 빌드 실패${NC}"
  echo -e "${YELLOW}⚠️  'npm run build'를 직접 실행해서 에러를 확인하세요${NC}"
  ((ERROR_COUNT++))
else
  echo -e "${GREEN}✅ 빌드 성공${NC}"
fi

# 4. Git 상태 확인
echo -e "\n4️⃣  Git 상태 확인..."
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}⚠️  커밋되지 않은 변경사항이 있습니다${NC}"
  git status --short
else
  echo -e "${GREEN}✅ 모든 변경사항이 커밋되었습니다${NC}"
fi

# 5. 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
echo -e "\n5️⃣  현재 브랜치: ${GREEN}$CURRENT_BRANCH${NC}"

if [ "$CURRENT_BRANCH" = "main" ]; then
  echo -e "${YELLOW}⚠️  운영 서버(main)에 배포됩니다!${NC}"
  echo -e "   신중하게 진행하세요."
elif [ "$CURRENT_BRANCH" = "dev" ]; then
  echo -e "${GREEN}✅ 개발 서버(dev)에 배포됩니다${NC}"
else
  echo -e "${YELLOW}⚠️  현재 브랜치: $CURRENT_BRANCH${NC}"
fi

# 최종 결과
echo -e "\n================================================"
if [ $ERROR_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ 모든 자동 체크 통과!${NC}"
  echo -e "\n📋 다음 단계:"
  echo -e "   1. 수동 QA 체크리스트 확인 (배포_및_QA_가이드.md)"
  echo -e "   2. git push origin $CURRENT_BRANCH"
  echo -e "   3. Vercel 자동 배포 대기"
  echo -e "   4. 배포 후 스모크 테스트"
  exit 0
else
  echo -e "${RED}❌ $ERROR_COUNT 개의 에러 발견${NC}"
  echo -e "\n🔧 에러를 수정한 후 다시 시도하세요."
  exit 1
fi
