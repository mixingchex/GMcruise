// scripts/delete-sample-data.ts
// 샘플 데이터 삭제 스크립트 (문의고객, 구매고객, 크루즈가이드 샘플)

import prisma from '../lib/prisma';

// 샘플 고객 전화번호 패턴 (create-sample-customers.ts에서 생성된 샘플)
const SAMPLE_PHONE_PATTERNS = [
  '010-1234-5678',
  '010-2345-6789',
  '010-3456-7890',
  '010-4567-8901',
  '010-5678-9012',
  '010-6789-0123',
  '010-7890-1234',
  '010-8901-2345',
  '010-9999-0001',
  '010-9999-0002',
  '010-9999-0003',
  '010-8888-0001',
  '010-8888-0002',
  '010-8888-0003',
  '010-7777-0001',
  '010-7777-0002',
];

// 샘플 고객 이름 패턴
const SAMPLE_NAMES = [
  '김민수',
  '이영희',
  '박준호',
  '최수진',
  '정다은',
  '강태영',
  '윤서연',
  '임동욱',
  '홍길동',
  '김영희',
  '이철수',
  '박지민',
  '최민지',
  '정수현',
  '강동원',
  '송혜교',
  '김샘플',
];

async function main() {
  console.log('🗑️  샘플 데이터 삭제 시작...\n');

  try {
    // 1. AffiliateLead 샘플 데이터 삭제 (문의고객, 구매고객)
    console.log('1️⃣ AffiliateLead 샘플 데이터 삭제 중...');
    
    // 샘플 전화번호로 검색
    const sampleLeads = await prisma.affiliateLead.findMany({
      where: {
        OR: [
          { customerPhone: { in: SAMPLE_PHONE_PATTERNS } },
          { customerName: { in: SAMPLE_NAMES } },
        ],
      },
    });

    if (sampleLeads.length > 0) {
      const deletedLeads = await prisma.affiliateLead.deleteMany({
        where: {
          id: { in: sampleLeads.map(l => l.id) },
        },
      });
      console.log(`   ✅ AffiliateLead 삭제: ${deletedLeads.count}개`);
    } else {
      console.log('   ℹ️  삭제할 AffiliateLead 샘플 데이터 없음');
    }

    // 2. User 샘플 데이터 삭제 (크루즈가이드 샘플 고객)
    console.log('\n2️⃣ User 샘플 데이터 삭제 중...');
    
    // 샘플 전화번호나 이름으로 검색
    const samplePhoneNumbers = SAMPLE_PHONE_PATTERNS.map(p => p.replace(/-/g, ''));
    const sampleUsers = await prisma.user.findMany({
      where: {
        AND: [
          { role: { not: 'admin' } }, // 관리자 제외
          {
            OR: [
              { phone: { in: samplePhoneNumbers } },
              { name: { in: SAMPLE_NAMES } },
              { customerStatus: 'test' },
              { customerStatus: 'excel' },
            ],
          },
        ],
      },
    });

    if (sampleUsers.length > 0) {
      // 관련 데이터 먼저 삭제 (외래키 제약 조건 때문에 순서 중요)
      const userIds = sampleUsers.map(u => u.id);
      
      // Reservation 삭제 (mainUserId)
      await prisma.reservation.deleteMany({
        where: { mainUserId: { in: userIds } },
      });
      
      // UserActivity 삭제
      await prisma.userActivity.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // UserTrip 삭제
      await prisma.userTrip.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // Expense 삭제
      await prisma.expense.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // ChecklistItem 삭제
      await prisma.checklistItem.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // ChatHistory 삭제
      await prisma.chatHistory.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // UserMessageRead 삭제
      await prisma.userMessageRead.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // VisitedCountry 삭제
      await prisma.visitedCountry.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // UserSchedule 삭제
      await prisma.userSchedule.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // CustomerNote 삭제
      await prisma.customerNote.deleteMany({
        where: { customerId: { in: userIds } },
      });
      
      // CustomerGroupMember 삭제
      await prisma.customerGroupMember.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // FeatureUsage 삭제
      await prisma.featureUsage.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // PassportSubmission 삭제 (userId로 직접)
      await prisma.passportSubmission.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // TravelDiaryEntry 삭제 (UserTrip을 통해)
      const userTrips = await prisma.userTrip.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      const userTripIds = userTrips.map(ut => ut.id);
      if (userTripIds.length > 0) {
        await prisma.travelDiaryEntry.deleteMany({
          where: { userTripId: { in: userTripIds } },
        });
      }
      
      // Session 삭제
      await prisma.session.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // PassportRequestLog 삭제
      await prisma.passportRequestLog.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // Traveler 삭제
      await prisma.traveler.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // ChatBotSession 삭제
      await prisma.chatBotSession.deleteMany({
        where: { userId: { in: userIds } },
      });
      
      // User 삭제
      const deletedUsers = await prisma.user.deleteMany({
        where: {
          id: { in: userIds },
        },
      });
      console.log(`   ✅ User 삭제: ${deletedUsers.count}개`);
    } else {
      console.log('   ℹ️  삭제할 User 샘플 데이터 없음');
    }

    // 3. CruiseProduct 샘플 상품 삭제 (SAMPLE-로 시작하는 상품)
    console.log('\n3️⃣ CruiseProduct 샘플 상품 삭제 중...');
    
    const sampleProducts = await prisma.cruiseProduct.findMany({
      where: {
        productCode: { startsWith: 'SAMPLE-' },
      },
    });

    if (sampleProducts.length > 0) {
      // 관련 데이터 먼저 삭제
      const productIds = sampleProducts.map(p => p.id);
      const productCodes = sampleProducts.map(p => p.productCode);
      
      // AffiliateProduct 삭제 (productCode로)
      await prisma.affiliateProduct.deleteMany({
        where: { productCode: { in: productCodes } },
      });
      
      // ProductView 삭제
      await prisma.productView.deleteMany({
        where: { productCode: { in: productCodes } },
      });
      
      // CruiseProduct 삭제
      const deletedProducts = await prisma.cruiseProduct.deleteMany({
        where: {
          id: { in: productIds },
        },
      });
      console.log(`   ✅ CruiseProduct 삭제: ${deletedProducts.count}개`);
    } else {
      console.log('   ℹ️  삭제할 CruiseProduct 샘플 데이터 없음');
    }

    // 4. AffiliateSale 샘플 판매 데이터 삭제
    console.log('\n4️⃣ AffiliateSale 샘플 판매 데이터 삭제 중...');
    
    // externalOrderCode 패턴으로 검색
    const sampleSales = await prisma.affiliateSale.findMany({
      where: {
        externalOrderCode: { startsWith: 'ORDER_SAMPLE' },
      },
    });

    if (sampleSales.length > 0) {
      const deletedSales = await prisma.affiliateSale.deleteMany({
        where: {
          id: { in: sampleSales.map(s => s.id) },
        },
      });
      console.log(`   ✅ AffiliateSale 삭제: ${deletedSales.count}개`);
    } else {
      console.log('   ℹ️  삭제할 AffiliateSale 샘플 데이터 없음');
    }

    // 5. Payment 샘플 결제 데이터 삭제
    console.log('\n5️⃣ Payment 샘플 결제 데이터 삭제 중...');
    
    const samplePayments = await prisma.payment.findMany({
      where: {
        orderId: { startsWith: 'ORDER_SAMPLE' },
      },
    });

    if (samplePayments.length > 0) {
      const deletedPayments = await prisma.payment.deleteMany({
        where: {
          id: { in: samplePayments.map(p => p.id) },
        },
      });
      console.log(`   ✅ Payment 삭제: ${deletedPayments.count}개`);
    } else {
      console.log('   ℹ️  삭제할 Payment 샘플 데이터 없음');
    }

    console.log('\n✨ 샘플 데이터 삭제 완료!\n');
  } catch (error: any) {
    console.error('\n❌ 에러 발생:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

