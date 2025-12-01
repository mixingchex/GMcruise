// lib/google-sheets.ts
// Google Sheets & Drive 연동 유틸리티

import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { getDriveClient, findOrCreateFolder, uploadFileToDrive } from '@/lib/google-drive';

type SheetsAppendRow = (string | number | null)[];

function resolveServiceAccount(): { clientEmail: string; privateKey: string } {
  const rawPrivateKey =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;

  const clientEmail =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.CLIENT_EMAIL;

  if (!rawPrivateKey || !clientEmail) {
    throw new Error('Google Sheets 인증 정보가 없습니다.');
  }

  const privateKey = rawPrivateKey.replace(/^["']|["']$/g, '').trim().replace(/\\n/g, '\n');
  return { clientEmail, privateKey };
}

function getSheetsClient() {
  const credentials = resolveServiceAccount();
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.clientEmail,
      private_key: credentials.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function appendRows(range: string, rows: SheetsAppendRow[]) {
  const spreadsheetId = process.env.COMMUNITY_BACKUP_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('COMMUNITY_BACKUP_SPREADSHEET_ID 환경변수가 설정되지 않았습니다.');
  }

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
}

function ensureIsoDate(value: Date | string) {
  return new Date(value).toISOString();
}

/**
 * APIS 스프레드시트 동기화
 */
export async function syncApisSpreadsheet(tripId: number): Promise<{
  ok: boolean;
  error?: string;
  spreadsheetId?: string | null;
  spreadsheetUrl?: string | null;
  folderId?: string | null;
  rowCount?: number;
}> {
  try {
    console.log('[syncApisSpreadsheet] 시작:', tripId);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        Reservation: {
          include: {
            User: true,
            Traveler: true,
          },
        },
      },
    });

    if (!trip) {
      return {
        ok: false,
        error: '여행 정보를 찾을 수 없습니다.',
        spreadsheetId: null,
        spreadsheetUrl: null,
        folderId: null,
        rowCount: 0,
      };
    }

    // ... (folder creation logic remains same) ...
    // I need to keep the folder creation logic which is between line 99 and 190.
    // So I should target the query part and the mapping part separately or be careful.
    // The previous replace_file_content updated lines 99-154.
    // So I should target lines 77-86 (query) and 201-216 (mapping).

    // Let's do query update first.


    if (!trip) {
      return {
        ok: false,
        error: '여행 정보를 찾을 수 없습니다.',
        spreadsheetId: null,
        spreadsheetUrl: null,
        folderId: null,
        rowCount: 0,
      };
    }

    const { getDriveFolderId } = await import('@/lib/config/drive-config');
    const parentFolderId = await getDriveFolderId('APIS_MAIN');

    const folderName = `${trip.shipName || 'Cruise'} - ${new Date(trip.departureDate).toISOString().split('T')[0]}`;

    // APIS 메인 폴더 안에 여행별 폴더 생성/찾기
    const folderResult = await findOrCreateFolder(folderName, parentFolderId);

    if (!folderResult.ok || !folderResult.folderId) {
      return {
        ok: false,
        error: '폴더 생성에 실패했습니다.',
        spreadsheetId: null,
        spreadsheetUrl: null,
        folderId: null,
        rowCount: 0,
      };
    }

    const folderId = folderResult.folderId;
    const sheets = getSheetsClient();
    const spreadsheetTitle = `APIS - ${folderName}`;
    let spreadsheetId = trip.spreadsheetId;

    if (!spreadsheetId) {
      // 템플릿 스프레드시트 ID 가져오기
      const templateSpreadsheetId = await getDriveFolderId('APIS_TEMPLATE_ID');

      if (templateSpreadsheetId) {
        // 템플릿 복제 방식 사용
        const drive = getDriveClient();
        const copiedFile = await drive.files.copy({
          fileId: templateSpreadsheetId,
          requestBody: {
            name: spreadsheetTitle,
            parents: [folderId], // 바로 대상 폴더에 생성
          },
          supportsAllDrives: true,
        });

        if (!copiedFile.data.id) {
          throw new Error('템플릿 스프레드시트 복제 실패');
        }

        spreadsheetId = copiedFile.data.id;

        // parents에 이미 추가했으므로 이동 불필요
      } else {
        // 템플릿이 없으면 새로 생성
        const createResponse = await sheets.spreadsheets.create({
          requestBody: {
            properties: { title: spreadsheetTitle },
            sheets: [
              {
                properties: {
                  title: 'Passengers',
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
              },
            ],
          },
        });

        spreadsheetId = createResponse.data.spreadsheetId!;

        const drive = getDriveClient();
        await drive.files.update({
          fileId: spreadsheetId,
          addParents: folderId,
          fields: 'id, parents',
        } as any);
      }

      await prisma.trip.update({
        where: { id: tripId },
        data: {
          spreadsheetId,
          googleFolderId: folderId,
        },
      });
    }

    // 헤더 업데이트 (X열 비고 추가, Y열 룸번호 추가)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Passengers!A1:Y1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['이름', '여권번호', '생년월일', '국적', '성별', '전화번호', '이메일', '제출상태', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '비고', '룸번호']],
      },
    });

    // 여권 링크 정보 가져오기 (Reservation에서 passportDriveUrl 또는 passportUrl 확인)
    // 여권 정보 가져오기 (Traveler 기준)
    const rows: SheetsAppendRow[] = [];

    trip.Reservation.forEach((reservation) => {
      // Traveler가 있으면 Traveler 정보 사용
      if (reservation.Traveler && reservation.Traveler.length > 0) {
        reservation.Traveler.forEach((traveler) => {
          const passportLink = traveler.passportImage || (reservation as any).passportDriveUrl || (reservation as any).passportUrl || '';
          rows.push([
            traveler.korName || reservation.User?.name || '',
            traveler.passportNo || '미제출',
            traveler.birthDate || '',
            traveler.nationality || '',
            traveler.gender || '',
            reservation.User?.phone || '', // 연락처는 예약자(대표자) 정보 사용
            reservation.User?.email || '',
            traveler.passportNo ? '제출완료' : '미제출',
            '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', // 빈 열들
            passportLink, // X열에 여권 링크
            traveler.roomNumber || '', // Y열에 룸번호
          ]);
        });
      } else {
        // Traveler가 없으면 예약자 정보로 기본 행 생성 (여권 미제출 상태)
        const passportLink = (reservation as any).passportDriveUrl || (reservation as any).passportUrl || '';
        rows.push([
          reservation.User?.name || '',
          '미제출',
          '', // 생년월일
          '', // 국적
          '', // 성별
          reservation.User?.phone || '',
          reservation.User?.email || '',
          '미제출',
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
          passportLink,
          '', // 룸번호
        ]);
      }
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Passengers!A2:Y${rows.length + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
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

    console.log('[syncApisSpreadsheet] 완료:', {
      spreadsheetId,
      folderId,
      rowCount: rows.length,
    });

    return {
      ok: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      folderId,
      rowCount: rows.length,
    };
  } catch (error: any) {
    console.error('[syncApisSpreadsheet] 오류:', error);
    return {
      ok: false,
      error: error?.message || '스프레드시트 동기화 중 오류가 발생했습니다.',
      spreadsheetId: null,
      spreadsheetUrl: null,
      folderId: null,
      rowCount: 0,
    };
  }
}

/**
 * 마스터 APIS 시트에 사용자 여권 정보 동기화
 */
export async function syncToMasterApisSheet(userId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const { getDriveFolderId } = await import('@/lib/config/drive-config');
    const masterSpreadsheetId = await getDriveFolderId('APIS_TEMPLATE_ID'); // 마스터 시트 ID 사용 (템플릿 ID와 동일하다고 가정하거나 별도 키 필요)
    // User requested: https://docs.google.com/spreadsheets/d/1Le6IPNzyvMqpn-6ZnqgvH0JTQ8O5rKymWMU_pkfbQ5Q/edit?gid=0#gid=0
    // This ID matches APIS_TEMPLATE_ID in drive-config.ts. So we use that.

    if (!masterSpreadsheetId) {
      throw new Error('APIS_TEMPLATE_ID가 설정되지 않았습니다.');
    }

    // 사용자 정보 및 여권 정보 가져오기 (가장 최근 Traveler 정보 또는 User 정보)
    // User와 Traveler를 조인해서 가져오는게 좋음. 하지만 Traveler는 Trip에 종속적임.
    // 마스터 시트는 "모든 고객들의 APIS 등록"이므로, User 기준으로 가장 최신 여권 정보를 가져와야 함.
    // 또는 특정 Trip의 Traveler 정보를 가져와야 하나?
    // "APIS 등록된 고객이 여행 등록을 하면..." -> User가 여권을 등록하면 마스터에 저장.
    // 따라서 User 테이블이나 Traveler 테이블에서 해당 userId의 정보를 가져와야 함.
    // Traveler 테이블에 여권 정보가 있으므로, 해당 유저의 모든 Traveler 기록 중 가장 최신 것을 사용하거나,
    // 별도의 PassportSubmissionGuest 등을 참조해야 할 수도 있음.
    // 여기서는 Traveler 테이블의 최신 정보를 사용한다고 가정.

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Traveler: {
          orderBy: { id: 'desc' }, // 가장 최근 여행자 정보
          take: 1,
        },
      },
    });

    if (!user) {
      return { ok: false, error: '사용자를 찾을 수 없습니다.' };
    }

    const traveler = user.Traveler[0];
    if (!traveler) {
      // 여권 정보가 없으면 동기화 할 게 없음 (또는 빈 값으로 업데이트?)
      return { ok: true }; // Skip
    }

    const sheets = getSheetsClient();

    // 1. 시트 데이터 읽기 (중복 확인 및 행 위치 찾기)
    // A열: 이름, B열: 여권번호, ... X열: 여권링크
    // 고유 식별자로 무엇을 쓸까? 이름+전화번호? 아니면 User ID를 별도 열에 저장?
    // 마스터 시트 양식이 Trip 시트와 같다면 A: 이름, F: 전화번호.
    // 이름과 전화번호로 매칭 시도.

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterSpreadsheetId,
      range: 'Passengers!A:F', // A:이름 ~ F:전화번호
    });

    const rows = response.data.values || [];
    let targetRowIndex = -1;

    for (let i = 1; i < rows.length; i++) { // 헤더 건너뜀
      const rowName = rows[i][0];
      const rowPhone = rows[i][5];

      if (rowName === (traveler.korName || user.name) && rowPhone === user.phone) {
        targetRowIndex = i + 1; // 1-based
        break;
      }
    }

    const rowData = [
      traveler.korName || user.name || '',
      traveler.passportNo || '',
      traveler.birthDate || '',
      traveler.nationality || '',
      traveler.gender || '',
      user.phone || '',
      user.email || '',
      traveler.passportNo ? '제출완료' : '미제출',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', // 빈 열들
      traveler.passportImage || '', // X열
    ];

    if (targetRowIndex !== -1) {
      // 업데이트
      await sheets.spreadsheets.values.update({
        spreadsheetId: masterSpreadsheetId,
        range: `Passengers!A${targetRowIndex}:X${targetRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] },
      });
    } else {
      // 추가
      await sheets.spreadsheets.values.append({
        spreadsheetId: masterSpreadsheetId,
        range: 'Passengers!A:X',
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] },
      });
    }

    console.log(`[syncToMasterApisSheet] 완료: User ${userId}`);
    return { ok: true };

  } catch (error: any) {
    console.error('[syncToMasterApisSheet] 오류:', error);
    return { ok: false, error: error.message };
  }
}

export type SavePostPayload = {
  id: number;
  title: string;
  content: string;
  category: string;
  authorName: string;
  createdAt: Date | string;
};

export async function savePostToSheets(postData: SavePostPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    await appendRows('Posts!A:F', [
      [
        postData.id,
        postData.title,
        postData.content,
        postData.category,
        postData.authorName,
        ensureIsoDate(postData.createdAt),
      ],
    ]);
    return { ok: true };
  } catch (error: any) {
    console.error('[savePostToSheets] 오류:', error);
    return { ok: false, error: error?.message };
  }
}

export type SaveCommentPayload = {
  id: number;
  postId: number;
  content: string;
  authorName: string;
  createdAt: Date | string;
};

export async function saveCommentToSheets(commentData: SaveCommentPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    await appendRows('Comments!A:E', [
      [
        commentData.id,
        commentData.postId,
        commentData.content,
        commentData.authorName,
        ensureIsoDate(commentData.createdAt),
      ],
    ]);
    return { ok: true };
  } catch (error: any) {
    console.error('[saveCommentToSheets] 오류:', error);
    return { ok: false, error: error?.message };
  }
}

export type SaveReviewPayload = {
  id: number;
  content: string;
  rating: number;
  authorName: string;
  createdAt: Date | string;
};

/**
 * 여권 제출 시 APIS 스프레드시트 X열에 링크 기록
 */
export async function updatePassportLinkInApis(
  reservationId: number,
  passportLink: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Reservation에서 Trip 정보 가져오기
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        Trip: {
          select: {
            id: true,
            spreadsheetId: true,
          },
        },
        User: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!reservation || !reservation.Trip || !reservation.Trip.spreadsheetId) {
      return { ok: false, error: 'APIS 스프레드시트를 찾을 수 없습니다.' };
    }

    const spreadsheetId = reservation.Trip.spreadsheetId;
    const sheets = getSheetsClient();

    // 스프레드시트에서 해당 사용자 행 찾기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Passengers!A:A', // 이름 열
    });

    const names = response.data.values || [];
    const userName = reservation.User?.name || '';

    // 사용자 이름으로 행 찾기 (1-based index, 헤더 제외)
    let rowIndex = -1;
    for (let i = 1; i < names.length; i++) {
      if (names[i] && names[i][0] === userName) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (rowIndex === -1) {
      // 사용자를 찾을 수 없으면 스프레드시트 동기화 필요
      console.warn(`[updatePassportLinkInApis] 사용자 ${userName}를 스프레드시트에서 찾을 수 없습니다. 스프레드시트 동기화를 실행하세요.`);
      return { ok: false, error: '스프레드시트에 해당 사용자가 없습니다. 스프레드시트 동기화를 먼저 실행하세요.' };
    }

    // X열(24번째 열)에 여권 링크 업데이트
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Passengers!X${rowIndex}:X${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[passportLink]],
      },
    });

    console.log(`[updatePassportLinkInApis] 여권 링크 업데이트 완료: ${userName} (행 ${rowIndex})`);
    return { ok: true };
  } catch (error: any) {
    console.error('[updatePassportLinkInApis] 오류:', error);
    return { ok: false, error: error?.message || '여권 링크 업데이트 중 오류가 발생했습니다.' };
  }
}

export async function saveReviewToSheets(reviewData: SaveReviewPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    await appendRows('Reviews!A:E', [
      [
        reviewData.id,
        reviewData.content,
        reviewData.rating,
        reviewData.authorName,
        ensureIsoDate(reviewData.createdAt),
      ],
    ]);
    return { ok: true };
  } catch (error: any) {
    console.error('[saveReviewToSheets] 오류:', error);
    return { ok: false, error: error?.message };
  }
}

async function uploadCommunityImage(
  imageBuffer: Buffer,
  fileName: string,
  folderId?: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    return await uploadFileToDrive({
      folderId: folderId || process.env.COMMUNITY_IMAGES_FOLDER_ID || null,
      fileName,
      mimeType: 'image/jpeg',
      buffer: imageBuffer,
      makePublic: true,
    });
  } catch (error: any) {
    console.error('[uploadCommunityImage] 오류:', error);
    return { ok: false, error: error?.message };
  }
}

export async function uploadPostImageToDrive(imageBuffer: Buffer, fileName: string, folderId?: string) {
  return uploadCommunityImage(imageBuffer, fileName, folderId);
}

export async function uploadCommentImageToDrive(imageBuffer: Buffer, fileName: string, folderId?: string) {
  return uploadCommunityImage(imageBuffer, fileName, folderId);
}

export async function uploadReviewImageToDrive(imageBuffer: Buffer, fileName: string, folderId?: string) {
  return uploadCommunityImage(imageBuffer, fileName, folderId);
}
