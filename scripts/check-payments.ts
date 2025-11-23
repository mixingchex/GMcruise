import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST,
    },
  },
});

async function checkPayments() {
  try {
    console.log('───────────────────────────────────────────');
    console.log('  📊 결제 데이터 확인');
    console.log('───────────────────────────────────────────\n');

    // boss1 사용자 확인
    const boss1User = await prisma.user.findFirst({
      where: { mallUserId: 'boss1' },
      include: { AffiliateProfile: true },
    });

    if (!boss1User) {
      console.log('❌ boss1 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log('1️⃣ boss1 사용자 정보:');
    console.log(`   ID: ${boss1User.id}`);
    console.log(`   mallUserId: ${boss1User.mallUserId}`);
    console.log(`   AffiliateProfile: ${boss1User.AffiliateProfile ? `있음 (ID: ${boss1User.AffiliateProfile.id}, affiliateCode: ${boss1User.AffiliateProfile.affiliateCode})` : '없음'}`);
    console.log('');

    // 모든 Payment 데이터 조회
    const allPayments = await prisma.payment.findMany({
      where: { status: 'completed' },
      include: { AffiliateSale: true },
    });

    console.log('2️⃣ 모든 완료된 결제 내역:');
    console.log(`   총 ${allPayments.length}개\n`);

    allPayments.forEach((payment, index) => {
      console.log(`   [${index + 1}] Order ID: ${payment.orderId}`);
      console.log(`       금액: ${payment.amount.toLocaleString()}원`);
      console.log(`       상태: ${payment.status}`);
      console.log(`       affiliateCode: ${payment.affiliateCode || '(없음)'}`);
      console.log(`       affiliateMallUserId: ${payment.affiliateMallUserId || '(없음)'}`);
      console.log(`       AffiliateSale ID: ${payment.saleId || '(없음)'}`);
      console.log('');
    });

    // boss1에 연결된 Payment 확인
    const affiliateCode = boss1User.AffiliateProfile?.affiliateCode;
    const boss1Payments = await prisma.payment.findMany({
      where: {
        status: 'completed',
        OR: [
          { affiliateMallUserId: 'boss1' },
          ...(affiliateCode ? [{ affiliateCode }] : []),
        ],
      },
    });

    console.log('3️⃣ boss1에 연결된 결제 내역:');
    console.log(`   총 ${boss1Payments.length}개\n`);

    if (boss1Payments.length === 0) {
      console.log('   ⚠️  boss1에 연결된 결제 내역이 없습니다!');
      console.log('');
      console.log('   원인 분석:');
      console.log(`   - 필터링 조건: affiliateMallUserId='boss1' OR affiliateCode='${affiliateCode}'`);
      console.log('');
      console.log('   실제 Payment 데이터:');
      allPayments.forEach((p) => {
        console.log(`   - ${p.orderId}: affiliateMallUserId='${p.affiliateMallUserId}', affiliateCode='${p.affiliateCode}'`);
      });
    } else {
      boss1Payments.forEach((payment, index) => {
        console.log(`   [${index + 1}] Order ID: ${payment.orderId}`);
        console.log(`       금액: ${payment.amount.toLocaleString()}원`);
        console.log(`       buyerName: ${payment.buyerName}`);
        console.log(`       productCode: ${payment.productCode}`);
        console.log(`       metadata:`, JSON.stringify(payment.metadata, null, 2));
        console.log('');
      });
    }

    console.log('───────────────────────────────────────────');
    console.log('  ✅ 확인 완료');
    console.log('───────────────────────────────────────────');
  } catch (error: any) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPayments();





