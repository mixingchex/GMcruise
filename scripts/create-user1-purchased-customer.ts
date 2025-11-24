/**
 * user1 판매원용 구매 완료 고객 생성 스크립트
 * 
 * 이 스크립트는:
 * 1. user1 판매원에게 연결된 구매 완료된 고객 1명을 생성합니다
 * 2. 여권 정보는 생성하지 않습니다 (수동 여권 등록 테스트를 위해)
 * 3. 수동 여권 등록 기능 테스트를 위한 데이터를 준비합니다
 * 
 * 실행 방법:
 * npx tsx scripts/create-user1-purchased-customer.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 user1 판매원용 구매 완료 고객 생성 시작...\n');

  try {
    // 1. user1 판매원 찾기
    console.log('1️⃣ user1 판매원 찾는 중...');
    const user1User = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: 'user1' },
          { mallUserId: 'user1' },
        ],
      },
      include: {
        AffiliateProfile: true,
      },
    });

    if (!user1User) {
      console.error('❌ user1 판매원을 찾을 수 없습니다.');
      console.error('   먼저 user1 계정을 생성하세요.');
      process.exit(1);
    }

    const user1Profile = user1User.AffiliateProfile;
    if (!user1Profile) {
      console.error('❌ user1 판매원의 AffiliateProfile을 찾을 수 없습니다.');
      process.exit(1);
    }

    console.log(`✅ user1 판매원 확인: ID ${user1Profile.id}, Code: ${user1Profile.affiliateCode}\n`);

    // 2. 크루즈 상품 찾기 (없으면 샘플 생성)
    console.log('2️⃣ 크루즈 상품 확인 중...');
    let cruiseProduct = await prisma.cruiseProduct.findFirst({
      where: {
        productCode: {
          startsWith: 'SAMPLE',
        },
      },
    });

    if (!cruiseProduct) {
      // 샘플 상품 생성
      cruiseProduct = await prisma.cruiseProduct.create({
        data: {
          productCode: 'SAMPLE001',
          cruiseLine: '로열 캐리비안',
          shipName: '오디세이 오브 더 시즈',
          packageName: '동지중해 크루즈 7박 8일',
          basePrice: 2000000,
          nights: 7,
          days: 8,
          itineraryPattern: [],
          updatedAt: new Date(),
        },
      });
      console.log(`✅ 샘플 크루즈 상품 생성: ${cruiseProduct.productCode}\n`);
    } else {
      console.log(`✅ 크루즈 상품 사용: ${cruiseProduct.productCode}\n`);
    }

    // 3. 트랜잭션으로 모든 데이터 생성
    const result = await prisma.$transaction(async (tx) => {
      // 3-1. 고객 User 생성
      const customerPhone = `010-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const customerName = '김여행';
      const customerEmail = `customer-${Date.now()}@test.com`;

      let customerUser = await tx.user.findFirst({
        where: {
          phone: customerPhone,
        },
      });

      if (!customerUser) {
        const hashedPassword = await bcrypt.hash('3800', 10);
        customerUser = await tx.user.create({
          data: {
            phone: customerPhone,
            name: customerName,
            email: customerEmail,
            password: hashedPassword,
            role: 'user',
            onboarded: false,
            updatedAt: new Date(),
          },
        });
        console.log(`✅ 고객 User 생성: ${customerName} (${customerPhone})\n`);
      } else {
        console.log(`✅ 기존 고객 User 사용: ${customerName} (${customerPhone})\n`);
      }

      // 3-2. AffiliateLead 생성 (구매 완료 상태)
      const lead = await tx.affiliateLead.create({
        data: {
          customerName: customerName,
          customerPhone: customerPhone,
          status: 'PURCHASED',
          source: 'partner-manual',
          agentId: user1Profile.id, // user1 판매원 연결
          updatedAt: new Date(),
        } as any, // agentId 직접 설정을 위한 타입 캐스팅
      });
      console.log(`✅ AffiliateLead 생성 (구매 완료): ID ${lead.id}\n`);

      // 3-3. Payment 생성 (결제 완료)
      const orderId = `ORDER_USER1_${Date.now()}`;
      const payment = await tx.payment.create({
        data: {
          orderId,
          productCode: cruiseProduct.productCode,
          productName: cruiseProduct.packageName || `${cruiseProduct.cruiseLine} ${cruiseProduct.shipName}`,
          amount: cruiseProduct.basePrice || 2000000,
          currency: 'KRW',
          buyerName: customerName,
          buyerEmail: customerEmail,
          buyerTel: customerPhone,
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
          affiliateMallUserId: 'user1',
          affiliateCode: user1Profile.affiliateCode,
        },
      });
      console.log(`✅ Payment 생성 (결제 완료): ${orderId}\n`);

      // 3-4. Trip 찾기 또는 생성
      let trip = await tx.trip.findFirst({
        where: {
          productCode: cruiseProduct.productCode,
        },
      });

      if (!trip) {
        const now = new Date();
        const departureDate = new Date(now);
        departureDate.setDate(departureDate.getDate() + 30); // 30일 후 출발

        trip = await tx.trip.create({
          data: {
            productCode: cruiseProduct.productCode,
            shipName: cruiseProduct.shipName,
            departureDate: departureDate,
            status: 'Upcoming',
          },
        });
        console.log(`✅ Trip 생성: ID ${trip.id}\n`);
      } else {
        console.log(`✅ 기존 Trip 사용: ID ${trip.id}\n`);
      }
      console.log(`✅ Trip 생성: ID ${trip.id}\n`);

      // 3-5. Reservation 생성
      const totalPeople = 2; // 2명
      const cabinType = '오션뷰 (2인실)';

      const reservation = await tx.reservation.create({
        data: {
          tripId: trip.id,
          mainUserId: customerUser.id,
          totalPeople,
          cabinType,
        },
      });
      console.log(`✅ Reservation 생성: ID ${reservation.id}\n`);

      // 3-6. Traveler는 생성하지 않음 (수동 여권 등록 테스트를 위해)
      console.log(`⚠️  Traveler는 생성하지 않았습니다. 수동으로 여권 정보를 입력하세요.\n`);

      return {
        lead,
        payment,
        reservation,
        customerUser,
        travelers: [],
        orderId,
      };
    });

    console.log('🎉 user1 판매원용 구매 완료 고객 생성 완료!\n');
    console.log('📋 생성된 데이터 요약:');
    console.log(`   - AffiliateLead ID: ${result.lead.id}`);
    console.log(`   - 고객명: ${result.customerUser.name} (${result.customerUser.phone})`);
    console.log(`   - 주문 ID: ${result.orderId}`);
    console.log(`   - 결제 금액: ${result.payment.amount.toLocaleString()}원`);
    console.log(`   - 예약 ID: ${result.reservation.id}`);
    console.log(`   - 여행자 수: ${result.reservation.totalPeople}명 (여권 정보 미입력)`);
    console.log('\n💡 user1 판매원 대시보드에서 수동 여권 등록 테스트:');
    console.log(`   - URL: http://localhost:3000/partner/user1/reservation/new`);
    console.log(`   - 1. "결제 내역 불러오기" 섹션에서 "${result.orderId} - ${result.customerUser.name} - ${result.payment.amount.toLocaleString()}원" 선택`);
    console.log(`   - 2. "결제 내역 불러오기" 버튼 클릭`);
    console.log(`   - 3. 여권 정보를 수동으로 입력하세요!`);
    console.log('\n⚠️  여권 정보는 입력되지 않았습니다. 수동으로 입력하여 테스트하세요!');
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

