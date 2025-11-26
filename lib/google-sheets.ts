// lib/google-sheets.ts
// Google Sheets API 연동 함수들

import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { getDriveClient, findOrCreateFolder, uploadFileToDrive } from '@/lib/google-drive';

/**
 * Google Sheets 클라이언트 생성
 */
function getSheetsClient() {
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

  let privateKey = rawPrivateKey
    .replace(/^["']|["']$/g, '')
    .trim()
    .replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * APIS 스프레드시트 동기화 함수
 * @param tripId - 여행 ID
 * @returns 동기화 결과
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

    // 1. Trip 정보 조회
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        Reservation: {
          include: {
            User: true,
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

    // 2. Google Drive 폴더 생성 또는 확인
    const folderName = `${trip.shipName || 'Cruise'} - ${new Date(trip.departureDate).toISOString().split('T')[0]}`;
    const folderResult = await findOrCreateFolder(folderName);

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

    // 3. Google Sheets 생성
    const sheets = getSheetsClient();
    const spreadsheetTitle = `APIS - ${folderName}`;

    // 기존 스프레드시트가 있는지 확인
    let spreadsheetId = trip.spreadsheetId;

    if (!spreadsheetId) {
      // 새 스프레드시트 생성
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: spreadsheetTitle,
          },
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

      // Drive로 파일 이동
      const drive = getDriveClient();
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: folderId,
        fields: 'id, parents',
      } as any);

      // DB에 spreadsheetId 저장
      await prisma.trip.update({
        where: { id: tripId },
        data: {
          spreadsheetId,
          googleFolderId: folderId,
        },
      });
    }

    // 4. 헤더 작성
    const headerRange = 'Passengers!A1:H1';
    const headers = [
      ['이름', '여권번호', '생년월일', '국적', '성별', '전화번호', '이메일', '제출상태']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: headers,
      },
    });

    // 5. 예약 데이터 작성
    const rows = trip.Reservation.map(reservation => [
      reservation.User?.name || '',
      reservation.passportNumber || '미제출',
      reservation.passportBirthDate || '',
      reservation.passportNationality || '',
      reservation.passportGender || '',
      reservation.User?.phone || '',
      reservation.User?.email || '',
      reservation.passportNumber ? '제출완료' : '미제출',
    ]);

    if (rows.length > 0) {
      const dataRange = `Passengers!A2:H${rows.length + 1}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: dataRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });
    }

    // 6. 헤더 스타일 적용
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
 * 게시글을 Google Sheets에 저장
 */
export async function savePostToSheets(postData: {
  id: number;
  title: string;
  content: string;
  category: string;
  authorName: string;
  createdAt: Date | string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.COMMUNITY_BACKUP_SPREADSHEET_ID;

    if (!spreadsheetId) {
      console.warn('[savePostToSheets] COMMUNITY_BACKUP_SPREADSHEET_ID 환경변수가 설정되지 않았습니다.');
      return { ok: false, error: 'Spreadsheet ID가 설정되지 않았습니다.' };
    }

    const row = [
      postData.id,
      postData.title,
      postData.content,
      postData.category,
      postData.authorName,
      new Date(postData.createdAt).toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Posts!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    return { ok: true };
  } catch (error: any) {
    console.error('[savePostToSheets] 오류:', error);
    return { ok: false, error: error?.message };
  }
}

/**
 * 댓글을 Google Sheets에 저장
 */
export async function saveCommentToSheets(commentData: {
  id: number;
  postId: number;
  content: string;
  authorName: string;
  createdAt: Date | string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.COMMUNITY_BACKUP_SPREADSHEET_ID;

    if (!spreadsheetId) {
      console.warn('[saveCommentToSheets] COMMUNITY_BACKUP_SPREADSHEET_ID 환경변수가 설정되지 않았습니다.');
      return { ok: false, error: 'Spreadsheet ID가 설정되지 않았습니다.' };
    }

    const row = [
      commentData.id,
      commentData.postId,
      commentData.content,
      commentData.authorName,
      new Date(commentData.createdAt).toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Comments!A:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    return { ok: true };
  } catch (error: any) {
    console.error('[saveCommentToSheets] 오류:', error);
    return { ok: false, error: error?.message };
  }
}

/**
 * 리뷰를 Google Sheets에 저장
 */
export async function saveReviewToSheets(reviewData: {
  id: number;
  content: string;
  rating: number;
  authorName: string;
  createdAt: Date | string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.COMMUNITY_BACKUP_SPREADSHEET_ID;

    if (!spreadsheetId) {
      console.warn('[saveReviewToSheets] COMMUNITY_BACKUP_SPREADSHEET_ID 환경변수가 설정되지 않았습니다.');
      return { ok: false, error: 'Spreadsheet ID가 설정되지 않았습니다.' };
    }

    const row = [
      reviewData.id,
      reviewData.content,
      reviewData.rating,
      reviewData.authorName,
      new Date(reviewData.createdAt).toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Reviews!A:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    return { ok: true };
  } catch (error: any) {
    console.error('[saveReviewToSheets] 오류:', error);
    return { ok: false, error: error?.message };
  }
}

/**
 * 게시글 이미지를 Drive에 업로드
 */
export async function uploadPostImageToDrive(
  imageBuffer: Buffer,
  fileName: string,
  folderId?: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const result = await uploadFileToDrive({
      folderId: folderId || process.env.COMMUNITY_IMAGES_FOLDER_ID || null,
      fileName,
      mimeType: 'image/jpeg',
      buffer: imageBuffer,
      makePublic: true,
    });

    return result;
  } catch (error: any) {
    console.error('[uploadPostImageToDrive] 오류:', error);
    return { ok: false, error: error?.message };
  }
}

/**
 * 댓글 이미지를 Drive에 업로드
 */
export async function uploadCommentImageToDrive(
  imageBuffer: Buffer,
  fileName: string,
  folderId?: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const result = await uploadFileToDrive({
      folderId: folderId || process.env.COMMUNITY_IMAGES_FOLDER_ID || null,
      fileName,
      mimeType: 'image/jpeg',
      buffer: imageBuffer,
      makePublic: true,
    });

    return result;
  } catch (error: any) {
    console.error('[uploadCommentImageToDrive] 오류:', error);
    return { ok: false, error: error?.message };
  }
}

/**
 * 리뷰 이미지를 Drive에 업로드
 */
export async function uploadReviewImageToDrive(
  imageBuffer: Buffer,
  fileName: string,
  folderId?: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const result = await uploadFileToDrive({
      folderId: folderId || process.env.COMMUNITY_IMAGES_FOLDER_ID || null,
      fileName,
      mimeType: 'image/jpeg',
      buffer: imageBuffer,
      makePublic: true,
    });

    return result;
  } catch (error: any) {
    console.error('[uploadReviewImageToDrive] 오류:', error);
    return { ok: false, error: error?.message };
  }
}
