import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { uploadFileToDrive } from '@/lib/google-drive';
import { findOrCreateFolder } from '@/lib/google-drive';
import dayjs from 'dayjs';
import { backupReservationsToSheet, runFullCustomerBackup } from '@/lib/google/customer-backup';

/**
 * 데이터베이스 백업 스케줄러
 * 매일 정해진 시간에 모든 DB 테이블 데이터를 구글 드라이브에 백업합니다.
 */

interface BackupResult {
  ok: boolean;
  tableName: string;
  rowCount?: number;
  fileId?: string;
  error?: string;
}

interface BackupLog {
  timestamp: string;
  totalTables: number;
  successCount: number;
  failureCount: number;
  results: BackupResult[];
  duration: number; // milliseconds
}

// 백업할 테이블 목록 (주요 테이블만 선택)
const TABLES_TO_BACKUP = [
  'User',
  'Trip',
  'Reservation',
  'Traveler',
  'AffiliateProfile',
  'AffiliateSale',
  'AffiliateLead',
  'AffiliateProduct',
  'AffiliateLedger',
  'PassportSubmission',
  'CommunityUser',
  'CustomerReview',
  'ChatHistory',
  'AdminActionLog',
] as const;

/**
 * 테이블 데이터를 엑셀 버퍼로 변환
 */
async function tableToExcelBuffer(
  tableName: string,
  data: any[]
): Promise<Buffer> {
  const workbook = XLSX.utils.book_new();
  
  // 데이터가 없으면 빈 시트 생성
  if (!data || data.length === 0) {
    const emptySheet = XLSX.utils.aoa_to_sheet([['No data']]);
    XLSX.utils.book_append_sheet(workbook, emptySheet, tableName);
  } else {
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, tableName);
  }
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * 특정 테이블 데이터 백업
 */
async function backupTable(
  tableName: string,
  backupFolderId: string
): Promise<BackupResult> {
  try {
    // @ts-ignore - Prisma 동적 모델 접근
    const model = prisma[tableName.charAt(0).toLowerCase() + tableName.slice(1)];
    
    if (!model) {
      return {
        ok: false,
        tableName,
        error: `Model ${tableName} not found in Prisma`,
      };
    }

    // 테이블 데이터 조회
    const data = await model.findMany();
    const rowCount = data.length;

    // JSON 데이터를 평탄화 (nested objects를 string으로 변환)
    const flattenedData = data.map((row: any) => {
      const flattened: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        if (value && typeof value === 'object' && !(value instanceof Date)) {
          flattened[key] = JSON.stringify(value);
        } else if (value instanceof Date) {
          flattened[key] = value.toISOString();
        } else {
          flattened[key] = value;
        }
      }
      return flattened;
    });

    // 엑셀 파일 생성
    const excelBuffer = await tableToExcelBuffer(tableName, flattenedData);

    // 파일명 생성
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
    const fileName = `${tableName}_${timestamp}.xlsx`;

    // 구글 드라이브에 업로드
    const uploadResult = await uploadFileToDrive({
      folderId: backupFolderId,
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: excelBuffer,
      makePublic: false,
    });

    if (!uploadResult.ok) {
      return {
        ok: false,
        tableName,
        rowCount,
        error: uploadResult.error || 'Upload failed',
      };
    }

    return {
      ok: true,
      tableName,
      rowCount,
      fileId: uploadResult.fileId,
    };
  } catch (error: any) {
    console.error(`[Database Backup] Error backing up table ${tableName}:`, error);
    return {
      ok: false,
      tableName,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * 모든 테이블 백업 실행
 */
export async function runDatabaseBackup(): Promise<BackupLog> {
  const startTime = Date.now();
  console.log('[Database Backup] Starting backup...');

  try {
    // 백업 폴더 생성 또는 찾기
    const today = dayjs().format('YYYY-MM-DD');
    const monthFolder = dayjs().format('YYYY-MM');
    
    // 월별 폴더 생성
    const monthFolderResult = await findOrCreateFolder(`DB_Backup_${monthFolder}`);
    if (!monthFolderResult.ok || !monthFolderResult.folderId) {
      throw new Error('Failed to create/find month folder');
    }

    // 일별 폴더 생성
    const dayFolderResult = await findOrCreateFolder(
      `Backup_${today}`,
      monthFolderResult.folderId
    );
    if (!dayFolderResult.ok || !dayFolderResult.folderId) {
      throw new Error('Failed to create/find day folder');
    }

    const backupFolderId = dayFolderResult.folderId;
    console.log(`[Database Backup] Backup folder ID: ${backupFolderId}`);

    // 모든 테이블 백업
    const results: BackupResult[] = [];
    for (const tableName of TABLES_TO_BACKUP) {
      console.log(`[Database Backup] Backing up table: ${tableName}`);
      const result = await backupTable(tableName, backupFolderId);
      results.push(result);
    }

    // 결과 집계
    const successCount = results.filter((r) => r.ok).length;
    const failureCount = results.filter((r) => !r.ok).length;
    const duration = Date.now() - startTime;

    const backupLog: BackupLog = {
      timestamp: dayjs().toISOString(),
      totalTables: TABLES_TO_BACKUP.length,
      successCount,
      failureCount,
      results,
      duration,
    };

    console.log('[Database Backup] Backup completed:', {
      successCount,
      failureCount,
      duration: `${(duration / 1000).toFixed(2)}s`,
    });

    // 백업 로그를 DB에 저장 (선택사항)
    try {
      await prisma.adminActionLog.create({
        data: {
          adminId: 1, // 시스템 관리자 ID (1번으로 가정)
          action: 'DATABASE_BACKUP',
          details: backupLog,
        },
      });
    } catch (logError) {
      console.error('[Database Backup] Failed to log backup:', logError);
    }

    return backupLog;
  } catch (error: any) {
    console.error('[Database Backup] Backup failed:', error);
    
    const duration = Date.now() - startTime;
    const backupLog: BackupLog = {
      timestamp: dayjs().toISOString(),
      totalTables: TABLES_TO_BACKUP.length,
      successCount: 0,
      failureCount: TABLES_TO_BACKUP.length,
      results: TABLES_TO_BACKUP.map((tableName) => ({
        ok: false,
        tableName,
        error: error.message || 'Backup process failed',
      })),
      duration,
    };

    // 실패 로그도 DB에 저장
    try {
      await prisma.adminActionLog.create({
        data: {
          adminId: 1,
          action: 'DATABASE_BACKUP_FAILED',
          details: backupLog,
        },
      });
    } catch (logError) {
      console.error('[Database Backup] Failed to log backup failure:', logError);
    }

    return backupLog;
  }
}

/**
 * 수동 실행용 함수 (DB 백업 + 고객 백업 + 예약 백업)
 */
export async function manualRunDatabaseBackup(): Promise<BackupLog & {
  customerBackup?: any;
  reservationBackup?: any;
}> {
  console.log('[Database Backup] Manual backup triggered');

  // 1. DB 테이블 백업
  const dbResult = await runDatabaseBackup();

  // 2. 고객 정보 스프레드시트 백업
  let customerBackupResult = null;
  try {
    console.log('[Database Backup] Starting customer spreadsheet backup...');
    customerBackupResult = await runFullCustomerBackup();
    console.log('[Database Backup] Customer backup completed:', customerBackupResult);
  } catch (error: any) {
    console.error('[Database Backup] Customer backup failed:', error);
    customerBackupResult = { ok: false, error: error.message };
  }

  // 3. 여행 예약 + 여권 스프레드시트 백업
  let reservationBackupResult = null;
  try {
    console.log('[Database Backup] Starting reservation spreadsheet backup...');
    reservationBackupResult = await backupReservationsToSheet();
    console.log('[Database Backup] Reservation backup completed:', reservationBackupResult);
  } catch (error: any) {
    console.error('[Database Backup] Reservation backup failed:', error);
    reservationBackupResult = { ok: false, error: error.message };
  }

  return {
    ...dbResult,
    customerBackup: customerBackupResult,
    reservationBackup: reservationBackupResult,
  };
}

/**
 * 데이터베이스 백업 스케줄러 시작
 * 매일 새벽 3시에 자동 백업 실행
 */
export function startDatabaseBackupScheduler() {
  const cron = require('node-cron');
  
  // 매일 새벽 3시에 실행 (KST 기준)
  cron.schedule('0 3 * * *', async () => {
    console.log('[Database Backup Scheduler] Starting scheduled backup...');
    try {
      const result = await runDatabaseBackup();
      console.log('[Database Backup Scheduler] Backup completed:', {
        successCount: result.successCount,
        failureCount: result.failureCount,
        duration: `${(result.duration / 1000).toFixed(2)}s`,
      });
    } catch (error) {
      console.error('[Database Backup Scheduler] Backup failed:', error);
    }
  }, {
    timezone: 'Asia/Seoul' // 한국 시간 기준
  });
  
  console.log('📦 [Database Backup Scheduler] Started - Will run daily at 3:00 AM KST');
}

