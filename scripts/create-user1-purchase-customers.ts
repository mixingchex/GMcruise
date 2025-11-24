/**
 * user1 판매원용 구매 확인증서 테스트용 고객 3명 생성 스크립트
 * 
 * 이 스크립트는:
 * 1. user1 판매원에게 연결된 구매 완료된 고객 3명을 생성합니다
 * 2. 구매확인증서 테스트를 위한 데이터를 준비합니다
 * 
 * 실행 방법:
 * npx tsx scripts/create-user1-purchase-customers.ts
 */

import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

// 샘플 고객 데이터
const sampleCustomers = [
  {
    name: '김민수',
    phone: '01011112222',
    email: 'kim.minsu@test.com',
    productName: '지중해 크루즈 7박 8일',
    productCode: 'USER1-CUSTOMER-001',
    amount: 3500000,
  },
  {
    name: '이영희',
    phone: '01022223333',
    email: 'lee.younghee@test.com',
    productName: '알래스카 크루즈 9박 10일',
    productCode: 'USER1-CUSTOMER-002',
    amount: 5200000,
  },
  {
    name: '박준호',
    phone: '01033334444',
    email: 'park.junho@test.com',
    productName: '카리브해 크루즈 10박 11일',
    productCode: 'USER1-CUSTOMER-003',
    amount: 4500000,
  },
];

async function main() {
  console.log('🚀 user1 판매원용 구매 고객 3명 생성 시작...\n');

  try {
    // 1. user1 판매원 찾기
    console.log('1️⃣ user1 판매원 찾는 중...');
    const user1User = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: 'user1' },
          { mallUserId: 'user1' },
        ],
      },
      include: {
        AffiliateProfile: true,
      },
    });

    if (!user1User) {
      console.error('❌ user1 판매원을 찾을 수 없습니다.');
      console.error('   먼저 user1 계정을 생성하세요.');
      process.exit(1);
    }

    const user1Profile = user1User.AffiliateProfile;
    if (!user1Profile) {
      console.error('❌ user1 판매원의 AffiliateProfile을 찾을 수 없습니다.');
      process.exit(1);
    }

    console.log(`✅ user1 판매원 확인: ID ${user1Profile.id}, Code: ${user1Profile.affiliateCode}\n`);

    // 2. 크루즈 상품 찾기 또는 생성
    console.log('2️⃣ 크루즈 상품 확인 중...');
    const createdProducts: any[] = [];

    for (const customerData of sampleCustomers) {
      let cruiseProduct = await prisma.cruiseProduct.findFirst({
        where: {
          productCode: customerData.productCode,
        },
      });

      if (!cruiseProduct) {
        // 기본 itineraryPattern 생성
        const itineraryPattern = [
          { day: 1, type: 'Embarkation', location: 'Barcelona', country: 'ES', currency: 'EUR', language: 'es', time: '14:00' },
          { day: 2, type: 'PortVisit', location: 'Marseille', country: 'FR', currency: 'EUR', language: 'fr', arrival: '08:00', departure: '18:00' },
          { day: 3, type: 'PortVisit', location: 'Genoa', country: 'IT', currency: 'EUR', language: 'it', arrival: '09:00', departure: '19:00' },
          { day: 4, type: 'Cruising' },
          { day: 5, type: 'PortVisit', location: 'Naples', country: 'IT', currency: 'EUR', language: 'it', arrival: '08:00', departure: '17:00' },
          { day: 6, type: 'PortVisit', location: 'Palermo', country: 'IT', currency: 'EUR', language: 'it', arrival: '09:00', departure: '18:00' },
          { day: 7, type: 'Cruising' },
          { day: 8, type: 'Disembarkation', location: 'Barcelona', country: 'ES', currency: 'EUR', language: 'es', time: '09:00' },
        ];

        cruiseProduct = await prisma.cruiseProduct.create({
          data: {
            productCode: customerData.productCode,
            cruiseLine: '로열 캐리비안',
            shipName: '오디세이 오브 더 시즈',
            packageName: customerData.productName,
            basePrice: customerData.amount,
            nights: 7,
            days: 8,
            description: `${customerData.productName} 크루즈 패키지`,
            tags: ['프리미엄', '크루즈'],
            itineraryPattern: itineraryPattern,
            updatedAt: new Date(),
          },
        });
        console.log(`✅ 크루즈 상품 생성: ${customerData.productCode} - ${customerData.productName}`);
      } else {
        console.log(`✅ 크루즈 상품 사용: ${customerData.productCode} - ${customerData.productName}`);
      }

      createdProducts.push(cruiseProduct);
    }

    console.log('');

    // 3. 고객 및 결제 정보 생성
    console.log('3️⃣ 고객 및 결제 정보 생성 중...\n');
    const createdCustomers: any[] = [];

    for (let i = 0; i < sampleCustomers.length; i++) {
      const customerData = sampleCustomers[i];
      const product = createdProducts[i];

      try {
        const result = await prisma.$transaction(async (tx) => {
          // 3-1. 고객 User 생성 또는 찾기
          let customerUser = await tx.user.findFirst({
            where: {
              phone: customerData.phone,
            },
          });

          if (!customerUser) {
            const hashedPassword = await bcrypt.hash('3800', 10);
            customerUser = await tx.user.create({
              data: {
                phone: customerData.phone,
                name: customerData.name,
                email: customerData.email,
                password: hashedPassword,
                role: 'user',
                onboarded: true,
                updatedAt: new Date(),
              },
            });
            console.log(`✅ 고객 User 생성: ${customerData.name} (${customerData.phone})`);
          } else {
            // 기존 고객 업데이트
            customerUser = await tx.user.update({
              where: { id: customerUser.id },
              data: {
                name: customerData.name,
                email: customerData.email,
                onboarded: true,
                updatedAt: new Date(),
              },
            });
            console.log(`✅ 기존 고객 User 사용: ${customerData.name} (${customerData.phone})`);
          }

          // 3-2. AffiliateLead 생성 (구매 완료 상태)
          const lead = await tx.affiliateLead.create({
            data: {
              customerName: customerData.name,
              customerPhone: customerData.phone,
              status: 'PURCHASED',
              source: 'partner-manual',
              agentId: user1Profile.id,
              updatedAt: new Date(),
            } as any,
          });
          console.log(`   ✅ AffiliateLead 생성: ID ${lead.id}`);

          // 3-3. Payment 생성 (결제 완료)
          const orderId = `ORDER_USER1_${customerData.productCode}_${Date.now()}`;
          const payment = await tx.payment.create({
            data: {
              orderId,
              productCode: product.productCode,
              productName: product.packageName || customerData.productName,
              amount: customerData.amount,
              currency: 'KRW',
              buyerName: customerData.name,
              buyerEmail: customerData.email,
              buyerTel: customerData.phone,
              status: 'paid',
              paidAt: new Date(),
              updatedAt: new Date(),
              affiliateMallUserId: 'user1',
              affiliateCode: user1Profile.affiliateCode,
            },
          });
          console.log(`   ✅ Payment 생성: ${orderId} (${customerData.amount.toLocaleString()}원)`);

          return {
            customerUser,
            lead,
            payment,
            orderId,
          };
        });

        createdCustomers.push(result);
        console.log(`\n✅ ${customerData.name} 고객 생성 완료!\n`);

      } catch (error: any) {
        console.error(`❌ ${customerData.name} 고객 생성 실패:`, error.message);
      }
    }

    console.log('\n🎉 user1 판매원용 구매 고객 3명 생성 완료!\n');
    console.log('📋 생성된 고객 요약:');
    createdCustomers.forEach((result, index) => {
      const customerData = sampleCustomers[index];
      console.log(`\n${index + 1}. ${customerData.name}`);
      console.log(`   - 전화번호: ${customerData.phone}`);
      console.log(`   - 이메일: ${customerData.email}`);
      console.log(`   - 상품: ${customerData.productName}`);
      console.log(`   - 결제금액: ${customerData.amount.toLocaleString()}원`);
      console.log(`   - 주문 ID: ${(result as any).orderId}`);
      console.log(`   - AffiliateLead ID: ${(result as any).lead?.id}`);
      console.log(`   - Payment ID: ${(result as any).payment?.id}`);
    });

    console.log('\n💡 구매확인증서 테스트 방법:');
    console.log('   1. user1 판매원으로 로그인');
    console.log('   2. 서류관리 페이지로 이동');
    console.log('   3. 구매확인증서 탭에서 고객명을 입력하여 테스트');
    console.log('\n');

  } catch (error: any) {
    console.error('❌ 오류 발생:', error);
    
    if (error.code === 'P2003') {
      console.error('\n⚠️  외래키 제약 조건 오류가 발생했습니다.');
      console.error('   데이터베이스 스키마를 확인하세요.');
    }
    
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('스크립트 실행 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

