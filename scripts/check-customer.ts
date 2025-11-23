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

async function checkCustomer() {
  try {
    console.log('───────────────────────────────────────────');
    console.log('  📊 테스트 고객 데이터 확인');
    console.log('───────────────────────────────────────────\n');

    // 테스트 고객 조회
    const testCustomer = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: '010-1234-5678' },
          { email: 'test-customer@test.local' },
          { name: '테스트 고객' },
        ],
      },
      include: {
        Reservation: true,
      },
    });

    if (!testCustomer) {
      console.log('❌ 테스트 고객을 찾을 수 없습니다.');
      console.log('');
      console.log('💡 해결 방법:');
      console.log('   npx tsx scripts/seed-test-data.ts');
      console.log('');
    } else {
      console.log('✅ 테스트 고객 발견:');
      console.log(`   ID: ${testCustomer.id}`);
      console.log(`   이름: ${testCustomer.name}`);
      console.log(`   전화번호: ${testCustomer.phone}`);
      console.log(`   이메일: ${testCustomer.email}`);
      console.log(`   상태: ${testCustomer.customerStatus || '(없음)'}`);
      console.log(`   예약 수: ${testCustomer.Reservation?.length || 0}`);
      console.log('');
    }

    // Payment 데이터 확인
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { buyerTel: '010-1234-5678' },
          { buyerEmail: 'test-customer@test.local' },
          { buyerName: '테스트 고객' },
        ],
      },
      include: {
        AffiliateSale: true,
      },
    });

    console.log('📦 결제 내역:');
    console.log(`   총 ${payments.length}개\n`);

    if (payments.length === 0) {
      console.log('❌ 결제 내역이 없습니다.');
    } else {
      payments.forEach((payment, index) => {
        console.log(`   [${index + 1}] Order ID: ${payment.orderId}`);
        console.log(`       금액: ${payment.amount.toLocaleString()}원`);
        console.log(`       상태: ${payment.status}`);
        console.log(`       구매자: ${payment.buyerName}`);
        console.log(`       AffiliateSale: ${payment.AffiliateSale ? `있음 (ID: ${payment.AffiliateSale.id})` : '없음'}`);
        console.log('');
      });
    }

    // AffiliateLead 확인
    const leads = await prisma.affiliateLead.findMany({
      where: {
        customerPhone: '010-1234-5678',
      },
      include: {
        AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: true,
      },
    });

    console.log('👥 AffiliateLead (고객 리드):');
    console.log(`   총 ${leads.length}개\n`);

    if (leads.length === 0) {
      console.log('❌ AffiliateLead가 없습니다.');
    } else {
      leads.forEach((lead, index) => {
        console.log(`   [${index + 1}] Lead ID: ${lead.id}`);
        console.log(`       고객명: ${lead.customerName}`);
        console.log(`       전화번호: ${lead.customerPhone}`);
        console.log(`       상태: ${lead.status}`);
        console.log(`       담당자: ${lead.AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile?.displayName || '(없음)'}`);
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

checkCustomer();





