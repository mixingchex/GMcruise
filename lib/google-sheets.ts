// lib/google-sheets.ts
// 구글 시트 동기화 유틸리티

import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import dayjs from 'dayjs';
import { findOrCreateFolder } from './google-drive';

/**
 * APIS 양식 고정 컬럼 구조
 */
export const APIS_COLUMNS = [
  '순번',
  'RV',
  'CABIN',
  '카테고리',
  '영문성',
  '영문이름',
  '성명',
  '주민번호',
  '성별',
  '생년월일',
  '여권번호',
  '발급일',
  '만료일',
  '연락처',
  '항공',
  '결제일',
  '결제방법',
  '결제금액',
  '담당자',
  '비고',
  '비고2',
  '여권링크',
] as const;

/**
 * 구글 인증 클라이언트 생성
 */
function getAuthClient() {
  const clientEmail =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Google 서비스 계정 정보가 설정되어 있지 않습니다.');
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
}

/**
 * 구글 시트 API 클라이언트 생성
 */
function getSheetsClient() {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

/**
 * Traveler 데이터를 APIS 양식에 맞게 변환
 */
export function formatTravelerToApisRow(
  traveler: {
    roomNumber: number | null;
    korName: string | null;
    engSurname: string | null;
    engGivenName: string | null;
    birthDate: string | null;
    gender: string | null;
    nationality: string | null;
    residentNum: string | null;
    passportNo: string | null;
    issueDate: string | null;
    expiryDate: string | null;
  },
  sequence: number,
  reservation?: {
    id: number;
    cabinType: string | null;
    paymentDate: Date | null;
    paymentMethod: string | null;
    paymentAmount: number | null;
    agentName: string | null;
    remarks: string | null;
    passportGroupLink: string | null;
  },
  userPhone?: string | null
): any[] {
  return [
    sequence, // 순번
    reservation?.id || '', // RV (Reservation ID)
    traveler.roomNumber || '', // CABIN
    reservation?.cabinType || '', // 카테고리
    traveler.engSurname || '', // 영문성
    traveler.engGivenName || '', // 영문이름
    traveler.korName || '', // 성명
    traveler.residentNum || '', // 주민번호
    traveler.gender || '', // 성별
    traveler.birthDate || '', // 생년월일
    traveler.passportNo || '', // 여권번호
    traveler.issueDate || '', // 발급일
    traveler.expiryDate || '', // 만료일
    userPhone || '', // 연락처
    '', // 항공
    reservation?.paymentDate
      ? dayjs(reservation.paymentDate).format('YYYY-MM-DD')
      : '', // 결제일
    reservation?.paymentMethod || '', // 결제방법
    reservation?.paymentAmount?.toString() || '', // 결제금액
    reservation?.agentName || '', // 담당자
    reservation?.remarks || '', // 비고
    '', // 비고2
    reservation?.passportGroupLink || '', // 여권링크
  ];
}

/**
 * APIS 구글 시트 동기화
 * tripId를 받아서 해당 Trip의 모든 Traveler 데이터를 APIS 양식에 맞게 구글 시트에 동기화합니다.
 */
export async function syncApisSpreadsheet(tripId: number): Promise<{
  ok: boolean;
  spreadsheetId?: string;
  folderId?: string;
  rowCount?: number;
  error?: string;
}> {
  try {
    console.log('[syncApisSpreadsheet] UserTrip ID:', tripId);
    
    // UserTrip 조회
    const userTrip = await prisma.userTrip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        spreadsheetId: true,
        CruiseProduct: {
          select: {
            productCode: true,
            cruiseLine: true,
            shipName: true,
            packageName: true,
          },
        },
      },
    });

    if (!userTrip) {
      return {
        ok: false,
        error: 'UserTrip을 찾을 수 없습니다.',
      };
    }

    // 상품 정보 조회 (여행명)
    const product = userTrip.CruiseProduct;

    // 해당 UserTrip의 모든 Reservation과 Traveler 조회
    const reservations = await prisma.reservation.findMany({
      where: {
        tripId: userTrip.id,
      },
      include: {
        Traveler: {
          orderBy: [
            { roomNumber: 'asc' },
            { id: 'asc' },
          ],
        },
        User: {
          select: {
            phone: true,
          },
        },
      },
    });

    // 여행명 구성
    const cruiseName =
      product?.packageName ||
      `${product?.cruiseLine || ''} ${product?.shipName || ''}`.trim();
    const departureDate = userTrip.startDate
      ? dayjs(userTrip.startDate).format('YYYY-MM-DD')
      : '';
    const arrivalDate = userTrip.endDate
      ? dayjs(userTrip.endDate).format('YYYY-MM-DD')
      : '';

    // APIS 데이터 구성 (고정 컬럼 구조)
    const apisRows: any[][] = [];
    let sequence = 1;

    for (const reservation of reservations) {
      const userPhone = reservation.User?.phone || null;
      for (const traveler of reservation.Traveler) {
        apisRows.push(
          formatTravelerToApisRow(traveler, sequence++, reservation, userPhone)
        );
      }
    }

    console.log(`[syncApisSpreadsheet] APIS 데이터 ${apisRows.length}건 준비 완료`);

    // 구글 시트 클라이언트 생성
    const auth = getAuthClient();
    const sheets = getSheetsClient();
    const drive = google.drive({ version: 'v3', auth });

    // 여권 전용 폴더 ID
    const rootFolderId =
      process.env.GOOGLE_DRIVE_PASSPORT_FOLDER_ID ||
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
      null;

    // 여행 상품 폴더 생성/검색
    // 형식: [출발일]_[선박명] (예: 20250509_MSC Bellissima)
    const departureDateForFolder = userTrip.startDate
      ? dayjs(userTrip.startDate).format('YYYYMMDD')
      : dayjs().format('YYYYMMDD');
    const tripFolderName = `${departureDateForFolder}_${product?.shipName || cruiseName}`;
    const tripFolderResult = await findOrCreateFolder(tripFolderName, rootFolderId);

    if (!tripFolderResult.ok || !tripFolderResult.folderId) {
      throw new Error(
        `여행 상품 폴더 생성 실패: ${tripFolderResult.error}`
      );
    }

    const folderId = tripFolderResult.folderId;

    // 기존 시트 확인 (UserTrip 테이블에 저장된 spreadsheetId 확인)
    let spreadsheetId = userTrip.spreadsheetId || null;

    if (spreadsheetId) {
      // 기존 시트 확인
      try {
        await sheets.spreadsheets.get({
          spreadsheetId: spreadsheetId,
        });
        console.log(
          `[syncApisSpreadsheet] 기존 시트 사용: ${spreadsheetId}`
        );
      } catch (error) {
        console.log(
          `[syncApisSpreadsheet] 기존 시트를 찾을 수 없음, 새로 생성`
        );
        spreadsheetId = null;
      }
    }

    // 시트 생성 (없는 경우)
    if (!spreadsheetId) {
      const spreadsheetTitle = `APIS_${tripFolderName}`;
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: spreadsheetTitle,
          },
          sheets: [
            {
              properties: {
                title: 'APIS',
              },
            },
          ],
        },
      });

      spreadsheetId = createResponse.data.spreadsheetId || null;

      if (!spreadsheetId) {
        throw new Error('구글 시트 생성에 실패했습니다.');
      }

      // 시트를 폴더로 이동
      const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
      const updateOptions: any = {
        fileId: spreadsheetId,
        addParents: folderId,
        fields: 'id, parents',
      };

      if (sharedDriveId && sharedDriveId !== 'root') {
        updateOptions.supportsAllDrives = true;
      }

      await drive.files.update(updateOptions);

      // UserTrip 테이블에 spreadsheetId 저장
      await prisma.userTrip.update({
        where: { id: tripId },
        data: { spreadsheetId },
      });

      console.log(`[syncApisSpreadsheet] 새 시트 생성: ${spreadsheetId}`);
    }

    // 시트 데이터 구성
    const worksheetData: any[][] = [];

    // 여행 정보 행 추가
    worksheetData.push(['여행명', cruiseName]);
    worksheetData.push(['출발일', departureDate]);
    worksheetData.push(['도착일', arrivalDate]);
    worksheetData.push([]); // 빈 행
    worksheetData.push([...APIS_COLUMNS]); // 헤더 행
    worksheetData.push(...apisRows); // 데이터 행

    // 시트에 데이터 쓰기
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'APIS!A1', // 시트 이름 명시
      valueInputOption: 'RAW',
      requestBody: {
        values: worksheetData,
      },
    });

    // 헤더 행 포맷팅 (옵션)
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0, // 첫 번째 시트
                  startRowIndex: 4, // 헤더 행 (5번째 행, 0-indexed)
                  endRowIndex: 5,
                  startColumnIndex: 0,
                  endColumnIndex: APIS_COLUMNS.length,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.9,
                      green: 0.9,
                      blue: 0.9,
                    },
                    textFormat: {
                      bold: true,
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        },
      });
    } catch (formatError) {
      console.warn(
        '[syncApisSpreadsheet] 헤더 포맷팅 실패 (무시):',
        formatError
      );
    }

    console.log(`[syncApisSpreadsheet] ✅ 완료: ${spreadsheetId}`);

    return {
      ok: true,
      spreadsheetId,
      folderId,
      rowCount: apisRows.length,
    };
  } catch (error: any) {
    console.error('[syncApisSpreadsheet] Error:', error);
    return {
      ok: false,
      error: error.message || '구글 시트 동기화 중 오류가 발생했습니다.',
    };
  }
}






