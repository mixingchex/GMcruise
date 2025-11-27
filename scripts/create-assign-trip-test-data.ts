/**
 * 여행배정 기능 테스트용 샘플 데이터 생성 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/create-assign-trip-test-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 여행배정 테스트 데이터 생성 시작...\n');

  try {
    // 1. 관리자 계정 생성
    console.log('📝 1. 관리자 계정 생성 중...');
    const adminPhone = '010-0000-0001';
    const adminName = '테스트 관리자';
    const adminPassword = 'admin123';

    let admin = await prisma.user.findFirst({
      where: {
        phone: adminPhone,
        role: 'admin',
      },
    });

    if (!admin) {
      const now = new Date();
      admin = await prisma.user.create({
        data: {
          name: adminName,
          phone: adminPhone,
          password: adminPassword,
          role: 'admin',
          onboarded: true,
          updatedAt: now,
        },
      });
      console.log(`   ✅ 관리자 계정 생성 완료 (ID: ${admin.id})`);
    } else {
      console.log(`   ℹ️  관리자 계정 이미 존재 (ID: ${admin.id})`);
    }

    console.log(`   📋 로그인 정보:`);
    console.log(`      이름: ${adminName}`);
    console.log(`      전화번호: ${adminPhone}`);
    console.log(`      비밀번호: ${adminPassword}\n`);

    // 2. 크루즈 가이드 사용자 생성
    console.log('📝 2. 크루즈 가이드 사용자 생성 중...');
    const geniePhone = '010-1234-5678';
    const genieName = '홍길동';

    let genieUser = await prisma.user.findFirst({
      where: {
        phone: geniePhone,
        role: 'user',
      },
    });

    if (!genieUser) {
      const now = new Date();
      genieUser = await prisma.user.create({
        data: {
          name: genieName,
          phone: geniePhone,
          password: '3800',
          role: 'user',
          onboarded: false,
          totalTripCount: 0,
          updatedAt: now,
        },
      });
      console.log(`   ✅ 크루즈 가이드 사용자 생성 완료 (ID: ${genieUser.id})`);
    } else {
      console.log(`   ℹ️  크루즈 가이드 사용자 이미 존재 (ID: ${genieUser.id})`);
    }

    console.log(`   📋 사용자 정보:`);
    console.log(`      이름: ${genieName}`);
    console.log(`      전화번호: ${geniePhone}`);
    console.log(`      비밀번호: 3800\n`);

    // 3. 구매 고객 생성
    console.log('📝 3. 구매 고객 생성 중...');
    const purchasePhone = '010-9876-5432';
    const purchaseName = '김구매';

    let purchaseCustomer = await prisma.user.findFirst({
      where: {
        phone: purchasePhone,
        role: 'community',
      },
    });

    if (!purchaseCustomer) {
      const now = new Date();
      purchaseCustomer = await prisma.user.create({
        data: {
          name: purchaseName,
          phone: purchasePhone,
          password: '3800',
          role: 'community',
          customerStatus: 'purchase_confirmed',
          onboarded: true,
          updatedAt: now,
        },
      });
      console.log(`   ✅ 구매 고객 생성 완료 (ID: ${purchaseCustomer.id})`);
    } else {
      // 기존 고객의 상태 업데이트
      purchaseCustomer = await prisma.user.update({
        where: { id: purchaseCustomer.id },
        data: { customerStatus: 'purchase_confirmed' },
      });
      console.log(`   ℹ️  구매 고객 이미 존재, 상태 업데이트 (ID: ${purchaseCustomer.id})`);
    }

    console.log(`   📋 고객 정보:`);
    console.log(`      이름: ${purchaseName}`);
    console.log(`      전화번호: ${purchasePhone}`);
    console.log(`      상태: purchase_confirmed\n`);

    // 4. 크루즈 상품 생성
    console.log('📝 4. 크루즈 상품 생성 중...');
    const productCode = 'TEST-001';
    const productName = 'MSC 벨리시마 일본 4박 5일';

    // 시작일은 오늘로부터 30일 후
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 30);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 4); // 4박 5일

    const itineraryPattern = [
      { day: 1, type: 'departure', location: '부산', country: 'KR', arrival: null, departure: '18:00' },
      { day: 2, type: 'sea', location: '해상', country: null, arrival: null, departure: null },
      { day: 3, type: 'port', location: '후쿠오카', country: 'JP', arrival: '08:00', departure: '18:00' },
      { day: 4, type: 'sea', location: '해상', country: null, arrival: null, departure: null },
      { day: 5, type: 'arrival', location: '부산', country: 'KR', arrival: '08:00', departure: null },
    ];

    let product = await prisma.cruiseProduct.findFirst({
      where: {
        productCode: productCode,
      },
    });

    if (!product) {
      const now = new Date();
      product = await prisma.cruiseProduct.create({
        data: {
          productCode: productCode,
          cruiseLine: 'MSC',
          shipName: '벨리시마',
          packageName: productName,
          nights: 4,
          days: 5,
          itineraryPattern: itineraryPattern as any,
          startDate: startDate,
          endDate: endDate,
          isPopular: true,
          updatedAt: now,
        },
      });
      console.log(`   ✅ 크루즈 상품 생성 완료 (ID: ${product.id})`);
    } else {
      // 기존 상품 업데이트
      product = await prisma.cruiseProduct.update({
        where: { id: product.id },
        data: {
          startDate: startDate,
          endDate: endDate,
        },
      });
      console.log(`   ℹ️  크루즈 상품 이미 존재, 업데이트 (ID: ${product.id})`);
    }

    console.log(`   📋 상품 정보:`);
    console.log(`      상품명: ${productName}`);
    console.log(`      상품코드: ${productCode}`);
    console.log(`      크루즈선: ${product.cruiseLine} ${product.shipName}`);
    console.log(`      기간: ${product.nights}박 ${product.days}일`);
    console.log(`      출발일: ${startDate.toISOString().split('T')[0]}\n`);

    // 5. 구매 고객을 위한 예약 및 여행 정보 생성
    console.log('📝 5. 구매 고객 예약 정보 생성 중...');
    
    // 기존 예약 확인
    let reservation = await prisma.reservation.findFirst({
      where: {
        mainUserId: purchaseCustomer.id,
      },
      include: {
        Trip: true,
      },
    });

    if (!reservation) {
      // Trip 생성
      const trip = await prisma.trip.create({
        data: {
          userId: purchaseCustomer.id,
          productId: product.id,
          productCode: productCode,
          shipName: product.shipName,
          cruiseName: `${product.cruiseLine} ${product.shipName}`,
          packageName: product.packageName,
          nights: product.nights,
          days: product.days,
          startDate: startDate,
          endDate: endDate,
          destination: '일본',
          status: 'Upcoming',
          reservationCode: productCode,
        },
      });

      // Reservation 생성
      reservation = await prisma.reservation.create({
        data: {
          mainUserId: purchaseCustomer.id,
          tripId: trip.id,
          status: 'confirmed',
        },
      });

      console.log(`   ✅ 예약 정보 생성 완료 (Reservation ID: ${reservation.id}, Trip ID: ${trip.id})`);
    } else {
      console.log(`   ℹ️  예약 정보 이미 존재 (Reservation ID: ${reservation.id})`);
    }

    // 6. 추가 테스트용 크루즈 가이드 사용자 생성 (여러 명)
    console.log('📝 6. 추가 테스트용 사용자 생성 중...');
    const additionalUsers = [
      { name: '이영희', phone: '010-1111-2222' },
      { name: '박철수', phone: '010-2222-3333' },
      { name: '최미영', phone: '010-3333-4444' },
    ];

    for (const userData of additionalUsers) {
      let user = await prisma.user.findFirst({
        where: {
          phone: userData.phone,
          role: 'user',
        },
      });

      if (!user) {
        const now = new Date();
        user = await prisma.user.create({
          data: {
            name: userData.name,
            phone: userData.phone,
            password: '3800',
            role: 'user',
            onboarded: false,
            totalTripCount: 0,
            updatedAt: now,
          },
        });
        console.log(`   ✅ ${userData.name} 생성 완료 (ID: ${user.id})`);
      }
    }

    // 7. 추가 테스트용 상품 생성
    console.log('📝 7. 추가 테스트용 상품 생성 중...');
    const additionalProducts = [
      {
        code: 'TEST-002',
        name: '로얄캐리비안 오디세이 오브 더 시즈 동남아 7박 8일',
        cruiseLine: '로얄캐리비안',
        shipName: '오디세이 오브 더 시즈',
        nights: 7,
        days: 8,
        countries: ['태국', '싱가포르', '말레이시아'],
      },
      {
        code: 'TEST-003',
        name: '코스타 스펙타쿨라 지중해 5박 6일',
        cruiseLine: '코스타',
        shipName: '스펙타쿨라',
        nights: 5,
        days: 6,
        countries: ['이탈리아', '그리스', '스페인'],
      },
    ];

    for (const prodData of additionalProducts) {
      const prodStartDate = new Date();
      prodStartDate.setDate(prodStartDate.getDate() + 60);
      const prodEndDate = new Date(prodStartDate);
      prodEndDate.setDate(prodEndDate.getDate() + prodData.days - 1);

      let prod = await prisma.cruiseProduct.findFirst({
        where: {
          productCode: prodData.code,
        },
      });

      if (!prod) {
        const now = new Date();
        prod = await prisma.cruiseProduct.create({
          data: {
            productCode: prodData.code,
            cruiseLine: prodData.cruiseLine,
            shipName: prodData.shipName,
            packageName: prodData.name,
            nights: prodData.nights,
            days: prodData.days,
            itineraryPattern: [] as any,
            startDate: prodStartDate,
            endDate: prodEndDate,
            updatedAt: now,
          },
        });
        console.log(`   ✅ ${prodData.name} 생성 완료 (ID: ${prod.id})`);
      }
    }

    console.log('\n✅ 모든 테스트 데이터 생성 완료!\n');
    console.log('📋 생성된 데이터 요약:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. 관리자 계정:');
    console.log(`   이름: ${adminName}`);
    console.log(`   전화번호: ${adminPhone}`);
    console.log(`   비밀번호: ${adminPassword}`);
    console.log('');
    console.log('2. 크루즈 가이드 사용자:');
    console.log(`   이름: ${genieName}`);
    console.log(`   전화번호: ${geniePhone}`);
    console.log(`   비밀번호: 3800`);
    console.log('');
    console.log('3. 구매 고객:');
    console.log(`   이름: ${purchaseName}`);
    console.log(`   전화번호: ${purchasePhone}`);
    console.log('');
    console.log('4. 크루즈 상품:');
    console.log(`   상품명: ${productName}`);
    console.log(`   상품코드: ${productCode}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 다음 단계:');
    console.log('   1. /admin/login 에서 관리자로 로그인');
    console.log('   2. /admin/assign-trip 페이지로 이동');
    console.log('   3. 위의 정보로 여행 배정 테스트 진행\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('스크립트 실행 실패:', e);
    process.exit(1);
  });

