#!/usr/bin/env tsx
/**
 * 데이터 연결 수정 스크립트
 * DATABASE_URL_TEST 환경에서 작동
 * 
 * 목적: Payment 데이터와 AffiliateSale을 연결하여 파트너 화면에서 결제 내역을 불러올 수 있도록 함
 * 
 * 로직:
 * 1. boss1 유저를 찾고, 그의 AffiliateProfile ID를 가져옵니다.
 * 2. CruiseProduct (지중해 크루즈)가 없으면 생성합니다.
 * 3. Payment 데이터를 생성할 때, 반드시 AffiliateSale 테이블도 같이 생성하고,
 *    여기에 managerId (또는 agentId)를 boss1의 프로필 ID로 설정합니다.
 * 4. AffiliateSale.status는 'PENDING'이어야 목록에 뜹니다.
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

// DATABASE_URL을 DATABASE_URL_TEST로 임시 변경
const originalDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = databaseUrlTest;

// Prisma 클라이언트 생성
const prisma = new PrismaClient();

async function main() {
  console.log('────────────────────────────────────────────');
  console.log('  🔧 데이터 연결 수정 스크립트 시작');
  console.log('────────────────────────────────────────────');
  console.log(`📌 연결 대상: ${databaseUrlTest.split('@')[1]?.split('/')[0] || '테스트 DB'}`);
  console.log('');

  try {
    // 1. boss1 유저 찾기
    console.log('1️⃣ boss1 유저 찾는 중...');
    const boss1User = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: { startsWith: 'boss1' } },
          { mallUserId: 'boss1' },
          { email: 'boss1@test.local' },
        ],
      },
    });

    if (!boss1User) {
      console.error('❌ boss1 유저를 찾을 수 없습니다.');
      console.error('💡 먼저 seed-test-data.ts를 실행하여 boss1 계정을 생성하세요.');
      process.exit(1);
    }

    console.log(`   ✅ boss1 유저 확인 완료 (ID: ${boss1User.id}, 이름: ${boss1User.name})`);

    // 2. AffiliateProfile ID 가져오기
    console.log('2️⃣ AffiliateProfile ID 가져오는 중...');
    const boss1Profile = await prisma.affiliateProfile.findUnique({
      where: { userId: boss1User.id },
    });

    if (!boss1Profile) {
      console.error('❌ boss1의 AffiliateProfile을 찾을 수 없습니다.');
      console.error('💡 먼저 seed-test-data.ts를 실행하여 AffiliateProfile을 생성하세요.');
      process.exit(1);
    }

    console.log(`   ✅ AffiliateProfile 확인 완료 (ID: ${boss1Profile.id}, affiliateCode: ${boss1Profile.affiliateCode})`);
    console.log('');

    // 3. CruiseProduct 확인/생성
    console.log('3️⃣ CruiseProduct 확인/생성 중...');
    const productCode = 'TEST-MED-001';
    let product = await prisma.cruiseProduct.findUnique({
      where: { productCode },
    });

    if (!product) {
      product = await prisma.cruiseProduct.create({
        data: {
          productCode: 'TEST-MED-001',
          cruiseLine: 'MSC 크루즈',
          shipName: 'MSC World Europa',
          packageName: '지중해 크루즈 7박 8일',
          nights: 7,
          days: 8,
          basePrice: 2500000,
          description: '바르셀로나 출발 지중해 크루즈 7박 8일',
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
      console.log(`   ✅ CruiseProduct 생성 완료 (${product.productCode})`);
    } else {
      console.log(`   ✅ CruiseProduct 확인 완료 (${product.productCode})`);
    }
    console.log('');

    // 4. 기존 Payment 데이터 확인 및 AffiliateSale 연결
    console.log('4️⃣ Payment 데이터 확인 및 AffiliateSale 연결 중...');
    
    // 모든 Payment 데이터 조회 (saleId가 없는 것들)
    const paymentsWithoutSale = await prisma.payment.findMany({
      where: {
        saleId: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`   📊 saleId가 없는 Payment 개수: ${paymentsWithoutSale.length}`);

    if (paymentsWithoutSale.length === 0) {
      console.log('   ℹ️  연결할 Payment 데이터가 없습니다.');
    } else {
      let createdCount = 0;
      let updatedCount = 0;

      for (const payment of paymentsWithoutSale) {
        // 이미 해당 orderId로 AffiliateSale이 있는지 확인
        const existingSale = await prisma.affiliateSale.findFirst({
          where: {
            externalOrderCode: payment.orderId,
          },
        });

        if (existingSale) {
          // 기존 AffiliateSale이 있으면 Payment와 연결
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              saleId: existingSale.id,
              updatedAt: new Date(),
            },
          });

          // managerId가 없으면 설정
          if (!existingSale.managerId && !existingSale.agentId) {
            await prisma.affiliateSale.update({
              where: { id: existingSale.id },
              data: {
                managerId: boss1Profile.id,
                status: 'PENDING',
                updatedAt: new Date(),
              },
            });
            console.log(`   ✅ AffiliateSale 업데이트 완료 (Sale ID: ${existingSale.id}, managerId 설정)`);
          }
          updatedCount++;
        } else {
          // AffiliateSale이 없으면 생성
          const sale = await prisma.affiliateSale.create({
            data: {
              externalOrderCode: payment.orderId,
              managerId: boss1Profile.id, // 핵심: boss1의 프로필 ID로 설정
              productCode: payment.productCode || productCode,
              cabinType: (payment.metadata as any)?.roomSelections?.[0]?.cabinType || null,
              fareCategory: (payment.metadata as any)?.roomSelections?.[0]?.fareCategory || null,
              headcount: (payment.metadata as any)?.totalGuests || 1,
              saleAmount: payment.amount,
              status: 'PENDING', // PENDING 상태로 설정 (목록에 뜨도록)
              saleDate: payment.paidAt || payment.createdAt,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Payment와 AffiliateSale 연결
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              saleId: sale.id,
              updatedAt: new Date(),
            },
          });

          console.log(`   ✅ AffiliateSale 생성 및 연결 완료 (Sale ID: ${sale.id}, Order ID: ${payment.orderId})`);
          createdCount++;
        }
      }

      console.log(`   📊 처리 완료: ${createdCount}개 생성, ${updatedCount}개 업데이트`);
    }
    console.log('');

    // 5. 기존 AffiliateSale의 managerId 확인 및 수정
    console.log('5️⃣ 기존 AffiliateSale의 managerId 확인 및 수정 중...');
    
    // managerId나 agentId가 없는 AffiliateSale 찾기
    const salesWithoutManager = await prisma.affiliateSale.findMany({
      where: {
        AND: [
          {
            OR: [
              { managerId: null },
              { agentId: null },
            ],
          },
          {
            NOT: {
              AND: [
                { managerId: boss1Profile.id },
                { agentId: boss1Profile.id },
              ],
            },
          },
        ],
      },
    });

    console.log(`   📊 managerId/agentId가 없는 AffiliateSale 개수: ${salesWithoutManager.length}`);

    if (salesWithoutManager.length > 0) {
      let fixedCount = 0;
      for (const sale of salesWithoutManager) {
        // Payment와 연결된 경우에만 수정
        const payment = await prisma.payment.findFirst({
          where: { saleId: sale.id },
        });

        if (payment) {
          await prisma.affiliateSale.update({
            where: { id: sale.id },
            data: {
              managerId: boss1Profile.id,
              status: sale.status === 'PENDING' ? 'PENDING' : (sale.status || 'PENDING'),
              updatedAt: new Date(),
            },
          });
          console.log(`   ✅ AffiliateSale 업데이트 완료 (Sale ID: ${sale.id}, managerId 설정)`);
          fixedCount++;
        }
      }
      console.log(`   📊 처리 완료: ${fixedCount}개 AffiliateSale 업데이트`);
    }
    console.log('');

    // 6. 최종 확인: boss1의 AffiliateSale 개수 확인
    console.log('6️⃣ 최종 확인: boss1의 AffiliateSale 개수 확인 중...');
    const boss1Sales = await prisma.affiliateSale.findMany({
      where: {
        OR: [
          { managerId: boss1Profile.id },
          { agentId: boss1Profile.id },
        ],
        status: {
          in: ['PENDING', 'COMPLETED', 'CONFIRMED'],
        },
      },
      include: {
        Payment: {
          select: {
            id: true,
            orderId: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    console.log(`   ✅ boss1의 AffiliateSale 개수: ${boss1Sales.length}개`);
    
    // PENDING 상태인 것들만 표시
    const pendingSales = boss1Sales.filter(s => s.status === 'PENDING');
    console.log(`   ✅ PENDING 상태인 AffiliateSale 개수: ${pendingSales.length}개`);
    
    if (boss1Sales.length > 0) {
      console.log('');
      console.log('   📋 AffiliateSale 목록:');
      boss1Sales.forEach((sale, index) => {
        console.log(`   ${index + 1}. Sale ID: ${sale.id}, Order: ${sale.externalOrderCode || 'N/A'}, Status: ${sale.status}, Amount: ${sale.saleAmount?.toLocaleString() || 'N/A'}원`);
        if (sale.Payment) {
          console.log(`      → Payment ID: ${sale.Payment.id}, Order ID: ${sale.Payment.orderId}`);
        }
      });
    }
    console.log('');

    console.log('────────────────────────────────────────────');
    console.log('  ✅ 데이터 연결 수정 완료!');
    console.log('────────────────────────────────────────────');
    console.log('');
    console.log('📊 처리 결과:');
    console.log(`   - boss1 유저 ID: ${boss1User.id}`);
    console.log(`   - AffiliateProfile ID: ${boss1Profile.id}`);
    console.log(`   - 연결된 AffiliateSale 개수: ${boss1Sales.length}개`);
    console.log(`   - PENDING 상태 AffiliateSale 개수: ${pendingSales.length}개`);
    console.log('');
    console.log('💡 이제 파트너 화면에서 "결제 내역 불러오기" 버튼을 클릭하면');
    console.log('   연결된 주문 목록을 확인할 수 있습니다.');
    console.log('');
  } catch (error: any) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    // DATABASE_URL 복원
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

