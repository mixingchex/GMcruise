#!/usr/bin/env tsx
/**
 * boss1 파트너의 데이터 확인 스크립트
 * - boss1 사용자 정보
 * - AffiliateProfile
 * - Payment 데이터
 * - AffiliateSale 데이터
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

const databaseUrlTest = process.env.DATABASE_URL_TEST;

if (!databaseUrlTest) {
  console.error('❌ 오류: DATABASE_URL_TEST 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const originalDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = databaseUrlTest;

const prisma = new PrismaClient();

async function main() {
  console.log('────────────────────────────────────────────');
  console.log('  📊 boss1 파트너 데이터 확인');
  console.log('────────────────────────────────────────────');
  console.log('');

  try {
    // 1. boss1 사용자 정보 확인
    console.log('1️⃣ boss1 사용자 정보:');
    const boss1User = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: 'boss1' },
          { mallUserId: 'boss1' },
          { email: 'boss1@test.local' },
        ],
      },
      include: {
        AffiliateProfile: {
          select: {
            id: true,
            affiliateCode: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!boss1User) {
      console.log('   ❌ boss1 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`   ✅ ID: ${boss1User.id}`);
    console.log(`   ✅ 전화번호: ${boss1User.phone}`);
    console.log(`   ✅ mallUserId: ${boss1User.mallUserId}`);
    console.log(`   ✅ 이름: ${boss1User.name}`);
    console.log('');

    // 2. AffiliateProfile 확인
    if (boss1User.AffiliateProfile && Array.isArray(boss1User.AffiliateProfile) && boss1User.AffiliateProfile.length > 0) {
      const profile = boss1User.AffiliateProfile[0];
      console.log('2️⃣ AffiliateProfile:');
      console.log(`   ✅ ID: ${profile.id}`);
      console.log(`   ✅ affiliateCode: ${profile.affiliateCode}`);
      console.log(`   ✅ type: ${profile.type}`);
      console.log(`   ✅ status: ${profile.status}`);
      console.log('');
    } else {
      // AffiliateProfile이 없으면 직접 조회
      const profile = await prisma.affiliateProfile.findUnique({
        where: { userId: boss1User.id },
      });
      
      if (profile) {
        console.log('2️⃣ AffiliateProfile (직접 조회):');
        console.log(`   ✅ ID: ${profile.id}`);
        console.log(`   ✅ affiliateCode: ${profile.affiliateCode}`);
        console.log(`   ✅ type: ${profile.type}`);
        console.log(`   ✅ status: ${profile.status}`);
        console.log('');
      } else {
        console.log('2️⃣ AffiliateProfile:');
        console.log('   ❌ AffiliateProfile이 없습니다.');
        console.log('');
      }
    }

    // 3. Payment 데이터 확인
    console.log('3️⃣ Payment 데이터:');
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { affiliateMallUserId: 'boss1' },
          { affiliateCode: boss1User.AffiliateProfile?.[0]?.affiliateCode },
        ],
      },
      include: {
        AffiliateSale: true,
      },
    });

    console.log(`   총 ${payments.length}개의 Payment 발견`);
    payments.forEach((p, i) => {
      console.log(`   [${i + 1}] Order ID: ${p.orderId}`);
      console.log(`       금액: ${p.amount.toLocaleString()}원`);
      console.log(`       상태: ${p.status}`);
      console.log(`       AffiliateSale ID: ${p.saleId || '없음'}`);
    });
    console.log('');

    // 4. AffiliateSale 데이터 확인
    console.log('4️⃣ AffiliateSale 데이터:');
    let affiliateProfile = boss1User.AffiliateProfile && Array.isArray(boss1User.AffiliateProfile) && boss1User.AffiliateProfile.length > 0
      ? boss1User.AffiliateProfile[0]
      : null;
    
    // AffiliateProfile이 없으면 직접 조회
    if (!affiliateProfile) {
      affiliateProfile = await prisma.affiliateProfile.findUnique({
        where: { userId: boss1User.id },
      });
    }
    
    if (affiliateProfile) {
      const sales = await prisma.affiliateSale.findMany({
        where: {
          OR: [
            { managerId: affiliateProfile.id },
            { agentId: affiliateProfile.id },
          ],
        },
        include: {
          Payment: true,
        },
      });

      console.log(`   총 ${sales.length}개의 AffiliateSale 발견`);
      sales.forEach((s, i) => {
        console.log(`   [${i + 1}] Sale ID: ${s.id}`);
        console.log(`       externalOrderCode: ${s.externalOrderCode}`);
        console.log(`       상태: ${s.status}`);
        console.log(`       managerId: ${s.managerId}`);
        console.log(`       agentId: ${s.agentId || '없음'}`);
        console.log(`       Payment 연결: ${s.Payment ? `있음 (${s.Payment.orderId})` : '없음'}`);
      });
    } else {
      console.log('   ❌ AffiliateProfile이 없어 AffiliateSale을 조회할 수 없습니다.');
    }
    console.log('');

    // 5. 로그인 테스트 정보
    console.log('5️⃣ 로그인 정보:');
    console.log('   전화번호/아이디: boss1');
    console.log('   비밀번호: 1101');
    console.log('   또는 비밀번호: qwe1 (파트너 로그인)');
    console.log('   모드: partner (선택)');
    console.log('');

  } catch (error: any) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
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

