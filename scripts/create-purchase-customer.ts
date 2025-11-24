/**
 * 구매고객 인증이 완료된 샘플 고객 생성 스크립트
 * user1 판매원에게 연결된 구매고객을 생성합니다.
 */

import { PrismaClient } from '@prisma/client';
import { normalizeItineraryPattern, extractDestinationsFromItineraryPattern, extractVisitedCountriesFromItineraryPattern } from '../lib/utils/itineraryPattern';

const prisma = new PrismaClient();

async function createPurchaseCustomer() {
  try {
    console.log('구매고객 인증 샘플 고객 생성 시작...');

    // 1. user1 판매원 찾기 또는 생성
    let user1 = await prisma.user.findFirst({
      where: {
        OR: [
          { mallUserId: 'user1' },
          { phone: 'user1' },
        ],
      },
      include: {
        AffiliateProfile: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user1) {
      // user1 생성
      user1 = await prisma.user.create({
        data: {
          name: '판매원1',
          phone: 'user1',
          mallUserId: 'user1',
          password: 'qwe1',
          role: 'user',
          customerSource: 'affiliate-manual',
          customerStatus: 'active',
          updatedAt: new Date(),
        },
        include: {
          AffiliateProfile: {
            where: { status: 'ACTIVE' },
          },
        },
      });
      console.log('user1 판매원 생성:', user1.id);
    }

    if (!user1) {
      throw new Error('user1을 생성할 수 없습니다.');
    }
    
    let affiliateProfile = user1.AffiliateProfile?.[0];
    if (!affiliateProfile) {
      // AffiliateProfile 조회 (status 무관)
      affiliateProfile = await prisma.affiliateProfile.findFirst({
        where: { userId: user1.id },
      });
      
      if (!affiliateProfile) {
        // AffiliateProfile 생성
        const { randomBytes } = await import('crypto');
        const affiliateCode = `AFF-USER1-${randomBytes(2).toString('hex').toUpperCase()}`;
        
        const now = new Date();
        affiliateProfile = await prisma.affiliateProfile.create({
          data: {
            userId: user1.id,
            affiliateCode,
            type: 'SALES_AGENT',
            status: 'ACTIVE',
            displayName: '판매원1',
            nickname: '판매원1',
            landingSlug: 'user1',
            updatedAt: now,
          },
        });
        console.log('AffiliateProfile 생성:', affiliateProfile.id);
      } else {
        // 기존 AffiliateProfile 활성화
        affiliateProfile = await prisma.affiliateProfile.update({
          where: { id: affiliateProfile.id },
          data: {
            status: 'ACTIVE',
            updatedAt: new Date(),
          },
        });
        console.log('기존 AffiliateProfile 활성화:', affiliateProfile.id);
      }
    }

    console.log('user1 판매원 찾음:', {
      userId: user1.id,
      affiliateProfileId: affiliateProfile.id,
      type: affiliateProfile.type,
    });

    // 2. 크루즈 상품 찾기 (REAL-CRUISE-01 또는 첫 번째 상품)
    let product = await prisma.cruiseProduct.findUnique({
      where: { productCode: 'REAL-CRUISE-01' },
    });

    if (!product) {
      product = await prisma.cruiseProduct.findFirst({
        orderBy: { id: 'asc' },
      });
    }

    if (!product) {
      console.error('크루즈 상품을 찾을 수 없습니다.');
      return;
    }

    console.log('크루즈 상품 찾음:', {
      productId: product.id,
      productCode: product.productCode,
      cruiseLine: product.cruiseLine,
      shipName: product.shipName,
    });

    // 3. 구매고객 User 생성
    const customerPhone = '01012345678';
    const customerName = '구매고객테스트';

    let customer = await prisma.user.findFirst({
      where: {
        phone: customerPhone,
        role: 'user',
      },
    });

    if (customer) {
      // 기존 고객 업데이트
      customer = await prisma.user.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          customerSource: 'cruise-guide',
          customerStatus: 'purchase_confirmed',
          password: '3800',
          isLocked: false,
          isHibernated: false,
        },
      });
      console.log('기존 고객 업데이트:', customer.id);
    } else {
      // 새 고객 생성
      const now = new Date();
      customer = await prisma.user.create({
        data: {
          name: customerName,
          phone: customerPhone,
          password: '3800',
          role: 'user',
          customerSource: 'cruise-guide',
          customerStatus: 'purchase_confirmed',
          onboarded: true,
          loginCount: 0,
          isLocked: false,
          isHibernated: false,
          updatedAt: now,
        },
      });
      console.log('새 고객 생성:', customer.id);
    }

    // 4. Trip 생성
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 30); // D-30
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + product.days - 1);
    endDate.setHours(23, 59, 59, 999);

    const destinations = extractDestinationsFromItineraryPattern(product.itineraryPattern);
    const visitedCountries = extractVisitedCountriesFromItineraryPattern(product.itineraryPattern);

    // 기존 Trip 확인 (productCode로)
    let trip = await prisma.trip.findUnique({
      where: {
        productCode: product.productCode,
      },
    });

    if (!trip) {
      // 새 Trip 생성
      trip = await prisma.trip.create({
        data: {
          productCode: product.productCode,
          shipName: product.shipName,
          departureDate: startDate,
          endDate,
          status: 'Upcoming',
        },
      });
      console.log('새 Trip 생성:', trip.id);
    } else {
      // 기존 Trip 업데이트
      trip = await prisma.trip.update({
        where: { id: trip.id },
        data: {
          shipName: product.shipName,
          departureDate: startDate,
          endDate,
          status: 'Upcoming',
        },
      });
      console.log('기존 Trip 업데이트:', trip.id);
    }

    // 5. Reservation 생성
    let reservation = await prisma.reservation.findFirst({
      where: {
        mainUserId: customer.id,
        tripId: trip.id,
      },
    });

    if (!reservation) {
      reservation = await prisma.reservation.create({
        data: {
          mainUserId: customer.id,
          tripId: trip.id,
          totalPeople: 2,
        },
      });
      console.log('새 Reservation 생성:', reservation.id);
    } else {
      console.log('기존 Reservation 존재:', reservation.id);
    }

    // 6. UserTrip 생성 (Itinerary는 UserTrip에 연결됨)
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const userTripReservationCode = `CRD-${dateStr}-${randomStr}`;

    let userTrip = await prisma.userTrip.findFirst({
      where: {
        userId: customer.id,
        productId: product.id,
      },
    });

    if (!userTrip) {
      userTrip = await prisma.userTrip.create({
        data: {
          userId: customer.id,
          productId: product.id,
          reservationCode: userTripReservationCode,
          cruiseName: `${product.cruiseLine} ${product.shipName}`,
          companionType: '가족',
          destination: destinations,
          startDate,
          endDate,
          nights: product.nights,
          days: product.days,
          visitCount: destinations.length,
          status: 'Upcoming',
          googleFolderId: 'auto-genie',
          spreadsheetId: 'auto-genie',
          updatedAt: now,
        },
      });
      console.log('UserTrip 생성 완료:', userTrip.id);
    } else {
      console.log('기존 UserTrip 존재:', userTrip.id);
    }

    // 7. Itinerary 생성
    const itineraryPattern = normalizeItineraryPattern(product.itineraryPattern);
    
    // 기존 Itinerary 삭제 후 재생성
    await prisma.itinerary.deleteMany({
      where: { userTripId: userTrip.id },
    });
    
    const itineraries: any[] = [];
    for (const pattern of itineraryPattern) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + pattern.day - 1);

      itineraries.push({
        userTripId: userTrip.id,
        day: pattern.day,
        date: dayDate,
        type: pattern.type,
        location: pattern.location || null,
        country: pattern.country || null,
        currency: pattern.currency || null,
        language: pattern.language || null,
        arrival: pattern.arrival || null,
        departure: pattern.departure || null,
        time: pattern.time || null,
        updatedAt: now,
      });
    }

    await prisma.itinerary.createMany({
      data: itineraries,
    });
    console.log('Itinerary 생성 완료:', itineraries.length, '개');

    // 8. VisitedCountry 업데이트
    for (const [countryCode, countryInfo] of visitedCountries) {
      await prisma.visitedCountry.upsert({
        where: {
          userId_countryCode: {
            userId: customer.id,
            countryCode,
          },
        },
        update: {
          visitCount: { increment: 1 },
          lastVisited: startDate,
        },
        create: {
          userId: customer.id,
          countryCode,
          countryName: countryInfo.name,
          visitCount: 1,
          lastVisited: startDate,
          updatedAt: now,
        },
      });
    }

    // 9. AffiliateLead 생성 (판매원 연결)
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
    const normalizedPhone = normalizePhone(customerPhone);

    let managerId: number | null = null;
    if (affiliateProfile.type === 'SALES_AGENT') {
      const agentRelation = await prisma.affiliateRelation.findFirst({
        where: {
          agentId: affiliateProfile.id,
          status: 'ACTIVE',
        },
        select: { managerId: true },
      });
      managerId = agentRelation?.managerId || null;
    } else {
      managerId = affiliateProfile.id;
    }

    const leadData: any = {
      customerName: customerName,
      customerPhone: normalizedPhone,
      status: 'CONVERTED',
      source: 'direct',
      metadata: {
        productCode: product.productCode,
        registeredBy: affiliateProfile.id,
        registeredAt: new Date().toISOString(),
        isCompanion: false,
        isPurchaseCustomer: true,
      },
    };

    if (affiliateProfile.type === 'SALES_AGENT') {
      leadData.agentId = affiliateProfile.id;
      if (managerId) {
        leadData.managerId = managerId;
      }
    } else {
      leadData.managerId = affiliateProfile.id;
    }

    const existingLead = await prisma.affiliateLead.findFirst({
      where: {
        customerPhone: normalizedPhone,
      },
    });

    if (existingLead) {
      await prisma.affiliateLead.update({
        where: { id: existingLead.id },
        data: leadData,
      });
      console.log('기존 AffiliateLead 업데이트:', existingLead.id);
    } else {
      leadData.updatedAt = now;
      const lead = await prisma.affiliateLead.create({
        data: leadData,
      });
      console.log('새 AffiliateLead 생성:', lead.id);
    }


    console.log('\n✅ 구매고객 인증 샘플 고객 생성 완료!');
    console.log('고객 정보:');
    console.log('  이름:', customerName);
    console.log('  전화번호:', customerPhone);
    console.log('  비밀번호: 3800');
    console.log('  상태: purchase_confirmed');
    console.log('  판매원: user1');
    console.log('  상품:', product.productCode);
    console.log('  출발일:', startDate.toISOString().split('T')[0]);
    console.log('  종료일:', endDate.toISOString().split('T')[0]);

  } catch (error) {
    console.error('오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createPurchaseCustomer()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });

