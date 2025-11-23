#!/usr/bin/env tsx
/**
 * boss1 파트너용 고객 샘플 데이터 생성 스크립트
 * 실제 서버 DB (DATABASE_URL)에 boss1(User ID 3)와 연결된 데이터 생성
 * 
 * 생성 데이터:
 * 1. AffiliateLead: 고객 리드
 * 2. Payment: 결제 완료 데이터
 * 3. AffiliateSale: boss1 파트너의 판매 실적
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// .env 파일 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

// 실제 서버 DB (DATABASE_URL) 사용
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 오류: DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  console.error('💡 .env 파일에 DATABASE_URL를 설정하세요.');
  process.exit(1);
}

// DATABASE_URL을 그대로 사용
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  console.log('────────────────────────────────────────────');
  console.log('  📦 boss1 파트너 고객 샘플 데이터 생성 시작');
  console.log('────────────────────────────────────────────');
  if (databaseUrl && databaseUrl.includes('@')) {
    const dbInfo = databaseUrl.split('@')[1]?.split('/')[0] || '알 수 없음';
    console.log(`📌 연결 대상: ${dbInfo}`);
  } else {
    console.log(`📌 연결 대상: 로컬 DB`);
  }
  console.log('');

  try {
    // 1. boss1 유저 찾기 (User ID 3)
    console.log('1️⃣ boss1 유저 확인 중...');
    const boss1User = await prisma.user.findFirst({
      where: {
        mallUserId: 'boss1',
      },
      include: {
        AffiliateProfile: true,
      },
    });

    if (!boss1User) {
      console.error('❌ boss1 유저를 찾을 수 없습니다.');
      console.error('💡 boss1 계정이 생성되어 있는지 확인하세요.');
      process.exit(1);
    }

    if (boss1User.id !== 3) {
      console.warn(`⚠️  경고: boss1 User ID가 3이 아닙니다 (현재: ${boss1User.id})`);
      console.warn(`   터미널 로그에는 User ID 3이 표시되었습니다.`);
    }

    console.log(`   ✅ boss1 유저 확인 완료 (ID: ${boss1User.id}, mallUserId: ${boss1User.mallUserId})`);

    // 2. AffiliateProfile 확인
    if (!boss1User.AffiliateProfile) {
      console.error('❌ boss1 유저의 AffiliateProfile을 찾을 수 없습니다.');
      console.error('💡 AffiliateProfile이 생성되어 있는지 확인하세요.');
      process.exit(1);
    }

    const profileId = boss1User.AffiliateProfile.id;
    const affiliateCode = boss1User.AffiliateProfile.affiliateCode;
    console.log(`   ✅ AffiliateProfile 확인 완료 (ID: ${profileId}, Code: ${affiliateCode})`);
    console.log('');

    // 3. 고객 리드 샘플 생성
    console.log('2️⃣ 고객 리드 샘플 생성 중...');
    const sampleCustomers = [
      {
        customerName: '김민수',
        customerPhone: '010-1234-5678',
        status: 'IN_PROGRESS',
        source: 'partner-manual',
        notes: '일본 크루즈 관심 있음. 2인 여행 예정.',
      },
      {
        customerName: '이영희',
        customerPhone: '010-2345-6789',
        status: 'CONTACTED',
        source: 'partner-manual',
        notes: '대만 크루즈 문의. 예산 200만원대.',
      },
      {
        customerName: '박준호',
        customerPhone: '010-3456-7890',
        status: 'NEW',
        source: 'partner-manual',
        notes: '가족 여행(4인) 계획 중. 3월 출발 희망.',
      },
      {
        customerName: '최수진',
        customerPhone: '010-4567-8901',
        status: 'CONTACTED',
        source: 'partner-manual',
        notes: '신혼여행으로 크루즈 검토 중.',
      },
      {
        customerName: '정다은',
        customerPhone: '010-5678-9012',
        status: 'IN_PROGRESS',
        source: 'partner-manual',
        notes: '친구들과 함께 5명 여행 계획.',
      },
    ];

    let createdLeads = 0;
    for (const customer of sampleCustomers) {
      // 이미 존재하는지 확인
      const existing = await prisma.affiliateLead.findFirst({
        where: {
          customerPhone: customer.customerPhone,
          managerId: profileId,
        },
      });

      if (existing) {
        console.log(`   ⏭️  건너뜀: ${customer.customerName} (${customer.customerPhone}) - 이미 존재함`);
        continue;
      }

      const lead = await prisma.affiliateLead.create({
        data: {
          customerName: customer.customerName,
          customerPhone: customer.customerPhone,
          status: customer.status,
          source: customer.source,
          notes: customer.notes,
          managerId: profileId,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ 생성: ${customer.customerName} (${customer.customerPhone}) - ${customer.status}`);
      createdLeads++;
    }
    console.log(`   📊 생성된 리드: ${createdLeads}개\n`);

    // 4. 상품 확인 (TEST-MED-001 또는 첫 번째 상품)
    console.log('3️⃣ 상품 확인 중...');
    let cruiseProduct = await prisma.cruiseProduct.findUnique({
      where: { productCode: 'TEST-MED-001' },
    });

    if (!cruiseProduct) {
      // TEST-MED-001 상품 생성
      console.log(`   ⚠️  TEST-MED-001 상품이 없어 생성 중...`);
      cruiseProduct = await prisma.cruiseProduct.create({
        data: {
          productCode: 'TEST-MED-001',
          cruiseLine: 'MSC 크루즈',
          shipName: 'MSC World Europa',
          packageName: '지중해 크루즈 7박 8일',
          nights: 7,
          days: 8,
          itineraryPattern: [
            { day: 1, type: 'boarding', location: '제노아', country: '이탈리아' },
            { day: 2, type: 'port', location: '나폴리', country: '이탈리아' },
            { day: 3, type: 'port', location: '팔레르모', country: '이탈리아' },
            { day: 4, type: 'sea', location: '해상', country: null },
            { day: 5, type: 'port', location: '발렌시아', country: '스페인' },
            { day: 6, type: 'port', location: '마르세유', country: '프랑스' },
            { day: 7, type: 'port', location: '제노아', country: '이탈리아' },
            { day: 8, type: 'disembarkation', location: '제노아', country: '이탈리아' },
          ],
          basePrice: 3000000,
          description: '지중해 크루즈 테스트 상품',
          saleStatus: '판매중',
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ 상품 생성 완료: ${cruiseProduct.productCode}`);
    } else {
      console.log(`   ✅ 상품 확인 완료: ${cruiseProduct.productCode}`);
    }
    console.log('');

    // 5. Payment 및 AffiliateSale 샘플 생성
    console.log('4️⃣ Payment 및 AffiliateSale 샘플 생성 중...');
    const sampleOrders = [
      {
        buyerName: '김샘플',
        buyerTel: '010-1111-2222',
        amount: 4500000,
        cabinType: '발코니',
        fareCategory: '베스트',
        headcount: 2,
      },
      {
        buyerName: '이테스트',
        buyerTel: '010-2222-3333',
        amount: 3000000,
        cabinType: '발코니',
        fareCategory: 'Standard',
        headcount: 2,
      },
      {
        buyerName: '박예약',
        buyerTel: '010-3333-4444',
        amount: 5000000,
        cabinType: '스위트',
        fareCategory: 'Premium',
        headcount: 2,
      },
      {
        buyerName: '최고객',
        buyerTel: '010-4444-5555',
        amount: 3500000,
        cabinType: '발코니',
        fareCategory: '베스트',
        headcount: 2,
      },
    ];

    let createdOrders = 0;
    for (const order of sampleOrders) {
      // 이미 존재하는 전화번호로 Payment가 있는지 확인
      const existingPayment = await prisma.payment.findFirst({
        where: {
          buyerTel: order.buyerTel,
          affiliateMallUserId: 'boss1',
        },
      });

      if (existingPayment) {
        console.log(`   ⏭️  건너뜀: ${order.buyerName} (${order.buyerTel}) - 이미 존재함`);
        continue;
      }

      const orderId = `ORDER_BOSS1_${Date.now()}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Payment 생성
      const payment = await prisma.payment.create({
        data: {
          orderId,
          productCode: cruiseProduct.productCode,
          productName: cruiseProduct.packageName || '크루즈 상품',
          amount: order.amount,
          currency: 'KRW',
          buyerName: order.buyerName,
          buyerTel: order.buyerTel,
          status: 'completed',
          paidAt: new Date(),
          affiliateMallUserId: 'boss1',
          affiliateCode: affiliateCode,
          metadata: {
            productCode: cruiseProduct.productCode,
            totalGuests: order.headcount,
            buyerName: order.buyerName,
            buyerTel: order.buyerTel,
            roomSelections: [
              {
                cabinType: order.cabinType,
                count: 1, // ⚠️ 중요: count 필드 필수 (발코니 2개 구매 시 count: 2)
                adult: order.headcount,
              },
            ],
          },
        },
      });

      // AffiliateSale 생성
      const affiliateSale = await prisma.affiliateSale.create({
        data: {
          externalOrderCode: orderId,
          productCode: cruiseProduct.productCode,
          cabinType: order.cabinType,
          fareCategory: order.fareCategory,
          headcount: order.headcount,
          saleAmount: order.amount,
          costAmount: Math.floor(order.amount * 0.8), // 80% 원가
          netRevenue: Math.floor(order.amount * 0.2), // 20% 순이익
          managerId: profileId,
          status: 'PENDING',
          saleDate: new Date(),
          updatedAt: new Date(),
          metadata: {
            testOrder: true,
            createdAt: new Date().toISOString(),
          },
        },
      });

      // Payment와 AffiliateSale 연결
      await prisma.payment.update({
        where: { id: payment.id },
        data: { saleId: affiliateSale.id },
      });

      console.log(`   ✅ 생성: ${order.buyerName} - ${order.amount.toLocaleString()}원 (Sale ID: ${affiliateSale.id})`);
      createdOrders++;
    }

    console.log(`   📊 생성된 주문: ${createdOrders}개\n`);

    console.log('────────────────────────────────────────────');
    console.log('  ✅ boss1 파트너 고객 샘플 데이터 생성 완료!');
    console.log('────────────────────────────────────────────');
    console.log(`📋 생성된 데이터:`);
    console.log(`   - 고객 리드: ${createdLeads}개`);
    console.log(`   - Payment 및 AffiliateSale: ${createdOrders}개`);
    console.log(`   - boss1 User ID: ${boss1User.id}`);
    console.log(`   - Profile ID: ${profileId}`);
    console.log(`   - AffiliateCode: ${affiliateCode}`);
    console.log('');
    console.log('💡 이제 boss1 계정으로 로그인하여 고객 및 판매 내역을 확인할 수 있습니다.');
  } catch (error: any) {
    console.error('❌ 오류 발생:', error);
    console.error('스택:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

