#!/usr/bin/env tsx
/**
 * 완벽한 샘플 데이터 생성 스크립트
 * 
 * 생성 데이터:
 * 1. CruiseProduct: TEST-MED-001 (요금표 포함: 인사이드, 오션뷰, 발코니, 스위트)
 * 2. Payment: 발코니 객실 2개, 성인 4명 (완벽한 metadata 형식)
 * 3. AffiliateSale: boss1 파트너와 연결, 상태 PENDING
 * 
 * 사용법:
 *   npx tsx scripts/seed-perfect-data.ts
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

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 오류: DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  console.error('💡 .env 파일에 DATABASE_URL를 설정하세요.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  console.log('────────────────────────────────────────────');
  console.log('  📦 완벽한 샘플 데이터 생성 시작');
  console.log('────────────────────────────────────────────');
  if (databaseUrl.includes('@')) {
    const dbInfo = databaseUrl.split('@')[1]?.split('/')[0] || '알 수 없음';
    console.log(`📌 연결 대상: ${dbInfo}`);
  } else {
    console.log(`📌 연결 대상: 로컬 DB`);
  }
  console.log('');

  try {
    // 1. boss1 유저 찾기
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

    console.log(`   ✅ boss1 유저 확인 완료 (ID: ${boss1User.id})`);

    if (!boss1User.AffiliateProfile) {
      console.error('❌ boss1 유저의 AffiliateProfile을 찾을 수 없습니다.');
      process.exit(1);
    }

    const profileId = boss1User.AffiliateProfile.id;
    const affiliateCode = boss1User.AffiliateProfile.affiliateCode;
    console.log(`   ✅ AffiliateProfile 확인 완료 (ID: ${profileId}, Code: ${affiliateCode})`);
    console.log('');

    // 2. 기존 TEST-MED-001 상품 및 관련 데이터 삭제
    console.log('2️⃣ 기존 TEST-MED-001 데이터 정리 중...');
    
    // 기존 Payment 삭제 (AffiliateSale과 연결된 것들)
    const existingPayments = await prisma.payment.findMany({
      where: {
        productCode: 'TEST-MED-001',
        affiliateMallUserId: 'boss1',
      },
      include: {
        AffiliateSale: true,
      },
    });

    for (const payment of existingPayments) {
      if (payment.saleId) {
        await prisma.affiliateSale.delete({
          where: { id: payment.saleId },
        });
      }
      await prisma.payment.delete({
        where: { id: payment.id },
      });
    }
    console.log(`   ✅ 기존 Payment ${existingPayments.length}개 삭제 완료`);

    // 기존 MallProductContent 삭제
    await prisma.mallProductContent.deleteMany({
      where: {
        productCode: 'TEST-MED-001',
      },
    });
    console.log(`   ✅ 기존 MallProductContent 삭제 완료`);

    // 기존 CruiseProduct 삭제
    await prisma.cruiseProduct.deleteMany({
      where: {
        productCode: 'TEST-MED-001',
      },
    });
    console.log(`   ✅ 기존 CruiseProduct 삭제 완료`);
    console.log('');

    // 3. 완벽한 CruiseProduct 생성 (요금표 포함)
    console.log('3️⃣ 완벽한 CruiseProduct 생성 중...');
    const cruiseProduct = await prisma.cruiseProduct.create({
      data: {
        productCode: 'TEST-MED-001',
        cruiseLine: 'MSC 크루즈',
        shipName: 'MSC World Europa',
        packageName: '지중해 크루즈 7박 8일',
        nights: 7,
        days: 8,
        itineraryPattern: ['Barcelona', 'Marseille', 'Genoa', 'Naples'],
        basePrice: 3000000,
        description: '지중해 크루즈 테스트 상품 - 완벽한 샘플 데이터',
        saleStatus: '판매중',
        updatedAt: new Date(),
      },
    });
    console.log(`   ✅ CruiseProduct 생성 완료: ${cruiseProduct.productCode}`);
    console.log('');

    // 4. MallProductContent 생성 (요금표 포함)
    console.log('4️⃣ MallProductContent 생성 중 (요금표 포함)...');
    const mallProductContent = await prisma.mallProductContent.create({
      data: {
        productCode: 'TEST-MED-001',
        thumbnail: null,
        images: [],
        videos: [],
        fonts: [],
        layout: {
          pricing: [
            {
              cabinType: '인테리어',
              fareCategory: 'Standard',
              fareLabel: '베스트',
              adultPrice: 1500000,
              childPrice: 1200000,
              infantPrice: 500000,
              minOccupancy: 1,
              maxOccupancy: 4,
            },
            {
              cabinType: '오션뷰',
              fareCategory: 'Standard',
              fareLabel: '베스트',
              adultPrice: 2000000,
              childPrice: 1500000,
              infantPrice: 600000,
              minOccupancy: 1,
              maxOccupancy: 4,
            },
            {
              cabinType: '발코니',
              fareCategory: 'Standard',
              fareLabel: '베스트',
              adultPrice: 2500000,
              childPrice: 1800000,
              infantPrice: 700000,
              minOccupancy: 1,
              maxOccupancy: 4,
            },
            {
              cabinType: '스위트',
              fareCategory: 'Premium',
              fareLabel: '프리미엄',
              adultPrice: 3500000,
              childPrice: 2500000,
              infantPrice: 1000000,
              minOccupancy: 1,
              maxOccupancy: 4,
            },
          ],
          departureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30일 후
        },
        customCss: null,
        isActive: true,
        updatedAt: new Date(),
      },
    });
    console.log(`   ✅ MallProductContent 생성 완료 (요금표 4개 타입 포함)`);
    console.log('');

    // 5. 완벽한 Payment 생성 (발코니 객실 2개, 성인 4명)
    console.log('5️⃣ 완벽한 Payment 생성 중...');
    const orderId = `ORDER_PERFECT_${Date.now()}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // 완벽한 metadata 형식 (프론트엔드 로직과 100% 호환)
    // ⚠️ 중요: 구매 개수(count) = 인원 수 (발코니 2개 = 2명)
    const perfectMetadata = {
      productCode: 'TEST-MED-001',
      totalGuests: 2, // ⚠️ 발코니 2개 = 2명 (count 합계와 일치)
      buyerName: '김철수',
      buyerTel: '010-1234-5678',
      roomSelections: [
        {
          cabinType: '발코니',
          count: 2, // 방 2개 = 2명
          adult: 2,
        },
      ],
    };

    const payment = await prisma.payment.create({
      data: {
        orderId,
        productCode: cruiseProduct.productCode,
        productName: cruiseProduct.packageName || '크루즈 상품',
        amount: 5000000, // 발코니 2개 × 성인 2명 × 250만원 = 500만원
        currency: 'KRW',
        buyerName: perfectMetadata.buyerName,
        buyerTel: perfectMetadata.buyerTel,
        buyerEmail: 'kim@test.com',
        status: 'completed',
        paidAt: new Date(),
        affiliateMallUserId: 'boss1',
        affiliateCode: affiliateCode,
        metadata: perfectMetadata,
        updatedAt: new Date(),
      },
    });
    console.log(`   ✅ Payment 생성 완료:`);
    console.log(`      - Order ID: ${orderId}`);
    console.log(`      - 구매자: ${perfectMetadata.buyerName} (${perfectMetadata.buyerTel})`);
    console.log(`      - 금액: ${payment.amount.toLocaleString()}원`);
    console.log(`      - Metadata: ${JSON.stringify(perfectMetadata, null, 2)}`);
    console.log('');

    // 6. AffiliateSale 생성 (boss1 파트너, 상태 PENDING)
    console.log('6️⃣ AffiliateSale 생성 중...');
    const affiliateSale = await prisma.affiliateSale.create({
      data: {
        externalOrderCode: orderId,
        productCode: cruiseProduct.productCode,
        cabinType: '발코니',
        fareCategory: 'Standard',
        headcount: 2, // ⚠️ 발코니 2개 = 2명 (count 합계와 일치)
        saleAmount: payment.amount,
        costAmount: Math.floor(payment.amount * 0.8), // 80% 원가
        netRevenue: Math.floor(payment.amount * 0.2), // 20% 순이익
        managerId: profileId,
        status: 'PENDING',
        saleDate: new Date(),
        updatedAt: new Date(),
        metadata: {
          testOrder: true,
          perfectSample: true,
          createdAt: new Date().toISOString(),
        },
      },
    });
    console.log(`   ✅ AffiliateSale 생성 완료 (Status: PENDING)`);
    console.log('');

    // 7. Payment와 AffiliateSale 연결
    console.log('7️⃣ Payment와 AffiliateSale 연결 중...');
    await prisma.payment.update({
      where: { id: payment.id },
      data: { saleId: affiliateSale.id },
    });
    console.log(`   ✅ 연결 완료`);
    console.log('');

    console.log('────────────────────────────────────────────');
    console.log('  ✅ 완벽한 샘플 데이터 생성 완료!');
    console.log('────────────────────────────────────────────');
    console.log(`📋 생성된 데이터:`);
    console.log(`   - CruiseProduct: ${cruiseProduct.productCode}`);
    console.log(`     * 요금표: 인사이드, 오션뷰, 발코니, 스위트 (4개 타입)`);
    console.log(`   - Payment: ${orderId}`);
    console.log(`     * 구매 내용: 발코니 객실 2개, 총 4명 (totalGuests: 4)`);
    console.log(`     * Metadata 형식: 완벽하게 준수`);
    console.log(`   - AffiliateSale: ID ${affiliateSale.id}`);
    console.log(`     * 파트너: boss1 (Profile ID: ${profileId})`);
    console.log(`     * 상태: PENDING`);
    console.log('');
    console.log('💡 이제 예약 폼에서 결제 내역을 선택하면 자동으로 세팅됩니다!');
    console.log('   - 상품 자동 선택');
    console.log('   - 방 자동 생성: 발코니 2개 + 미배정 1개 = 총 3개');
    console.log('   - 대표자 정보 자동 입력');
    console.log('   - 여행자 슬롯 4개 자동 생성');
  } catch (error: any) {
    console.error('❌ 오류 발생:', error);
    console.error('스택:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

