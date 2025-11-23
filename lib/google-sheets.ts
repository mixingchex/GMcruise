// lib/google-sheets.ts
// 구글 시트 동기화 유틸리티

import prisma from '@/lib/prisma';

/**
 * APIS 구글 시트 동기화
 * TODO: 실제 구현 필요 (현재는 빈 구현)
 */
export async function syncApisSpreadsheet(tripId: number): Promise<{
  ok: boolean;
  spreadsheetId?: string;
  folderId?: string;
  rowCount?: number;
  error?: string;
}> {
  try {
    console.log('[syncApisSpreadsheet] Trip ID:', tripId);
    
    // TODO: 실제 구글 시트 동기화 로직 구현
    // 현재는 빈 구현으로 빌드 에러 방지
    
    return {
      ok: true,
      spreadsheetId: `temp-${tripId}`,
    };
  } catch (error: any) {
    console.error('[syncApisSpreadsheet] Error:', error);
    return {
      ok: false,
      error: error.message || '구글 시트 동기화 중 오류가 발생했습니다.',
    };
  }
}






