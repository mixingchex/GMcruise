import { PartnerApiError } from '@/app/api/partner/_utils';

// Google Apps Script URL for Customer Groups
// Updated by user on 2025-12-03
const GROUP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9vkrgmtYuTIyu-muC7XaYpXl5v0jzGRNqnGI2GuYEXw9dDCaNE5lT1rzYV0pPzLOXZw/exec';

// Google Apps Script URL for My Customer Management
// Updated by user on 2025-12-03
const MANAGEMENT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbywcApub-kRMhuNzkLf5MaEPArQoGwalfVMU5fCh1a_BUGUI-t5ux0szObncbNy_Gy7/exec';

// Google Apps Script URL for Purchased Customers
// Updated by user on 2025-12-03
const PURCHASED_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbynS4vlBUNTSYGSksIJi9ca9gdDWH12y0JRK0O5iU6kmPVnDsoqIIrEUSuqK19N4Nll/exec';

interface GoogleSheetData {
  name: string;
  phone: string;
  source: string;
  productName?: string;
  channel: string;
  manager: string;
  notes?: string;
  target?: 'group' | 'management' | 'purchased'; // Default is 'group' if not specified

  // Additional fields for purchased customers (APIS format)
  reservationDate?: string; // B: 예약일
  reservationNo?: string;   // C: 예약번호
  departureDate?: string;   // E: 출발일
  cabinType?: string;       // F: 객실 종류
  paymentDate?: string;     // R: 결제일
  paymentMethod?: string;   // S: 결제방법
  amount?: number;          // T: 결제금액
  lastEditor?: string;      // V: 최종수정자
  lastEditTime?: string;    // W: 최종수정일시
}

/**
 * Sends customer data to Google Sheets via Google Apps Script.
 * @param data Customer data to send
 */
export async function sendToGoogleSheet(data: GoogleSheetData): Promise<void> {
  try {
    const timestamp = new Date().toLocaleString('ko-KR');
    let targetUrl = GROUP_SCRIPT_URL;

    if (data.target === 'management') {
      targetUrl = MANAGEMENT_SCRIPT_URL;
    } else if (data.target === 'purchased') {
      targetUrl = PURCHASED_SCRIPT_URL;
    }

    const formData = new URLSearchParams();
    formData.append('action', 'addRow');
    formData.append('timestamp', timestamp);
    formData.append('name', data.name);
    formData.append('phone', data.phone);
    formData.append('source', data.source);
    formData.append('productName', data.productName || '');
    formData.append('channel', data.channel);
    formData.append('manager', data.manager);
    formData.append('notes', data.notes || '');

    // Add extra fields for purchased customers (APIS format)
    if (data.reservationDate) formData.append('reservationDate', data.reservationDate);
    if (data.reservationNo) formData.append('reservationNo', data.reservationNo);
    if (data.departureDate) formData.append('departureDate', data.departureDate);
    if (data.cabinType) formData.append('cabinType', data.cabinType);
    if (data.paymentDate) formData.append('paymentDate', data.paymentDate);
    if (data.paymentMethod) formData.append('paymentMethod', data.paymentMethod);
    if (data.amount) formData.append('amount', data.amount.toString());
    if (data.lastEditor) formData.append('lastEditor', data.lastEditor);
    if (data.lastEditTime) formData.append('lastEditTime', data.lastEditTime);

    console.log(`[Google Sheets Backup] Sending data to ${data.target || 'group'} sheet:`, {
      name: data.name,
      phone: data.phone,
      channel: data.channel,
      manager: data.manager,
      target: data.target
    });

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const result = await response.text();
    console.log('[Google Sheets Backup] Response:', result);
  } catch (error) {
    console.error('[Google Sheets Backup] Failed to send data:', error);
    // We don't throw here to avoid failing the main operation (customer creation)
  }
}

// ============================================================================
// Stub functions for deprecated/removed APIS sync functionality
// These functions are no longer actively used but are kept for backward compatibility
// to prevent build errors in files that still import them.
// ============================================================================

interface SyncResult {
  ok: boolean;
  error?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  folderId?: string;
  rowCount?: number;
}

import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { getGoogleAuth } from '@/lib/google-drive';
import { getDriveFolderId } from '@/lib/config/drive-config';

// ... existing imports ...

// ... existing code ...

/**
 * Syncs APIS data to a Google Sheet for a specific trip.
 * Creates a new sheet from template if it doesn't exist.
 */
export async function syncApisSpreadsheet(tripId: number): Promise<SyncResult> {
  try {
    // 1. Get Trip Info with Travelers
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        Reservation: {
          include: {
            Traveler: true,
          },
        },
      },
    });

    if (!trip) {
      return { ok: false, error: 'Trip not found' };
    }

    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    let spreadsheetId = trip.spreadsheetId;

    // 2. Create Spreadsheet if not exists
    if (!spreadsheetId) {
      const templateId = await getDriveFolderId('APIS_TEMPLATE_ID');
      const apisMainFolderId = await getDriveFolderId('APIS_MAIN');

      const copyRes = await drive.files.copy({
        fileId: templateId,
        requestBody: {
          name: `[APIS] ${trip.shipName} (${new Date(trip.departureDate).toISOString().split('T')[0]})`,
          parents: apisMainFolderId ? [apisMainFolderId] : undefined,
        },
        fields: 'id, webViewLink',
        supportsAllDrives: true,
      });

      spreadsheetId = copyRes.data.id;
      if (!spreadsheetId) throw new Error('Failed to copy spreadsheet template');

      await prisma.trip.update({
        where: { id: tripId },
        data: { spreadsheetId },
      });
    }

    // 3. Prepare Data
    // Filter out canceled reservations if necessary, but usually we keep all linked travelers
    // Flatten travelers
    const travelers = trip.Reservation.flatMap(r => r.Traveler);

    // Sort by Room Number
    travelers.sort((a, b) => (a.roomNumber || 0) - (b.roomNumber || 0));

    // Map to Rows (Adjust columns based on template)
    // A: No, B: Room, C: KorName, D: EngSurname, E: EngGivenName, F: PassportNo, G: Nationality, H: DOB, I: Expiry, J: Gender
    const rows = travelers.map((t, index) => [
      index + 1,
      t.roomNumber,
      t.korName || '',
      t.engSurname || '',
      t.engGivenName || '',
      t.passportNo || '',
      t.nationality || '',
      t.birthDate || '',
      t.expiryDate || '',
      t.gender || '',
      t.issueDate || '',
    ]);

    // 4. Clear & Write Data
    // Get the first sheet name dynamically
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    });

    const sheetTitle = meta.data.sheets?.[0]?.properties?.title;
    if (!sheetTitle) {
      throw new Error('Could not find any sheet in the spreadsheet');
    }

    // We assume the data starts at A3 (Row 1-2 are headers)
    // First, clear existing data to avoid leftovers
    // Use single quotes for sheet name to handle spaces or special chars
    const range = `'${sheetTitle}'!A3:Z1000`;

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetTitle}'!A3`,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });
    }

    return {
      ok: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      rowCount: rows.length
    };

  } catch (error: any) {
    console.error('[Google Sheets] syncApisSpreadsheet Error:', error);
    return { ok: false, error: error.message || 'Failed to sync APIS spreadsheet' };
  }
}

/**
 * @deprecated This function is no longer actively used.
 * Stub implementation to prevent build errors.
 */
export async function syncToMasterApisSheet(userId: number): Promise<SyncResult> {
  console.warn(`[Google Sheets] syncToMasterApisSheet is deprecated. Called with userId=${userId}`);
  return { ok: true, error: 'Function deprecated - no operation performed' };
}

interface PostData {
  id: number;
  title: string;
  content: string;
  category: string;
  authorName: string;
  createdAt: Date;
}

interface CommentData {
  id: number;
  postId: number;
  content: string;
  authorName: string;
  createdAt: Date;
}

/**
 * @deprecated This function is no longer actively used.
 * Stub implementation to prevent build errors.
 */
export async function savePostToSheets(data: PostData): Promise<SyncResult> {
  console.warn(`[Google Sheets] savePostToSheets is deprecated. Called with postId=${data.id}`);
  return { ok: true, error: 'Function deprecated - no operation performed' };
}

/**
 * @deprecated This function is no longer actively used.
 * Stub implementation to prevent build errors.
 */
export async function saveCommentToSheets(data: CommentData): Promise<SyncResult> {
  console.warn(`[Google Sheets] saveCommentToSheets is deprecated. Called with commentId=${data.id}`);
  return { ok: true, error: 'Function deprecated - no operation performed' };
}

/**
 * @deprecated This function is no longer actively used.
 * Stub implementation to prevent build errors.
 */
export async function updatePassportLinkInApis(reservationId: number, fileUrl: string): Promise<SyncResult> {
  console.warn(`[Google Sheets] updatePassportLinkInApis is deprecated. Called with reservationId=${reservationId}`);
  return { ok: true, error: 'Function deprecated - no operation performed' };
}
