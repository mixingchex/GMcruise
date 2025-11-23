import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

/**
 * APIS 엑셀 다운로드 API
 * GET /api/admin/apis/excel?tripId=123
 * 
 * 관리자 전용 API로, tripId를 받아서 해당 Trip의 여권 데이터를 엑셀로 다운로드합니다.
 */
export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const { cookies } = await import('next/headers');
    const SESSION_COOKIE = 'cg.sid.v2';
    const sid = cookies().get(SESSION_COOKIE)?.value;

    if (!sid) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true },
        },
      },
    });

    if (!session?.User || session.User.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 쿼리 파라미터에서 tripId 가져오기
    const { searchParams } = new URL(req.url);
    const tripIdStr = searchParams.get('tripId');

    if (!tripIdStr) {
      return NextResponse.json(
        { ok: false, error: 'tripId는 필수입니다.' },
        { status: 400 }
      );
    }

    const tripId = parseInt(tripIdStr, 10);
    if (isNaN(tripId)) {
      return NextResponse.json(
        { ok: false, error: 'tripId는 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    // Trip 존재 확인 및 데이터 가져오기
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        cruiseName: true,
        departureDate: true,
        shipName: true,
        User: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        PassportSubmission: {
          select: {
            id: true,
            isSubmitted: true,
            submittedAt: true,
            passportData: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { ok: false, error: '여행을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // APIS 데이터 구성
    const apisData: any[] = [];

    // 고객 본인 정보
    const customerData = trip.User;
    const submission = trip.PassportSubmission;
    const passportData = submission?.passportData as any;

    // 본인 데이터 추가
    if (passportData?.personalInfo) {
      const personal = passportData.personalInfo;
      apisData.push({
        순번: 1,
        성명한글: customerData.name || '',
        성명영문: `${personal.lastNameEn || ''} ${personal.firstNameEn || ''}`.trim(),
        생년월일: personal.birthDate || '',
        성별: personal.gender === 'M' ? '남성' : personal.gender === 'F' ? '여성' : '',
        국적: personal.nationality || '',
        여권번호: personal.passportNumber || '',
        여권발급일: personal.issueDate || '',
        여권만료일: personal.expiryDate || '',
        '제출여부': submission?.isSubmitted ? '제출완료' : '미제출',
        '제출일시': submission?.submittedAt ? dayjs(submission.submittedAt).format('YYYY-MM-DD HH:mm') : '',
      });
    } else {
      // 기본 정보만 있는 경우
      apisData.push({
        순번: 1,
        성명한글: customerData.name || '',
        성명영문: '',
        생년월일: '',
        성별: '',
        국적: '',
        여권번호: '',
        여권발급일: '',
        여권만료일: '',
        '제출여부': submission?.isSubmitted ? '제출완료' : '미제출',
        '제출일시': submission?.submittedAt ? dayjs(submission.submittedAt).format('YYYY-MM-DD HH:mm') : '',
      });
    }

    // 동반자 정보 추가
    if (passportData?.companions && Array.isArray(passportData.companions)) {
      passportData.companions.forEach((companion: any, index: number) => {
        apisData.push({
          순번: index + 2,
          성명한글: companion.nameKr || '',
          성명영문: `${companion.lastNameEn || ''} ${companion.firstNameEn || ''}`.trim(),
          생년월일: companion.birthDate || '',
          성별: companion.gender === 'M' ? '남성' : companion.gender === 'F' ? '여성' : '',
          국적: companion.nationality || '',
          여권번호: companion.passportNumber || '',
          여권발급일: companion.issueDate || '',
          여권만료일: companion.expiryDate || '',
          '제출여부': submission?.isSubmitted ? '제출완료' : '미제출',
          '제출일시': submission?.submittedAt ? dayjs(submission.submittedAt).format('YYYY-MM-DD HH:mm') : '',
        });
      });
    }

    // 엑셀 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 여행 정보 시트
    const tripInfoSheet = XLSX.utils.json_to_sheet([
      {
        항목: '크루즈명',
        내용: trip.cruiseName || '',
      },
      {
        항목: '선박명',
        내용: trip.shipName || '',
      },
      {
        항목: '출발일',
        내용: trip.departureDate ? dayjs(trip.departureDate).format('YYYY-MM-DD') : '',
      },
      {
        항목: '고객명',
        내용: customerData.name || '',
      },
      {
        항목: '연락처',
        내용: customerData.phone || '',
      },
      {
        항목: '이메일',
        내용: customerData.email || '',
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, tripInfoSheet, '여행정보');

    // APIS 데이터 시트
    const apisSheet = XLSX.utils.json_to_sheet(apisData);
    XLSX.utils.book_append_sheet(workbook, apisSheet, 'APIS');

    // 엑셀 버퍼 생성
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 파일명 생성
    const filename = `APIS_${trip.cruiseName || 'Trip'}_${tripId}_${dayjs().format('YYYY-MM-DD')}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    console.error('[APIS Excel] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'APIS 엑셀 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}










