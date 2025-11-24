/**
 * 수동여권등록 샘플 데이터 생성 스크립트
 * 대리점장 대시보드에서 수동여권등록 테스트를 위한 샘플 예약 데이터 생성
 * 
 * ⚠️ 중요: 이 스크립트는 여권 정보 없이 예약만 생성합니다.
 * 수동여권등록 테스트를 위해 여권 정보는 나중에 입력하도록 합니다.
 * 
 * 실행 방법:
 * npx tsx scripts/create-sample-passport-registration.ts
 * 
 * ⚠️ 서버 실행 불필요: Prisma를 직접 사용하여 데이터베이스에 데이터를 생성합니다.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 수동여권등록 샘플 데이터 생성 시작...\n');
  console.log('⚠️  여권 정보 없이 예약과 결제 정보를 생성합니다.\n');

  try {
    // 1. 기존 CruiseProduct 찾기
    const cruiseProduct = await prisma.cruiseProduct.findFirst({
      where: {
        productCode: {
          startsWith: 'SAMPLE',
        },
      },
    });

    if (!cruiseProduct) {
      console.error('❌ 샘플 크루즈 상품을 찾을 수 없습니다.');
      console.error('   먼저 샘플 상품을 생성하세요: npx tsx scripts/create-sample-products.ts');
      process.exit(1);
    }

    console.log(`✅ 크루즈 상품 사용: ${cruiseProduct.productCode} (ID: ${cruiseProduct.id})\n`);

    // 2. 트랜잭션으로 모든 데이터 생성
    const result = await prisma.$transaction(async (tx) => {
      // 2-1. 메인 유저 생성 또는 찾기
      const mainUserPhone = '010-1234-5678';
      const mainUserName = '홍길동';
      const mainUserEmail = 'hong@example.com';

      let mainUser = await tx.user.findFirst({
        where: {
          phone: mainUserPhone,
        },
      });

      if (!mainUser) {
        const hashedPassword = await bcrypt.hash(mainUserPhone, 10);
        mainUser = await tx.user.create({
          data: {
            phone: mainUserPhone,
            name: mainUserName,
            email: mainUserEmail,
            password: hashedPassword,
            role: 'user',
            onboarded: false,
            updatedAt: new Date(),
          },
        });
        console.log(`✅ 메인 유저 생성 완료: ${mainUserName} (ID: ${mainUser.id})\n`);
      } else {
        console.log(`✅ 기존 메인 유저 사용: ${mainUserName} (ID: ${mainUser.id})\n`);
      }

      // 2-2. 결제 정보 생성 (페이지에서 선택할 수 있도록)
      const orderId = `ORDER_SAMPLE_${Date.now()}`;
      const payment = await tx.payment.create({
        data: {
          orderId,
          productCode: cruiseProduct.productCode,
          productName: cruiseProduct.packageName || `${cruiseProduct.cruiseLine} ${cruiseProduct.shipName}`,
          amount: cruiseProduct.basePrice || 1000000,
          currency: 'KRW',
          buyerName: mainUserName,
          buyerEmail: mainUserEmail,
          buyerTel: mainUserPhone,
          status: 'completed',
          paidAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            roomSelections: [
              {
                cabinType: '오션뷰 (2인실)',
                count: 1, // 1개 = 2명 (2인 1실 원칙)
              },
            ],
            totalGuests: 2,
          },
          // 파트너 연결 (boss1로 가정)
          affiliateMallUserId: 'boss1',
          affiliateCode: null,
        },
      });

      console.log(`✅ 결제 정보 생성 완료: ${orderId} (ID: ${payment.id})\n`);

      // 2-3. Trip 생성 (Reservation이 Trip을 참조하므로 필요)
      // ⚠️ Trip 모델은 최소한의 필드만 필요 (기존 데이터 구조 참고)
      const now = new Date();
      const trip = await tx.trip.create({
        data: {
          productCode: cruiseProduct.productCode, // 필수 필드
          shipName: cruiseProduct.shipName, // 필수 필드
          departureDate: now, // 필수 필드
          status: 'Upcoming',
          // 선택적 필드들
          googleFolderId: null,
          spreadsheetId: null,
        },
      });

      console.log(`✅ Trip 생성 완료: ID ${trip.id}\n`);

      // 2-4. Reservation 생성 (여권 정보 없이)
      const totalPeople = 0; // 여권 정보 없으므로 0명
      const cabinType = '오션뷰 (2인실)';

      const reservation = await tx.reservation.create({
        data: {
          tripId: trip.id, // Trip.id 사용
          mainUserId: mainUser.id,
          totalPeople,
          cabinType,
        },
      });

      console.log(`✅ 예약 생성 완료: ID ${reservation.id}\n`);

      return {
        reservation,
        payment,
        mainUser,
        trip,
        orderId,
      };
    });

    console.log('🎉 수동여권등록 샘플 데이터 생성 완료!\n');
    console.log('📋 생성된 데이터 요약:');
    console.log(`   - 예약 ID: ${result.reservation.id}`);
    console.log(`   - 결제 ID: ${result.payment.id}`);
    console.log(`   - 주문 ID: ${result.orderId}`);
    console.log(`   - 메인 유저: ${result.mainUser.name} (${result.mainUser.phone})`);
    console.log(`   - 여행자 수: 0명 (여권 정보 없음 - 수동으로 추가 필요)`);
    console.log(`   - 크루즈 상품: ${cruiseProduct.cruiseLine} ${cruiseProduct.shipName}`);
    console.log(`   - 객실 타입: 오션뷰 (2인실)`);
    console.log('\n💡 대리점장 대시보드에서 수동여권등록 테스트:');
    console.log(`   - URL: http://localhost:3000/partner/boss1/reservation/new`);
    console.log(`   - 1. "결제 내역 불러오기" 섹션에서 "${result.orderId} - ${result.mainUser.name} (${cruiseProduct.packageName || cruiseProduct.cruiseLine}) - ${result.payment.amount.toLocaleString()}원" 선택`);
    console.log(`   - 2. "결제 내역 불러오기" 버튼 클릭`);
    console.log(`   - 3. 여권 정보를 수동으로 입력하세요!`);
    console.log('\n');

  } catch (error: any) {
    console.error('❌ 오류 발생:', error);
    
    if (error.code === 'P2003') {
      console.error('\n⚠️  외래키 제약 조건 오류가 발생했습니다.');
      console.error('   데이터베이스 스키마를 확인하세요.');
    }
    
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
