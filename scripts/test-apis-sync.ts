// scripts/test-apis-sync.ts
// APIS 엑셀 생성 테스트 스크립트

import prisma from '../lib/prisma';
import { syncApisSpreadsheet } from '../lib/google-sheets';

async function main() {
  console.log('🧪 APIS 엑셀 생성 테스트 시작...\n');

  try {
    // 1. MainUser 찾기 또는 생성 (담당자 "이판매")
    console.log('1️⃣ MainUser 확인 중...');
    let mainUser = await prisma.user.findFirst({
      where: {
        OR: [
          { name: '이판매' },
          { phone: '01011112222' },
        ],
      },
    });

    if (!mainUser) {
      console.log('   MainUser가 없습니다. 생성 중...');
      mainUser = await prisma.user.create({
        data: {
          name: '이판매',
          email: 'leesanme@test.local',
          phone: '01011112222',
          password: 'test1234',
          onboarded: true,
        },
      });
      console.log(`   ✅ MainUser 생성: ${mainUser.name} (ID: ${mainUser.id})\n`);
    } else {
      console.log(`   ✅ MainUser 찾음: ${mainUser.name} (ID: ${mainUser.id})\n`);
    }

    // 2. Trip 생성 (MSC Bellissima, 2025-05-10 출발)
    console.log('2️⃣ Trip 생성 중...');
    const departureDate = new Date('2025-05-10');
    departureDate.setHours(0, 0, 0, 0);

    // 기존 Trip이 있으면 삭제
    const existingTrip = await prisma.trip.findUnique({
      where: { productCode: 'TEST-MSC-20250510' },
    });

    if (existingTrip) {
      console.log('   기존 Trip 삭제 중...');
      await prisma.trip.delete({
        where: { id: existingTrip.id },
      });
    }

    const trip = await prisma.trip.create({
      data: {
        productCode: 'TEST-MSC-20250510',
        shipName: 'MSC Bellissima',
        departureDate,
      },
    });
    console.log(`   ✅ Trip 생성: ${trip.shipName} (ID: ${trip.id}, 코드: ${trip.productCode})\n`);

    // 3. Reservation 생성
    console.log('3️⃣ Reservation 생성 중...');
    const paymentDate = new Date('2024-12-01');
    paymentDate.setHours(0, 0, 0, 0);

    const reservation = await prisma.reservation.create({
      data: {
        tripId: trip.id,
        mainUserId: mainUser.id,
        totalPeople: 5,
        cabinType: '오션뷰',
        paymentDate,
        paymentMethod: '카드결제',
        paymentAmount: 15000000, // 15,000,000원
        agentName: '이판매',
        remarks: '할머니 싱글차지 확인 요망',
      },
    });
    console.log(`   ✅ Reservation 생성: ID ${reservation.id}\n`);

    // 4. Traveler 5명 생성
    console.log('4️⃣ Traveler 5명 생성 중...');

    // [방1] 아빠(KIM/PAPA), 엄마(LEE/MAMA)
    const traveler1 = await prisma.traveler.create({
      data: {
        reservationId: reservation.id,
        roomNumber: 1,
        isSingleCharge: false,
        engSurname: 'KIM',
        engGivenName: 'PAPA',
        korName: '김아빠',
        residentNum: '700101-1234567',
        gender: 'M',
        birthDate: '1970-01-01',
        passportNo: 'M12345678',
        issueDate: '2020-01-15',
        expiryDate: '2030-01-14',
        passportImage: 'https://example.com/passport/kim-papa.jpg',
      },
    });
    console.log(`   ✅ Traveler 1 (방1 - 아빠): ${traveler1.korName} (${traveler1.engSurname}/${traveler1.engGivenName})`);

    const traveler2 = await prisma.traveler.create({
      data: {
        reservationId: reservation.id,
        roomNumber: 1,
        isSingleCharge: false,
        engSurname: 'LEE',
        engGivenName: 'MAMA',
        korName: '이엄마',
        residentNum: '700205-2345678',
        gender: 'F',
        birthDate: '1970-02-05',
        passportNo: 'F12345678',
        issueDate: '2020-02-20',
        expiryDate: '2030-02-19',
        passportImage: 'https://example.com/passport/lee-mama.jpg',
      },
    });
    console.log(`   ✅ Traveler 2 (방1 - 엄마): ${traveler2.korName} (${traveler2.engSurname}/${traveler2.engGivenName})`);

    // [방2] 아들(KIM/SON), 딸(KIM/DAUGHTER)
    const traveler3 = await prisma.traveler.create({
      data: {
        reservationId: reservation.id,
        roomNumber: 2,
        isSingleCharge: false,
        engSurname: 'KIM',
        engGivenName: 'SON',
        korName: '김아들',
        residentNum: '050315-3123456',
        gender: 'M',
        birthDate: '2005-03-15',
        passportNo: 'M87654321',
        issueDate: '2022-03-10',
        expiryDate: '2032-03-09',
        passportImage: 'https://example.com/passport/kim-son.jpg',
      },
    });
    console.log(`   ✅ Traveler 3 (방2 - 아들): ${traveler3.korName} (${traveler3.engSurname}/${traveler3.engGivenName})`);

    const traveler4 = await prisma.traveler.create({
      data: {
        reservationId: reservation.id,
        roomNumber: 2,
        isSingleCharge: false,
        engSurname: 'KIM',
        engGivenName: 'DAUGHTER',
        korName: '김딸',
        residentNum: '070420-4234567',
        gender: 'F',
        birthDate: '2007-04-20',
        passportNo: 'F87654321',
        issueDate: '2023-04-15',
        expiryDate: '2033-04-14',
        passportImage: 'https://example.com/passport/kim-daughter.jpg',
      },
    });
    console.log(`   ✅ Traveler 4 (방2 - 딸): ${traveler4.korName} (${traveler4.engSurname}/${traveler4.engGivenName})`);

    // [방3] 할머니(PARK/GRANDMA) - 싱글차지
    const traveler5 = await prisma.traveler.create({
      data: {
        reservationId: reservation.id,
        roomNumber: 3,
        isSingleCharge: true,
        engSurname: 'PARK',
        engGivenName: 'GRANDMA',
        korName: '박할머니',
        residentNum: '450625-1234567',
        gender: 'F',
        birthDate: '1945-06-25',
        passportNo: 'G98765432',
        issueDate: '2019-06-01',
        expiryDate: '2029-05-31',
        passportImage: 'https://example.com/passport/park-grandma.jpg',
      },
    });
    console.log(`   ✅ Traveler 5 (방3 - 할머니, 싱글차지): ${traveler5.korName} (${traveler5.engSurname}/${traveler5.engGivenName})\n`);

    // 5. 동기화 실행
    console.log('5️⃣ APIS 엑셀 동기화 실행 중...');
    const result = await syncApisSpreadsheet(trip.id);

    if (result.ok && result.spreadsheetUrl) {
      console.log('\n✅ 동기화 성공!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Google Sheet URL:`);
      console.log(`   ${result.spreadsheetUrl}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`📋 Spreadsheet ID: ${result.spreadsheetId}`);
      console.log('\n✨ 테스트 완료!\n');
    } else {
      console.error('\n❌ 동기화 실패:', result.error);
      throw new Error(result.error || '동기화 실패');
    }
  } catch (error: any) {
    console.error('\n❌ 에러 발생:', error);
    if (error.message) {
      console.error('   메시지:', error.message);
    }
    if (error.stack) {
      console.error('   스택:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


