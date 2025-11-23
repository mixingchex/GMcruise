// 인증서 테스트용 샘플 고객 데이터 생성 스크립트
// 구매확인 인증서 및 환불인증서 테스트를 위한 고객 샘플 생성
// 실제 상품과 결제 정보를 연결

import prisma from '@/lib/prisma';
import * as crypto from 'crypto';

// 샘플 상품 데이터
const sampleProducts = [
  {
    productCode: 'CERT-MED-001',
    cruiseLine: 'MSC 크루즈',
    shipName: 'MSC 벨리시마',
    packageName: '지중해 7박 8일 크루즈',
    nights: 7,
    days: 8,
    basePrice: 3500000,
    description: '지중해를 여행하는 7박 8일 크루즈',
    tags: ['지중해', '유럽', '프리미엄'],
    itineraryPattern: [
      { day: 1, type: 'Embarkation', location: 'Barcelona', country: 'ES', currency: 'EUR', language: 'es', time: '14:00' },
      { day: 2, type: 'PortVisit', location: 'Marseille', country: 'FR', currency: 'EUR', language: 'fr', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: 'Genoa', country: 'IT', currency: 'EUR', language: 'it', arrival: '09:00', departure: '19:00' },
      { day: 4, type: 'Cruising' },
      { day: 5, type: 'PortVisit', location: 'Naples', country: 'IT', currency: 'EUR', language: 'it', arrival: '08:00', departure: '17:00' },
      { day: 6, type: 'PortVisit', location: 'Palermo', country: 'IT', currency: 'EUR', language: 'it', arrival: '09:00', departure: '18:00' },
      { day: 7, type: 'Cruising' },
      { day: 8, type: 'Disembarkation', location: 'Barcelona', country: 'ES', currency: 'EUR', language: 'es', time: '09:00' },
    ],
    layout: {
      included: [
        '크루즈 객실료 (TAX 및 항구세 포함)',
        '하루 3식 이상의 식사 (뷔페, 정찬 레스토랑 등)',
        '크루즈 편의 시설 이용 (각종 쇼, 라이브 공연 등)',
        'AI 지니 가이드 서비스 지원',
        '비행기 (왕복 항공권 포함)',
        '인솔자 동행',
        '크루즈닷 전용 스탭',
        '여행자 보험',
      ],
      excluded: [
        '크루즈 선상팁 (1인 1박당 $16)',
        '기항지 관광 (승선 후 선사프로그램 개별 신청 가능)',
        '선내 유료 시설 (음료, 스페셜티 레스토랑, 인터넷 등)',
      ],
      refundPolicy: `121일 전 = 취소 수수료 없음

여행 출발일 기준 120일 ~ 91일 전까지 = 신청금

여행 출발일 기준 90일 ~ 71일 전까지 = 여행 총액의 25%

여행 출발일 기준 70일 ~ 46일 전까지 = 여행 총액의 50%

여행 출발일 기준 45일 ~ 21일 전까지 = 여행 총액의 75%

여행 출발일 기준 20일 ~ 출발일 = 여행 총액의 100%`,
      flightInfo: { included: true },
      hasGuide: true,
      hasEscort: true,
      hasCruiseDotStaff: true,
      hasTravelInsurance: true,
    },
  },
  {
    productCode: 'CERT-ALASKA-001',
    cruiseLine: 'Royal Caribbean',
    shipName: 'Quantum of the Seas',
    packageName: '알래스카 9박 10일 크루즈',
    nights: 9,
    days: 10,
    basePrice: 5200000,
    description: '알래스카를 여행하는 9박 10일 크루즈',
    tags: ['알래스카', '북미', '프리미엄'],
    itineraryPattern: [
      { day: 1, type: 'Embarkation', location: 'Seattle', country: 'US', currency: 'USD', language: 'en', time: '16:00' },
      { day: 2, type: 'Cruising' },
      { day: 3, type: 'PortVisit', location: 'Juneau', country: 'US', currency: 'USD', language: 'en', arrival: '08:00', departure: '18:00' },
      { day: 4, type: 'PortVisit', location: 'Skagway', country: 'US', currency: 'USD', language: 'en', arrival: '07:00', departure: '17:00' },
      { day: 5, type: 'PortVisit', location: 'Glacier Bay', country: 'US', currency: 'USD', language: 'en', arrival: '06:00', departure: '15:00' },
      { day: 6, type: 'PortVisit', location: 'Ketchikan', country: 'US', currency: 'USD', language: 'en', arrival: '08:00', departure: '16:00' },
      { day: 7, type: 'Cruising' },
      { day: 8, type: 'Cruising' },
      { day: 9, type: 'Cruising' },
      { day: 10, type: 'Disembarkation', location: 'Seattle', country: 'US', currency: 'USD', language: 'en', time: '08:00' },
    ],
    layout: {
      included: [
        '크루즈 객실료 (TAX 및 항구세 포함)',
        '하루 3식 이상의 식사',
        '크루즈 편의 시설 이용',
        'AI 지니 가이드 서비스 지원',
        '비행기 (왕복 항공권 포함)',
        '인솔자 동행',
        '여행자 보험',
      ],
      excluded: [
        '크루즈 선상팁',
        '기항지 관광',
        '선내 유료 시설',
      ],
      refundPolicy: `121일 전 = 취소 수수료 없음

여행 출발일 기준 120일 ~ 91일 전까지 = 신청금

여행 출발일 기준 90일 ~ 71일 전까지 = 여행 총액의 25%`,
      flightInfo: { included: true },
      hasGuide: false,
      hasEscort: true,
      hasCruiseDotStaff: false,
      hasTravelInsurance: true,
    },
  },
  {
    productCode: 'CERT-SEA-001',
    cruiseLine: 'Costa Cruises',
    shipName: 'Costa Mediterranea',
    packageName: '동남아시아 5박 6일 크루즈',
    nights: 5,
    days: 6,
    basePrice: 2800000,
    description: '동남아시아를 여행하는 5박 6일 크루즈',
    tags: ['동남아시아', '아시아', '가성비'],
    itineraryPattern: [
      { day: 1, type: 'Embarkation', location: 'Singapore', country: 'SG', currency: 'SGD', language: 'en', time: '15:00' },
      { day: 2, type: 'PortVisit', location: 'Kuala Lumpur', country: 'MY', currency: 'MYR', language: 'ms', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: 'Phuket', country: 'TH', currency: 'THB', language: 'th', arrival: '09:00', departure: '19:00' },
      { day: 4, type: 'Cruising' },
      { day: 5, type: 'PortVisit', location: 'Penang', country: 'MY', currency: 'MYR', language: 'ms', arrival: '08:00', departure: '17:00' },
      { day: 6, type: 'Disembarkation', location: 'Singapore', country: 'SG', currency: 'SGD', language: 'en', time: '09:00' },
    ],
    layout: {
      included: [
        '크루즈 객실료',
        '하루 3식 이상의 식사',
        '크루즈 편의 시설 이용',
        'AI 지니 가이드 서비스 지원',
      ],
      excluded: [
        '크루즈 선상팁',
        '기항지 관광',
        '선내 유료 시설',
        '비행기',
        '여행자 보험',
      ],
      refundPolicy: `90일 전 = 취소 수수료 없음

여행 출발일 기준 89일 ~ 61일 전까지 = 여행 총액의 10%

여행 출발일 기준 60일 ~ 31일 전까지 = 여행 총액의 30%

여행 출발일 기준 30일 ~ 출발일 = 여행 총액의 100%`,
      flightInfo: { included: false },
      hasGuide: false,
      hasEscort: false,
      hasCruiseDotStaff: false,
      hasTravelInsurance: false,
    },
  },
  {
    productCode: 'CERT-CARIB-001',
    cruiseLine: 'Carnival Cruise Line',
    shipName: 'Carnival Vista',
    packageName: '카리브해 10박 11일 크루즈',
    nights: 10,
    days: 11,
    basePrice: 4500000,
    description: '카리브해를 여행하는 10박 11일 크루즈',
    tags: ['카리브해', '열대', '프리미엄'],
    itineraryPattern: [
      { day: 1, type: 'Embarkation', location: 'Miami', country: 'US', currency: 'USD', language: 'en', time: '16:00' },
      { day: 2, type: 'Cruising' },
      { day: 3, type: 'PortVisit', location: 'Cozumel', country: 'MX', currency: 'MXN', language: 'es', arrival: '08:00', departure: '18:00' },
      { day: 4, type: 'PortVisit', location: 'Grand Cayman', country: 'KY', currency: 'KYD', language: 'en', arrival: '09:00', departure: '17:00' },
      { day: 5, type: 'PortVisit', location: 'Ocho Rios', country: 'JM', currency: 'JMD', language: 'en', arrival: '08:00', departure: '18:00' },
      { day: 6, type: 'Cruising' },
      { day: 7, type: 'PortVisit', location: 'Aruba', country: 'AW', currency: 'AWG', language: 'nl', arrival: '08:00', departure: '19:00' },
      { day: 8, type: 'PortVisit', location: 'Curacao', country: 'CW', currency: 'ANG', language: 'nl', arrival: '09:00', departure: '18:00' },
      { day: 9, type: 'Cruising' },
      { day: 10, type: 'Cruising' },
      { day: 11, type: 'Disembarkation', location: 'Miami', country: 'US', currency: 'USD', language: 'en', time: '08:00' },
    ],
    layout: {
      included: [
        '크루즈 객실료',
        '하루 3식 이상의 식사',
        '크루즈 편의 시설 이용',
        'AI 지니 가이드 서비스 지원',
        '비행기',
        '인솔자 동행',
      ],
      excluded: [
        '크루즈 선상팁',
        '기항지 관광',
        '선내 유료 시설',
        '여행자 보험',
      ],
      refundPolicy: `121일 전 = 취소 수수료 없음

여행 출발일 기준 120일 ~ 91일 전까지 = 신청금

여행 출발일 기준 90일 ~ 71일 전까지 = 여행 총액의 25%`,
      flightInfo: { included: true },
      hasGuide: true,
      hasEscort: true,
      hasCruiseDotStaff: false,
      hasTravelInsurance: false,
    },
  },
  {
    productCode: 'CERT-WORLD-001',
    cruiseLine: 'Cunard Line',
    shipName: 'Queen Mary 2',
    packageName: '월드 크루즈 30박 31일',
    nights: 30,
    days: 31,
    basePrice: 15000000,
    description: '전 세계를 여행하는 30박 31일 월드 크루즈',
    tags: ['월드 크루즈', '프리미엄', '럭셔리'],
    itineraryPattern: [
      { day: 1, type: 'Embarkation', location: 'Southampton', country: 'GB', currency: 'GBP', language: 'en', time: '16:00' },
      { day: 31, type: 'Disembarkation', location: 'Southampton', country: 'GB', currency: 'GBP', language: 'en', time: '08:00' },
    ],
    layout: {
      included: [
        '크루즈 객실료',
        '하루 3식 이상의 식사',
        '크루즈 편의 시설 이용',
        'AI 지니 가이드 서비스 지원',
        '비행기',
        '인솔자 동행',
        '가이드',
        '크루즈닷 전용 스탭',
        '여행자 보험',
      ],
      excluded: [
        '크루즈 선상팁',
        '기항지 관광',
        '선내 유료 시설',
      ],
      refundPolicy: `180일 전 = 취소 수수료 없음

여행 출발일 기준 179일 ~ 121일 전까지 = 신청금

여행 출발일 기준 120일 ~ 91일 전까지 = 여행 총액의 25%`,
      flightInfo: { included: true },
      hasGuide: true,
      hasEscort: true,
      hasCruiseDotStaff: true,
      hasTravelInsurance: true,
    },
  },
  {
    productCode: 'CERT-NORDIC-001',
    cruiseLine: 'Holland America Line',
    shipName: 'Nieuw Statendam',
    packageName: '북유럽 8박 9일 크루즈',
    nights: 8,
    days: 9,
    basePrice: 3800000,
    description: '북유럽을 여행하는 8박 9일 크루즈',
    tags: ['북유럽', '유럽', '프리미엄'],
    itineraryPattern: [
      { day: 1, type: 'Embarkation', location: 'Copenhagen', country: 'DK', currency: 'DKK', language: 'da', time: '16:00' },
      { day: 2, type: 'PortVisit', location: 'Oslo', country: 'NO', currency: 'NOK', language: 'no', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: 'Stockholm', country: 'SE', currency: 'SEK', language: 'sv', arrival: '09:00', departure: '19:00' },
      { day: 4, type: 'PortVisit', location: 'Helsinki', country: 'FI', currency: 'EUR', language: 'fi', arrival: '08:00', departure: '17:00' },
      { day: 5, type: 'PortVisit', location: 'Tallinn', country: 'EE', currency: 'EUR', language: 'et', arrival: '09:00', departure: '18:00' },
      { day: 6, type: 'Cruising' },
      { day: 7, type: 'PortVisit', location: 'Warnemunde', country: 'DE', currency: 'EUR', language: 'de', arrival: '08:00', departure: '18:00' },
      { day: 8, type: 'Cruising' },
      { day: 9, type: 'Disembarkation', location: 'Copenhagen', country: 'DK', currency: 'DKK', language: 'da', time: '09:00' },
    ],
    layout: {
      included: [
        '크루즈 객실료',
        '하루 3식 이상의 식사',
        '크루즈 편의 시설 이용',
        'AI 지니 가이드 서비스 지원',
        '비행기',
        '인솔자 동행',
        '여행자 보험',
      ],
      excluded: [
        '크루즈 선상팁',
        '기항지 관광',
        '선내 유료 시설',
      ],
      refundPolicy: `121일 전 = 취소 수수료 없음

여행 출발일 기준 120일 ~ 91일 전까지 = 신청금

여행 출발일 기준 90일 ~ 71일 전까지 = 여행 총액의 25%`,
      flightInfo: { included: true },
      hasGuide: true,
      hasEscort: true,
      hasCruiseDotStaff: false,
      hasTravelInsurance: true,
    },
  },
];

// 샘플 고객 데이터
const sampleCustomers = [
  {
    name: '김민수',
    email: 'kim.minsu@example.com',
    phone: '01011112222',
    password: '1234',
    birthDate: '1985-03-15',
    productIndex: 0, // 지중해 7박 8일
    paymentAmount: 3500000,
    paymentDate: '2024-12-01',
  },
  {
    name: '이영희',
    email: 'lee.younghee@example.com',
    phone: '01022223333',
    password: '1234',
    birthDate: '1990-07-22',
    productIndex: 1, // 알래스카 9박 10일
    paymentAmount: 5200000,
    paymentDate: '2024-11-15',
  },
  {
    name: '박준호',
    email: 'park.junho@example.com',
    phone: '01033334444',
    password: '1234',
    birthDate: '1988-11-08',
    productIndex: 2, // 동남아시아 5박 6일
    paymentAmount: 2800000,
    paymentDate: '2024-10-20',
    refundAmount: 2800000,
    refundDate: '2024-11-05',
  },
  {
    name: '최수진',
    email: 'choi.sujin@example.com',
    phone: '01044445555',
    password: '1234',
    birthDate: '1992-05-30',
    productIndex: 3, // 카리브해 10박 11일
    paymentAmount: 4500000,
    paymentDate: '2024-09-10',
    refundAmount: 2250000,
    refundDate: '2024-10-01',
  },
  {
    name: '정대현',
    email: 'jung.daehyun@example.com',
    phone: '01055556666',
    password: '1234',
    birthDate: '1975-12-25',
    productIndex: 4, // 월드 크루즈 30박 31일
    paymentAmount: 15000000,
    paymentDate: '2024-08-01',
  },
  {
    name: '한소영',
    email: 'han.soyoung@example.com',
    phone: '01066667777',
    password: '1234',
    birthDate: '1995-02-14',
    productIndex: 5, // 북유럽 8박 9일
    paymentAmount: 3800000,
    paymentDate: '2024-07-15',
    refundAmount: 3800000,
    refundDate: '2024-08-20',
  },
];

async function main() {
  console.log('📋 인증서 테스트용 샘플 데이터 생성 시작...\n');

  // 1. 상품 생성
  console.log('🚢 상품 생성 중...');
  const createdProducts: any[] = [];
  for (const productData of sampleProducts) {
    try {
      // 상품 생성 또는 업데이트
      const product = await prisma.cruiseProduct.upsert({
        where: { productCode: productData.productCode },
        update: {
          cruiseLine: productData.cruiseLine,
          shipName: productData.shipName,
          packageName: productData.packageName,
          nights: productData.nights,
          days: productData.days,
          basePrice: productData.basePrice,
          description: productData.description,
          tags: productData.tags,
          itineraryPattern: productData.itineraryPattern,
          updatedAt: new Date(),
        },
        create: {
          productCode: productData.productCode,
          cruiseLine: productData.cruiseLine,
          shipName: productData.shipName,
          packageName: productData.packageName,
          nights: productData.nights,
          days: productData.days,
          basePrice: productData.basePrice,
          description: productData.description,
          tags: productData.tags,
          itineraryPattern: productData.itineraryPattern,
          updatedAt: new Date(),
        },
      });

      // MallProductContent 생성 또는 업데이트
      await prisma.mallProductContent.upsert({
        where: { productCode: productData.productCode },
        update: {
          layout: productData.layout,
          updatedAt: new Date(),
        },
        create: {
          productCode: productData.productCode,
          layout: productData.layout,
          updatedAt: new Date(),
        },
      });

      createdProducts.push(product);
      console.log(`   ✅ ${productData.productCode} - ${productData.packageName}`);
    } catch (error: any) {
      console.error(`   ❌ 상품 생성 실패 (${productData.productCode}):`, error.message);
    }
  }

  console.log(`\n✅ 상품 생성 완료: ${createdProducts.length}개\n`);

  // 2. 고객 및 결제 정보 생성
  console.log('👥 고객 및 결제 정보 생성 중...');
  let createdCount = 0;
  let errorCount = 0;

  for (const customer of sampleCustomers) {
    try {
      const externalId = crypto.randomUUID();
      const product = createdProducts[customer.productIndex];
      
      if (!product) {
        console.error(`   ❌ 상품을 찾을 수 없습니다 (인덱스: ${customer.productIndex})`);
        errorCount++;
        continue;
      }

      // 고객 생성 또는 업데이트 (이메일이 이미 존재하면 업데이트)
      const user = await prisma.user.upsert({
        where: { email: customer.email },
        update: {
          name: customer.name,
          phone: customer.phone,
          password: customer.password,
          onboarded: true,
          role: 'user',
          updatedAt: new Date(),
        },
        create: {
          externalId,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          password: customer.password,
          onboarded: true,
          role: 'user',
          updatedAt: new Date(),
        },
      });

      // 결제 정보 생성 또는 업데이트 (Payment)
      // 기존 결제 정보가 있는지 확인
      const existingPayment = await prisma.payment.findFirst({
        where: {
          buyerEmail: customer.email,
          productCode: product.productCode,
        },
      });

      let payment;
      if (existingPayment) {
        // 기존 결제 정보 업데이트
        payment = await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            productCode: product.productCode,
            productName: product.packageName,
            amount: customer.paymentAmount,
            currency: 'KRW',
            buyerName: customer.name,
            buyerEmail: customer.email,
            buyerTel: customer.phone,
            status: 'paid',
            paidAt: new Date(customer.paymentDate),
            updatedAt: new Date(),
          },
        });
      } else {
        // 새 결제 정보 생성
        const orderId = `ORDER-CERT-${user.id}-${Date.now()}`;
        payment = await prisma.payment.create({
          data: {
            orderId,
            productCode: product.productCode,
            productName: product.packageName,
            amount: customer.paymentAmount,
            currency: 'KRW',
            buyerName: customer.name,
            buyerEmail: customer.email,
            buyerTel: customer.phone,
            status: 'paid',
            paidAt: new Date(customer.paymentDate),
            updatedAt: new Date(),
          },
        });
      }

      console.log(`✅ 고객 생성 완료: ${customer.name}`);
      console.log(`   📧 이메일: ${customer.email}`);
      console.log(`   📱 전화번호: ${customer.phone}`);
      console.log(`   🆔 사용자 ID: ${user.id}`);
      console.log(`   📦 상품: ${product.packageName}`);
      console.log(`   💰 결제금액: ${customer.paymentAmount.toLocaleString()}원 (${customer.paymentDate})`);
      
      if (customer.refundAmount) {
        console.log(`   💸 환불금액: ${customer.refundAmount.toLocaleString()}원 (${customer.refundDate})`);
        console.log(`   📄 테스트용: 환불인증서`);
      } else {
        console.log(`   📄 테스트용: 구매확인 인증서`);
      }
      
      console.log('');

      createdCount++;
    } catch (error: any) {
      console.error(`❌ 고객 생성 실패 (${customer.name}):`, error.message);
      errorCount++;
    }
  }

  console.log('\n✨ 샘플 데이터 생성 완료!');
  console.log(`   ✅ 고객 생성: ${createdCount}개`);
  console.log(`   ❌ 실패: ${errorCount}개`);
  console.log('\n📝 인증서 테스트 시 사용할 정보:');
  console.log('   관리자 패널 > 서류관리 > 구매확인 인증서 / 환불인증서에서');
  console.log('   고객명을 입력하면 자동으로 상품 정보가 불러와집니다.\n');
}

main()
  .catch((e) => {
    console.error('에러:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
