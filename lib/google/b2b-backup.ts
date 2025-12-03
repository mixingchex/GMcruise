
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google-drive';

// 고정된 B2B 잠재고객 백업 스프레드시트 ID
// 모든 판매원, 대리점장에서 들어오는 B2B DB가 이 시트로 백업됨
const B2B_BACKUP_SPREADSHEET_ID = '11_cfi841QGIDaBmYdjdk3aHYp2UYpCnx1QVVrgV7QJY';

/**
 * 서비스 계정으로 Google API 인증
 */
// getServiceAccountAuth function removed, using getGoogleAuth directly

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
