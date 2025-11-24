import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getAffiliateOwnershipForUsers } from '@/lib/affiliate/customer-ownership';

// 관리자 권한 확인
async function checkAdminAuth() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return null;
  }

  // 사용자 role 확인
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, role: true },
  });

  if (!user || user.role !== 'admin') {
    return null;
  }

  return sessionUser;
}

// GET: 사용자 상세 정보 조회
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(params.userId);
    if (isNaN(userId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // 사용자 정보 조회 (비밀번호 이력 포함)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        lastActiveAt: true,
        isLocked: true,
        lockedAt: true,
        lockedReason: true,
        isHibernated: true,
        hibernatedAt: true,
        customerStatus: true,
        testModeStartedAt: true,
        adminMemo: true,
        loginCount: true,
        tripCount: true,
        mallUserId: true,
        mallNickname: true,
        kakaoChannelAdded: true,
        kakaoChannelAddedAt: true,
        genieStatus: true,
        genieLinkedAt: true,
        role: true,
        UserTrip: {
          select: {
            id: true,
            cruiseName: true,
            companionType: true,
            destination: true,
            startDate: true,
            endDate: true,
            nights: true,
            days: true,
            visitCount: true,
            status: true,
            createdAt: true,
            productId: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        PasswordEvent: {
          select: {
            id: true,
            from: true,
            to: true,
            reason: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // API 응답에서 Trip을 trips로 변환하고, 날짜를 ISO 문자열로 변환
    // 가장 최근 비밀번호 변경 이력에서 'to' 값을 현재 비밀번호로 사용
    const latestPasswordEvent = user.PasswordEvent && user.PasswordEvent.length > 0 
      ? user.PasswordEvent[0] 
      : null;
    const currentPassword = latestPasswordEvent?.to || null;

    // 명시적으로 저장된 상태가 있으면 사용, 없으면 계산
    const resolvedStatus = user.customerStatus || (
      user.isLocked 
        ? 'locked' 
        : user.isHibernated 
        ? 'dormant' 
        : (user.UserTrip && user.UserTrip.length > 0) 
        ? 'package' 
        : 'active'
    );

    // 본인 여행 목록 (Reservation 및 Traveler 정보는 별도 조회)
    let ownTrips: any[] = [];
    try {
      ownTrips = await Promise.all((user.UserTrip || []).map(async (trip) => {
      // UserTrip의 productId로 CruiseProduct를 찾고, 그 productCode로 Trip을 찾아 Reservation 조회
      let reservations: any[] = [];
      if (trip.productId) {
        try {
          const product = await prisma.cruiseProduct.findUnique({
            where: { id: trip.productId },
            select: { productCode: true },
          });
          if (product?.productCode) {
            const tripRecord = await prisma.trip.findFirst({
              where: { productCode: product.productCode },
              select: { id: true },
            });
            if (tripRecord) {
              try {
                // mainUserId로 먼저 시도
                let res: any[] = [];
                try {
                  res = await prisma.reservation.findMany({
                    where: { 
                      tripId: tripRecord.id, 
                      mainUserId: userId 
                    },
                    select: {
                      id: true,
                      tripId: true,
                      totalPeople: true,
                      passportStatus: true,
                      Traveler: {
                        select: {
                          id: true,
                          engGivenName: true,
                          engSurname: true,
                          korName: true,
                          passportNo: true,
                          birthDate: true,
                          expiryDate: true,
                        },
                      },
                    },
                    orderBy: { id: 'desc' },
                  });
                } catch (firstQueryError: any) {
                  console.warn('[Admin Get User] First reservation query failed for trip:', trip.id, {
                    error: firstQueryError?.message,
                    code: firstQueryError?.code,
                  });
                  // 첫 번째 쿼리가 실패해도 계속 진행
                }
                
                // mainUserId로 찾지 못한 경우 tripId만으로 조회
                if (res.length === 0) {
                  try {
                    res = await prisma.reservation.findMany({
                      where: { tripId: tripRecord.id },
                      select: {
                        id: true,
                        tripId: true,
                        totalPeople: true,
                        passportStatus: true,
                        Traveler: {
                          select: {
                            id: true,
                            engGivenName: true,
                            engSurname: true,
                            korName: true,
                            passportNo: true,
                            birthDate: true,
                            expiryDate: true,
                          },
                        },
                      },
                      orderBy: { id: 'desc' },
                    });
                  } catch (secondQueryError: any) {
                    console.warn('[Admin Get User] Second reservation query failed for trip:', trip.id, {
                      error: secondQueryError?.message,
                      code: secondQueryError?.code,
                    });
                    // 두 번째 쿼리도 실패하면 빈 배열 사용
                    res = [];
                  }
                }
                
                reservations = res || [];
              } catch (reservationError: any) {
                console.error('[Admin Get User] Reservation query error for trip:', trip.id, {
                  error: reservationError?.message,
                  code: reservationError?.code,
                  meta: reservationError?.meta,
                  stack: reservationError?.stack?.substring(0, 200),
                });
                // 에러가 발생해도 빈 배열로 계속 진행
                reservations = [];
              }
            }
          }
        } catch (error) {
          console.error('[Admin Get User] Failed to fetch reservations for trip:', trip.id, error);
        }
      }
      
      // Trip 모델에서 googleFolderId와 spreadsheetId 가져오기
      let tripGoogleFolderId = null;
      let tripSpreadsheetId = null;
      if (trip.productId) {
        try {
          const product = await prisma.cruiseProduct.findUnique({
            where: { id: trip.productId },
            select: { productCode: true },
          });
          if (product?.productCode) {
            const tripRecord = await prisma.trip.findFirst({
              where: { productCode: product.productCode },
              select: {
                googleFolderId: true,
                spreadsheetId: true,
              },
            });
            if (tripRecord) {
              tripGoogleFolderId = tripRecord.googleFolderId;
              tripSpreadsheetId = tripRecord.spreadsheetId;
            }
          }
        } catch (tripInfoError: any) {
          console.warn('[Admin Get User] Failed to fetch trip info for UserTrip:', trip.id, tripInfoError?.message);
        }
      }
      
      return {
        ...trip,
        startDate: trip.startDate?.toISOString() || null,
        endDate: trip.endDate?.toISOString() || null,
        createdAt: trip.createdAt?.toISOString() || null,
        googleFolderId: tripGoogleFolderId,
        spreadsheetId: tripSpreadsheetId,
        Reservation: reservations.map((res: any) => ({
          ...res,
          Traveler: res.Traveler || [],
        })),
        ownerType: 'own' as const, // 본인 여행 표시
      };
      }));
    } catch (tripsError: any) {
      console.error('[Admin Get User] Failed to fetch own trips:', tripsError);
      ownTrips = [];
    }

    // 연동된 사용자의 여행도 조회
    let linkedUserTrips: any[] = [];
    
    // 크루즈가이드 사용자인 경우 연동된 크루즈몰 사용자의 여행 조회
    if (user.role === 'user' && user.mallUserId) {
      try {
        const mallUserIdNum = parseInt(user.mallUserId);
        let linkedMallUserId = null;
        
        if (!isNaN(mallUserIdNum)) {
          linkedMallUserId = mallUserIdNum;
        } else {
          // phone으로 찾기
          const mallUser = await prisma.user.findFirst({
            where: {
              phone: user.mallUserId,
              role: 'community',
            },
            select: { id: true },
          });
          if (mallUser) {
            linkedMallUserId = mallUser.id;
          }
        }
        
        if (linkedMallUserId) {
          const linkedTrips = await prisma.userTrip.findMany({
            where: { userId: linkedMallUserId },
            select: {
              id: true,
              cruiseName: true,
              companionType: true,
              destination: true,
              startDate: true,
              endDate: true,
              nights: true,
              days: true,
              visitCount: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          });
          
          linkedUserTrips = linkedTrips.map(trip => ({
            ...trip,
            startDate: trip.startDate?.toISOString() || null,
            endDate: trip.endDate?.toISOString() || null,
            createdAt: trip.createdAt?.toISOString() || null,
            ownerType: 'linked_mall' as const, // 연동된 크루즈몰 사용자 여행 표시
          }));
        }
      } catch (error) {
        console.error('[Admin Get User] Failed to fetch linked mall user trips:', error);
      }
    }
    
    // 크루즈몰 사용자인 경우 연동된 크루즈가이드 사용자의 여행 조회
    if (user.role === 'community') {
      try {
        // ID 또는 phone으로 연동된 크루즈가이드 사용자 찾기
        const genieUser = await prisma.user.findFirst({
          where: {
            OR: [
              { mallUserId: user.id.toString(), role: 'user' },
              ...(user.phone ? [{ mallUserId: user.phone, role: 'user' }] : []),
            ],
          },
          select: { id: true },
        });
        
        if (genieUser) {
          const linkedTrips = await prisma.userTrip.findMany({
            where: { userId: genieUser.id },
            select: {
              id: true,
              cruiseName: true,
              companionType: true,
              destination: true,
              startDate: true,
              endDate: true,
              nights: true,
              days: true,
              visitCount: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          });
          
          linkedUserTrips = linkedTrips.map(trip => ({
            ...trip,
            startDate: trip.startDate?.toISOString() || null,
            endDate: trip.endDate?.toISOString() || null,
            createdAt: trip.createdAt?.toISOString() || null,
            ownerType: 'linked_genie' as const, // 연동된 크루즈가이드 사용자 여행 표시
          }));
        }
      } catch (error) {
        console.error('[Admin Get User] Failed to fetch linked genie user trips:', error);
      }
    }

    // 본인 여행 + 연동된 사용자 여행 합치기 (날짜순 정렬)
    let allTrips: any[] = [];
    try {
      allTrips = [...ownTrips, ...linkedUserTrips].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // 최신순
      });
    } catch (sortError: any) {
      console.error('[Admin Get User] Failed to sort trips:', sortError);
      allTrips = [...ownTrips, ...linkedUserTrips];
    }

    let affiliateOwnership = null;
    try {
      const ownershipMap = await getAffiliateOwnershipForUsers([{ id: user.id, phone: user.phone }]);
      affiliateOwnership = ownershipMap.get(user.id) ?? null;
    } catch (ownershipError: any) {
      console.error('[Admin Get User] Failed to fetch ownership:', ownershipError);
    }

    // APIS 정보 조회 (Trip 모델에서 - UserTrip의 productId로 CruiseProduct를 찾고, 그 productCode로 Trip을 찾음)
    let apisInfo = null;
    if (user.UserTrip && user.UserTrip.length > 0) {
      const latestTrip = user.UserTrip[0];
      if (latestTrip.productId) {
        try {
          // CruiseProduct에서 productCode 가져오기
          const product = await prisma.cruiseProduct.findUnique({
            where: { id: latestTrip.productId },
            select: { productCode: true },
          });
          
          if (product && product.productCode) {
            // Trip 모델에서 googleFolderId와 spreadsheetId 조회
            const tripRecord = await prisma.trip.findFirst({
              where: { productCode: product.productCode },
              select: {
                googleFolderId: true,
                spreadsheetId: true,
                id: true,
              },
            });
            if (tripRecord) {
              apisInfo = {
                spreadsheetId: tripRecord.spreadsheetId,
                googleFolderId: tripRecord.googleFolderId,
                tripId: tripRecord.id,
              };
            }
          }
        } catch (error) {
          console.error('[Admin Get User] Failed to fetch APIS info:', error);
        }
      }
    }

    // 환불 이력 조회 (CertificateApproval에서 refundAmount가 있는 것들)
    let refundHistory: any[] = [];
    try {
      const refunds = await prisma.certificateApproval.findMany({
        where: {
          customerId: user.id,
          certificateType: 'refund',
          refundAmount: { not: null },
        },
        select: {
          id: true,
          refundAmount: true,
          refundDate: true,
          productName: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      refundHistory = refunds.map(refund => ({
        id: refund.id,
        amount: refund.refundAmount || 0,
        reason: refund.metadata && typeof refund.metadata === 'object' && 'reason' in refund.metadata 
          ? String(refund.metadata.reason) 
          : '환불 처리',
        createdAt: refund.createdAt.toISOString(),
        productName: refund.productName,
        tripId: refund.metadata && typeof refund.metadata === 'object' && 'tripId' in refund.metadata
          ? Number(refund.metadata.tripId)
          : null,
      }));
    } catch (error) {
      console.error('[Admin Get User] Failed to fetch refund history:', error);
    }

    // 모든 trips에서 Reservation을 평탄화하여 reservations 배열 생성
    let allReservations: any[] = [];
    try {
      allTrips.forEach((trip: any) => {
        if (trip.Reservation && Array.isArray(trip.Reservation)) {
          allReservations.push(...trip.Reservation);
        }
      });
    } catch (reservationsError: any) {
      console.error('[Admin Get User] Failed to flatten reservations:', reservationsError);
      allReservations = [];
    }

    let userResponse: any;
    try {
      userResponse = {
        ...user,
        trips: allTrips, // 본인 여행 + 연동된 사용자 여행
        reservations: allReservations, // 모든 예약 정보 (여권 기록 포함)
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        lastActiveAt: user.lastActiveAt?.toISOString() || null,
        lockedAt: user.lockedAt?.toISOString() || null,
        isHibernated: user.isHibernated || false,
        hibernatedAt: user.hibernatedAt?.toISOString() || null,
        testModeStartedAt: user.testModeStartedAt?.toISOString() || null,
        adminMemo: user.adminMemo || null,
        currentPassword: currentPassword, // 현재 비밀번호 (평문)
        resolvedStatus: resolvedStatus, // 해결된 상태 (명시적으로 저장된 상태 우선)
        kakaoChannelAdded: user.kakaoChannelAdded || false,
        kakaoChannelAddedAt: user.kakaoChannelAddedAt?.toISOString() || null,
        genieStatus: user.genieStatus || null,
        genieLinkedAt: user.genieLinkedAt?.toISOString() || null,
        role: user.role || 'user',
        passwordEvents: (user.PasswordEvent || []).map((event: any) => ({
          ...event,
          createdAt: event.createdAt?.toISOString() || new Date().toISOString(),
        })),
        affiliateOwnership: affiliateOwnership ? { ...affiliateOwnership } : null,
        apisInfo,
        refundHistory,
      };
    } catch (responseError: any) {
      console.error('[Admin Get User] Failed to build user response:', responseError);
      // 기본 응답 생성
      userResponse = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        lastActiveAt: user.lastActiveAt?.toISOString() || null,
        isLocked: user.isLocked || false,
        isHibernated: user.isHibernated || false,
        customerStatus: user.customerStatus,
        role: user.role || 'user',
        trips: [],
        reservations: [],
        currentPassword: currentPassword,
        resolvedStatus: resolvedStatus,
        passwordEvents: [],
        affiliateOwnership: null,
        apisInfo: null,
        refundHistory: [],
      };
    }
    
    // 크루즈가이드 사용자인 경우 연동된 크루즈몰 사용자 정보 조회
    let linkedMallUser = null;
    if (user.role === 'user' && user.mallUserId) {
      try {
        // mallUserId가 숫자면 ID로, 아니면 phone으로 찾기
        const mallUserIdNum = parseInt(user.mallUserId);
        let mallUser = null;
        
        if (!isNaN(mallUserIdNum)) {
          // 숫자면 ID로 찾기
          mallUser = await prisma.user.findUnique({
            where: { id: mallUserIdNum },
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              password: true,
              createdAt: true,
              PasswordEvent: {
                select: {
                  id: true,
                  from: true,
                  to: true,
                  reason: true,
                  createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          });
        }
        
        // ID로 못 찾았거나 mallUserId가 숫자가 아니면 phone으로 찾기
        if (!mallUser) {
          mallUser = await prisma.user.findFirst({
            where: {
              phone: user.mallUserId,
              role: 'community', // 크루즈몰 사용자는 community 역할
            },
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              password: true,
              createdAt: true,
              PasswordEvent: {
                select: {
                  id: true,
                  from: true,
                  to: true,
                  reason: true,
                  createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          });
        }
        
        if (mallUser) {
          // 최신 비밀번호 가져오기 (PasswordEvent 우선, 없으면 user.password)
          const latestPasswordEvent = mallUser.PasswordEvent && mallUser.PasswordEvent.length > 0 
            ? mallUser.PasswordEvent[0] 
            : null;
          const currentPassword = latestPasswordEvent?.to || mallUser.password || null;
          
          linkedMallUser = {
            id: mallUser.id,
            name: mallUser.name,
            phone: mallUser.phone,
            email: mallUser.email,
            role: mallUser.role,
            createdAt: mallUser.createdAt.toISOString(),
            currentPassword: currentPassword, // 비밀번호 추가
          };
        }
      } catch (error) {
        console.error('[Admin Get User] Failed to fetch linked mall user:', error);
      }
    }
    
    // 크루즈몰 사용자인 경우 연동된 크루즈가이드 사용자 정보 조회
    let linkedGenieUser = null;
    if (user.role === 'community') {
      try {
        // ID 또는 phone으로 연동된 크루즈가이드 사용자 찾기
        const genieUser = await prisma.user.findFirst({
          where: {
            OR: [
              { mallUserId: user.id.toString(), role: 'user' },
              ...(user.phone ? [{ mallUserId: user.phone, role: 'user' }] : []),
            ],
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            password: true,
            genieStatus: true,
            genieLinkedAt: true,
            createdAt: true,
            PasswordEvent: {
              select: {
                id: true,
                from: true,
                to: true,
                reason: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });
        
        if (genieUser) {
          // 최신 비밀번호 가져오기 (PasswordEvent 우선, 없으면 user.password)
          const latestPasswordEvent = genieUser.PasswordEvent && genieUser.PasswordEvent.length > 0 
            ? genieUser.PasswordEvent[0] 
            : null;
          const currentPassword = latestPasswordEvent?.to || genieUser.password || null;
          
          linkedGenieUser = {
            id: genieUser.id,
            name: genieUser.name,
            phone: genieUser.phone,
            email: genieUser.email,
            genieStatus: genieUser.genieStatus,
            genieLinkedAt: genieUser.genieLinkedAt?.toISOString() || null,
            createdAt: genieUser.createdAt.toISOString(),
            currentPassword: currentPassword, // 비밀번호 추가
          };
        }
      } catch (error) {
        console.error('[Admin Get User] Failed to fetch linked genie user:', error);
      }
    }
    
    // PassportSubmission 정보 조회
    let passportSubmissions: any[] = [];
    try {
      const submissions = await prisma.passportSubmission.findMany({
        where: { userId },
        include: {
          PassportSubmissionGuest: {
            orderBy: { groupNumber: 'asc' },
          },
          UserTrip: {
            select: {
              id: true,
              cruiseName: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      passportSubmissions = submissions.map(sub => ({
        id: sub.id,
        token: sub.token,
        isSubmitted: sub.isSubmitted,
        submittedAt: sub.submittedAt?.toISOString() || null,
        driveFolderUrl: sub.driveFolderUrl,
        createdAt: sub.createdAt.toISOString(),
        tokenExpiresAt: sub.tokenExpiresAt?.toISOString() || null,
        guests: sub.PassportSubmissionGuest.map(g => ({
          id: g.id,
          groupNumber: g.groupNumber,
          name: g.name,
          phone: g.phone,
          passportNumber: g.passportNumber,
          nationality: g.nationality,
          dateOfBirth: g.dateOfBirth?.toISOString() || null,
          passportExpiryDate: g.passportExpiryDate?.toISOString() || null,
        })),
        trip: sub.UserTrip ? {
          id: sub.UserTrip.id,
          cruiseName: sub.UserTrip.cruiseName,
          startDate: sub.UserTrip.startDate?.toISOString() || null,
          endDate: sub.UserTrip.endDate?.toISOString() || null,
        } : null,
      }));
    } catch (error) {
      console.error('[Admin Get User] Failed to fetch passport submissions:', error);
    }

    const userResponseWithLinks = {
      ...userResponse,
      linkedMallUser,
      linkedGenieUser,
      passportSubmissions,
    };
    
    // UserTrip 필드 제거 (trips로 변환했으므로)
    delete (userResponseWithLinks as any).UserTrip;
    // PasswordEvent 필드 제거 (passwordEvents로 변환했으므로)
    delete (userResponseWithLinks as any).PasswordEvent;

    return NextResponse.json({ ok: true, user: userResponseWithLinks });
  } catch (error) {
    console.error('[Admin Get User] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode = (error as any)?.code;
    const errorMeta = (error as any)?.meta;
    console.error('[Admin Get User] Error details:', { 
      errorMessage, 
      errorStack, 
      errorCode,
      errorMeta,
      userId: params.userId 
    });
    
    // Prisma 에러인 경우 더 자세한 정보 제공
    if (errorCode) {
      console.error('[Admin Get User] Prisma error code:', errorCode);
      console.error('[Admin Get User] Prisma error meta:', errorMeta);
    }
    
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Failed to fetch user',
        details: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          code: errorCode,
          meta: errorMeta,
        } : undefined
      },
      { status: 500 }
    );
  }
}

// PATCH: 사용자 정보 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(params.userId);
    if (isNaN(userId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, phone, email, adminMemo, status, tripCount, autoIncrementTripCount, mallUserId, mallNickname, linkedStatus, genieStatus, currentTripEndDate } = body;

    // 기존 사용자 정보 조회
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isLocked: true,
        isHibernated: true,
        tripCount: true,
        UserTrip: {
          select: { id: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { ok: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // 업데이트할 데이터 준비
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (email !== undefined) updateData.email = email || null;
    if (adminMemo !== undefined) updateData.adminMemo = adminMemo || null;
    if (mallUserId !== undefined) updateData.mallUserId = mallUserId || null;
    if (mallNickname !== undefined) updateData.mallNickname = mallNickname || null;
    if (currentTripEndDate !== undefined) {
      updateData.currentTripEndDate = currentTripEndDate ? new Date(currentTripEndDate) : null;
      // 최신 UserTrip의 endDate도 업데이트
      if (currentTripEndDate && existingUser.UserTrip && existingUser.UserTrip.length > 0) {
        const latestTripId = existingUser.UserTrip[0].id;
        await prisma.userTrip.update({
          where: { id: latestTripId },
          data: { endDate: new Date(currentTripEndDate) },
        });
      }
    }
    
    // tripCount: 수동으로 입력한 값이 있으면 우선 적용
    const hasManualTripCount = tripCount !== undefined && tripCount !== null;
    if (hasManualTripCount) {
      updateData.tripCount = parseInt(tripCount) || 0;
    }

    // 상태 변경 처리 (linkedStatus와 genieStatus 우선 처리)
    if (linkedStatus !== undefined || genieStatus !== undefined || status !== undefined) {
      const previousStatus = existingUser.isLocked 
        ? 'locked' 
        : existingUser.isHibernated 
        ? 'dormant' 
        : (existingUser.UserTrip && existingUser.UserTrip.length > 0) 
        ? 'package' 
        : 'active';

      // genieStatus가 있으면 우선 사용 (지니 상태)
      const statusToUse = genieStatus !== undefined ? genieStatus : status;

      if (statusToUse === 'locked') {
        // 잠금 상태로 변경
        updateData.isLocked = true;
        updateData.lockedAt = new Date();
        updateData.lockedReason = updateData.lockedReason || '관리자에 의해 잠금';
        updateData.isHibernated = false;
        updateData.hibernatedAt = null;
        // customerStatus에 지니 상태 저장 (mallUserId가 있으면 크루즈몰 고객)
        updateData.customerStatus = 'locked';
        // tripCount를 명시적으로 변경하지 않으면 현재 값 유지
        if (!hasManualTripCount) {
          updateData.tripCount = existingUser.tripCount;
        }
      } else if (statusToUse === 'dormant') {
        // 동면 상태로 변경
        updateData.isHibernated = true;
        updateData.hibernatedAt = new Date();
        updateData.isLocked = false;
        updateData.lockedAt = null;
        updateData.lockedReason = null;
        updateData.customerStatus = 'dormant';
        // tripCount를 명시적으로 변경하지 않으면 현재 값 유지
        if (!hasManualTripCount) {
          updateData.tripCount = existingUser.tripCount;
        }
      } else if (statusToUse === 'active' || statusToUse === 'package') {
        // 활성/패키지 상태로 변경
        updateData.isLocked = false;
        updateData.lockedAt = null;
        updateData.lockedReason = null;
        updateData.isHibernated = false;
        updateData.hibernatedAt = null;
        // 명시적으로 설정한 상태 저장
        updateData.customerStatus = statusToUse;

        // tripCount를 명시적으로 변경하지 않은 경우 자동 증가 로직 실행
        if (!hasManualTripCount) {
          // 같은 상태로 변경하는 경우는 자동 증가 안 함
          if (statusToUse === previousStatus) {
            updateData.tripCount = existingUser.tripCount;
          }
          // 잠금이나 동면에서 활성/패키지로 변경 시 여행 횟수 증가 (자동화)
          else if ((previousStatus === 'locked' || previousStatus === 'dormant') && statusToUse !== previousStatus) {
            updateData.tripCount = existingUser.tripCount + 1;
          }
          // 활성 ↔ 패키지 변경 시 여행 횟수 증가 (자동화)
          else if ((previousStatus === 'active' && statusToUse === 'package') || (previousStatus === 'package' && statusToUse === 'active')) {
            updateData.tripCount = existingUser.tripCount + 1;
          } else {
            // 그 외의 경우는 현재 값 유지
            updateData.tripCount = existingUser.tripCount;
          }
        }
      } else if (statusToUse === 'test' || statusToUse === 'test-locked') {
        // 테스트 상태
        updateData.customerStatus = statusToUse;
        if (statusToUse === 'test-locked') {
          updateData.isLocked = true;
          updateData.lockedAt = new Date();
          updateData.lockedReason = updateData.lockedReason || '테스트 잠금';
        } else {
          updateData.isLocked = false;
          updateData.lockedAt = null;
          updateData.lockedReason = null;
        }
        updateData.isHibernated = false;
        updateData.hibernatedAt = null;
      } else if (statusToUse === 'excel') {
        // 잠재고객 상태
        updateData.customerStatus = 'excel';
        updateData.isLocked = false;
        updateData.lockedAt = null;
        updateData.lockedReason = null;
        updateData.isHibernated = false;
        updateData.hibernatedAt = null;
      }
    }

    // 사용자 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        lastActiveAt: true,
        isLocked: true,
        isHibernated: true,
        tripCount: true,
        customerStatus: true,
        testModeStartedAt: true,
        adminMemo: true,
        lockedAt: true,
        lockedReason: true,
        hibernatedAt: true,
        loginCount: true,
        mallUserId: true,
        mallNickname: true,
        UserTrip: {
          select: {
            id: true,
            cruiseName: true,
            companionType: true,
            destination: true,
            startDate: true,
            endDate: true,
            nights: true,
            days: true,
            visitCount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        PasswordEvent: {
          select: {
            id: true,
            from: true,
            to: true,
            reason: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    // 응답 형식을 GET과 동일하게 맞춤 (수동으로 저장한 값 그대로 반환)
    // 가장 최근 비밀번호 변경 이력에서 'to' 값을 현재 비밀번호로 사용
    const latestPasswordEvent = updatedUser.PasswordEvent && updatedUser.PasswordEvent.length > 0 
      ? updatedUser.PasswordEvent[0] 
      : null;
    const currentPassword = latestPasswordEvent?.to || null;

    // 명시적으로 저장된 상태가 있으면 사용, 없으면 계산
    const resolvedStatus = updatedUser.customerStatus || (
      updatedUser.isLocked 
        ? 'locked' 
        : updatedUser.isHibernated 
        ? 'dormant' 
        : (updatedUser.UserTrip && updatedUser.UserTrip.length > 0) 
        ? 'package' 
        : 'active'
    );

    const userResponse = {
      ...updatedUser,
      trips: (updatedUser.UserTrip || []).map(trip => ({
        ...trip,
        startDate: trip.startDate?.toISOString() || null,
        endDate: trip.endDate?.toISOString() || null,
        createdAt: trip.createdAt?.toISOString() || null,
      })),
      currentPassword: currentPassword, // 현재 비밀번호 (평문)
      resolvedStatus: resolvedStatus, // 해결된 상태 (명시적으로 저장된 상태 우선)
      passwordEvents: (updatedUser.PasswordEvent || []).map(event => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
      createdAt: updatedUser.createdAt.toISOString(),
      lastActiveAt: updatedUser.lastActiveAt?.toISOString() || null,
      lockedAt: updatedUser.lockedAt?.toISOString() || null,
      hibernatedAt: updatedUser.hibernatedAt?.toISOString() || null,
      testModeStartedAt: updatedUser.testModeStartedAt?.toISOString() || null,
    };
    
    // UserTrip, PasswordEvent 필드 제거
    delete (userResponse as any).UserTrip;
    delete (userResponse as any).PasswordEvent;

    return NextResponse.json({ ok: true, user: userResponse });
  } catch (error) {
    console.error('[Admin Update User] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Failed to update user',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE: 사용자 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(params.userId);
    if (isNaN(userId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // 관리자 자신은 삭제할 수 없도록 체크
    if (userId === admin.id) {
      return NextResponse.json(
        { ok: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // 다른 관리자 계정은 삭제할 수 없도록 체크 (선택사항)
    if (user.role === 'admin' && userId !== admin.id) {
      return NextResponse.json(
        { ok: false, error: 'Cannot delete another admin account' },
        { status: 403 }
      );
    }

    // 완전한 데이터베이스 삭제를 위해 Foreign Key 제약 조건을 일시적으로 비활성화하고
    // 모든 관련 데이터를 명시적으로 삭제
    try {
      // Foreign Key 제약 조건 비활성화
      await prisma.$executeRaw`PRAGMA foreign_keys = OFF`;
      
      // 모든 관련 데이터 삭제 (Cascade delete가 없는 관계들)
      const deleteQueries = [
        // Admin 관련
        `DELETE FROM AdminActionLog WHERE adminId = ${userId} OR targetUserId = ${userId}`,
        `DELETE FROM AdminMessage WHERE adminId = ${userId}`,
        `UPDATE AdminMessage SET userId = NULL WHERE userId = ${userId}`,
        
        // 사용자 활동 데이터
        `DELETE FROM RePurchaseTrigger WHERE userId = ${userId}`,
        `DELETE FROM ChatHistory WHERE userId = ${userId}`,
        `DELETE FROM ChecklistItem WHERE userId = ${userId}`,
        `DELETE FROM Expense WHERE userId = ${userId}`,
        `DELETE FROM FeatureUsage WHERE userId = ${userId}`,
        `DELETE FROM UserActivity WHERE userId = ${userId}`,
        `DELETE FROM UserSchedule WHERE userId = ${userId}`,
        `DELETE FROM VisitedCountry WHERE userId = ${userId}`,
        `DELETE FROM MapTravelRecord WHERE userId = ${userId}`,
        `DELETE FROM MarketingInsight WHERE userId = ${userId}`,
        `DELETE FROM PushSubscription WHERE userId = ${userId}`,
        `DELETE FROM NotificationLog WHERE userId = ${userId}`,
        `DELETE FROM UserMessageRead WHERE userId = ${userId}`,
        `DELETE FROM LoginLog WHERE userId = ${userId}`,
        `DELETE FROM PasswordEvent WHERE userId = ${userId}`,
        `DELETE FROM Session WHERE userId = ${userId}`,
        `DELETE FROM TravelDiaryEntry WHERE userId = ${userId}`,
        
        // 여행 관련 (Cascade delete가 설정되어 있지만 명시적으로 삭제)
        `DELETE FROM Trip WHERE userId = ${userId}`,
        
        // 관리자 메시지 및 예약 메시지
        `DELETE FROM ScheduledMessage WHERE adminId = ${userId}`,
        `DELETE FROM EmailAddressBook WHERE adminId = ${userId}`,
        
        // 크루즈몰 컨텐츠는 userId를 null로 설정하여 보존
        `UPDATE ProductInquiry SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE ProductView SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE CommunityPost SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE CommunityComment SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE CruiseReview SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE ChatBotSession SET userId = NULL WHERE userId = ${userId}`,
      ];
      
      // 모든 삭제 쿼리 실행
      for (const query of deleteQueries) {
        try {
          await prisma.$executeRawUnsafe(query);
        } catch (e: any) {
          // 일부 테이블이 존재하지 않을 수 있으므로 에러를 무시하고 계속 진행
          console.warn(`[Admin Delete User] Query warning: ${query.substring(0, 60)}... - ${e?.message}`);
        }
      }
      
      // 사용자 삭제
      await prisma.$executeRawUnsafe(`DELETE FROM User WHERE id = ${userId}`);
      
      // Foreign Key 제약 조건 재활성화
      await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
      
      console.log(`[Admin Delete User] User ${userId} and all related data deleted successfully`);
    } catch (deleteError: any) {
      // Foreign Key 제약 조건 재활성화 (에러 발생 시에도)
      try {
        await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
      } catch (e) {
        console.error('[Admin Delete User] Failed to re-enable foreign keys:', e);
      }
      
      throw deleteError;
    }

    return NextResponse.json({ 
      ok: true, 
      message: `User ${user.name || userId} has been deleted successfully` 
    });
  } catch (error) {
    console.error('[Admin Delete User] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Foreign key constraint 오류 처리
    if (errorMessage.includes('foreign key constraint') || errorMessage.includes('FOREIGN KEY')) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Cannot delete user due to related data. Please remove related records first.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        ok: false, 
        error: 'Failed to delete user',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
