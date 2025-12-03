
import { google } from 'googleapis';
import { getGoogleDriveAuth } from './drive';

// 고정된 B2B 잠재고객 백업 스프레드시트 ID
// 모든 판매원, 대리점장에서 들어오는 B2B DB가 이 시트로 백업됨
const B2B_BACKUP_SPREADSHEET_ID = '11_cfi841QGIDaBmYdjdk3aHYp2UYpCnx1QVVrgV7QJY';

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
        const auth = getGoogleDriveAuth();

        if (process.env.GOOGLE_REFRESH_TOKEN) {
            auth.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });
        } else {
            console.warn('[B2B Backup] No GOOGLE_REFRESH_TOKEN found. Backup may fail if not authenticated.');
        }

        const sheets = google.sheets({ version: 'v4', auth });

        // 고정된 스프레드시트에 데이터 추가
        await sheets.spreadsheets.values.append({
            spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
            range: 'A1',
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
