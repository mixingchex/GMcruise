// scripts/setup_trial_user_trip.ts
// 무료체험 사용자에게 테스트 여행 상품 연결

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userId = 102; // 무료체험 사용자 (trial_1764325110725)
  const productId = 62; // TEST-001 상품

  // 3일 후 출발 날짜 계산
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + 3); // 3일 후 출발

  // 상품 정보 조회
  const product = await prisma.cruiseProduct.findUnique({
    where: { id: productId }
  });

  if (!product) {
    console.log('상품을 찾을 수 없습니다.');
    return;
  }

  // 종료일 계산
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (product.nights || 4));

  console.log('=== 여행 정보 ===');
  console.log('User ID:', userId);
  console.log('Product:', product.productCode, '-', product.cruiseLine, product.shipName);
  console.log('Start Date:', startDate.toISOString());
  console.log('End Date:', endDate.toISOString());
  console.log('Nights:', product.nights);
  console.log('Days:', product.days);

  // 기존 UserTrip 및 Itinerary 삭제
  const existingTrips = await prisma.userTrip.findMany({
    where: { userId },
    select: { id: true }
  });

  for (const trip of existingTrips) {
    await prisma.itinerary.deleteMany({
      where: { userTripId: trip.id }
    });
  }

  await prisma.userTrip.deleteMany({
    where: { userId }
  });

  // UserTrip 생성
  const userTrip = await prisma.userTrip.create({
    data: {
      userId,
      productId,
      cruiseName: `${product.cruiseLine} ${product.shipName}`,
      startDate,
      endDate,
      nights: product.nights || 4,
      days: product.days || 5,
      destination: ['일본 - 후쿠오카', '일본 - 나가사키'],
      updatedAt: new Date(),
    }
  });

  console.log('\n=== UserTrip 생성 완료 ===');
  console.log('UserTrip ID:', userTrip.id);

  // itineraryPattern에서 Itinerary 생성
  if (product.itineraryPattern && Array.isArray(product.itineraryPattern)) {
    console.log('\n=== Itinerary 생성 ===');

    for (const item of product.itineraryPattern as any[]) {
      if (item && typeof item === 'object') {
        const dayNum = item.day || 1;
        const itineraryDate = new Date(startDate);
        itineraryDate.setDate(itineraryDate.getDate() + (dayNum - 1));

        await prisma.itinerary.create({
          data: {
            userTripId: userTrip.id,
            day: dayNum,
            date: itineraryDate,
            type: item.type || 'port',
            country: item.country || 'JP',
            location: item.location || '미정',
            arrival: item.arrival || null,
            departure: item.departure || null,
            language: item.language || '일본어',
            currency: item.currency || 'JPY',
            updatedAt: new Date(),
          }
        });

        console.log(`Day ${dayNum}: ${item.location || '미정'} (${item.country || 'JP'})`);
      }
    }
  }

  // 사용자 onboarded 상태 업데이트
  await prisma.user.update({
    where: { id: userId },
    data: { onboarded: true }
  });

  console.log('\n완료! 무료체험 사용자에게 테스트 여행이 설정되었습니다.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
