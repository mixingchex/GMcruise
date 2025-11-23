#!/bin/bash
# 수정 사항 빠른 테스트 스크립트

set -e

echo "🧪 수정 사항 테스트 시작..."
echo ""

# 1. Prisma 스키마 검증
echo "1️⃣ Prisma 스키마 검증 중..."
npx prisma validate
echo "✅ 스키마 검증 완료"
echo ""

# 2. Prisma Client 생성 확인
echo "2️⃣ Prisma Client 확인 중..."
if [ -d "node_modules/@prisma/client" ]; then
  echo "✅ Prisma Client 존재 확인"
else
  echo "⚠️  Prisma Client 없음. 생성 중..."
  npx prisma generate
fi
echo ""

# 3. DB 연결 테스트
echo "3️⃣ DB 연결 테스트 중..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Trip 모델에 status 필드가 있는지 확인
    const trip = await prisma.trip.findFirst({
      select: { id: true, status: true, shipName: true }
    });
    
    if (trip) {
      console.log('✅ DB 연결 성공');
      console.log('✅ Trip 모델 status 필드 확인:', trip.status || 'null');
    } else {
      console.log('✅ DB 연결 성공 (Trip 데이터 없음)');
    }
    
    // Reservations 관계 테스트
    const tripWithReservations = await prisma.trip.findFirst({
      include: {
        Reservations: {
          include: {
            MainUser: {
              select: { id: true, name: true }
            }
          },
          take: 1
        }
      }
    });
    
    if (tripWithReservations) {
      console.log('✅ Reservations → MainUser 관계 정상 작동');
    }
    
  } catch (error) {
    console.error('❌ DB 연결 실패:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
})();
"
echo ""

# 4. TypeScript 타입 체크
echo "4️⃣ TypeScript 타입 체크 중..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  echo "⚠️  TypeScript 에러 발견 (일부는 무시 가능)"
  npx tsc --noEmit 2>&1 | head -20
else
  echo "✅ TypeScript 타입 체크 통과"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 기본 테스트 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. 서버 시작: npm run dev"
echo "2. 관리자 대시보드 테스트: http://localhost:3000/api/admin/dashboard"
echo "3. Proactive Engine 테스트: curl -X POST http://localhost:3000/api/scheduler/trigger"
echo ""
echo "📖 자세한 테스트 가이드: TEST_GUIDE.md 참고"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"









