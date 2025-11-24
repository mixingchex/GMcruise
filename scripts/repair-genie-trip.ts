// scripts/repair-genie-trip.ts
// 박지니(010-2222-2222) 유저의 UserTrip 수리 스크립트

import prisma from '../lib/prisma';

async function main() {
  console.log('🔧 박지니 유저의 UserTrip 수리 시작...\n');

  // 1. 유저 찾기
  const phone = '010-2222-2222';
  console.log(`1️⃣ 유저 찾기: 전화번호 '${phone}'\n`);

  const user = await prisma.user.findFirst({
    where: { phone },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      customerSource: true,
    },
  });

  if (!user) {
    console.error(`❌ 오류: 전화번호 '${phone}'인 유저를 찾을 수 없습니다.`);
    console.error('   스크립트를 중단합니다.');
    process.exit(1);
  }

  console.log('✅ 유저 찾음:');
  console.log(`   ID: ${user.id}`);
  console.log(`   이름: ${user.name}`);
  console.log(`   전화번호: ${user.phone}`);
  console.log(`   역할: ${user.role}`);
  console.log(`   고객 소스: ${user.customerSource}\n`);

  // 2. 상품 찾기
  const productCode = 'REAL-CRUISE-01';
  console.log(`2️⃣ 상품 찾기: '${productCode}'\n`);

  const product = await prisma.cruiseProduct.findUnique({
    where: { productCode },
    select: {
      id: true,
      productCode: true,
      cruiseLine: true,
      shipName: true,
      packageName: true,
      nights: true,
      days: true,
      itineraryPattern: true,
    },
  });

  if (!product) {
    console.error(`❌ 오류: 상품코드 '${productCode}'를 찾을 수 없습니다.`);
    console.error('   먼저 init-master-ecosystem.ts를 실행하여 상품을 생성해주세요.');
    process.exit(1);
  }

  console.log('✅ 상품 찾음:');
  console.log(`   ID: ${product.id}`);
  console.log(`   상품코드: ${product.productCode}`);
  console.log(`   상품명: ${product.packageName}`);
  console.log(`   기간: ${product.nights}박 ${product.days}일\n`);

  // 3. 여행(UserTrip) 확인 및 생성
  console.log('3️⃣ UserTrip 확인 및 생성\n');

  let userTrip = await prisma.userTrip.findFirst({
    where: {
      userId: user.id,
      productId: product.id,
    },
    select: {
      id: true,
      userId: true,
      productId: true,
      startDate: true,
      endDate: true,
      googleFolderId: true,
      spreadsheetId: true,
    },
  });

  if (userTrip) {
    console.log('✅ 기존 UserTrip 발견:');
    console.log(`   UserTrip ID: ${userTrip.id}`);
    console.log(`   출발일: ${userTrip.startDate ? new Date(userTrip.startDate).toISOString().split('T')[0] : '없음'}`);
    console.log(`   종료일: ${userTrip.endDate ? new Date(userTrip.endDate).toISOString().split('T')[0] : '없음'}\n`);
    
    // googleFolderId와 spreadsheetId가 없으면 업데이트
    if (!userTrip.googleFolderId || !userTrip.spreadsheetId) {
      console.log('📝 googleFolderId/spreadsheetId 업데이트 중...');
      userTrip = await prisma.userTrip.update({
        where: { id: userTrip.id },
        data: {
          googleFolderId: userTrip.googleFolderId || 'dummy-repair',
          spreadsheetId: userTrip.spreadsheetId || 'dummy-repair',
          updatedAt: new Date(),
        },
        select: {
          id: true,
          userId: true,
          productId: true,
          startDate: true,
          endDate: true,
          googleFolderId: true,
          spreadsheetId: true,
        },
      });
      console.log('✅ 업데이트 완료\n');
    }
  } else {
    console.log('📝 UserTrip 생성 중...');

    // 날짜 계산
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const departureDate = new Date(today);
    departureDate.setDate(departureDate.getDate() + 30); // 오늘 + 30일 (D-30)
    departureDate.setHours(0, 0, 0, 0);

    const endDate = new Date(departureDate);
    endDate.setDate(endDate.getDate() + product.days - 1);
    endDate.setHours(23, 59, 59, 999);

    const destinations = ['일본 도쿄', '일본 오사카', '중국 상하이', '홍콩'];

    userTrip = await prisma.userTrip.create({
      data: {
        userId: user.id,
        productId: product.id,
        reservationCode: `CRD-${today.toISOString().slice(0, 10).replace(/-/g, '')}-REPAIR`,
        cruiseName: `${product.cruiseLine} ${product.shipName}`,
        companionType: '가족',
        destination: destinations,
        startDate: departureDate,
        endDate: endDate,
        nights: product.nights,
        days: product.days,
        visitCount: destinations.length,
        status: 'Upcoming',
        googleFolderId: 'dummy-repair',
        spreadsheetId: 'dummy-repair',
        updatedAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        productId: true,
        startDate: true,
        endDate: true,
        googleFolderId: true,
        spreadsheetId: true,
      },
    });

    console.log('✅ UserTrip 생성 완료:');
    console.log(`   UserTrip ID: ${userTrip.id}`);
    console.log(`   출발일: ${departureDate.toISOString().split('T')[0]} (D-30)`);
    console.log(`   종료일: ${endDate.toISOString().split('T')[0]}`);
    console.log(`   googleFolderId: ${userTrip.googleFolderId}`);
    console.log(`   spreadsheetId: ${userTrip.spreadsheetId}\n`);
  }

  // 4. 기능 데이터 생성 (Itinerary)
  console.log('4️⃣ Itinerary 생성\n');

  const itineraryDate = userTrip.startDate ? new Date(userTrip.startDate) : new Date();
  
  // 기존 Itinerary 확인
  const existingItinerary = await prisma.itinerary.findFirst({
    where: {
      userTripId: userTrip.id,
      day: 1,
    },
  });

  if (existingItinerary) {
    console.log('✅ 기존 Itinerary 발견 (Day 1)');
    console.log(`   Itinerary ID: ${existingItinerary.id}\n`);
  } else {
    console.log('📝 Itinerary 생성 중 (Day 1)...');

    await prisma.itinerary.create({
      data: {
        userTripId: userTrip.id,
        day: 1,
        date: itineraryDate,
        type: 'Embarkation',
        location: 'Busan',
        country: 'KR',
        currency: 'KRW',
        language: 'ko',
        time: '14:00',
        updatedAt: new Date(),
      },
    });

    console.log('✅ Itinerary 생성 완료 (Day 1)\n');
  }

  // 최종 확인
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 수리 완료!\n');
  console.log('📋 최종 상태:\n');
  console.log(`   유저: ${user.name} (${user.phone})`);
  console.log(`   상품: ${product.packageName} (${product.productCode})`);
  console.log(`   UserTrip ID: ${userTrip.id}`);
  console.log(`   출발일: ${userTrip.startDate ? new Date(userTrip.startDate).toISOString().split('T')[0] : '없음'} (D-30)`);
  console.log(`   종료일: ${userTrip.endDate ? new Date(userTrip.endDate).toISOString().split('T')[0] : '없음'}`);
  console.log(`   Itinerary: Day 1 생성됨\n`);
  console.log('💡 이제 로그인 후 프로필 페이지에서 D-Day 정보가 표시됩니다.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
