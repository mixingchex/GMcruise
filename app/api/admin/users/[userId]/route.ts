export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAuth } from '@/lib/auth';

// 고객 상세 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const auth = await checkAdminAuth();

    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        Reservation: {
          include: {
            Traveler: true,
            Trip: {
              include: {
                Reservation: {
                  include: {
                    Traveler: true,
                  },
                },
              },
            },
            AffiliateSale: {
              include: {
                AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
                  select: {
                    id: true,
                    displayName: true,
                    type: true,
                    contactPhone: true,
                    affiliateCode: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        CustomerNote_CustomerNote_customerIdToUser: {
          orderBy: { createdAt: 'desc' },
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
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // APIS 정보 조회
    let apisInfo = null;
    const latestReservation = user.Reservation[0];
    if (latestReservation?.Trip) {
      const trip = latestReservation.Trip;
      apisInfo = {
        spreadsheetId: (trip as any).spreadsheetId || null,
        googleFolderId: (trip as any).googleFolderId || null,
        tripId: trip.id,
      };
    }

    // 담당자 정보 (가장 최근 예약의 담당자)
    const assignedManager = latestReservation?.AffiliateSale?.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile || null;

    // 상담기록 포맷팅
    const consultationNotes = user.CustomerNote_CustomerNote_customerIdToUser.map((note) => {
      let createdByLabel = '본사';
      if (note.createdByType === 'BRANCH_MANAGER') {
        createdByLabel = '대리점장';
      } else if (note.createdByType === 'SALES_AGENT') {
        createdByLabel = '판매원';
      }

      return {
        id: note.id,
        content: note.content,
        consultedAt: note.consultedAt?.toISOString() || note.createdAt.toISOString(),
        nextActionDate: note.nextActionDate?.toISOString() || null,
        nextActionNote: note.nextActionNote,
        statusAfter: note.statusAfter,
        audioFileUrl: note.audioFileUrl,
        createdByLabel,
        createdByName: note.createdByName || '관리자',
        createdAt: note.createdAt.toISOString(),
      };
    });

    // Reservation에서 Trip 정보를 추출하여 trips 배열 생성
    // passportImage는 Traveler에 포함되므로 trips 경로에서도 반드시 제거
    const tripsMap = new Map<number, any>();
    user.Reservation.forEach((res: any) => {
      if (res.Trip && !tripsMap.has(res.Trip.id)) {
        const sanitizedReservations = (res.Trip.Reservation || [res]).map((r: any) => ({
          ...r,
          Traveler: r.Traveler?.map((t: any) => {
            const { passportImage, ...tRest } = t;
            return { ...tRest, hasPassportImage: !!passportImage };
          }) ?? [],
        }));
        tripsMap.set(res.Trip.id, {
          ...res.Trip,
          Reservation: sanitizedReservations,
        });
      }
    });
    const trips = Array.from(tripsMap.values());

    // 비밀번호는 별도 엔드포인트(/api/admin/users/[userId]/password)에서 감사 로그와 함께 제공
    const hasPassword = !!(
      ((user as any).PasswordEvent && (user as any).PasswordEvent.length > 0)
      || user.password
    );

    // 응답 데이터 구성
    const responseData = {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        lastActiveAt: user.lastActiveAt?.toISOString() || null,
        isLocked: user.isLocked,
        isHibernated: user.isHibernated,
        customerStatus: user.customerStatus,
        customerSource: user.customerSource,
        role: user.role,
        mallUserId: user.mallUserId,
        mallNickname: user.mallNickname,
        kakaoChannelAdded: user.kakaoChannelAdded,
        kakaoChannelAddedAt: user.kakaoChannelAddedAt?.toISOString() || null,
        pwaGenieInstalledAt: user.pwaGenieInstalledAt?.toISOString() || null,
        pwaMallInstalledAt: user.pwaMallInstalledAt?.toISOString() || null,
        hasPassword, // 비밀번호 보유 여부만 표시 (실제 값은 /api/admin/users/[userId]/password 에서 감사 로그와 함께 제공)
        nextActionDate: user.nextActionDate?.toISOString() || null,
        nextActionNote: user.nextActionNote,
        customerGroupId: user.customerGroupId,
        customerGroupName: null, // 추후 CustomerGroup 모델 연결 시 구현
        assignedManager,
        consultationNotes,
        trips,
        reservations: user.Reservation.map((res: any) => ({
          ...res,
          Traveler: res.Traveler?.map((t: any) => {
            const { passportImage, ...tRest } = t;
            return { ...tRest, hasPassportImage: !!passportImage };
          }) ?? [],
          Trip: res.Trip ? {
            ...res.Trip,
            Reservation: res.Trip.Reservation?.map((r: any) => ({
              ...r,
              Traveler: r.Traveler?.map((t: any) => {
                const { passportImage, ...tRest } = t;
                return { ...tRest, hasPassportImage: !!passportImage };
              }) ?? [],
            })) ?? [],
          } : null,
        })),
        refundHistory: [], // RefundHistory 관계가 없으므로 빈 배열
        apisInfo,
      },
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('[Admin User Detail Error]', error);
    return NextResponse.json({ ok: false, error: error.message || '조회 실패' }, { status: 500 });
  }
}

// 고객 정보 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const auth = await checkAdminAuth();

    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerStatus,
      nextActionDate,
      nextActionNote,
      customerGroupId,
      adminMemo,
    } = body;

    const updateData: any = {};

    if (customerStatus !== undefined) {
      updateData.customerStatus = customerStatus;
    }
    if (nextActionDate !== undefined) {
      updateData.nextActionDate = nextActionDate ? new Date(nextActionDate) : null;
    }
    if (nextActionNote !== undefined) {
      updateData.nextActionNote = nextActionNote;
    }
    if (customerGroupId !== undefined) {
      updateData.customerGroupId = customerGroupId;
    }
    if (adminMemo !== undefined) {
      updateData.adminMemo = adminMemo;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData,
    });

    // Google 스프레드시트 백업 트리거 (비동기)
    import('@/lib/google/customer-backup').then(({ backupCustomerToSheet }) => {
      backupCustomerToSheet(parseInt(userId)).catch((err: any) => {
        console.error('[Google Backup Error]', err);
      });
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser.id,
        customerStatus: updatedUser.customerStatus,
        nextActionDate: updatedUser.nextActionDate?.toISOString() || null,
        nextActionNote: updatedUser.nextActionNote,
      },
      message: '고객 정보가 수정되었습니다.',
    });
  } catch (error: any) {
    console.error('[Admin User Update Error]', error);
    return NextResponse.json({ ok: false, error: error.message || '수정 실패' }, { status: 500 });
  }
}
