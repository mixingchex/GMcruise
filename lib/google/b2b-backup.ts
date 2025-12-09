
import { google, sheets_v4 } from 'googleapis';
import { getGoogleAuth } from '@/lib/google-drive';

// 고정된 B2B 잠재고객 백업 스프레드시트 ID
// 모든 판매원, 대리점장에서 들어오는 B2B DB가 이 시트로 백업됨
const B2B_BACKUP_SPREADSHEET_ID = '11_cfi841QGIDaBmYdjdk3aHYp2UYpCnx1QVVrgV7QJY';

// 시트별 헤더 정의
const SHEET_HEADERS: Record<string, string[]> = {
  // DB 등록 백업
  'B2B 잠재고객': ['이름', '연락처', '담당파트너', '유입경로', '등록일시', '메모'],
  '시스템 상담': ['이름', '연락처', '담당파트너', '상태', '등록일시', '문의내용'],
  // 상담기록 백업 (B2B 유입과 시스템 상담 분리)
  'B2B유입 상담기록': ['상담ID', '고객ID', '고객이름', '연락처', '상담일시', '상담내용', '상담자', '상담자유형', '다음조치일', '다음조치메모', '상담후상태', '녹음파일링크', '등록일'],
  '시스템상담 상담기록': ['노트ID', '문의ID', '고객이름', '연락처', '담당파트너', '상담일시', '상담내용', '상담자', '상담자유형', '다음조치일', '다음조치메모', '상담후상태', '녹음파일링크', '등록일'],
  // 레거시 (기존 통합 시트 - 하위 호환용)
  '상담기록': ['출처', '상담ID', '고객ID', '고객이름', '연락처', '상담일시', '상담내용', '상담자', '상담자유형', '다음조치일', '다음조치메모', '상담후상태', '녹음파일링크', '등록일'],
  '시스템문의 상담기록': ['노트ID', '문의ID', '고객이름', '연락처', '담당파트너', '상담일시', '상담내용', '상담자', '상담자유형', '다음조치일', '다음조치메모', '상담후상태', '녹음파일링크', '등록일'],
};

// 시트 존재 여부 캐시 (메모리)
const sheetExistsCache: Set<string> = new Set();

/**
 * 시트가 존재하는지 확인하고, 없으면 생성 + 헤더 추가
 */
async function ensureSheetExists(sheets: sheets_v4.Sheets, sheetName: string): Promise<void> {
  // 캐시에 있으면 스킵
  if (sheetExistsCache.has(sheetName)) {
    return;
  }

  try {
    // 스프레드시트 정보 조회
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
    });

    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

    if (!existingSheets.includes(sheetName)) {
      // 시트 생성
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      console.log(`[B2B Backup] Created new sheet: ${sheetName}`);

      // 헤더 추가
      const headers = SHEET_HEADERS[sheetName];
      if (headers) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers],
          },
        });

        // 헤더 행 스타일링 (볼드, 배경색)
        const sheetId = (await sheets.spreadsheets.get({
          spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
        })).data.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId;

        if (sheetId !== undefined) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
            requestBody: {
              requests: [
                {
                  repeatCell: {
                    range: {
                      sheetId,
                      startRowIndex: 0,
                      endRowIndex: 1,
                    },
                    cell: {
                      userEnteredFormat: {
                        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                        textFormat: { bold: true },
                      },
                    },
                    fields: 'userEnteredFormat(backgroundColor,textFormat)',
                  },
                },
                {
                  updateSheetProperties: {
                    properties: {
                      sheetId,
                      gridProperties: {
                        frozenRowCount: 1,
                      },
                    },
                    fields: 'gridProperties.frozenRowCount',
                  },
                },
              ],
            },
          });
        }

        console.log(`[B2B Backup] Added headers to sheet: ${sheetName}`);
      }
    }

    // 캐시에 추가
    sheetExistsCache.add(sheetName);
  } catch (error) {
    console.error(`[B2B Backup] Failed to ensure sheet exists: ${sheetName}`, error);
    // 에러가 나도 일단 진행 (시트가 이미 있을 수 있음)
  }
}

/**
 * Appends a new B2B lead to the fixed Google Sheet.
 * All B2B leads from all partners (branch managers and sales agents) go to this single sheet.
 */
export async function appendB2BLeadToSheet(leadData: {
    name: string;
    phone: string;
    partnerName: string;
    source: string;
    createdAt: string;
    notes?: string;
}) {
    try {
        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        // 시트가 없으면 생성
        await ensureSheetExists(sheets, 'B2B 잠재고객');

        // B2B 잠재고객 시트에 데이터 추가
        await sheets.spreadsheets.values.append({
            spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
            range: 'B2B 잠재고객!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    leadData.name,
                    leadData.phone,
                    leadData.partnerName,
                    leadData.source,
                    leadData.createdAt,
                    leadData.notes || ''
                ]],
            },
        });

        console.log('[B2B Backup] Successfully appended lead to sheet:', B2B_BACKUP_SPREADSHEET_ID);
        return true;

    } catch (error) {
        console.error('[B2B Backup] Failed to backup lead:', error);
        // Don't throw, just log. We don't want to fail the registration if backup fails.
        return false;
    }
}

/**
 * 시스템 상담 신청을 스프레드시트에 백업
 */
export async function appendSystemConsultationToSheet(data: {
    name: string;
    phone: string;
    partnerName: string;
    status: string;
    createdAt: string;
    message?: string;
}) {
    try {
        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        // 시트가 없으면 생성
        await ensureSheetExists(sheets, '시스템 상담');

        // 시스템 상담 시트에 데이터 추가
        await sheets.spreadsheets.values.append({
            spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
            range: '시스템 상담!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    data.name,
                    data.phone,
                    data.partnerName,
                    data.status,
                    data.createdAt,
                    data.message || ''
                ]],
            },
        });

        console.log('[System Consultation Backup] Successfully appended to sheet');
        return true;

    } catch (error) {
        console.error('[System Consultation Backup] Failed:', error);
        return false;
    }
}

/**
 * B2B 잠재고객 상담기록을 스프레드시트 "B2B유입 상담기록" 시트에 백업
 * 컬럼: 상담ID, 고객ID, 고객이름, 연락처, 상담일시, 상담내용, 상담자, 상담자유형, 다음조치일, 다음조치메모, 상담후상태, 녹음파일링크, 등록일
 */
export async function appendConsultationNoteToSheet(data: {
    consultationId: number;
    customerId: number;
    customerName: string;
    customerPhone: string;
    consultedAt: string;
    content: string;
    consultantName: string;
    consultantType: string; // '본사' | '대리점장' | '판매원'
    nextActionDate?: string | null;
    nextActionNote?: string | null;
    statusAfter?: string | null;
    audioFileUrl?: string | null;
    createdAt: string;
}) {
    try {
        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        // B2B유입 전용 시트가 없으면 생성
        await ensureSheetExists(sheets, 'B2B유입 상담기록');

        // B2B유입 상담기록 시트에 데이터 추가
        await sheets.spreadsheets.values.append({
            spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
            range: 'B2B유입 상담기록!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    data.consultationId,
                    data.customerId,
                    data.customerName,
                    data.customerPhone,
                    data.consultedAt,
                    data.content,
                    data.consultantName,
                    data.consultantType,
                    data.nextActionDate || '',
                    data.nextActionNote || '',
                    data.statusAfter || '',
                    data.audioFileUrl || '',
                    data.createdAt,
                ]],
            },
        });

        console.log('[B2B Consultation Note Backup] Successfully appended to B2B유입 상담기록 sheet');
        return true;

    } catch (error) {
        console.error('[B2B Consultation Note Backup] Failed:', error);
        return false;
    }
}

/**
 * 시스템 문의 상담기록을 스프레드시트 "시스템상담 상담기록" 시트에 백업
 * 컬럼: 노트ID, 문의ID, 고객이름, 연락처, 담당파트너, 상담일시, 상담내용, 상담자, 상담자유형, 다음조치일, 다음조치메모, 상담후상태, 녹음파일링크, 등록일
 */
export async function appendSystemConsultationNoteToSheet(data: {
    noteId: number;
    consultationId: number;
    customerName: string;
    customerPhone: string;
    partnerName: string;
    consultedAt: string;
    content: string;
    consultantName: string;
    consultantType: string; // '본사' | '대리점장' | '판매원'
    nextActionDate?: string | null;
    nextActionNote?: string | null;
    statusAfter?: string | null;
    audioFileUrl?: string | null;
    createdAt: string;
}) {
    try {
        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        // 시스템상담 전용 시트가 없으면 생성
        await ensureSheetExists(sheets, '시스템상담 상담기록');

        // 시스템상담 상담기록 시트에 데이터 추가
        await sheets.spreadsheets.values.append({
            spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
            range: '시스템상담 상담기록!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    data.noteId,
                    data.consultationId,
                    data.customerName,
                    data.customerPhone,
                    data.partnerName,
                    data.consultedAt,
                    data.content,
                    data.consultantName,
                    data.consultantType,
                    data.nextActionDate || '',
                    data.nextActionNote || '',
                    data.statusAfter || '',
                    data.audioFileUrl || '',
                    data.createdAt,
                ]],
            },
        });

        console.log('[System Consultation Note Backup] Successfully appended to 시스템상담 상담기록 sheet');
        return true;

    } catch (error) {
        console.error('[System Consultation Note Backup] Failed:', error);
        return false;
    }
}
