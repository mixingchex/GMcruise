#!/bin/bash
# UserTrip 관련 코드에서 잘못 변경된 필드명 되돌리기
# UserTrip 모델은 startDate, cruiseName을 사용해야 함

set -e

echo "🔧 UserTrip 관련 코드 수정 시작..."
echo ""

# 1. prisma.userTrip을 사용하는 파일 찾기
echo "1️⃣ prisma.userTrip 사용 파일 확인 중..."
USER_TRIP_FILES=$(grep -rl "prisma\.userTrip" --include='*.ts' --include='*.tsx' . 2>/dev/null | grep -v node_modules | grep -v ".next" || true)

if [ -z "$USER_TRIP_FILES" ]; then
  echo "   ⚠️  prisma.userTrip을 사용하는 파일이 없습니다."
  echo "   → prisma.trip을 userId와 함께 사용하는 파일들을 확인해야 합니다."
fi

# 2. userId와 함께 prisma.trip을 사용하는 파일들 확인
echo ""
echo "2️⃣ userId와 함께 prisma.trip을 사용하는 파일 확인 중..."
TRIP_WITH_USERID=$(grep -rn "prisma\.trip\." --include='*.ts' --include='*.tsx' . | grep "userId" | grep -v node_modules | grep -v ".next" | cut -d: -f1 | sort -u)

if [ -z "$TRIP_WITH_USERID" ]; then
  echo "   ✅ userId와 함께 prisma.trip을 사용하는 파일이 없습니다."
else
  echo "   ⚠️  다음 파일들이 userId와 함께 prisma.trip을 사용합니다:"
  echo "$TRIP_WITH_USERID" | while read file; do
    echo "      - $file"
  done
  echo ""
  echo "   ⚠️  주의: Trip 모델에는 userId 필드가 없습니다!"
  echo "   → 이 파일들은 prisma.userTrip을 사용해야 할 수 있습니다."
fi

# 3. UserTrip 타입을 사용하는 파일에서 필드명 되돌리기
echo ""
echo "3️⃣ UserTrip 타입 사용 파일에서 필드명 되돌리기..."

# UserTrip 타입 정의가 있는 파일 찾기
USER_TRIP_TYPE_FILES=$(grep -rl "UserTrip\|userTrip:" --include='*.ts' --include='*.tsx' . 2>/dev/null | grep -v node_modules | grep -v ".next" | head -20 || true)

if [ ! -z "$USER_TRIP_TYPE_FILES" ]; then
  echo "   발견된 파일 수: $(echo "$USER_TRIP_TYPE_FILES" | wc -l)"
  echo ""
  echo "   ⚠️  수동 확인이 필요한 파일들:"
  echo "$USER_TRIP_TYPE_FILES" | while read file; do
    # departureDate나 shipName이 있는지 확인
    if grep -q "departureDate\|shipName" "$file" 2>/dev/null; then
      echo "      - $file (departureDate/shipName 사용 중)"
    fi
  done
else
  echo "   ✅ UserTrip 타입을 사용하는 파일이 없습니다."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 확인 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. userId와 함께 prisma.trip을 사용하는 파일들을 확인"
echo "2. 해당 파일들이 실제로 UserTrip을 사용해야 하는지 확인"
echo "3. UserTrip을 사용하는 경우:"
echo "   - departureDate → startDate"
echo "   - shipName → cruiseName"
echo "4. Trip을 사용하는 경우:"
echo "   - departureDate, shipName 유지 (이미 변경됨)"
echo ""
echo "⚠️  주의: Trip 모델에는 userId 필드가 없습니다!"
echo "   → prisma.trip.findMany({ where: { userId } })는 작동하지 않습니다!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"









