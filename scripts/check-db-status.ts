#!/usr/bin/env tsx
/**
 * DB 상태 확인 스크립트
 * - DATABASE_URL_TEST를 사용하여 접속
 * - 4가지 조회: User, AffiliateProfile, Payment, AffiliateSale
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

// 실제 서버가 사용하는 DATABASE_URL 확인 (터미널 로그에 따르면 실제 서버는 DATABASE_URL 사용)
const databaseUrl = process.env.DATABASE_URL;
const databaseUrlTest = process.env.DATABASE_URL_TEST;

// 실제 서버 DB (DATABASE_URL)를 우선 사용, 없으면 DATABASE_URL_TEST 사용
const targetDatabaseUrl = databaseUrl || databaseUrlTest;

if (!targetDatabaseUrl) {
  console.error('❌ 오류: DATABASE_URL 또는 DATABASE_URL_TEST 환경 변수가 설정되지 않았습니다.');
  console.error('💡 .env 파일에 DATABASE_URL 또는 DATABASE_URL_TEST를 설정하세요.');
  process.exit(1);
}

const usingMainDb = !!databaseUrl;
console.log(`📌 사용할 DB: ${usingMainDb ? 'DATABASE_URL (실제 서버 DB)' : 'DATABASE_URL_TEST (테스트 DB)'}`);
if (targetDatabaseUrl.includes('@')) {
  const dbInfo = targetDatabaseUrl.split('@')[1]?.split('/')[0] || '알 수 없음';
  console.log(`📌 연결 대상: ${dbInfo}\n`);
} else {
  console.log(`📌 연결 대상: 로컬 DB\n`);
}

// DATABASE_URL을 실제 사용할 DB로 임시 변경 (PrismaClient가 이 환경 변수를 사용)
const originalDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = targetDatabaseUrl;

// Prisma 클라이언트 생성 (이제 DATABASE_URL_TEST를 사용)
const prisma = new PrismaClient();

async function checkDbStatus() {
  try {
    console.log('────────────────────────────────────────────');
    console.log('  📊 DB 상태 확인');
    console.log('────────────────────────────────────────────');
    console.log('');

    // 1. User 테이블에서 mallUserId가 'boss1'인 유저 확인 (모든 결과 조회)
    console.log('1️⃣ User 테이블에서 mallUserId가 "boss1"인 유저:');
    console.log('────────────────────────────────────────────');
    const boss1Users = await prisma.user.findMany({
      where: {
        mallUserId: 'boss1',
      },
      orderBy: {
        id: 'asc',
      },
    });

    const boss1Count = boss1Users.length;
    console.log(`   ✅ Count: ${boss1Count}`);
    
    if (boss1Count > 0) {
      console.log(`   ✅ 발견된 ID들: ${boss1Users.map(u => u.id).join(', ')}`);
      console.log('   ✅ 데이터 내용 (JSON):');
      boss1Users.forEach((user, index) => {
        console.log(`\n   [${index + 1}] User ID: ${user.id}`);
        console.log(JSON.stringify(user, null, 2));
      });
    } else {
      console.log('   ❌ 데이터 내용: 없음');
    }
    console.log('');

    // 2. AffiliateProfile 테이블에서 위 유저들과 연결된 프로필 확인
    console.log('2️⃣ AffiliateProfile 테이블에서 위 유저들과 연결된 프로필:');
    console.log('────────────────────────────────────────────');
    
    let affiliateProfiles: Array<{id: number, userId: number, affiliateCode: string, [key: string]: any}> = [];
    
    if (boss1Count > 0) {
      affiliateProfiles = await prisma.affiliateProfile.findMany({
        where: {
          userId: {
            in: boss1Users.map(u => u.id),
          },
        },
        orderBy: {
          id: 'asc',
        },
      });

      const profileCount = affiliateProfiles.length;
      console.log(`   ✅ Count: ${profileCount}`);
      
      if (profileCount > 0) {
        console.log(`   ✅ 발견된 Profile ID들: ${affiliateProfiles.map(p => p.id).join(', ')}`);
        console.log('   ✅ 데이터 내용 (JSON):');
        affiliateProfiles.forEach((profile, index) => {
          console.log(`\n   [${index + 1}] Profile ID: ${profile.id} (연결된 User ID: ${profile.userId})`);
          console.log(JSON.stringify(profile, null, 2));
        });
        
        // 각 User와 Profile의 연결 상태 확인
        console.log('\n   📋 연결 상태 확인:');
        boss1Users.forEach(user => {
          const connectedProfile = affiliateProfiles.find(p => p.userId === user.id);
          if (connectedProfile) {
            console.log(`      ✅ User ID ${user.id} → Profile ID ${connectedProfile.id} (연결됨)`);
          } else {
            console.log(`      ❌ User ID ${user.id} → Profile 없음 (연결 안됨)`);
          }
        });
      } else {
        console.log('   ❌ 데이터 내용: 없음');
        console.log('   ⚠️  boss1 유저들에 연결된 AffiliateProfile이 없습니다.');
      }
    } else {
      console.log('   ⚠️  boss1 유저가 없어 조회할 수 없습니다.');
    }
    console.log('');

    // 3. Payment 테이블에 데이터가 몇 개나 있는지 (전체 출력)
    console.log('3️⃣ Payment 테이블 전체 데이터:');
    console.log('────────────────────────────────────────────');
    const payments = await prisma.payment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log(`   ✅ Count: ${payments.length}`);
    
    // boss1과 관련된 Payment 개수 확인
    if (boss1Count > 0 && affiliateProfiles.length > 0) {
      const boss1ProfileIds = affiliateProfiles.map(p => p.id);
      const boss1AffiliateCode = affiliateProfiles[0]?.affiliateCode;
      
      const boss1Payments = payments.filter(p => 
        p.affiliateMallUserId === 'boss1' || 
        p.affiliateCode === boss1AffiliateCode
      );
      
      console.log(`   📊 boss1 관련 Payment: ${boss1Payments.length}개`);
      console.log(`   📊 전체 Payment: ${payments.length}개`);
      
      // saleId 연결 확인
      const paymentsWithSale = payments.filter(p => p.saleId !== null);
      const paymentsWithoutSale = payments.filter(p => p.saleId === null);
      console.log(`   📊 AffiliateSale과 연결된 Payment: ${paymentsWithSale.length}개`);
      console.log(`   📊 AffiliateSale과 연결 안된 Payment: ${paymentsWithoutSale.length}개`);
    }
    
    console.log('   ✅ 데이터 내용 (JSON):');
    if (payments.length > 0) {
      console.log(JSON.stringify(payments, null, 2));
    } else {
      console.log('   []');
    }
    console.log('');

    // 4. AffiliateSale 테이블에 데이터가 몇 개나 있는지 (전체 출력)
    console.log('4️⃣ AffiliateSale 테이블 전체 데이터:');
    console.log('────────────────────────────────────────────');
    const affiliateSales = await prisma.affiliateSale.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log(`   ✅ Count: ${affiliateSales.length}`);
    
    // boss1 Profile과 연결된 AffiliateSale 확인
    if (boss1Count > 0 && affiliateProfiles.length > 0) {
      const boss1ProfileIds = affiliateProfiles.map(p => p.id);
      const boss1Sales = affiliateSales.filter(s => 
        boss1ProfileIds.includes(s.managerId || -1) || 
        boss1ProfileIds.includes(s.agentId || -1)
      );
      
      console.log(`   📊 boss1 Profile (ID: ${boss1ProfileIds.join(', ')}) 관련 AffiliateSale: ${boss1Sales.length}개`);
      console.log(`   📊 전체 AffiliateSale: ${affiliateSales.length}개`);
      
      // Payment와의 연결 확인
      const salesWithPayment = affiliateSales.filter(s => {
        const payment = payments.find(p => p.saleId === s.id);
        return payment !== undefined;
      });
      const salesWithoutPayment = affiliateSales.filter(s => {
        const payment = payments.find(p => p.saleId === s.id);
        return payment === undefined;
      });
      console.log(`   📊 Payment와 연결된 AffiliateSale: ${salesWithPayment.length}개`);
      console.log(`   📊 Payment와 연결 안된 AffiliateSale: ${salesWithoutPayment.length}개`);
    }
    
    console.log('   ✅ 데이터 내용 (JSON):');
    if (affiliateSales.length > 0) {
      console.log(JSON.stringify(affiliateSales, null, 2));
    } else {
      console.log('   []');
    }
    console.log('');
    
    // 5. 연결 상태 상세 확인
    if (boss1Count > 0 && affiliateProfiles.length > 0) {
      console.log('5️⃣ 연결 상태 상세 확인:');
      console.log('────────────────────────────────────────────');
      const boss1Profile = affiliateProfiles[0];
      console.log(`   📌 boss1 User ID: ${boss1Users[0].id}`);
      console.log(`   📌 boss1 Profile ID: ${boss1Profile.id}`);
      console.log(`   📌 boss1 AffiliateCode: ${boss1Profile.affiliateCode}`);
      console.log('');
      
      // Payment와 AffiliateSale 연결 확인
      const connectedPairs: Array<{paymentId: number, saleId: number, orderId: string}> = [];
      const unconnectedPayments: Array<{paymentId: number, orderId: string}> = [];
      const unconnectedSales: Array<{saleId: number, externalOrderCode: string | null}> = [];
      
      payments.forEach(payment => {
        if (payment.saleId) {
          const sale = affiliateSales.find(s => s.id === payment.saleId);
          if (sale) {
            connectedPairs.push({
              paymentId: payment.id,
              saleId: sale.id,
              orderId: payment.orderId
            });
          }
        } else {
          unconnectedPayments.push({
            paymentId: payment.id,
            orderId: payment.orderId
          });
        }
      });
      
      affiliateSales.forEach(sale => {
        const payment = payments.find(p => p.saleId === sale.id);
        if (!payment) {
          unconnectedSales.push({
            saleId: sale.id,
            externalOrderCode: sale.externalOrderCode
          });
        }
      });
      
      console.log(`   ✅ Payment ↔ AffiliateSale 연결된 쌍: ${connectedPairs.length}개`);
      if (connectedPairs.length > 0) {
        connectedPairs.slice(0, 5).forEach(pair => {
          console.log(`      - Payment ID ${pair.paymentId} ↔ Sale ID ${pair.saleId} (Order: ${pair.orderId})`);
        });
        if (connectedPairs.length > 5) {
          console.log(`      ... 외 ${connectedPairs.length - 5}개`);
        }
      }
      console.log('');
      
      console.log(`   ⚠️  Payment와 연결 안된 Sale: ${unconnectedSales.length}개`);
      if (unconnectedSales.length > 0) {
        unconnectedSales.slice(0, 5).forEach(sale => {
          console.log(`      - Sale ID ${sale.saleId} (Order: ${sale.externalOrderCode || '없음'})`);
        });
        if (unconnectedSales.length > 5) {
          console.log(`      ... 외 ${unconnectedSales.length - 5}개`);
        }
      }
      console.log('');
      
      console.log(`   ⚠️  Sale와 연결 안된 Payment: ${unconnectedPayments.length}개`);
      if (unconnectedPayments.length > 0) {
        unconnectedPayments.slice(0, 5).forEach(payment => {
          console.log(`      - Payment ID ${payment.paymentId} (Order: ${payment.orderId})`);
        });
        if (unconnectedPayments.length > 5) {
          console.log(`      ... 외 ${unconnectedPayments.length - 5}개`);
        }
      }
      console.log('');
    }

    console.log('────────────────────────────────────────────');
    console.log('  ✅ DB 상태 확인 완료');
    console.log('────────────────────────────────────────────');

  } catch (error: any) {
    console.error('❌ 오류 발생:', error);
    console.error('스택 트레이스:', error.stack);
  } finally {
    await prisma.$disconnect();
    // 원래 DATABASE_URL 복원
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  }
}

checkDbStatus()
  .catch((error) => {
    console.error('❌ 스크립트 실행 중 오류:', error);
    process.exit(1);
  });
