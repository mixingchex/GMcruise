import { PrismaClient } from '@prisma/client';
import { normalizeItineraryPattern, extractDestinationsFromItineraryPattern, extractVisitedCountriesFromItineraryPattern } from '../lib/utils/itineraryPattern';

const prisma = new PrismaClient();

async function main() {
  const userName = '전혜선';
  const userPhone = '01024958013';
  const productCode = 'SAMPLE-MED-001';

  console.log('=== 테스트 여행 생성 ===\n');
  console.log(`사용자: ${userName} (${userPhone})`);
  console.log(`상품 코드: ${productCode}\n`);

  // 1. 사용자 찾기
  const user = await prisma.user.findFirst({
    where: {
      name: userName,
      phone: userPhone,
      role: 'user',
    },
  });

  if (!user) {
    console.error('❌ 사용자를 찾을 수 없습니다.');
    console.log(`   이름: ${userName}`);
    console.log(`   전화번호: ${userPhone}`);
    process.exit(1);
  }

  console.log('✅ 사용자 찾음:');
  console.log(`   ID: ${user.id}`);
  console.log(`   이름: ${user.name}`);
  console.log(`   전화번호: ${user.phone}\n`);

  // 2. 상품 찾기
  const product = await prisma.cruiseProduct.findUnique({
    where: { productCode },
  });

  if (!product) {
    console.error(`❌ 상품을 찾을 수 없습니다: ${productCode}`);
    process.exit(1);
  }

  console.log('✅ 상품 찾음:');
  console.log(`   ID: ${product.id}`);
  console.log(`   상품 코드: ${product.productCode}`);
  console.log(`   크루즈: ${product.cruiseLine} ${product.shipName}`);
  console.log(`   박수: ${product.nights}박 ${product.days}일\n`);

  // 3. 기존 UserTrip 확인 및 삭제
  const existingUserTrip = await prisma.userTrip.findFirst({
    where: { userId: user.id },
    select: { id: true, productId: true },
  });

  if (existingUserTrip) {
    console.log('📝 기존 여행 발견, 삭제 중...');
    console.log(`   UserTrip ID: ${existingUserTrip.id}`);
    
    // 관련 Itinerary 삭제 (userTripId로)
    await prisma.itinerary.deleteMany({
      where: { userTripId: existingUserTrip.id },
    });
    
    // UserTrip 삭제
    await prisma.userTrip.delete({
      where: { id: existingUserTrip.id },
    });
    
    console.log('✅ 기존 여행 삭제 완료\n');
  }

  // 4. 날짜 계산 (출발일까지 100일 남음)
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() + 100); // 오늘로부터 100일 후 출발
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + product.days - 1);
  endDate.setHours(23, 59, 59, 999);

  const daysUntilDeparture = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  console.log('📅 날짜 계산:');
  console.log(`   오늘: ${now.toISOString().split('T')[0]}`);
  console.log(`   출발일: ${startDate.toISOString().split('T')[0]} (${daysUntilDeparture}일 후)`);
  console.log(`   종료일: ${endDate.toISOString().split('T')[0]}\n`);

  // 5. 목적지 및 국가 정보 추출
  const itineraryPattern = normalizeItineraryPattern(product.itineraryPattern);
  const destinations = extractDestinationsFromItineraryPattern(product.itineraryPattern);
  const visitedCountries = extractVisitedCountriesFromItineraryPattern(product.itineraryPattern);

  console.log('📍 목적지 정보:');
  console.log(`   목적지: ${destinations.join(', ')}`);
  console.log(`   방문 국가 수: ${visitedCountries.size}\n`);

  // 6. 예약번호 생성
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const reservationCode = `CRD-${dateStr}-${randomStr}`;

  console.log('🎫 예약번호 생성:');
  console.log(`   ${reservationCode}\n`);

  // 7. Trip 생성 (Itinerary가 Trip을 참조하므로 Trip도 생성 필요)
  console.log('🚢 Trip 생성 중...');
  const trip = await prisma.trip.create({
    data: {
      productCode: reservationCode, // Trip의 productCode는 unique이므로 예약번호 사용
      shipName: product.shipName,
      departureDate: startDate,
      status: 'Upcoming',
      endDate: endDate,
    },
  });

  console.log('✅ Trip 생성 완료:');
  console.log(`   Trip ID: ${trip.id}`);
  console.log(`   Product Code: ${trip.productCode}\n`);

  // 8. UserTrip 생성
  console.log('🚢 UserTrip 생성 중...');
  const userTrip = await prisma.userTrip.create({
    data: {
      userId: user.id,
      productId: product.id,
      reservationCode,
      cruiseName: `${product.cruiseLine} ${product.shipName}`,
      companionType: '가족',
      destination: destinations,
      startDate,
      endDate,
      nights: product.nights,
      days: product.days,
      visitCount: destinations.length,
      status: 'Upcoming',
      updatedAt: new Date(),
    },
  });

  console.log('✅ UserTrip 생성 완료:');
  console.log(`   UserTrip ID: ${userTrip.id}`);
  console.log(`   크루즈: ${userTrip.cruiseName}`);
  console.log(`   예약번호: ${userTrip.reservationCode}\n`);

  // 9. Itinerary 생성
  console.log('📋 일정 생성 중...');
  const itineraries = [];
  const nowForItinerary = new Date();
  for (const pattern of itineraryPattern) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + pattern.day - 1);

    itineraries.push({
      tripId: trip.id, // Trip 모델의 ID 사용
      userTripId: userTrip.id, // UserTrip도 연결
      day: pattern.day,
      date: dayDate,
      type: pattern.type,
      location: pattern.location || null,
      country: pattern.country || null,
      currency: pattern.currency || null,
      language: pattern.language || null,
      arrival: pattern.arrival || null,
      departure: pattern.departure || null,
      time: pattern.time || null,
      createdAt: nowForItinerary,
      updatedAt: nowForItinerary,
    });
  }

  await prisma.itinerary.createMany({
    data: itineraries,
  });

  console.log(`✅ 일정 생성 완료: ${itineraries.length}개\n`);

  // 10. VisitedCountry 업데이트
  console.log('🌍 방문 국가 정보 업데이트 중...');
  const nowForVisitedCountry = new Date();
  for (const [countryCode, countryInfo] of visitedCountries) {
    await prisma.visitedCountry.upsert({
      where: {
        userId_countryCode: {
          userId: user.id,
          countryCode,
        },
      },
      update: {
        visitCount: { increment: 1 },
        lastVisited: startDate,
        updatedAt: nowForVisitedCountry,
      },
      create: {
        userId: user.id,
        countryCode,
        countryName: countryInfo.name,
        visitCount: 1,
        lastVisited: startDate,
        updatedAt: nowForVisitedCountry,
      },
    });
  }

  console.log(`✅ 방문 국가 정보 업데이트 완료: ${visitedCountries.size}개\n`);

  // 11. 온보딩 완료 상태로 설정
  console.log('✅ 온보딩 완료 상태 설정 중...');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      onboarded: true,
      totalTripCount: { increment: 1 },
      currentTripEndDate: endDate,
    },
  });

  console.log('✅ 온보딩 완료 상태 설정 완료\n');

  // 최종 확인
  const finalUserTrip = await prisma.userTrip.findUnique({
    where: { id: userTrip.id },
    include: {
      CruiseProduct: true,
    },
  });

  console.log('=== 생성 완료 ===\n');
  console.log('✅ 테스트 여행이 성공적으로 생성되었습니다!');
  console.log(`   사용자: ${userName} (${userPhone})`);
  console.log(`   Trip ID: ${trip.id}`);
  console.log(`   UserTrip ID: ${userTrip.id}`);
  console.log(`   크루즈: ${finalUserTrip?.cruiseName}`);
  console.log(`   예약번호: ${finalUserTrip?.reservationCode}`);
  console.log(`   출발일: ${startDate.toISOString().split('T')[0]}`);
  console.log(`   종료일: ${endDate.toISOString().split('T')[0]}`);
  console.log(`   ${product.nights}박 ${product.days}일`);
  console.log(`   목적지: ${destinations.join(', ')}\n`);
  console.log('📌 이제 로그인하여 크루즈가이드 지니를 사용할 수 있습니다!');
  console.log(`   - 이름: ${userName}`);
  console.log(`   - 전화번호: ${userPhone}`);
  console.log(`   - 비밀번호: 3800\n`);
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

