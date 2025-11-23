#!/usr/bin/env tsx
/**
 * 테스트 데이터 시드 스크립트
 * DATABASE_URL_TEST 환경에서 실행되는 테스트용 데이터 생성 스크립트
 * 
 * 생성 데이터:
 * 1. CruiseProduct: "지중해 크루즈 7박 8일" (productCode: 'TEST-MED-001')
 * 2. Trip: 위 상품과 연결된 여행 (출발일: 2025-05-01, 선박명: 'MSC World Europa')
 * 3. Affiliate (파트너): 테스트용 파트너 계정 (boss1)이 없다면 생성
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

// .env 파일 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

// DATABASE_URL_TEST 환경 변수 확인
const databaseUrlTest = process.env.DATABASE_URL_TEST;

if (!databaseUrlTest) {
  console.error('❌ 오류: DATABASE_URL_TEST 환경 변수가 설정되지 않았습니다.');
  console.error('💡 .env 파일에 DATABASE_URL_TEST를 설정하세요.');
  process.exit(1);
}

// DATABASE_URL을 DATABASE_URL_TEST로 임시 변경 (PrismaClient가 이 환경 변수를 사용)
const originalDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = databaseUrlTest;

// Prisma 클라이언트 생성 (이제 DATABASE_URL_TEST를 사용)
const prisma = new PrismaClient();

async function main() {
  console.log('────────────────────────────────────────────');
  console.log('  📦 테스트 데이터 생성 시작');
  console.log('────────────────────────────────────────────');
  console.log(`📌 연결 대상: ${databaseUrlTest.split('@')[1]?.split('/')[0] || '테스트 DB'}`);
  console.log('');

  try {
    // 1. 파트너 계정 (boss1) 생성 또는 확인
    console.log('1️⃣ 파트너 계정 (boss1) 확인/생성 중...');
    let boss1User = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: { startsWith: 'boss1' } },
          { mallUserId: 'boss1' },
          { email: 'boss1@test.local' },
        ],
      },
    });

    if (!boss1User) {
      const hashedPassword = await bcrypt.hash('1101', 10);
      boss1User = await prisma.user.create({
        data: {
          phone: 'boss1',
          email: 'boss1@test.local',
          name: '테스트 대리점장',
          password: hashedPassword,
          mallUserId: 'boss1',
          mallNickname: '테스트 대리점장',
          role: 'user',
          onboarded: true,
        },
      });
      console.log(`   ✅ boss1 계정 생성 완료 (ID: ${boss1User.id})`);
    } else {
      console.log(`   ✅ boss1 계정 확인 완료 (ID: ${boss1User.id})`);
    }

    // AffiliateProfile 확인/생성
    let boss1Profile = await prisma.affiliateProfile.findUnique({
      where: { userId: boss1User.id },
    });

    if (!boss1Profile) {
      boss1Profile = await prisma.affiliateProfile.create({
        data: {
          userId: boss1User.id,
          affiliateCode: `AFF-BOSS1-${Date.now().toString().slice(-4)}`,
          type: 'BRANCH_MANAGER',
          status: 'ACTIVE',
          displayName: '테스트 대리점장',
          nickname: 'boss1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ boss1 AffiliateProfile 생성 완료 (ID: ${boss1Profile.id}, affiliateCode: ${boss1Profile.affiliateCode})`);
    } else {
      // 기존 AffiliateProfile이 있으면 업데이트 (type 확인)
      boss1Profile = await prisma.affiliateProfile.update({
        where: { id: boss1Profile.id },
        data: {
          type: 'BRANCH_MANAGER', // type 확인
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ boss1 AffiliateProfile 확인 완료 (ID: ${boss1Profile.id}, affiliateCode: ${boss1Profile.affiliateCode})`);
    }

    console.log('');

    // 1-1. user1 판매원 생성 또는 확인
    console.log('1-1️⃣ 판매원 계정 (user1) 확인/생성 중...');
    let user1User = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: { startsWith: 'user1' } },
          { mallUserId: 'user1' },
          { email: 'user1@test.local' },
        ],
      },
    });

    if (!user1User) {
      const hashedPassword = await bcrypt.hash('1101', 10);
      user1User = await prisma.user.create({
        data: {
          phone: 'user1',
          email: 'user1@test.local',
          name: '테스트 판매원',
          password: hashedPassword,
          mallUserId: 'user1',
          mallNickname: '테스트 판매원',
          role: 'user',
          onboarded: true,
        },
      });
      console.log(`   ✅ user1 계정 생성 완료 (ID: ${user1User.id})`);
    } else {
      console.log(`   ✅ user1 계정 확인 완료 (ID: ${user1User.id})`);
    }

    // user1 AffiliateProfile 확인/생성
    let user1Profile = await prisma.affiliateProfile.findUnique({
      where: { userId: user1User.id },
    });

    if (!user1Profile) {
      user1Profile = await prisma.affiliateProfile.create({
        data: {
          userId: user1User.id,
          affiliateCode: `AFF-USER1-${Date.now().toString().slice(-4)}`,
          type: 'SALES_AGENT',
          status: 'ACTIVE',
          displayName: '테스트 판매원',
          nickname: 'user1',
        },
      });
      console.log(`   ✅ user1 AffiliateProfile 생성 완료 (ID: ${user1Profile.id})`);
    } else {
      console.log(`   ✅ user1 AffiliateProfile 확인 완료 (ID: ${user1Profile.id})`);
    }

    // boss1과 user1의 AffiliateRelation 확인/생성
    console.log('1-2️⃣ AffiliateRelation 생성 중 (boss1 → user1)...');
    const existingRelation = await prisma.affiliateRelation.findUnique({
      where: {
        managerId_agentId: {
          managerId: boss1Profile.id,
          agentId: user1Profile.id,
        },
      },
    });

    if (!existingRelation) {
      await prisma.affiliateRelation.create({
        data: {
          managerId: boss1Profile.id,
          agentId: user1Profile.id,
          status: 'ACTIVE',
          connectedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateRelation 생성 완료 (boss1 → user1)`);
    } else {
      await prisma.affiliateRelation.update({
        where: { id: existingRelation.id },
        data: {
          status: 'ACTIVE',
          connectedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateRelation 업데이트 완료 (boss1 → user1)`);
    }

    console.log('');

    // 2. CruiseProduct 생성 (지중해 크루즈 7박 8일)
    console.log('2️⃣ 크루즈 상품 생성 중...');
    const product = await prisma.cruiseProduct.upsert({
      where: { productCode: 'TEST-MED-001' },
      update: {
        shipName: 'MSC World Europa',
        cruiseLine: 'MSC 크루즈',
        packageName: '지중해 크루즈 7박 8일',
        nights: 7,
        days: 8,
        itineraryPattern: [
          {
            day: 1,
            type: 'Embarkation',
            location: 'Barcelona',
            country: 'ES',
            currency: 'EUR',
            language: 'es',
            time: '17:00',
          },
          {
            day: 2,
            type: 'Cruising',
          },
          {
            day: 3,
            type: 'PortVisit',
            location: 'Palma, Mallorca',
            country: 'ES',
            currency: 'EUR',
            language: 'es',
            arrival: '08:00',
            departure: '18:00',
          },
          {
            day: 4,
            type: 'PortVisit',
            location: 'Marseille',
            country: 'FR',
            currency: 'EUR',
            language: 'fr',
            arrival: '09:00',
            departure: '19:00',
          },
          {
            day: 5,
            type: 'PortVisit',
            location: 'Genoa',
            country: 'IT',
            currency: 'EUR',
            language: 'it',
            arrival: '08:00',
            departure: '18:00',
          },
          {
            day: 6,
            type: 'PortVisit',
            location: 'Naples',
            country: 'IT',
            currency: 'EUR',
            language: 'it',
            arrival: '09:00',
            departure: '20:00',
          },
          {
            day: 7,
            type: 'Cruising',
          },
          {
            day: 8,
            type: 'Disembarkation',
            location: 'Barcelona',
            country: 'ES',
            currency: 'EUR',
            language: 'es',
            time: '09:00',
          },
        ],
      },
      create: {
        productCode: 'TEST-MED-001',
        cruiseLine: 'MSC 크루즈',
        shipName: 'MSC World Europa',
        packageName: '지중해 크루즈 7박 8일',
        nights: 7,
        days: 8,
        basePrice: 2500000,
        description: '바르셀로나 출발 지중해 크루즈 7박 8일',
        updatedAt: new Date(),
        itineraryPattern: [
          {
            day: 1,
            type: 'Embarkation',
            location: 'Barcelona',
            country: 'ES',
            currency: 'EUR',
            language: 'es',
            time: '17:00',
          },
          {
            day: 2,
            type: 'Cruising',
          },
          {
            day: 3,
            type: 'PortVisit',
            location: 'Palma, Mallorca',
            country: 'ES',
            currency: 'EUR',
            language: 'es',
            arrival: '08:00',
            departure: '18:00',
          },
          {
            day: 4,
            type: 'PortVisit',
            location: 'Marseille',
            country: 'FR',
            currency: 'EUR',
            language: 'fr',
            arrival: '09:00',
            departure: '19:00',
          },
          {
            day: 5,
            type: 'PortVisit',
            location: 'Genoa',
            country: 'IT',
            currency: 'EUR',
            language: 'it',
            arrival: '08:00',
            departure: '18:00',
          },
          {
            day: 6,
            type: 'PortVisit',
            location: 'Naples',
            country: 'IT',
            currency: 'EUR',
            language: 'it',
            arrival: '09:00',
            departure: '20:00',
          },
          {
            day: 7,
            type: 'Cruising',
          },
          {
            day: 8,
            type: 'Disembarkation',
            location: 'Barcelona',
            country: 'ES',
            currency: 'EUR',
            language: 'es',
            time: '09:00',
          },
        ],
      },
    });

    console.log(`   ✅ 크루즈 상품 생성 완료 (${product.productCode}: ${product.packageName})`);
    console.log('');

    // 2-1. MallProductContent 생성 (요금표 포함)
    console.log('2-1️⃣ 상품 콘텐츠 생성 중 (요금표 포함)...');
    await prisma.mallProductContent.upsert({
      where: { productCode: 'TEST-MED-001' },
      update: {
        layout: {
          pricing: [
            {
              cabinType: '인테리어',
              fareCategory: '어드밴티지',
              fareLabel: '어드밴티지',
              adultPrice: 1500000,
              childPrice: 750000,
              infantPrice: 0,
              minOccupancy: 2,
              maxOccupancy: 4,
            },
            {
              cabinType: '발코니',
              fareCategory: '베스트',
              fareLabel: '베스트',
              adultPrice: 2500000,
              childPrice: 1250000,
              minOccupancy: 2,
              maxOccupancy: 4,
            },
          ],
          departureDate: '2025-05-01',
        },
        updatedAt: new Date(),
      },
      create: {
        productCode: 'TEST-MED-001',
        isActive: true,
        layout: {
          pricing: [
            {
              cabinType: '인테리어',
              fareCategory: '어드밴티지',
              fareLabel: '어드밴티지',
              adultPrice: 1500000,
              childPrice: 750000,
              infantPrice: 0,
              minOccupancy: 2,
              maxOccupancy: 4,
            },
            {
              cabinType: '발코니',
              fareCategory: '베스트',
              fareLabel: '베스트',
              adultPrice: 2500000,
              childPrice: 1250000,
              minOccupancy: 2,
              maxOccupancy: 4,
            },
          ],
          departureDate: '2025-05-01',
        },
        updatedAt: new Date(),
      },
    });
    console.log('   ✅ 상품 콘텐츠 생성 완료 (요금표 포함)');
    console.log('');

    // 3. Trip 생성 (출발일: 2025-05-01)
    console.log('3️⃣ 여행 일정 생성 중...');
    const departureDate = new Date('2025-05-01T00:00:00Z');
    const endDate = new Date(departureDate);
    endDate.setDate(endDate.getDate() + product.days - 1);

    // 기존 Trip 확인
    let trip = await prisma.trip.findFirst({
      where: {
        userId: boss1User.id,
        productCode: 'TEST-MED-001',
        departureDate,
      },
    });

    if (trip) {
      // 기존 Trip 업데이트
      trip = await prisma.trip.update({
        where: { id: trip.id },
        data: {
          shipName: 'MSC World Europa',
          departureDate,
          startDate: departureDate,
          endDate,
          productCode: 'TEST-MED-001',
          cruiseName: `${product.cruiseLine} ${product.shipName}`,
        },
      });
      console.log(`   ✅ 기존 여행 일정 업데이트 완료 (Trip ID: ${trip.id})`);
    } else {
      // 새 Trip 생성
      trip = await prisma.trip.create({
        data: {
          userId: boss1User.id,
          productId: product.id,
          productCode: 'TEST-MED-001',
          shipName: 'MSC World Europa',
          departureDate,
          startDate: departureDate,
          endDate,
          cruiseName: `${product.cruiseLine} ${product.shipName}`,
          nights: product.nights,
          days: product.days,
          visitCount: 4, // 방문 도시 수
          status: 'Upcoming',
          destination: ['Barcelona', 'Palma', 'Marseille', 'Genoa', 'Naples'],
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ 여행 일정 생성 완료 (Trip ID: ${trip.id})`);
    }

    console.log(`   ✅ 여행 일정 생성 완료 (Trip ID: ${trip.id})`);
    console.log(`      출발일: ${departureDate.toISOString().split('T')[0]}`);
    console.log(`      선박명: ${trip.shipName}`);
    console.log('');

    // 4. 테스트 고객(User) 생성 (boss1의 고객으로 연결)
    console.log('4️⃣ 테스트 고객 생성 중...');
    let testCustomer = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: '010-1234-5678' },
          { email: 'test-customer@test.local' },
        ],
      },
    });

    if (!testCustomer) {
      const hashedPassword = await bcrypt.hash('test1234', 10);
      testCustomer = await prisma.user.create({
        data: {
          phone: '010-1234-5678',
          email: 'test-customer@test.local',
          name: '테스트 고객',
          password: hashedPassword,
          role: 'user',
          customerStatus: 'REGISTERED',
          onboarded: true,
        },
      });
      console.log(`   ✅ 테스트 고객 생성 완료 (ID: ${testCustomer.id}, 이름: ${testCustomer.name})`);
    } else {
      console.log(`   ✅ 테스트 고객 확인 완료 (ID: ${testCustomer.id}, 이름: ${testCustomer.name})`);
    }

    // AffiliateLead 생성 (boss1의 고객으로 연결)
    const existingLead = await prisma.affiliateLead.findFirst({
      where: {
        customerPhone: testCustomer.phone,
        managerId: boss1Profile.id,
      },
    });

    if (!existingLead) {
      await prisma.affiliateLead.create({
        data: {
          managerId: boss1Profile.id,
          customerName: testCustomer.name || '테스트 고객',
          customerPhone: testCustomer.phone || '010-1234-5678',
          status: 'CONTACTED',
          source: 'TEST',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateLead 생성 완료 (boss1의 고객으로 연결)`);
    } else {
      console.log(`   ✅ AffiliateLead 확인 완료 (boss1의 고객으로 연결)`);
    }

    console.log('');

    // 5. 결제 완료된 주문(Payment) 데이터 생성
    console.log('5️⃣ 결제 완료된 주문(Payment) 데이터 생성 중...');
    
    // 주문번호 고정 (ORDER_TEST_001)
    const orderId = 'ORDER_TEST_001';
    
    // 기존 Payment 확인
    let existingPayment = await prisma.payment.findFirst({
      where: {
        orderId: 'ORDER_TEST_001',
      },
    });

    if (!existingPayment) {
      // Payment 생성 (발코니 베스트, 성인 2명)
      const paymentAmount = 5000000; // 발코니 베스트 2명 * 2,500,000원
      const now = new Date();
      
      existingPayment = await prisma.payment.create({
        data: {
          orderId,
          productCode: 'TEST-MED-001',
          productName: '지중해 크루즈 7박 8일',
          amount: paymentAmount,
          currency: 'KRW',
          buyerName: '김샘플',
          buyerEmail: testCustomer.email || 'test-customer@test.local',
          buyerTel: '010-1234-5678',
          status: 'completed',
          pgProvider: 'TEST_PG',
          pgTransactionId: `PG_${Date.now()}`,
          affiliateCode: boss1Profile.affiliateCode,
          affiliateMallUserId: 'boss1',
          paidAt: now,
          metadata: {
            productCode: 'TEST-MED-001',
            totalGuests: 2,
            roomSelections: [
              {
                cabinType: '발코니',
                adult: 2,
              },
            ],
          },
          createdAt: now,
          updatedAt: now,
        },
      });
      console.log(`   ✅ Payment 생성 완료 (Order ID: ${orderId}, 금액: ${paymentAmount.toLocaleString()}원)`);

      // AffiliateSale 생성 (status: PENDING)
      const sale = await prisma.affiliateSale.create({
        data: {
          externalOrderCode: orderId,
          managerId: boss1Profile.id,
          productCode: 'TEST-MED-001',
          cabinType: '발코니',
          fareCategory: '베스트',
          headcount: 2, // 총 인원수
          saleAmount: paymentAmount,
          status: 'PENDING',
          saleDate: now,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Payment와 AffiliateSale 연결
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          saleId: sale.id,
          updatedAt: now,
        },
      });

      console.log(`   ✅ AffiliateSale 생성 완료 (Sale ID: ${sale.id}, 인원: ${sale.headcount}명, 상태: ${sale.status})`);
      console.log(`   ✅ Payment와 AffiliateSale 연결 완료`);
    } else {
      // 기존 Payment가 있으면 업데이트하여 요구사항에 맞게 설정
      existingPayment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: 'completed',
          buyerName: '김샘플',
          buyerTel: '010-1234-5678',
          metadata: {
            productCode: 'TEST-MED-001',
            totalGuests: 2,
            roomSelections: [
              {
                cabinType: '발코니',
                adult: 2,
              },
            ],
          },
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ 기존 Payment 업데이트 완료 (Order ID: ${orderId}, 상태: ${existingPayment.status})`);

      // AffiliateSale 확인/생성
      const existingSale = await prisma.affiliateSale.findFirst({
        where: {
          externalOrderCode: orderId,
          managerId: boss1Profile.id,
        },
      });

      if (!existingSale) {
        const sale = await prisma.affiliateSale.create({
          data: {
            externalOrderCode: orderId,
            managerId: boss1Profile.id,
            productCode: 'TEST-MED-001',
            cabinType: '발코니',
            fareCategory: '베스트',
            headcount: 2,
            saleAmount: existingPayment.amount,
            status: 'PENDING',
            saleDate: existingPayment.paidAt || new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Payment와 AffiliateSale 연결
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            saleId: sale.id,
            updatedAt: new Date(),
          },
        });

        console.log(`   ✅ AffiliateSale 생성 완료 (Sale ID: ${sale.id}, 상태: ${sale.status})`);
        console.log(`   ✅ Payment와 AffiliateSale 연결 완료`);
      } else {
        // AffiliateSale 상태 확인
        console.log(`   ✅ AffiliateSale 확인 완료 (Sale ID: ${existingSale.id}, 상태: ${existingSale.status})`);
      }
    }

    console.log('');

    console.log('────────────────────────────────────────────');
    console.log('  ✅ 테스트 데이터 생성 완료!');
    console.log('────────────────────────────────────────────');
    console.log('');
    console.log('📊 생성된 데이터:');
    console.log(`   - 크루즈 상품: ${product.productCode} (${product.packageName})`);
    console.log(`   - 여행 일정: Trip ID ${trip.id}`);
    console.log(`   - 파트너 계정: boss1 (ID: ${boss1User.id})`);
    console.log(`   - 판매원 계정: user1 (ID: ${user1User.id})`);
    console.log(`   - 관계: boss1 → user1 (AffiliateRelation)`);
    console.log(`   - 테스트 고객: ${testCustomer.name} (ID: ${testCustomer.id})`);
    if (existingPayment) {
      console.log(`   - 결제 주문: ${existingPayment.orderId} (금액: ${existingPayment.amount.toLocaleString()}원)`);
      console.log(`   - 주문 정보: 발코니 베스트, 총 2명`);
    }
    console.log('');
    console.log('💡 이제 파트너 예약 페이지에서 데이터를 확인할 수 있습니다.');
    console.log('   "결제 내역 불러오기" 버튼을 클릭하여 주문을 선택하면 자동으로 채워집니다.');
    console.log('');
  } catch (error: any) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    // DATABASE_URL 복원 (원래 값이 있었다면)
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  }
}

main()
  .catch((error) => {
    console.error('❌ 스크립트 실행 중 오류:', error);
    process.exit(1);
  });

