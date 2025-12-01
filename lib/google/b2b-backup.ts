
import { google } from 'googleapis';
import { getGoogleDriveAuth } from './drive';

const SPREADSHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';
const SPREADSHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';

/**
 * Appends a new B2B lead to the Google Sheet in the specified folder.
 * If no sheet exists, it creates one.
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
        // We need to use a service account or ensure the OAuth client has offline access and a valid token.
        // However, the existing `getGoogleDriveAuth` returns an OAuth2Client which needs `setCredentials`.
        // We need a way to get a valid access token.
        // Assuming the system has a way to get a system-wide token or we use a service account.
        // If `getGoogleDriveAuth` relies on user context, this background job might fail if not triggered by an admin.
        // BUT, since this is triggered by a public POST request, we need a Service Account or a stored Refresh Token.

        // CHECK: Does the project have a stored refresh token for system actions?
        // Looking at `lib/google/drive.ts`, it seems to rely on passing `accessToken` to functions.
        // We need a stored system credential.

        // For now, let's assume we can get a client with credentials if we have env vars.
        // If GOOGLE_REFRESH_TOKEN is present, we can use it.

        if (process.env.GOOGLE_REFRESH_TOKEN) {
            auth.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });
        } else {
            console.warn('[GoogleBackup] No GOOGLE_REFRESH_TOKEN found. Backup may fail if not authenticated.');
        }

        const drive = google.drive({ version: 'v3', auth });
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Find or Create Subfolder "B2B_DB_Backup"
        // Note: With new configuration, B2B_BACKUP points to a specific folder.
        // We should use it directly.
        const { getDriveFolderId } = await import('@/lib/config/drive-config');
        const targetFolderId = await getDriveFolderId('B2B_BACKUP');

        if (!targetFolderId) throw new Error('Failed to find or create backup folder (B2B_BACKUP config missing)');

        // 2. Find or Create Spreadsheet inside the subfolder
        const fileList = await drive.files.list({
            q: `'${targetFolderId}' in parents and name = 'B2B_Leads_Backup' and mimeType = '${SPREADSHEET_MIME_TYPE}' and trashed = false`,
            fields: 'files(id, name)',
        });

        let spreadsheetId = fileList.data.files?.[0]?.id;

        if (!spreadsheetId) {
            // Create new spreadsheet
            const newSheet = await drive.files.create({
                requestBody: {
                    name: 'B2B_Leads_Backup',
                    mimeType: SPREADSHEET_MIME_TYPE,
                    parents: [targetFolderId], // Create inside the new folder
                },
                fields: 'id',
            });
            spreadsheetId = newSheet.data.id;

            // Add header row
            if (spreadsheetId) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: 'A1',
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: [['이름', '연락처', '담당 파트너', '유입 경로', '등록일', '비고']],
                    },
                });
            }
        }

        if (!spreadsheetId) throw new Error('Failed to find or create spreadsheet');

        // 2. Append Data
        await sheets.spreadsheets.values.append({
            spreadsheetId,
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

        console.log('[GoogleBackup] Successfully appended lead to sheet:', spreadsheetId);
        return true;

    } catch (error) {
        console.error('[GoogleBackup] Failed to backup lead:', error);
        // Don't throw, just log. We don't want to fail the registration if backup fails.
        return false;
    }
}
