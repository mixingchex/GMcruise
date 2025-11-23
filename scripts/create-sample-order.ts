#!/usr/bin/env tsx
/**
 * boss1 파트너용 샘플 주문 데이터 생성 스크립트
 * DATABASE_URL_TEST 환경에서 실행되는 테스트용 데이터 생성 스크립트
 * 
 * 생성 데이터:
 * 1. Payment: 결제 완료 데이터
 * 2. AffiliateSale: boss1 파트너의 판매 실적
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
  console.log('  📦 boss1 파트너 샘플 주문 데이터 생성 시작');
  console.log('────────────────────────────────────────────');
  console.log(`📌 연결 대상: ${databaseUrlTest.split('@')[1]?.split('/')[0] || '테스트 DB'}`);
  console.log('');

  try {
    // 1. boss1 유저 찾기
    console.log('1️⃣ boss1 유저 확인 중...');
    const boss1User = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: { startsWith: 'boss1' } },
          { mallUserId: 'boss1' },
          { email: 'boss1@test.local' },
        ],
      },
      include: {
        AffiliateProfile: true,
      },
    });

    if (!boss1User) {
      console.error('❌ boss1 유저를 찾을 수 없습니다.');
      console.error('💡 먼저 seed-test-data.ts를 실행하여 boss1 계정을 생성하세요.');
      process.exit(1);
    }

    console.log(`   ✅ boss1 유저 확인 완료 (ID: ${boss1User.id}, mallUserId: ${boss1User.mallUserId})`);

    // 2. AffiliateProfile 확인
    if (!boss1User.AffiliateProfile) {
      console.error('❌ boss1 유저의 AffiliateProfile을 찾을 수 없습니다.');
      console.error('💡 먼저 seed-test-data.ts를 실행하여 AffiliateProfile을 생성하세요.');
      process.exit(1);
    }

    const profileId = boss1User.AffiliateProfile.id;
    console.log(`   ✅ AffiliateProfile 확인 완료 (ID: ${profileId})`);

    // 3. 상품 확인/생성 (TEST-MED-001)
    console.log('2️⃣ 상품 확인/생성 중...');
    let cruiseProduct = await prisma.cruiseProduct.findUnique({
      where: { productCode: 'TEST-MED-001' },
    });

    if (!cruiseProduct) {
      // 상품 생성
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
        },
      });
      console.log(`   ✅ 상품 생성 완료 (ID: ${cruiseProduct.id}, productCode: ${cruiseProduct.productCode})`);
    } else {
      console.log(`   ✅ 상품 확인 완료 (ID: ${cruiseProduct.id}, productCode: ${cruiseProduct.productCode})`);
    }

    // 4. MallProductContent 확인/생성 (요금표 포함)
    console.log('3️⃣ MallProductContent 확인/생성 중...');
    let mallProductContent = await prisma.mallProductContent.findUnique({
      where: { productCode: 'TEST-MED-001' },
    });

    if (!mallProductContent) {
      mallProductContent = await prisma.mallProductContent.create({
        data: {
          productCode: 'TEST-MED-001',
          layout: {
            pricing: [
              {
                cabinType: '발코니',
                fareCategory: '베스트',
                fareLabel: '베스트',
                adultPrice: 4500000,
                childPrice: 3600000,
                infantPrice: 0,
                minOccupancy: 2,
                maxOccupancy: 4,
              },
              {
                cabinType: '발코니',
                fareCategory: 'Standard',
                fareLabel: '기본',
                adultPrice: 3000000,
                childPrice: 2400000,
                infantPrice: 0,
                minOccupancy: 2,
                maxOccupancy: 4,
              },
              {
                cabinType: '스위트',
                fareCategory: 'Premium',
                fareLabel: '프리미엄',
                adultPrice: 5000000,
                childPrice: 4000000,
                infantPrice: 0,
                minOccupancy: 2,
                maxOccupancy: 4,
              },
            ],
          },
          isActive: true,
        },
      });
      console.log(`   ✅ MallProductContent 생성 완료 (요금표 포함, 베스트 카테고리 포함)`);
    } else {
      // 기존 MallProductContent가 있으면 pricing에 "베스트" 카테고리 추가
      const currentLayout = mallProductContent.layout as any;
      const pricing = currentLayout?.pricing || [];
      const hasBestCategory = pricing.some((p: any) => p.fareCategory === '베스트');
      
      if (!hasBestCategory) {
        pricing.unshift({
          cabinType: '발코니',
          fareCategory: '베스트',
          fareLabel: '베스트',
          adultPrice: 4500000,
          childPrice: 3600000,
          infantPrice: 0,
          minOccupancy: 2,
          maxOccupancy: 4,
        });
        
        await prisma.mallProductContent.update({
          where: { productCode: 'TEST-MED-001' },
          data: {
            layout: {
              ...currentLayout,
              pricing,
            },
          },
        });
        console.log(`   ✅ MallProductContent 업데이트 완료 (베스트 카테고리 추가)`);
      } else {
        console.log(`   ✅ MallProductContent 확인 완료 (베스트 카테고리 존재)`);
      }
    }

    // 5. Payment 생성
    console.log('4️⃣ Payment 생성 중...');
    const orderId = `ORDER_SAMPLE_${Date.now()}`;
    const payment = await prisma.payment.create({
      data: {
        orderId,
        productCode: 'TEST-MED-001',
        productName: '지중해 크루즈 7박 8일',
        amount: 4500000, // 요구사항: 4500000
        currency: 'KRW',
        buyerName: '김샘플',
        buyerTel: '010-1234-5678',
        status: 'completed',
        paidAt: new Date(),
        affiliateMallUserId: 'boss1', // boss1 파트너로 연결 (API 조회용)
        affiliateCode: boss1User.AffiliateProfile?.affiliateCode || null, // AffiliateCode도 설정
        metadata: {
          totalGuests: 2,
          roomSelections: [
            {
              cabinType: '발코니',
              fareCategory: '베스트', // 요구사항: fareCategory 포함
              adult: 2,
            },
          ],
        },
      },
    });
    console.log(`   ✅ Payment 생성 완료 (ID: ${payment.id}, orderId: ${orderId})`);

    // 6. AffiliateSale 생성 (boss1의 managerId로 연결)
    console.log('5️⃣ AffiliateSale 생성 중...');
    const affiliateSale = await prisma.affiliateSale.create({
      data: {
        externalOrderCode: orderId,
        productCode: 'TEST-MED-001',
        cabinType: '발코니',
        fareCategory: '베스트', // Payment의 metadata와 일치
        headcount: 2,
        saleAmount: 4500000, // Payment의 amount와 일치
        costAmount: 3600000,
        netRevenue: 900000,
        managerId: profileId, // boss1의 AffiliateProfile ID (핵심!)
        status: 'PENDING', // 처리 대기 중이어야 목록에 표시됨
        saleDate: new Date(),
        updatedAt: new Date(), // updatedAt 필드 명시
        metadata: {
          testOrder: true,
          createdAt: new Date().toISOString(),
        },
      },
    });
    console.log(`   ✅ AffiliateSale 생성 완료 (ID: ${affiliateSale.id}, managerId: ${profileId})`);

    // 7. Payment와 AffiliateSale 연결
    console.log('6️⃣ Payment와 AffiliateSale 연결 중...');
    await prisma.payment.update({
      where: { id: payment.id },
      data: { saleId: affiliateSale.id },
    });
    console.log(`   ✅ 연결 완료`);

    console.log('');
    console.log('────────────────────────────────────────────');
    console.log('  ✅ 샘플 주문 데이터 생성 완료!');
    console.log('────────────────────────────────────────────');
    console.log(`📋 생성된 데이터:`);
    console.log(`   - Payment ID: ${payment.id}`);
    console.log(`   - Order ID: ${orderId}`);
    console.log(`   - AffiliateSale ID: ${affiliateSale.id}`);
    console.log(`   - Manager ID (boss1): ${profileId}`);
    console.log(`   - 상태: PENDING (목록에 표시됨)`);
    console.log('');
    console.log('💡 이제 boss1 계정으로 로그인하여 결제 내역을 확인할 수 있습니다.');
  } catch (error: any) {
    console.error('❌ 오류 발생:', error);
    console.error('스택:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    // 원래 DATABASE_URL 복원
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  }
}

main();

