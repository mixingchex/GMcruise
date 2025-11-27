import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAdminUser } from '../_utils';
import { logger } from '@/lib/logger';

interface GuestPayload {
  name: string;
  phone?: string;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  passportExpiryDate?: string;
}

interface GroupPayload {
  groupNumber: number;
  guests: GuestPayload[];
}

interface ManualRegisterRequestBody {
  userId: number;
  groups: GroupPayload[];
  remarks?: string;
}

const MAX_GROUPS = 30;

function generateToken() {
  return randomBytes(16).toString('hex');
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json(
        { ok: false, message: '인증이 필요합니다. 다시 로그인해 주세요.' },
        { status: 403 }
      );
    }

    const body: ManualRegisterRequestBody = await req.json();

    if (!body.userId || Number.isNaN(body.userId)) {
      return NextResponse.json({ ok: false, message: 'userId가 필요합니다.' }, { status: 400 });
    }

    if (!body.groups || !Array.isArray(body.groups) || body.groups.length === 0) {
      return NextResponse.json({ ok: false, message: '최소 한 개 이상의 그룹이 필요합니다.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: '고객 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // User의 최신 여행 정보 조회
    const latestTrip = await prisma.userTrip.findFirst({
      where: { userId: user.id },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        cruiseName: true,
        startDate: true,
        endDate: true,
      },
    });

    const validGroups = body.groups
      .slice(0, MAX_GROUPS)
      .map((group) => ({
        groupNumber: Number(group.groupNumber),
        guests: Array.isArray(group.guests) ? group.guests : [],
      }))
      .filter((group) => group.groupNumber >= 1 && group.groupNumber <= MAX_GROUPS);

    if (validGroups.length === 0) {
      return NextResponse.json({ ok: false, message: '최소 한 개 이상의 그룹이 필요합니다.' }, { status: 400 });
    }

    const guestRecords = validGroups.flatMap((group) => {
      return group.guests
        .map((guest) => ({
          groupNumber: group.groupNumber,
          name: guest.name?.trim() ?? '',
          phone: guest.phone?.trim() || null,
          passportNumber: guest.passportNumber?.trim() || null,
          nationality: guest.nationality?.trim() || null,
          dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth) : null,
          passportExpiryDate: guest.passportExpiryDate ? new Date(guest.passportExpiryDate) : null,
        }))
        .filter((guest) => guest.name.length > 0);
    });

    if (guestRecords.length === 0) {
      return NextResponse.json({ ok: false, message: '각 그룹에 최소 한 명 이상의 탑승자를 입력해주세요.' }, { status: 400 });
    }

    const purchaserName = user.name || '';
    const purchaserPhone = user.phone || '';

    // PassportSubmission 생성 및 Guest 등록
    const result = await prisma.$transaction(async (tx) => {
      // 기존 미제출 submission이 있으면 삭제
      const existingSubmission = await tx.passportSubmission.findFirst({
        where: { userId: user.id, isSubmitted: false },
        orderBy: { createdAt: 'desc' },
      });

      if (existingSubmission) {
        await tx.passportSubmissionGuest.deleteMany({ where: { submissionId: existingSubmission.id } });
        await tx.passportSubmission.delete({ where: { id: existingSubmission.id } });
      }

      // 새 submission 생성
      const token = generateToken();
      const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30일 후 만료

      const createData: any = {
        User: { connect: { id: user.id } },
        token,
        tokenExpiresAt,
        isSubmitted: true, // 수동 등록은 바로 제출 완료로 처리
        submittedAt: new Date(),
        driveFolderUrl: null,
        extraData: {
          groups: validGroups.map((group) => ({
            groupNumber: group.groupNumber,
            guests: group.guests,
          })),
          remarks: body.remarks ?? '',
          passportFiles: [],
          manuallyRegistered: true, // 수동 등록 표시
          registeredBy: admin.id,
          registeredAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      };

      if (latestTrip) {
        createData.UserTrip = { connect: { id: latestTrip.id } };
      }

      const submission = await tx.passportSubmission.create({
        data: createData,
      });

      // 동행자들을 등록하면서 잠재고객으로 자동 생성
      const createdGuests = [];
      for (const guest of guestRecords) {
        // 구매자와 동일한 정보인지 확인
        const isSameAsPurchaser =
          guest.name === purchaserName &&
          guest.phone &&
          guest.phone.replace(/[-.\s]/g, '') === purchaserPhone.replace(/[-.\s]/g, '');

        // 구매자와 다른 정보면 잠재고객으로 사용자 생성
        let guestUserId: number | null = null;
        if (!isSameAsPurchaser && guest.name && guest.phone) {
          const normalizedPhone = guest.phone.replace(/[-.\s]/g, '');
          const mobilePattern = /^01[0-9]{9}$/;
          
          if (mobilePattern.test(normalizedPhone)) {
            const existingUser = await tx.user.findFirst({
              where: {
                name: guest.name,
                phone: normalizedPhone,
              },
            });

            if (existingUser) {
              guestUserId = existingUser.id;
              if (existingUser.customerStatus !== 'purchase_confirmed') {
                await tx.user.update({
                  where: { id: existingUser.id },
                  data: {
                    customerStatus: 'prospects',
                  },
                });
              }
            } else {
              const apisInfo = {
                passportSubmissionId: submission.id,
                passportSubmissionGuestName: guest.name,
                passportNumber: guest.passportNumber,
                nationality: guest.nationality,
                dateOfBirth: guest.dateOfBirth?.toISOString(),
                passportExpiryDate: guest.passportExpiryDate?.toISOString(),
                manuallyRegistered: true,
                createdAt: new Date().toISOString(),
              };

              const now = new Date();
              const newUser = await tx.user.create({
                data: {
                  name: guest.name,
                  phone: normalizedPhone,
                  password: '3800',
                  role: 'user',
                  customerStatus: 'prospects',
                  onboarded: false,
                  loginCount: 0,
                  tripCount: 0,
                  totalTripCount: 0,
                  adminMemo: `수동 여권 등록으로 자동 생성 (PassportSubmission ID: ${submission.id})\nAPIS 정보: ${JSON.stringify(apisInfo, null, 2)}`,
                  updatedAt: now,
                },
              });
              guestUserId = newUser.id;
            }
          }
        }

        // PassportSubmissionGuest 생성
        const createdGuest = await tx.passportSubmissionGuest.create({
          data: {
            submissionId: submission.id,
            groupNumber: guest.groupNumber,
            name: guest.name,
            phone: guest.phone,
            passportNumber: guest.passportNumber,
            nationality: guest.nationality,
            dateOfBirth: guest.dateOfBirth,
            passportExpiryDate: guest.passportExpiryDate,
            ocrRawData: guest.passportNumber
              ? {
                  name: guest.name,
                  phone: guest.phone,
                  passportNumber: guest.passportNumber,
                  nationality: guest.nationality,
                  dateOfBirth: guest.dateOfBirth?.toISOString(),
                  passportExpiryDate: guest.passportExpiryDate?.toISOString(),
                  manuallyRegistered: true,
                  createdAt: new Date().toISOString(),
                }
              : null,
          },
        });
        createdGuests.push(createdGuest);
      }

      // PassportRequestLog 기록
      try {
        await tx.passportRequestLog.create({
          data: {
            userId: user.id,
            adminId: admin.id,
            templateId: null,
            messageBody: `수동 여권 등록 (관리자: ${admin.name})`,
            messageChannel: 'MANUAL_REGISTER',
            status: 'SUCCESS',
            errorReason: null,
            sentAt: new Date(),
          },
        });
      } catch (logError) {
        logger.warn('[ManualRegister] Failed to insert log:', logError);
      }

      return {
        submissionId: submission.id,
        token: submission.token,
        guestsCount: createdGuests.length,
      };
    });

    return NextResponse.json({
      ok: true,
      result: {
        submissionId: result.submissionId,
        token: result.token,
        guestsCount: result.guestsCount,
        message: `${result.guestsCount}명의 여권 정보가 수동으로 등록되었습니다.`,
      },
    });
  } catch (error) {
    logger.error('[ManualRegister] POST error:', error);
    logger.error('[ManualRegister] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        ok: false,
        message: '수동 여권 등록 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}


