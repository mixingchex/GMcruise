import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getAffiliateOwnershipForUsers } from '@/lib/affiliate/customer-ownership';
import { getCurrentCustomerGroup, CustomerGroup, getCustomerCountByGroup } from '@/lib/customer-journey';
import { logger } from '@/lib/logger';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인
async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) {
    logger.debug('[Admin Customers] No session ID');
    return false;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { role: true },
        },
      },
    });

    if (!session) {
      logger.debug('[Admin Customers] Session not found:', sid);
      return false;
    }

    if (!session.User) {
      logger.debug('[Admin Customers] User not found in session');
      return false;
    }

    const isAdmin = session.User.role === 'admin';
    logger.debug('[Admin Customers] Auth check:', { userId: session.userId, role: session.User.role, isAdmin });
    return isAdmin;
  } catch (error) {
    console.error('[Admin Customers] Auth check error:', error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const sid = cookies().get(SESSION_COOKIE)?.value;
    
    if (!sid) {
      logger.debug('[Admin Customers] No session cookie found');
      return NextResponse.json({ 
        ok: false, 
        error: '인증이 필요합니다. 다시 로그인해 주세요.',
        details: 'No session cookie'
      }, { status: 403 });
    }

    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      console.log('[Admin Customers] Admin check failed for session:', sid);
      return NextResponse.json({ 
        ok: false, 
        error: '인증이 필요합니다. 다시 로그인해 주세요.',
        details: 'Admin check failed'
      }, { status: 403 });
    }

    // URL 파라미터
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all'; // all, active, hibernated, locked
    const certificateType = searchParams.get('certificateType') || 'all'; // all, purchase_confirmed, refunded
    const monthFilter = searchParams.get('monthFilter') || ''; // YYYY-MM 형식
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt, name, tripCount, lastActiveAt
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // asc, desc
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const userType = searchParams.get('userType') || 'all'; // all, trial, regular - 3일 체험 사용자와 일반 사용자 구분
    const managerProfileId = searchParams.get('managerProfileId'); // 점장별 필터링
    const customerGroup = searchParams.get('customerGroup') as CustomerGroup | null; // 고객 그룹 필터: prospects, trial, mall, purchase, refund, passport, manager-customers, agent-customers

    // 연동된 크루즈몰 고객 ID 목록 조회 (중복 제거용)
    // 크루즈 가이드 고객 중 mallUserId가 설정된 고객들의 mallUserId 목록
    const linkedMallUserIds = await prisma.user.findMany({
      where: {
        role: 'user',
        mallUserId: { not: null },
      },
      select: {
        mallUserId: true,
      },
    }).then(users => 
      users
        .map(u => u.mallUserId)
        .filter((id): id is string => id !== null)
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id))
    );

    // 검색 조건 - AND 구조로 시작
    const whereConditions: any[] = [
      // role이 'admin'이 아닌 모든 사용자 표시
      { role: { not: 'admin' } },
      // customerSource 필터링 제거 - 모든 고객 조회 (본사, 대리점장, 랜딩페이지 등 모든 유입 경로 포함)
    ];

    // 3일 체험 사용자와 일반 사용자 구분
    if (userType === 'trial') {
      // 3일 체험 사용자만 조회 (testModeStartedAt이 있는 사용자)
      whereConditions.push({
        testModeStartedAt: { not: null },
      });
    } else if (userType === 'regular') {
      // 일반 사용자만 조회 (testModeStartedAt이 null인 사용자)
      whereConditions.push({
        OR: [
          { testModeStartedAt: null },
          { testModeStartedAt: undefined },
        ],
      });
    }
    // userType === 'all'이면 필터링하지 않음

    // 연동된 크루즈몰 고객은 제외
    if (linkedMallUserIds.length > 0) {
      whereConditions.push({
        NOT: {
          AND: [
            { role: 'community' },
            { id: { in: linkedMallUserIds } },
          ],
        },
      });
    }

    // 검색 조건 추가
    // SQLite 호환: contains는 Prisma가 자동으로 LIKE로 변환하지만, 안전하게 처리
    if (search) {
      whereConditions.push({
        OR: [
          // SQLite에서는 contains가 LIKE로 변환됨
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      });
    }

    // 상태 필터
    if (status === 'active') {
      // 활성 상태: customerStatus가 'active', 'package', 'test'이고, 잠금/동면이 아닌 경우
      // 'test'는 3일 체험 사용자도 포함
      whereConditions.push({
        OR: [
          { customerStatus: { in: ['active', 'package', 'test'] } },
          {
            AND: [
              { customerStatus: null },
              { isHibernated: false },
              { isLocked: false },
            ],
          },
        ],
      });
    } else if (status === 'hibernated') {
      // 동면 상태: customerStatus가 'dormant'이거나 isHibernated가 true인 경우
      whereConditions.push({
        OR: [
          { customerStatus: 'dormant' },
          { isHibernated: true },
        ],
      });
    } else if (status === 'locked') {
      // 잠금 상태: customerStatus가 'locked'이거나 isLocked가 true인 경우
      whereConditions.push({
        OR: [
          { customerStatus: 'locked' },
          { isLocked: true },
        ],
      });
    }

    // 인증서 타입 필터 (all이 아닐 때만 적용)
    if (certificateType && certificateType !== 'all') {
      if (certificateType === 'purchase_confirmed') {
        whereConditions.push({
          customerStatus: 'purchase_confirmed',
        });
      } else if (certificateType === 'refunded') {
        whereConditions.push({
          customerStatus: 'refunded',
        });
      }
    }

    // 월별 필터 (인증서 처리 날짜 기준)
    if (monthFilter && monthFilter.trim() !== '') {
      try {
        const [year, month] = monthFilter.split('-').map(Number);
        if (year && month && !isNaN(year) && !isNaN(month)) {
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0, 23, 59, 59, 999);
          
          console.log('[Admin Customers API] Month filter applied:', {
            monthFilter,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
          
          // metadata에서 인증서 처리 날짜 확인하거나, updatedAt 기준으로 필터링
          // 일단 updatedAt 기준으로 필터링 (인증서 처리 시 updatedAt이 갱신되므로)
          whereConditions.push({
            updatedAt: {
              gte: startDate,
              lte: endDate,
            },
          });
        } else {
          console.warn('[Admin Customers API] Invalid monthFilter format:', monthFilter);
        }
      } catch (monthFilterError: any) {
        console.error('[Admin Customers API] Month filter error:', monthFilterError);
        // 필터 파싱 실패 시 해당 필터 무시
      }
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // 정렬
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'tripCount') {
      orderBy.tripCount = sortOrder;
    } else if (sortBy === 'lastActiveAt') {
      orderBy.lastActiveAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // 전체 개수 조회
    let total = 0;
    try {
      console.log('[Admin Customers API] Where conditions:', JSON.stringify(where, null, 2));
      total = await prisma.user.count({ where });
      console.log('[Admin Customers API] Total customers found:', total);
      
      // 필터 조건이 너무 엄격한지 확인
      if (total === 0 && whereConditions.length > 1) {
        console.warn('[Admin Customers API] No customers found. Checking without filters...');
        const totalWithoutFilters = await prisma.user.count({
          where: { role: { not: 'admin' } },
        });
        console.log('[Admin Customers API] Total customers without filters:', totalWithoutFilters);
      }
    } catch (countError: any) {
      console.error('[Admin Customers API] Count query error:', countError);
      console.error('[Admin Customers API] Count error details:', {
        message: countError?.message,
        code: countError?.code,
      });
      // count 실패 시 기본값 사용
      total = 0;
    }

    // 데이터 조회
    let customers: any[] = [];
    try {
      console.log('[Admin Customers API] Fetching customers with where:', JSON.stringify(where, null, 2));
      customers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        lastActiveAt: true,
        tripCount: true,
        totalTripCount: true,
        isHibernated: true,
        isLocked: true,
        password: true, // 비밀번호 (평문)
        customerStatus: true, // ✅ customerStatus 필드 추가
        customerSource: true, // ✅ customerSource 필드 추가
        testModeStartedAt: true, // 테스트 모드 시작 시간
        currentTripEndDate: true,
        updatedAt: true, // 인증서 처리 날짜 확인용
        metadata: true, // 환불 횟수 등 메타데이터
        mallUserId: true, // 크루즈몰 사용자 ID
        mallNickname: true, // 크루즈몰 닉네임
        kakaoChannelAdded: true, // 카카오 채널 추가 여부
        kakaoChannelAddedAt: true, // 카카오 채널 추가 일시
        pwaGenieInstalledAt: true, // 크루즈가이드 지니 바탕화면 추가 일시
        pwaMallInstalledAt: true, // 크루즈몰 바탕화면 추가 일시
        role: true, // role 추가 (크루즈몰 고객 구분용)
        AffiliateProfile: {
          select: {
            id: true,
            type: true,
            status: true,
            displayName: true,
            nickname: true,
            affiliateCode: true,
            branchLabel: true,
          },
        },
        UserTrip: {
          select: {
            id: true,
            cruiseName: true,
            companionType: true,
            destination: true,
            startDate: true,
            endDate: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        PasswordEvent: {
          select: {
            id: true,
            to: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy,
      skip,
      take: limit,
      });
      console.log('[Admin Customers API] Found customers:', customers.length);
      if (customers.length > 0) {
        console.log('[Admin Customers API] Sample customer:', {
          id: customers[0].id,
          name: customers[0].name,
          phone: customers[0].phone,
          role: customers[0].role,
        });
      }
    } catch (findManyError: any) {
      console.error('[Admin Customers API] FindMany query error:', findManyError);
      console.error('[Admin Customers API] FindMany error details:', {
        message: findManyError?.message,
        code: findManyError?.code,
        meta: findManyError?.meta,
      });
      // 빈 배열 반환하여 계속 진행
      customers = [];
    }

    // 연동된 크루즈몰 고객 정보 조회 (mallUserId가 있는 크루즈 가이드 고객용)
    const mallUserIdsToFetch = customers
      .filter(c => c.mallUserId && c.role === 'user')
      .map(c => parseInt(c.mallUserId!, 10))
      .filter(id => !isNaN(id));
    
    const linkedMallUsers = mallUserIdsToFetch.length > 0
      ? await prisma.user.findMany({
          where: {
            id: { in: mallUserIdsToFetch },
            role: 'community',
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            mallNickname: true,
          },
        })
      : [];
    
    const mallUsersMap = new Map(
      linkedMallUsers.map(mu => [mu.id, mu])
    );

    // 크루즈몰 고객(role: 'community')이 크루즈가이드와 연동되었는지 확인
    // 크루즈몰 고객 ID를 mallUserId로 가진 크루즈가이드 사용자 찾기
    const mallCustomerIds = customers
      .filter(c => c.role === 'community')
      .map(c => c.id.toString());
    
    const mallCustomerPhones = customers
      .filter(c => c.role === 'community' && c.phone)
      .map(c => c.phone!);
    
    const linkedGenieUsers = (mallCustomerIds.length > 0 || mallCustomerPhones.length > 0)
      ? await prisma.user.findMany({
          where: {
            OR: [
              { mallUserId: { in: mallCustomerIds }, role: 'user' },
              { mallUserId: { in: mallCustomerPhones }, role: 'user' },
            ],
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            mallUserId: true,
            UserTrip: {
              select: { id: true },
              take: 1,
            },
          },
        })
      : [];
    
    // 크루즈몰 고객 ID -> 크루즈가이드 사용자 매핑 생성
    const genieUsersMapByMallId = new Map<string, any>();
    linkedGenieUsers.forEach(genieUser => {
      if (genieUser.mallUserId) {
        // ID로 매핑
        const mallUserIdNum = parseInt(genieUser.mallUserId);
        if (!isNaN(mallUserIdNum)) {
          genieUsersMapByMallId.set(mallUserIdNum.toString(), genieUser);
        }
        // phone으로도 매핑 (mallUserId가 phone인 경우)
        genieUsersMapByMallId.set(genieUser.mallUserId, genieUser);
      }
    });
    
    // 크루즈가이드 사용자 ID -> 여행 존재 여부 매핑 생성
    const genieUserHasTripMap = new Map<number, boolean>();
    linkedGenieUsers.forEach(genieUser => {
      // UserTrip이 이미 조회되어 있으면 확인
      if (genieUser.UserTrip && genieUser.UserTrip.length > 0) {
        genieUserHasTripMap.set(genieUser.id, true);
      }
    });

    const preparedCustomers = customers.map((customer) => {
      let mergedCustomer = { ...customer };
      if (customer.mallUserId && customer.role === 'user') {
        const mallUserIdNum = parseInt(customer.mallUserId, 10);
        if (!isNaN(mallUserIdNum)) {
          const linkedMallUser = mallUsersMap.get(mallUserIdNum);
          if (linkedMallUser) {
            mergedCustomer = {
              ...customer,
              name: customer.name || (linkedMallUser as any).name || customer.mallNickname || null,
              phone: customer.phone || (linkedMallUser as any).phone || null,
              email: customer.email || (linkedMallUser as any).email || null,
              mallNickname: customer.mallNickname || (linkedMallUser as any).mallNickname || null,
            };
          }
        }
      }

      let isLinkedForMallCustomer = false;
      let linkedGenieUser = null;
      if (mergedCustomer.role === 'community') {
        linkedGenieUser = genieUsersMapByMallId.get(mergedCustomer.id.toString());
        if (!linkedGenieUser && mergedCustomer.phone) {
          linkedGenieUser = genieUsersMapByMallId.get(mergedCustomer.phone);
        }
        isLinkedForMallCustomer = !!linkedGenieUser;
      }

      let linkedGenieHasTrip = false;
      if (linkedGenieUser) {
        linkedGenieHasTrip = genieUserHasTripMap.has(linkedGenieUser.id);
      }

      const hasTrip = mergedCustomer.UserTrip && mergedCustomer.UserTrip.length > 0;
      const customerStatus = mergedCustomer.customerStatus;
      const customerSource = mergedCustomer.customerSource;

      let customerType: 'cruise-guide' | 'mall' | 'test' | 'admin' | 'mall-admin' | 'prospect' = 'cruise-guide';

      if (customerSource === 'admin') {
        customerType = 'admin';
      } else if (customerSource === 'mall-admin') {
        customerType = 'mall-admin';
      } else if (customerSource === 'mall-signup') {
        customerType = 'mall';
      } else if (customerSource === 'test-guide') {
        customerType = 'test';
      } else if (customerSource === 'cruise-guide') {
        customerType = 'cruise-guide';
      } else if (customerStatus === 'test' || customerStatus === 'test-locked') {
        customerType = 'test';
      } else if (customerStatus === 'excel') {
        customerType = 'prospect';
      } else if (mergedCustomer.mallUserId && mergedCustomer.role === 'user') {
        customerType = 'mall';
      } else if (mergedCustomer.email && mergedCustomer.mallNickname && mergedCustomer.role === 'community') {
        customerType = 'mall';
      } else if (mergedCustomer.name && mergedCustomer.phone && hasTrip) {
        customerType = 'cruise-guide';
      }

      let genieStatus: 'active' | 'package' | 'dormant' | 'locked' | 'test' | 'test-locked' | null = null;

      if (customerType === 'test') {
        if (customerStatus === 'test-locked') {
          genieStatus = 'test-locked';
        } else if (mergedCustomer.testModeStartedAt) {
          const now = new Date();
          const testModeEndAt = new Date(mergedCustomer.testModeStartedAt);
          testModeEndAt.setHours(testModeEndAt.getHours() + 72);
          genieStatus = now > testModeEndAt ? 'test-locked' : 'test';
        } else {
          genieStatus = 'test';
        }
      } else if (customerType === 'prospect') {
        genieStatus = null;
      } else if (linkedGenieHasTrip && mergedCustomer.role === 'community') {
        genieStatus = 'active';
        if (mergedCustomer.isLocked || mergedCustomer.isHibernated || customerStatus === 'locked' || customerStatus === 'dormant') {
          // 비동기 업데이트 (await 없이 실행, 에러는 catch로 처리)
          prisma.user.update({
            where: { id: mergedCustomer.id },
            data: {
              isLocked: false,
              lockedAt: null,
              lockedReason: null,
              isHibernated: false,
              hibernatedAt: null,
              customerStatus: 'active',
              lastActiveAt: new Date(),
            },
          }).catch(error => {
            console.error(`[Admin Customers API] 크루즈몰 사용자 (ID: ${mergedCustomer.id}) 상태 활성화 실패:`, error);
          });
        }
      } else if (customerStatus === 'active' || customerStatus === 'package') {
        genieStatus = customerStatus;
      } else if (customerStatus === 'locked' || mergedCustomer.isLocked) {
        genieStatus = 'locked';
      } else if (customerStatus === 'dormant' || mergedCustomer.isHibernated) {
        genieStatus = 'dormant';
      } else if (hasTrip || linkedGenieHasTrip) {
        genieStatus = 'package';
      } else {
        genieStatus = 'locked';
      }

      const latestPasswordEvent = mergedCustomer.PasswordEvent && mergedCustomer.PasswordEvent.length > 0
        ? mergedCustomer.PasswordEvent[0]
        : null;
      const currentPassword = latestPasswordEvent?.to || null;

      let daysRemaining: number | null = null;
      if (mergedCustomer.currentTripEndDate) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const endDate = new Date(mergedCustomer.currentTripEndDate);
        endDate.setHours(0, 0, 0, 0);
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysRemaining = diffDays;
      }

      return {
        ...mergedCustomer,
        createdAt: mergedCustomer.createdAt.toISOString(),
        lastActiveAt: mergedCustomer.lastActiveAt?.toISOString() || null,
        currentTripEndDate: mergedCustomer.currentTripEndDate?.toISOString() || null,
        status: genieStatus,
        customerType: mergedCustomer.AffiliateProfile ? 'partner' : customerType,
        isMallUser: customerType === 'mall' || (!!mergedCustomer.mallUserId && mergedCustomer.role === 'user'),
        isLinked: (!!mergedCustomer.mallUserId && mergedCustomer.role === 'user') || isLinkedForMallCustomer,
        currentPassword,
        daysRemaining,
        kakaoChannelAdded: mergedCustomer.kakaoChannelAdded || false,
        kakaoChannelAddedAt: mergedCustomer.kakaoChannelAddedAt?.toISOString() || null,
        role: mergedCustomer.role,
        AffiliateProfile: mergedCustomer.AffiliateProfile ? {
          id: mergedCustomer.AffiliateProfile.id,
          type: mergedCustomer.AffiliateProfile.type,
          status: mergedCustomer.AffiliateProfile.status,
          displayName: mergedCustomer.AffiliateProfile.displayName,
          nickname: mergedCustomer.AffiliateProfile.nickname,
          affiliateCode: mergedCustomer.AffiliateProfile.affiliateCode,
          branchLabel: mergedCustomer.AffiliateProfile.branchLabel,
        } : null,
        trips: (mergedCustomer.UserTrip || []).map(trip => ({
          ...trip,
          startDate: trip.startDate?.toISOString() || null,
          endDate: trip.endDate?.toISOString() || null,
        })),
      };
    });

    // 각 고객의 Reservation 정보 조회 (구매 정보 및 여권 상태)
    const customerIds = preparedCustomers.map(c => c.id);
    
    // 방법 1: mainUserId로 직접 조회
    let reservations = customerIds.length > 0 ? await prisma.reservation.findMany({
      where: { mainUserId: { in: customerIds } },
      select: {
        id: true,
        mainUserId: true,
        tripId: true,
        totalPeople: true,
        passportStatus: true,
        createdAt: true,
        Traveler: {
          select: {
            id: true,
            passportNo: true,
            birthDate: true,
            expiryDate: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' }, // 최신 순으로 정렬
    }).catch((error) => {
      console.error('[Admin Customers API] Reservation query error:', error);
      return [];
    }) : [];
    
    // 방법 2는 제거: Reservation은 mainUserId로 직접 조회하는 것이 가장 안정적
    // APIS 관련 로직은 유지하되, Trip 모델 직접 조회는 제거
    
    console.log('[Admin Customers API] Reservations found:', {
      count: reservations.length,
      sample: reservations.slice(0, 3).map(r => ({
        id: r.id,
        mainUserId: r.mainUserId,
        totalPeople: r.totalPeople,
        travelersCount: r.Traveler?.length || 0,
        travelersWithPassport: r.Traveler?.filter(t => t.passportNo)?.length || 0,
      })),
    });

    // 고객별 Reservation 정보 매핑 (최신 예약 기준)
    const reservationMap = new Map<number, any>();
    reservations.forEach(res => {
      // mainUserId가 없는 예약은 건너뜀
      if (!res.mainUserId) return;
      // 이미 있는 경우는 무시 (최신 것만 유지)
      if (!reservationMap.has(res.mainUserId)) {
        reservationMap.set(res.mainUserId, res);
      }
    });

    // 고객별 예약 개수 계산
    const reservationCountMap = new Map<number, number>();
    reservations.forEach(res => {
      const count = reservationCountMap.get(res.mainUserId) || 0;
      reservationCountMap.set(res.mainUserId, count + 1);
    });

    // 고객 데이터에 구매 정보 및 여권 상태 추가
    const customersWithPurchaseInfo = preparedCustomers.map(customer => {
      const latestReservation = reservationMap.get(customer.id);
      const hasReservation = !!latestReservation;
      const reservationCount = reservationCountMap.get(customer.id) || 0;
      
      let passportInfo = null;
      if (latestReservation) {
        const totalPeople = latestReservation.totalPeople || 0;
        const travelersWithPassport = latestReservation.Traveler?.filter(t => t.passportNo && t.passportNo.trim() !== '')?.length || 0;
        const missingCount = Math.max(0, totalPeople - travelersWithPassport);
        
        // 여권 만료 6개월 이내 체크
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
        
        const expiringPassports = latestReservation.Traveler?.filter(t => {
          if (!t.expiryDate) return false;
          const expiryDate = new Date(t.expiryDate);
          return expiryDate <= sixMonthsFromNow && expiryDate >= new Date(); // 6개월 이내 + 아직 만료되지 않음
        }) || [];
        
        const expiredPassports = latestReservation.Traveler?.filter(t => {
          if (!t.expiryDate) return false;
          const expiryDate = new Date(t.expiryDate);
          return expiryDate < new Date(); // 이미 만료됨
        }) || [];
        
        passportInfo = {
          totalPeople,
          travelersWithPassport,
          missingCount,
          expiringCount: expiringPassports.length, // 6개월 이내 만료
          expiredCount: expiredPassports.length, // 이미 만료됨
          expiringPassports: expiringPassports.map(t => ({
            name: `${t.lastName || ''} ${t.firstName || ''}`.trim() || '이름 없음',
            expiryDate: t.expiryDate,
          })),
          expiredPassports: expiredPassports.map(t => ({
            name: `${t.lastName || ''} ${t.firstName || ''}`.trim() || '이름 없음',
            expiryDate: t.expiryDate,
          })),
        };
      }

      return {
        ...customer,
        hasReservation,
        reservationCount,
        passportInfo,
      };
    });

    // 어필리에이트 소유권 정보 조회 (에러 발생 시 빈 Map 반환)
    let ownershipMap = new Map<number, any>();
    try {
      ownershipMap = await getAffiliateOwnershipForUsers(
        customersWithPurchaseInfo.map((customer) => ({
          id: customer.id,
          phone: customer.phone || null,
        })),
      );
    } catch (ownershipError: any) {
      console.error('[Admin Customers API] Ownership query error:', ownershipError);
      console.error('[Admin Customers API] Ownership error details:', {
        message: ownershipError?.message,
        code: ownershipError?.code,
        meta: ownershipError?.meta,
      });
      // 에러 발생 시 빈 Map 사용 (소유권 정보 없이 계속 진행)
      ownershipMap = new Map();
    }

    // 랜딩페이지로 유입된 고객의 점장 소유권 정보 조회
    const customerPhones = customersWithPurchaseInfo
      .map(c => c.phone)
      .filter((phone): phone is string => phone !== null);
    
    const landingPageOwnershipMap = new Map<number, {
      managerProfileId: number;
      managerDisplayName: string | null;
      managerBranchLabel: string | null;
      landingPageId: number;
      landingPageTitle: string | null;
    }>();

    if (customerPhones.length > 0) {
      // 랜딩페이지 등록 정보 조회
      const landingPageRegistrations = await prisma.landingPageRegistration.findMany({
        where: {
          phone: { in: customerPhones },
          userId: { not: null },
          deletedAt: null,
        },
        include: {
          LandingPage: {
            select: {
              id: true,
              title: true,
              adminId: true,
            },
          },
          User: {
            select: {
              id: true,
            },
          },
        },
      });

      // 각 등록에 대해 점장 소유권 확인
      for (const registration of landingPageRegistrations) {
        if (!registration.User) continue;

        // 해당 랜딩페이지가 공유된 점장들 조회
        const sharedLandingPages = await prisma.sharedLandingPage.findMany({
          where: {
            landingPageId: registration.landingPageId,
          },
          include: {
            ManagerProfile: {
              select: {
                id: true,
                displayName: true,
                branchLabel: true,
              },
            },
          },
        });

        for (const shared of sharedLandingPages) {
          if (!landingPageOwnershipMap.has(registration.User.id)) {
            landingPageOwnershipMap.set(registration.User.id, {
              managerProfileId: shared.managerProfileId,
              managerDisplayName: shared.ManagerProfile?.displayName || null,
              managerBranchLabel: shared.ManagerProfile?.branchLabel || null,
              landingPageId: registration.landingPageId,
              landingPageTitle: registration.LandingPage?.title || null,
            });
          }
        }
      }
    }

    // 점장별 필터링 적용
    let filteredCustomers = customersWithPurchaseInfo;
    if (managerProfileId) {
      const managerId = parseInt(managerProfileId, 10);
      if (!isNaN(managerId)) {
        filteredCustomers = customersWithPurchaseInfo.filter(customer => {
          const ownership = ownershipMap.get(customer.id);
          const landingOwnership = landingPageOwnershipMap.get(customer.id);
          
          // AffiliateLead 기반 소유권 확인
          if (ownership) {
            if (ownership.ownerType === 'BRANCH_MANAGER' && ownership.ownerProfileId === managerId) {
              return true;
            }
          }
          
          // 랜딩페이지 기반 소유권 확인
          if (landingOwnership && landingOwnership.managerProfileId === managerId) {
            return true;
          }
          
          return false;
        });
      }
    }

    // 각 고객의 현재 그룹 계산 및 그룹 필터링
    const customersWithGroup = await Promise.all(
      filteredCustomers.map(async (customer) => {
        const ownership = ownershipMap.get(customer.id) || null;
        const landingOwnership = landingPageOwnershipMap.get(customer.id) || null;
        
        // 랜딩페이지 소유권 정보를 affiliateOwnership에 통합
        let finalOwnership = ownership;
        if (landingOwnership && !ownership) {
          // 랜딩페이지로만 유입된 경우
          finalOwnership = {
            ownerType: 'BRANCH_MANAGER' as const,
            ownerProfileId: landingOwnership.managerProfileId,
            ownerName: landingOwnership.managerDisplayName,
            ownerNickname: null,
            ownerAffiliateCode: null,
            ownerBranchLabel: landingOwnership.managerBranchLabel,
            ownerStatus: null,
            ownerPhone: null,
            source: 'landing-page' as const,
            managerProfile: null,
            leadId: null,
            leadStatus: null,
          };
        } else if (landingOwnership && ownership) {
          // 둘 다 있는 경우 랜딩페이지 정보를 우선
          finalOwnership = {
            ...ownership,
            ownerProfileId: landingOwnership.managerProfileId,
            ownerName: landingOwnership.managerDisplayName,
            ownerBranchLabel: landingOwnership.managerBranchLabel,
            source: 'landing-page' as const,
          };
        }

        // 현재 고객 그룹 계산 (에러 처리 포함)
        let currentGroup: CustomerGroup | null = null;
        try {
          currentGroup = await getCurrentCustomerGroup(customer.id);
        } catch (groupError: any) {
          console.error(`[Admin Customers API] Failed to get current group for user ${customer.id}:`, groupError);
          // 그룹 계산 실패 시 기본값 사용
          currentGroup = null;
        }

        return {
          ...customer,
          affiliateOwnership: finalOwnership ? { ...finalOwnership } : null,
          landingPageOwnership: landingOwnership,
          currentGroup, // 현재 그룹 추가
        };
      })
    );

    // 고객 그룹 필터링 (passport는 구매고객 중 여권 정보가 있는/없는 고객)
    // customerGroup이 없거나 'all'이면 필터링하지 않음 (전체 고객 표시)
    const effectiveGroup: CustomerGroup | 'all' | 'passport' | null = customerGroup as CustomerGroup | 'all' | 'passport' | null;
    let customersWithOwnership = customersWithGroup;
    if (effectiveGroup && effectiveGroup !== 'all') {
      try {
        if (effectiveGroup === 'passport') {
          // 여권 관리: 구매고객 중 여권 정보가 있는 고객
          customersWithOwnership = customersWithGroup.filter(
            (c) => {
              const isPurchase = c.currentGroup === 'purchase';
              const hasPassportInfo = c.passportInfo && Object.keys(c.passportInfo).length > 0;
              return isPurchase && hasPassportInfo;
            }
          );
        } else if (effectiveGroup === 'manager-customers') {
          // 대리점장 고객: 소유권이 BRANCH_MANAGER인 고객만 (소스 충돌 방지)
          customersWithOwnership = customersWithGroup.filter(
            (c) => {
              try {
                if (!c.affiliateOwnership) return false;
                // 소유권 타입이 BRANCH_MANAGER인 경우만 필터링
                const isManagerCustomer = c.affiliateOwnership.ownerType === 'BRANCH_MANAGER';
                // 랜딩페이지 소유권도 확인 (랜딩페이지는 대리점장 소유)
                const hasLandingOwnership = c.landingPageOwnership && c.landingPageOwnership.managerProfileId;
                return isManagerCustomer || !!hasLandingOwnership;
              } catch (e) {
                console.error(`[Admin Customers API] Error filtering manager customer ${c.id}:`, e);
                return false; // 에러 발생 시 해당 고객 제외
              }
            }
          );
        } else if (effectiveGroup === 'agent-customers') {
          // 판매원 고객: 소유권이 SALES_AGENT인 고객만 (소스 충돌 방지)
          customersWithOwnership = customersWithGroup.filter(
            (c) => {
              try {
                if (!c.affiliateOwnership) return false;
                // 소유권 타입이 SALES_AGENT인 경우만 필터링
                return c.affiliateOwnership.ownerType === 'SALES_AGENT';
              } catch (e) {
                console.error(`[Admin Customers API] Error filtering agent customer ${c.id}:`, e);
                return false; // 에러 발생 시 해당 고객 제외
              }
            }
          );
        } else if (effectiveGroup === 'prospects') {
          // 잠재고객: 랜딩페이지로 유입된 고객 (landing-page 그룹)
          customersWithOwnership = customersWithGroup.filter(
            (c) => {
              try {
                // currentGroup이 landing-page이거나, 그룹이 없고 customerSource가 없는 경우
                if (c.currentGroup === 'landing-page') {
                  return true;
                }
                if (!c.currentGroup && !c.customerSource) {
                  return true; // 초기 상태는 잠재고객으로 분류
                }
                return false;
              } catch (e) {
                console.error(`[Admin Customers API] Error filtering prospects customer ${c.id}:`, e);
                return false;
              }
            }
          );
        } else {
          // 일반 그룹 필터링
          customersWithOwnership = customersWithGroup.filter(
            (c) => {
              // null 체크 및 그룹 매칭
              if (!c.currentGroup) {
                return false; // 초기 상태는 prospects 그룹으로 분류되므로 여기서는 제외
              }
              return c.currentGroup === effectiveGroup;
            }
          );
        }
      } catch (filterError: any) {
        console.error('[Admin Customers API] Group filter error:', filterError);
        // 필터링 에러 발생 시 전체 고객 반환 (에러 방지)
        customersWithOwnership = customersWithGroup;
      }
    }

    // 점장 목록 조회 (필터링 옵션용)
    const managers = await prisma.affiliateProfile.findMany({
      where: {
        type: 'BRANCH_MANAGER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        branchLabel: true,
        affiliateCode: true,
      },
      orderBy: {
        displayName: 'asc',
      },
    });

    // 그룹별 고객 수 계산 (전체 고객 기준 - 페이지네이션 없이)
    // 주의: groupCounts는 전체 고객을 기준으로 계산해야 하므로, 페이지네이션된 결과가 아닌 전체 고객을 기준으로 계산
    let groupCounts: Record<string, number> = {
      'all': 0,
      'trial': 0,
      'mall': 0,
      'purchase': 0,
      'refund': 0,
      'passport': 0,
      'manager-customers': 0,
      'agent-customers': 0,
      'prospects': 0,
    };
    
    try {
      // 전체 고객 조회 (페이지네이션 없이, 그룹 계산용)
      const allCustomersForCount = await prisma.user.findMany({
        where: {
          role: { not: 'admin' },
        },
        select: {
          id: true,
          customerStatus: true,
          customerSource: true,
          testModeStartedAt: true,
          role: true,
          mallUserId: true,
          Reservation: {
            select: { id: true },
            take: 1,
          },
        },
      });
      
      console.log('[Admin Customers API] Calculating group counts for', allCustomersForCount.length, 'total customers');
      
      // 각 고객의 그룹 계산 및 카운트
      for (const customer of allCustomersForCount) {
        try {
          const group = await getCurrentCustomerGroup(customer.id);
          
          if (group) {
            // 'landing-page'는 CustomerGroup 타입에 없지만 getCurrentCustomerGroup에서 반환할 수 있음
            // 타입 단언을 사용하여 비교
            const groupValue = group as CustomerGroup | 'landing-page';
            if (groupValue === 'landing-page') {
              groupCounts['prospects'] = (groupCounts['prospects'] || 0) + 1;
            } else if (groupCounts.hasOwnProperty(group)) {
              groupCounts[group] = (groupCounts[group] || 0) + 1;
              if (group === 'trial') {
                console.log(`[Admin Customers API] Trial customer found: ID ${customer.id}`);
              }
            }
          } else {
            groupCounts['prospects'] = (groupCounts['prospects'] || 0) + 1;
          }
        } catch (groupError) {
          console.error(`[Admin Customers API] Error calculating group for customer ${customer.id}:`, groupError);
        }
      }
      
      // 전체 고객 수는 모든 그룹의 합
      groupCounts['all'] = allCustomersForCount.length;
      
      // 소유권 기반 그룹 카운트는 별도로 계산 (성능 최적화를 위해 나중에 추가 가능)
      // 현재는 기본 그룹 카운트만 계산
      
    } catch (countError) {
      console.error('[Admin Customers API] Error calculating group counts:', countError);
      // 에러 발생 시 기본값 사용
      groupCounts['all'] = customersWithGroup.length;
    }
    
    console.log('[Admin Customers API] Final group counts:', groupCounts);
    
    // 페이지네이션 적용 (필터링된 고객 목록 기준)
    // 그룹 필터링 후에는 이미 메모리에서 필터링되었으므로 slice만 적용
    const paginatedCustomers = customersWithOwnership.slice(skip, skip + limit);
    
    // 총 개수는 필터링된 고객 목록의 길이
    const filteredTotal = customersWithOwnership.length;
    
    return NextResponse.json({
      ok: true,
      customers: paginatedCustomers,
      managers: managers.map(m => ({
        id: m.id,
        displayName: m.displayName,
        branchLabel: m.branchLabel,
        affiliateCode: m.affiliateCode,
      })),
      groupCounts, // 그룹별 고객 수 추가
      pagination: {
        total: filteredTotal,
        page,
        limit,
        totalPages: Math.ceil(filteredTotal / limit),
      },
    });
  } catch (error: any) {
    console.error('[Admin Customers API] Error:', error);
    console.error('[Admin Customers API] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: error?.code,
      meta: error?.meta,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Prisma 에러인 경우 더 자세한 정보 제공
    if (error?.code) {
      console.error('[Admin Customers API] Prisma error code:', error.code);
      console.error('[Admin Customers API] Prisma error meta:', error.meta);
    }
    
    return NextResponse.json(
      { 
        ok: false, 
        error: '고객 목록을 불러올 수 없습니다.',
        details: process.env.NODE_ENV === 'development' 
          ? {
              message: error instanceof Error ? error.message : String(error),
              code: error?.code,
              meta: error?.meta,
            }
          : undefined
      },
      { status: 500 }
    );
  }
}








