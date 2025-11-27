#!/usr/bin/env tsx
import 'dotenv/config';
import prisma from '@/lib/prisma';
import { getManagedUserIds } from '@/app/api/partner/assign-trip/_utils';
import { normalizePhone, isValidMobilePhone } from '@/lib/phone-utils';

async function ensurePartnerProfile() {
  const phone = '01000000001';
  let user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    const now = new Date();
    user = await prisma.user.create({
      data: {
        name: '시뮬레이션 대리점장',
        phone,
        password: 'simulate',
        role: 'user',
        mallUserId: 'sim-partner',
        mallNickname: '시뮬파트너',
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  let profile = await prisma.affiliateProfile.findFirst({ where: { userId: user.id } });
  if (!profile) {
    const now = new Date();
    profile = await prisma.affiliateProfile.create({
      data: {
        userId: user.id,
        type: 'BRANCH_MANAGER',
        displayName: '시뮬레이션 대리점장',
        affiliateCode: 'SIMPARTNER',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  return { user, profile };
}

async function ensureProduct() {
  let product = await prisma.cruiseProduct.findFirst({ where: { productCode: 'SIM-001' } });
  if (!product) {
    const now = new Date();
    product = await prisma.cruiseProduct.create({
      data: {
        productCode: 'SIM-001',
        cruiseLine: 'Simulation Line',
        shipName: 'Sim Ship',
        packageName: '시뮬 4박5일',
        nights: 4,
        days: 5,
        itineraryPattern: [
          { day: 1, country: 'KR', location: '부산' },
          { day: 2, country: 'JP', location: '후쿠오카' },
          { day: 3, country: 'JP', location: '나가사키' },
          { day: 4, country: 'JP', location: '가고시마' },
          { day: 5, country: 'KR', location: '부산' },
        ],
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        saleStatus: '판매중',
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  return product;
}

async function ensureTripRecord(product: { shipName: string }) {
  let trip = await prisma.trip.findFirst({ where: { productCode: 'SIM-001-TRIP' } });
  if (!trip) {
    const now = new Date();
    trip = await prisma.trip.create({
      data: {
        productCode: 'SIM-001-TRIP',
        shipName: product.shipName,
        departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  return trip;
}

async function ensurePurchaseCustomer(profileId: number, productId: number) {
  const phone = '01011112222';
  let user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    const now = new Date();
    user = await prisma.user.create({
      data: {
        name: '시뮬 구매고객',
        phone,
        password: '3800',
        role: 'user',
        customerStatus: 'purchase_confirmed',
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  let lead = await prisma.affiliateLead.findFirst({ where: { customerPhone: phone } });
  if (lead) {
    lead = await prisma.affiliateLead.update({
      where: { id: lead.id },
      data: {
        status: 'PURCHASED',
        updatedAt: new Date(),
        AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: {
          connect: { id: profileId },
        },
      },
      include: {
        AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: true,
      },
    });
  } else {
    const now = new Date();
    lead = await prisma.affiliateLead.create({
      data: {
        customerName: '시뮬 구매고객',
        customerPhone: phone,
        status: 'PURCHASED',
        createdAt: now,
        updatedAt: now,
        AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: {
          connect: { id: profileId },
        },
      },
      include: {
        AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: true,
      },
    });
  }

  const product = await prisma.cruiseProduct.findUnique({ where: { id: productId } });
  const tripRecord = await ensureTripRecord(product!);

  let reservation = await prisma.reservation.findFirst({ where: { mainUserId: user.id } });
  if (!reservation) {
    reservation = await prisma.reservation.create({
      data: {
        mainUserId: user.id,
        tripId: tripRecord.id,
        totalPeople: 2,
        paymentDate: new Date(),
      },
      include: { Trip: true },
    });
  }

  const existingTraveler = await prisma.traveler.findFirst({ where: { reservationId: reservation.id } });
  if (existingTraveler) {
    await prisma.traveler.update({
      where: { id: existingTraveler.id },
      data: {
        korName: '동행 잠재고객',
        engSurname: 'Companion',
        engGivenName: 'Simulation',
      },
    });
  } else {
    await prisma.traveler.create({
      data: {
        reservationId: reservation.id,
        roomNumber: 1,
        korName: '동행 잠재고객',
        engSurname: 'Companion',
        engGivenName: 'Simulation',
      },
    });
  }

  return { user, lead, reservation };
}

async function simulatePartnerFlow() {
  const { profile } = await ensurePartnerProfile();
  const product = await ensureProduct();
  const { user: purchaseUser } = await ensurePurchaseCustomer(profile.id, product.id);

  console.log('1) 파트너 프로필 ID:', profile.id);
  const { userIds } = await getManagedUserIds(profile);
  console.log('   관리 가능한 고객 수:', userIds.length);

  if (!userIds.includes(purchaseUser.id)) {
    throw new Error('구매고객이 파트너 소유 범위에 없습니다.');
  }

  console.log('2) 구매고객 검색 성공:', purchaseUser.name, purchaseUser.phone);

  // 동행자 자동 생성/선택 시뮬
  const companionPhone = normalizePhone('010-3333-4444');
  if (!companionPhone || !isValidMobilePhone(companionPhone)) {
    throw new Error('동행자 전화번호가 유효하지 않습니다.');
  }

  let companion = await prisma.user.findFirst({ where: { phone: companionPhone } });
  if (!companion) {
    const now = new Date();
    companion = await prisma.user.create({
      data: {
        name: '동행 잠재고객',
        phone: companionPhone,
        password: '3800',
        customerStatus: 'prospects',
        role: 'user',
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log('3) 동행자 자동 생성 완료:', companion.id);
  } else {
    console.log('3) 기존 동행자 재사용:', companion.id);
  }

  // 여행 배정 수행 (UserTrip 생성)
  const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const result = await prisma.$transaction(async (tx) => {
    const trip = await tx.userTrip.create({
      data: {
        userId: companion!.id,
        productId: product.id,
        cruiseName: `${product.cruiseLine} ${product.shipName}`,
        nights: product.nights,
        days: product.days,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        destination: ['일본'],
        companionType: '가족',
        status: 'Upcoming',
        reservationCode: product.productCode,
        updatedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: companion!.id },
      data: {
        onboarded: true,
        customerStatus: 'purchase_confirmed',
        totalTripCount: { increment: 1 },
        password: '3800',
      },
    });

    return trip;
  });

  console.log('4) 여행 배정 완료 - UserTrip ID:', result.id);
  console.log('   시작일:', result.startDate.toISOString().split('T')[0], '종료일:', result.endDate.toISOString().split('T')[0]);
  console.log('   동행자 User ID:', companion!.id);
}

simulatePartnerFlow()
  .then(() => {
    console.log('\n시뮬레이션이 성공적으로 완료되었습니다.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n시뮬레이션 중 오류 발생:', error);
    process.exit(1);
  });
