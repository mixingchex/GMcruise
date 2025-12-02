// scripts/init-master-ecosystem.ts
// 마스터 생태계 초기화 스크립트: 3일 체험 & 유료 고객 시나리오 생성

import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

// ============================================
// 안전한 데이터 생성 헬퍼 함수 (Upsert 대체)
// ============================================

// 파트너용: mallUserId로 찾기
async function findOrCreatePartner(data: {
  mallUserId: string;
  phone: string;
  name: string;
  password: string;
  role?: string;
  customerStatus?: string;
  customerSource?: string;
  loginCount?: number;
  updatedAt?: Date;
}) {
  const existingUser = await prisma.user.findFirst({
    where: { mallUserId: data.mallUserId },
  });

  if (existingUser) {
    // 이미 존재하면 패스워드 업데이트
    return await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: data.password,
        name: data.name,
        phone: data.phone,
        role: data.role ?? existingUser.role ?? 'user',
        customerStatus: data.customerStatus ?? existingUser.customerStatus,
        customerSource: data.customerSource ?? existingUser.customerSource,
        updatedAt: data.updatedAt ?? new Date(),
      },
    });
  } else {
    return await prisma.user.create({
      data: {
        mallUserId: data.mallUserId,
        phone: data.phone,
        name: data.name,
        password: data.password,
        role: data.role ?? 'user',
        customerStatus: data.customerStatus ?? 'active',
        customerSource: data.customerSource ?? null,
        loginCount: data.loginCount ?? 0,
        updatedAt: data.updatedAt ?? new Date(),
      },
    });
  }
}

// 고객용: phone으로 찾기
async function findOrCreateCustomer(data: {
  phone: string;
  name: string;
  password: string;
  role?: string;
  customerStatus?: string;
  customerSource?: string;
  testModeStartedAt?: Date | null;
  onboarded?: boolean;
  loginCount?: number;
  updatedAt?: Date;
}) {
  const existingUser = await prisma.user.findFirst({
    where: { phone: data.phone },
  });

  if (existingUser) {
    return await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: data.name,
        password: data.password,
        role: data.role ?? existingUser.role ?? 'user',
        customerStatus: data.customerStatus ?? existingUser.customerStatus,
        customerSource: data.customerSource ?? existingUser.customerSource,
        testModeStartedAt: data.testModeStartedAt ?? existingUser.testModeStartedAt,
        onboarded: data.onboarded ?? existingUser.onboarded,
        updatedAt: data.updatedAt ?? new Date(),
      },
    });
  } else {
    return await prisma.user.create({
      data: {
        phone: data.phone,
        name: data.name,
        password: data.password,
        role: data.role ?? 'user',
        customerStatus: data.customerStatus ?? 'active',
        customerSource: data.customerSource ?? null,
        testModeStartedAt: data.testModeStartedAt ?? null,
        onboarded: data.onboarded ?? false,
        loginCount: data.loginCount ?? 0,
        updatedAt: data.updatedAt ?? new Date(),
      },
    });
  }
}

// Itinerary 안전 생성 (findFirst -> create)
async function createItineraryIfNotExists(data: {
  userTripId: number;
  day: number;
  date: Date;
  type: string;
  location?: string | null;
  country?: string | null;
  currency?: string | null;
  language?: string | null;
  arrival?: string | null;
  departure?: string | null;
  time?: string | null;
}) {
  const existing = await prisma.itinerary.findFirst({
    where: {
      userTripId: data.userTripId,
      day: data.day,
    },
  });

  if (!existing) {
    return await prisma.itinerary.create({
      data: {
        userTripId: data.userTripId,
        day: data.day,
        date: data.date,
        type: data.type,
        location: data.location ?? null,
        country: data.country ?? null,
        currency: data.currency ?? null,
        language: data.language ?? null,
        arrival: data.arrival ?? null,
        departure: data.departure ?? null,
        time: data.time ?? null,
        updatedAt: new Date(),
      },
    });
  }
  return existing;
}

// Expense 안전 생성 (findFirst -> create)
async function createExpenseIfNotExists(data: {
  userId: number;
  userTripId: number;
  description: string;
  category: string;
  foreignAmount: number;
  krwAmount: number;
  usdAmount: number;
  currency: string;
}) {
  // 같은 설명과 카테고리로 이미 존재하는지 확인
  const existing = await prisma.expense.findFirst({
    where: {
      userId: data.userId,
      userTripId: data.userTripId,
      description: data.description,
      category: data.category,
    },
  });

  if (!existing) {
    return await prisma.expense.create({
      data: {
        userId: data.userId,
        userTripId: data.userTripId,
        description: data.description,
        category: data.category,
        foreignAmount: data.foreignAmount,
        krwAmount: data.krwAmount,
        usdAmount: data.usdAmount,
        currency: data.currency,
        updatedAt: new Date(),
      },
    });
  }
  return existing;
}

async function main() {
  console.log('🚀 마스터 생태계 초기화 시작...\n');

  // ============================================
  // 1. 날짜 변수 설정 (핵심)
  // ============================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trialDepartureDate = new Date(today);
  trialDepartureDate.setDate(trialDepartureDate.getDate() + 3); // 오늘 + 3일 (D-3 상태)
  trialDepartureDate.setHours(0, 0, 0, 0);

  const realDepartureDate = new Date(today);
  realDepartureDate.setDate(realDepartureDate.getDate() + 30); // 오늘 + 30일 (D-30 상태)
  realDepartureDate.setHours(0, 0, 0, 0);

  console.log('📅 날짜 설정:');
  console.log(`   오늘: ${today.toISOString().split('T')[0]}`);
  console.log(`   3일 체험 출발일 (D-3): ${trialDepartureDate.toISOString().split('T')[0]}`);
  console.log(`   유료 고객 출발일 (D-30): ${realDepartureDate.toISOString().split('T')[0]}\n`);

  // ============================================
  // 2. 상품 생성 (Product)
  // ============================================
  console.log('📦 상품 생성 중...\n');

  // SAMPLE-MED-001 (체험용) - 3개국 방문 (일본, 대만, 베트남)
  const sampleProduct = await prisma.cruiseProduct.upsert({
    where: { productCode: 'SAMPLE-MED-001' },
    update: {
      cruiseLine: '로얄캐리비안',
      shipName: '스펙트럼 오브 더 시즈',
      packageName: '지니 3일 체험 (아시아 3개국)',
      nights: 6,
      days: 7,
      saleStatus: '판매중',
      isGeniePack: true,
      isTestProduct: true, // 테스트 상품 플래그
      itineraryPattern: [
        {
          day: 1,
          type: 'Embarkation',
          location: '부산',
          country: 'KR',
          currency: 'KRW',
          language: 'ko',
          time: '16:00',
        },
        {
          day: 2,
          type: 'PortVisit',
          location: '후쿠오카',
          country: 'JP',
          currency: 'JPY',
          language: 'ja',
          arrival: '08:00',
          departure: '18:00',
        },
        {
          day: 3,
          type: 'Cruising',
        },
        {
          day: 4,
          type: 'PortVisit',
          location: '지룽',
          country: 'TW',
          currency: 'TWD',
          language: 'zh-TW',
          arrival: '07:00',
          departure: '17:00',
        },
        {
          day: 5,
          type: 'PortVisit',
          location: '다낭',
          country: 'VN',
          currency: 'VND',
          language: 'vi',
          arrival: '08:00',
          departure: '18:00',
        },
        {
          day: 6,
          type: 'Cruising',
        },
        {
          day: 7,
          type: 'Disembarkation',
          location: '부산',
          country: 'KR',
          currency: 'KRW',
          language: 'ko',
          time: '09:00',
        },
      ],
      updatedAt: new Date(),
    },
    create: {
      productCode: 'SAMPLE-MED-001',
      cruiseLine: '로얄캐리비안',
      shipName: '스펙트럼 오브 더 시즈',
      packageName: '지니 3일 체험 (아시아 3개국)',
      nights: 6,
      days: 7,
      basePrice: 0, // 체험용 무료
      description: '크루즈 가이드 지니 AI 3일 체험 상품입니다. 일본, 대만, 베트남 3개국을 방문합니다.',
      saleStatus: '판매중',
      isGeniePack: true,
      isTestProduct: true, // 테스트 상품 플래그
      source: 'genie-trial',
      category: '체험',
      itineraryPattern: [
        {
          day: 1,
          type: 'Embarkation',
          location: '부산',
          country: 'KR',
          currency: 'KRW',
          language: 'ko',
          time: '16:00',
        },
        {
          day: 2,
          type: 'PortVisit',
          location: '후쿠오카',
          country: 'JP',
          currency: 'JPY',
          language: 'ja',
          arrival: '08:00',
          departure: '18:00',
        },
        {
          day: 3,
          type: 'Cruising',
        },
        {
          day: 4,
          type: 'PortVisit',
          location: '지룽',
          country: 'TW',
          currency: 'TWD',
          language: 'zh-TW',
          arrival: '07:00',
          departure: '17:00',
        },
        {
          day: 5,
          type: 'PortVisit',
          location: '다낭',
          country: 'VN',
          currency: 'VND',
          language: 'vi',
          arrival: '08:00',
          departure: '18:00',
        },
        {
          day: 6,
          type: 'Cruising',
        },
        {
          day: 7,
          type: 'Disembarkation',
          location: '부산',
          country: 'KR',
          currency: 'KRW',
          language: 'ko',
          time: '09:00',
        },
      ],
      updatedAt: new Date(),
    },
  });

  console.log('✅ SAMPLE-MED-001 생성 완료:');
  console.log(`   상품코드: ${sampleProduct.productCode}`);
  console.log(`   상품명: ${sampleProduct.packageName}`);
  console.log(`   기간: ${sampleProduct.nights}박 ${sampleProduct.days}일\n`);

  // REAL-CRUISE-01 (유료용)
  const realProduct = await prisma.cruiseProduct.upsert({
    where: { productCode: 'REAL-CRUISE-01' },
    update: {
      packageName: '럭셔리 세계일주 (실제상품)',
      saleStatus: '판매중',
      updatedAt: new Date(),
    },
    create: {
      productCode: 'REAL-CRUISE-01',
      cruiseLine: 'MSC 크루즈',
      shipName: 'MSC 그랜드오사',
      packageName: '럭셔리 세계일주 (실제상품)',
      nights: 7,
      days: 8,
      basePrice: 5000000,
      description: '럭셔리 세계일주 크루즈 여행 상품입니다.',
      saleStatus: '판매중',
      isPremium: true,
      source: 'cruisedot',
      category: '프리미엄',
      itineraryPattern: [
        {
          day: 1,
          type: 'Embarkation',
          location: 'Busan',
          country: 'KR',
          currency: 'KRW',
          language: 'ko',
          time: '14:00',
        },
        {
          day: 2,
          type: 'PortVisit',
          location: 'Tokyo',
          country: 'JP',
          currency: 'JPY',
          language: 'ja',
          arrival: '08:00',
          departure: '20:00',
        },
        {
          day: 3,
          type: 'PortVisit',
          location: 'Osaka',
          country: 'JP',
          currency: 'JPY',
          language: 'ja',
          arrival: '07:00',
          departure: '18:00',
        },
        {
          day: 4,
          type: 'Cruising',
        },
        {
          day: 5,
          type: 'PortVisit',
          location: 'Shanghai',
          country: 'CN',
          currency: 'CNY',
          language: 'zh-CN',
          arrival: '09:00',
          departure: '19:00',
        },
        {
          day: 6,
          type: 'PortVisit',
          location: 'Hong Kong',
          country: 'HK',
          currency: 'HKD',
          language: 'zh-HK',
          arrival: '08:00',
          departure: '22:00',
        },
        {
          day: 7,
          type: 'Cruising',
        },
        {
          day: 8,
          type: 'Disembarkation',
          location: 'Busan',
          country: 'KR',
          currency: 'KRW',
          language: 'ko',
          time: '09:00',
        },
      ],
      updatedAt: new Date(),
    },
  });

  console.log('✅ REAL-CRUISE-01 생성 완료:');
  console.log(`   상품코드: ${realProduct.productCode}`);
  console.log(`   상품명: ${realProduct.packageName}`);
  console.log(`   기간: ${realProduct.nights}박 ${realProduct.days}일\n`);

  // ============================================
  // 3. 파트너 생성 (ID/PW 로그인)
  // ============================================
  console.log('👥 파트너 생성 중...\n');

  const partnerPassword = await bcrypt.hash('qwe1', 10);

  // user1 (판매원)
  const user1 = await findOrCreatePartner({
    mallUserId: 'user1',
    phone: 'user1',
    name: '판매원',
    password: partnerPassword,
    role: 'user',
    customerStatus: 'active',
    customerSource: 'partner-test',
    loginCount: 0,
    updatedAt: new Date(),
  });

  // user1의 AffiliateProfile 생성
  let user1Profile = await prisma.affiliateProfile.findFirst({
    where: { userId: user1.id },
  });

  if (user1Profile) {
    user1Profile = await prisma.affiliateProfile.update({
      where: { id: user1Profile.id },
      data: {
        affiliateCode: `AFF-USER1-${Date.now().toString(36).toUpperCase()}`,
        type: 'SALES_AGENT',
        status: 'ACTIVE',
        displayName: '판매원',
        nickname: '판매원',
        updatedAt: new Date(),
      },
    });
  } else {
    user1Profile = await prisma.affiliateProfile.create({
      data: {
        userId: user1.id,
        affiliateCode: `AFF-USER1-${Date.now().toString(36).toUpperCase()}`,
        type: 'SALES_AGENT',
        status: 'ACTIVE',
        displayName: '판매원',
        nickname: '판매원',
        updatedAt: new Date(),
      },
    });
  }

  console.log('✅ user1 (판매원) 생성 완료:');
  console.log(`   ID: ${user1.id}`);
  console.log(`   mallUserId: ${user1.mallUserId}`);
  console.log(`   전화번호: ${user1.phone}`);
  console.log(`   AffiliateCode: ${user1Profile.affiliateCode}\n`);

  // boss1 (지점장)
  const boss1 = await findOrCreatePartner({
    mallUserId: 'boss1',
    phone: 'boss1',
    name: '대리점장',
    password: partnerPassword,
    role: 'user',
    customerStatus: 'active',
    customerSource: 'partner-test',
    loginCount: 0,
    updatedAt: new Date(),
  });

  // boss1의 AffiliateProfile 생성
  let boss1Profile = await prisma.affiliateProfile.findFirst({
    where: { userId: boss1.id },
  });

  if (boss1Profile) {
    boss1Profile = await prisma.affiliateProfile.update({
      where: { id: boss1Profile.id },
      data: {
        affiliateCode: `AFF-BOSS1-${Date.now().toString(36).toUpperCase()}`,
        type: 'BRANCH_MANAGER',
        status: 'ACTIVE',
        displayName: '대리점장',
        nickname: '대리점장',
        updatedAt: new Date(),
      },
    });
  } else {
    boss1Profile = await prisma.affiliateProfile.create({
      data: {
        userId: boss1.id,
        affiliateCode: `AFF-BOSS1-${Date.now().toString(36).toUpperCase()}`,
        type: 'BRANCH_MANAGER',
        status: 'ACTIVE',
        displayName: '대리점장',
        nickname: '대리점장',
        updatedAt: new Date(),
      },
    });
  }

  console.log('✅ boss1 (지점장) 생성 완료:');
  console.log(`   ID: ${boss1.id}`);
  console.log(`   mallUserId: ${boss1.mallUserId}`);
  console.log(`   전화번호: ${boss1.phone}`);
  console.log(`   AffiliateCode: ${boss1Profile.affiliateCode}\n`);

  // ============================================
  // 4. 고객 & 여행 생성 (UserTrip 필수)
  // ============================================

  // 시나리오 A: 3일 체험 (잠재고객) - 이름+연락처+1101 로그인
  console.log('🎫 시나리오 A: 3일 체험 고객 생성 중...\n');

  const trialPassword = await bcrypt.hash('1101', 10);
  const trialName = '김체험';
  const trialPhone = '010-1111-1111';

  const trialUser = await findOrCreateCustomer({
    phone: trialPhone,
    name: trialName,
    password: trialPassword,
    role: 'user',
    customerStatus: 'test',
    customerSource: 'test-guide',
    testModeStartedAt: today,
    onboarded: false,
    loginCount: 0,
    updatedAt: new Date(),
  });

  console.log('✅ 3일 체험 고객 생성 완료:');
  console.log(`   ID: ${trialUser.id}`);
  console.log(`   이름: ${trialUser.name}`);
  console.log(`   전화번호: ${trialUser.phone}`);
  console.log(`   비밀번호: 1101 (암호화됨)\n`);

  // trial-user의 UserTrip 생성
  const trialEndDate = new Date(trialDepartureDate);
  trialEndDate.setDate(trialEndDate.getDate() + sampleProduct.days - 1);
  trialEndDate.setHours(23, 59, 59, 999);

  const destinations = ['일본 후쿠오카', '대만 타이베이'];

  let trialUserTrip = await prisma.userTrip.findFirst({
    where: {
      userId: trialUser.id,
      productId: sampleProduct.id,
    },
  });

  if (trialUserTrip) {
    trialUserTrip = await prisma.userTrip.update({
      where: { id: trialUserTrip.id },
      data: {
        startDate: trialDepartureDate,
        endDate: trialEndDate,
        googleFolderId: 'dummy',
        spreadsheetId: 'dummy',
        updatedAt: new Date(),
      },
    });
  } else {
    trialUserTrip = await prisma.userTrip.create({
      data: {
        userId: trialUser.id,
        productId: sampleProduct.id,
        reservationCode: `CRD-${today.toISOString().slice(0, 10).replace(/-/g, '')}-TRIAL`,
        cruiseName: `${sampleProduct.cruiseLine} ${sampleProduct.shipName}`,
        companionType: '가족',
        destination: destinations,
        startDate: trialDepartureDate,
        endDate: trialEndDate,
        nights: sampleProduct.nights,
        days: sampleProduct.days,
        visitCount: destinations.length,
        status: 'Upcoming',
        googleFolderId: 'dummy',
        spreadsheetId: 'dummy',
        updatedAt: new Date(),
      },
    });
  }

  console.log('✅ 3일 체험 고객의 UserTrip 생성 완료:');
  console.log(`   UserTrip ID: ${trialUserTrip.id}`);
  console.log(`   상품: ${sampleProduct.productCode}`);
  console.log(`   출발일: ${trialDepartureDate.toISOString().split('T')[0]} (D-3)\n`);

  // 김체험의 Itinerary 생성 (Day 1) - findFirst -> create
  const trialItineraryDate = new Date(trialDepartureDate);
  await createItineraryIfNotExists({
    userTripId: trialUserTrip.id,
    day: 1,
    date: trialItineraryDate,
    type: 'Embarkation',
    location: 'Busan',
    country: 'KR',
    currency: 'KRW',
    language: 'ko',
    time: '14:00',
  });

  console.log('✅ 3일 체험 고객의 Itinerary 생성 완료 (Day 1)');

  // 김체험의 Expense 생성 (1개) - findFirst -> create
  await createExpenseIfNotExists({
    userId: trialUser.id,
    userTripId: trialUserTrip.id,
    description: '후쿠오카 현지 식사',
    category: '식비',
    foreignAmount: 5000,
    krwAmount: 50000,
    usdAmount: 38.5,
    currency: 'JPY',
  });

  console.log('✅ 3일 체험 고객의 Expense 생성 완료 (1개)\n');

  // 시나리오 B: 지니 가이드 (구매고객) - 이름+연락처+3800 로그인
  console.log('🎫 시나리오 B: 지니 가이드 고객 생성 중...\n');

  const geniePassword = await bcrypt.hash('3800', 10);
  const genieName = '박지니';
  const geniePhone = '010-2222-2222';

  const genieUser = await findOrCreateCustomer({
    phone: geniePhone,
    name: genieName,
    password: geniePassword,
    role: 'user',
    customerStatus: 'active',
    customerSource: 'cruise-guide',
    onboarded: true,
    loginCount: 0,
    updatedAt: new Date(),
  });

  console.log('✅ 지니 가이드 고객 생성 완료:');
  console.log(`   ID: ${genieUser.id}`);
  console.log(`   이름: ${genieUser.name}`);
  console.log(`   전화번호: ${genieUser.phone}`);
  console.log(`   비밀번호: 3800 (암호화됨)\n`);

  // genie-user의 UserTrip 생성
  const genieEndDate = new Date(realDepartureDate);
  genieEndDate.setDate(genieEndDate.getDate() + realProduct.days - 1);
  genieEndDate.setHours(23, 59, 59, 999);

  const genieDestinations = ['일본 도쿄', '일본 오사카', '중국 상하이', '홍콩'];

  let genieUserTrip = await prisma.userTrip.findFirst({
    where: {
      userId: genieUser.id,
      productId: realProduct.id,
    },
  });

  if (genieUserTrip) {
    genieUserTrip = await prisma.userTrip.update({
      where: { id: genieUserTrip.id },
      data: {
        startDate: realDepartureDate,
        endDate: genieEndDate,
        googleFolderId: 'dummy',
        spreadsheetId: 'dummy',
        updatedAt: new Date(),
      },
    });
  } else {
    genieUserTrip = await prisma.userTrip.create({
      data: {
        userId: genieUser.id,
        productId: realProduct.id,
        reservationCode: `CRD-${today.toISOString().slice(0, 10).replace(/-/g, '')}-GENIE`,
        cruiseName: `${realProduct.cruiseLine} ${realProduct.shipName}`,
        companionType: '가족',
        destination: genieDestinations,
        startDate: realDepartureDate,
        endDate: genieEndDate,
        nights: realProduct.nights,
        days: realProduct.days,
        visitCount: genieDestinations.length,
        status: 'Upcoming',
        googleFolderId: 'dummy',
        spreadsheetId: 'dummy',
        updatedAt: new Date(),
      },
    });
  }

  console.log('✅ 지니 가이드 고객의 UserTrip 생성 완료:');
  console.log(`   UserTrip ID: ${genieUserTrip.id}`);
  console.log(`   상품: ${realProduct.productCode}`);
  console.log(`   출발일: ${realDepartureDate.toISOString().split('T')[0]} (D-30)\n`);

  // 박지니의 Itinerary 생성 (Day 1) - findFirst -> create
  const genieItineraryDate = new Date(realDepartureDate);
  await createItineraryIfNotExists({
    userTripId: genieUserTrip.id,
    day: 1,
    date: genieItineraryDate,
    type: 'Embarkation',
    location: 'Busan',
    country: 'KR',
    currency: 'KRW',
    language: 'ko',
    time: '14:00',
  });

  console.log('✅ 지니 가이드 고객의 Itinerary 생성 완료 (Day 1)\n');

  // ============================================
  // 최종 요약
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 마스터 생태계 초기화 완료!\n');
  console.log('📋 생성된 데이터 요약:\n');
  console.log('📦 상품:');
  console.log(`   - SAMPLE-MED-001: ${sampleProduct.packageName}`);
  console.log(`   - REAL-CRUISE-01: ${realProduct.packageName}\n`);
  console.log('👥 파트너 (ID/PW 로그인):');
  console.log(`   - user1 (판매원): mallUserId 'user1', 비밀번호 'qwe1'`);
  console.log(`   - boss1 (지점장): mallUserId 'boss1', 비밀번호 'qwe1'\n`);
  console.log('🎫 고객 & 여행:');
  console.log(`   - 3일 체험 고객 (이름+연락처+1101):`);
  console.log(`     * 이름: '김체험'`);
  console.log(`     * 전화번호: '010-1111-1111'`);
  console.log(`     * 비밀번호: '1101'`);
  console.log(`     * 상품: SAMPLE-MED-001`);
  console.log(`     * 출발일: ${trialDepartureDate.toISOString().split('T')[0]} (D-3)`);
  console.log(`     * Itinerary: Day 1 생성됨`);
  console.log(`     * Expense: 1개 생성됨\n`);
  console.log(`   - 지니 가이드 고객 (이름+연락처+3800):`);
  console.log(`     * 이름: '박지니'`);
  console.log(`     * 전화번호: '010-2222-2222'`);
  console.log(`     * 비밀번호: '3800'`);
  console.log(`     * 상품: REAL-CRUISE-01`);
  console.log(`     * 출발일: ${realDepartureDate.toISOString().split('T')[0]} (D-30)`);
  console.log(`     * Itinerary: Day 1 생성됨\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
