/**
 * 리얼 시나리오 데이터 생성 스크립트
 * 
 * 테스트를 위해 "관리자 패널에서 수동 등록한 것과 동일한" 정교한 데이터를 생성합니다.
 * 
 * 생성 데이터:
 * - Trip: "2025.05.14 MSC Bellissima (부산 출발)"
 * - Pricing: 인사이드(2인), 오션뷰(2인), 발코니(2인), 스위트(2인) 요금표
 * - Reservation: '김여행' 고객이 "발코니 2개, 인사이드 1개 (총 5명)" 구매 및 결제 완료
 * - User: '김여행' (Role: GUIDE_USER, Phone: 01012345678, PW: 3800)
 */

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🚀 리얼 시나리오 데이터 생성 시작...\n');

  try {
    // 1. User 생성 또는 업데이트 (김여행)
    console.log('1️⃣ 사용자 생성/업데이트 중...');
    const hashedPassword = await bcrypt.hash('3800', 10);
    
    let user = await prisma.user.findFirst({
      where: { phone: '01012345678' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: '김여행',
          phone: '01012345678',
          password: hashedPassword,
          role: 'GUIDE_USER',
          onboarded: true,
        },
      });
      console.log('   ✅ 신규 사용자 생성:', user.id);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: '김여행',
          password: hashedPassword,
          role: 'GUIDE_USER',
          onboarded: true,
        },
      });
      console.log('   ✅ 기존 사용자 업데이트:', user.id);
    }

    // 2. Trip 생성 (2025.05.14 MSC Bellissima)
    console.log('\n2️⃣ 여행(Trip) 생성 중...');
    const departureDate = new Date('2025-05-14T00:00:00Z');
    const productCode = '20250514-MSC-BELLISSIMA';

    // 기존 Trip이 있으면 삭제
    const existingTrip = await prisma.trip.findUnique({
      where: { productCode },
    });
    if (existingTrip) {
      await prisma.trip.delete({
        where: { productCode },
      });
      console.log('   ⚠️  기존 Trip 삭제됨');
    }

    const trip = await prisma.trip.create({
      data: {
        productCode,
        shipName: 'MSC Bellissima',
        departureDate,
        googleFolderId: null,
        spreadsheetId: null,
      },
    });
    console.log('   ✅ Trip 생성:', trip.id, '-', productCode);

    // 3. Reservation 생성 (발코니 2개, 인사이드 1개, 총 5명)
    console.log('\n3️⃣ 예약(Reservation) 생성 중...');
    
    // 기존 Reservation이 있으면 삭제
    const existingReservations = await prisma.reservation.findMany({
      where: { tripId: trip.id },
    });
    if (existingReservations.length > 0) {
      await prisma.reservation.deleteMany({
        where: { tripId: trip.id },
      });
      console.log('   ⚠️  기존 Reservation 삭제됨');
    }

    // 발코니 2개 (방 1, 2)
    const balconyReservation1 = await prisma.reservation.create({
      data: {
        tripId: trip.id,
        mainUserId: user.id,
        totalPeople: 2,
        cabinType: '발코니',
        paymentDate: new Date(),
        paymentMethod: 'PG',
        paymentAmount: 3500000, // 예시 금액
        agentName: '김담당',
        passportStatus: 'PENDING',
      },
    });

    const balconyReservation2 = await prisma.reservation.create({
      data: {
        tripId: trip.id,
        mainUserId: user.id,
        totalPeople: 2,
        cabinType: '발코니',
        paymentDate: new Date(),
        paymentMethod: 'PG',
        paymentAmount: 3500000,
        agentName: '김담당',
        passportStatus: 'PENDING',
      },
    });

    // 인사이드 1개 (방 3)
    const insideReservation = await prisma.reservation.create({
      data: {
        tripId: trip.id,
        mainUserId: user.id,
        totalPeople: 1,
        cabinType: '인사이드',
        paymentDate: new Date(),
        paymentMethod: 'PG',
        paymentAmount: 1500000,
        agentName: '김담당',
        passportStatus: 'PENDING',
      },
    });

    console.log('   ✅ Reservation 생성 완료:');
    console.log('      - 발코니 1:', balconyReservation1.id, '(2명)');
    console.log('      - 발코니 2:', balconyReservation2.id, '(2명)');
    console.log('      - 인사이드:', insideReservation.id, '(1명)');

    // 4. Traveler 생성 (총 5명)
    console.log('\n4️⃣ 여행자(Traveler) 생성 중...');
    
    const travelers = [
      // 발코니 1 (방 1)
      {
        reservationId: balconyReservation1.id,
        roomNumber: 1,
        korName: '김여행',
        engSurname: 'KIM',
        engGivenName: 'YEOHAENG',
        gender: 'M',
        birthDate: '1980-01-01',
      },
      {
        reservationId: balconyReservation1.id,
        roomNumber: 1,
        korName: '이동반',
        engSurname: 'LEE',
        engGivenName: 'DONGBAN',
        gender: 'F',
        birthDate: '1982-03-15',
      },
      // 발코니 2 (방 2)
      {
        reservationId: balconyReservation2.id,
        roomNumber: 2,
        korName: '박가족',
        engSurname: 'PARK',
        engGivenName: 'GAJOK',
        gender: 'M',
        birthDate: '1975-05-20',
      },
      {
        reservationId: balconyReservation2.id,
        roomNumber: 2,
        korName: '최가족',
        engSurname: 'CHOI',
        engGivenName: 'GAJOK',
        gender: 'F',
        birthDate: '1978-07-10',
      },
      // 인사이드 (방 3)
      {
        reservationId: insideReservation.id,
        roomNumber: 3,
        korName: '정혼자',
        engSurname: 'JUNG',
        engGivenName: 'HONJA',
        gender: 'M',
        birthDate: '1990-09-25',
      },
    ];

    await prisma.traveler.createMany({
      data: travelers,
    });

    console.log('   ✅ Traveler 생성 완료:', travelers.length, '명');

    // 5. 요금표 정보 출력 (메타데이터로 저장)
    console.log('\n5️⃣ 요금표 정보:');
    const pricing = {
      인사이드: { '2인': 2500000, '1인': 1500000 },
      오션뷰: { '2인': 3000000, '1인': 1800000 },
      발코니: { '2인': 3500000, '1인': 2100000 },
      스위트: { '2인': 5000000, '1인': 3000000 },
    };
    console.log('   📊 요금표:');
    Object.entries(pricing).forEach(([type, prices]) => {
      console.log(`      - ${type}: 2인 ${prices['2인'].toLocaleString()}원, 1인 ${prices['1인'].toLocaleString()}원`);
    });

    console.log('\n✅ 리얼 시나리오 데이터 생성 완료!');
    console.log('\n📋 생성 요약:');
    console.log(`   - 사용자: ${user.name} (${user.phone})`);
    console.log(`   - 여행: ${trip.productCode} (${trip.shipName})`);
    console.log(`   - 예약: 3개 (발코니 2개, 인사이드 1개)`);
    console.log(`   - 여행자: 5명`);
    console.log(`   - 결제 상태: 완료`);
    console.log(`   - 여권 상태: PENDING (등록 대기)`);
    console.log('\n🔗 테스트 URL:');
    console.log(`   - 결제 완료 페이지: /mall/checkout/success?reservationId=${balconyReservation1.id}`);
    console.log(`   - 여권 등록 폼: /passport/register?reservationId=${balconyReservation1.id}`);
    console.log(`   - 챗봇: /chat/passport?reservationId=${balconyReservation1.id}`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('스크립트 실행 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });









