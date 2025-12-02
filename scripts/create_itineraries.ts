// scripts/create_itineraries.ts
// UserTrip에 Itinerary 생성

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userTripId = 42;
  const productId = 62;

  // 상품 정보 조회
  const product = await prisma.cruiseProduct.findUnique({
    where: { id: productId }
  });

  // UserTrip 정보 조회
  const userTrip = await prisma.userTrip.findUnique({
    where: { id: userTripId }
  });

  if (!product || !userTrip) {
    console.log('상품 또는 여행을 찾을 수 없습니다.');
    return;
  }

  console.log('UserTrip:', userTrip.id, userTrip.cruiseName);
  console.log('StartDate:', userTrip.startDate);

  // 기존 Itinerary 삭제
  await prisma.itinerary.deleteMany({
    where: { userTripId }
  });

  // itineraryPattern에서 Itinerary 생성
  if (product.itineraryPattern && Array.isArray(product.itineraryPattern)) {
    console.log('\n=== Itinerary 생성 ===');

    for (const item of product.itineraryPattern as any[]) {
      if (item && typeof item === 'object') {
        const dayNum = item.day || 1;
        const itineraryDate = new Date(userTrip.startDate!);
        itineraryDate.setDate(itineraryDate.getDate() + (dayNum - 1));

        await prisma.itinerary.create({
          data: {
            userTripId: userTripId,
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
  const userId = 102;
  await prisma.user.update({
    where: { id: userId },
    data: { onboarded: true }
  });

  console.log('\n완료! Itinerary가 생성되었습니다.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
