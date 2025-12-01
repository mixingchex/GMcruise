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

    // 헤더 업데이트 (X열 비고 추가)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Passengers!A1:X1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['이름', '여권번호', '생년월일', '국적', '성별', '전화번호', '이메일', '제출상태', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '비고']],
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
        ]);
      }
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Passengers!A2:X${rows.length + 1}`,
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
