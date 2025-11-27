/**
 * 정액제 판매원 자동 백업 유틸리티
 * 재시도 로직 및 안정성 개선
 */

import { logger } from '@/lib/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1초

/**
 * 자동 백업 API 호출 (재시도 로직 포함)
 */
export async function callAutoBackup(
  userId: number | string,
  trigger: string = 'auto',
  retryCount: number = 0
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const backupUrl = `${baseUrl}/api/admin/subscription/auto-backup`;

  try {
    const response = await fetch(backupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 내부 API 토큰 추가 (보안 강화)
        'X-Internal-API-Token': process.env.INTERNAL_API_TOKEN || 'internal-backup-token',
      },
      body: JSON.stringify({
        userId: userId.toString(),
        trigger,
      }),
      // 타임아웃 설정 (10초)
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Backup API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.message || 'Backup failed');
    }

    logger.log('[Auto Backup] Success:', { userId, trigger, retryCount });
    return { success: true };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    
    // 재시도 가능한 경우 재시도
    if (retryCount < MAX_RETRIES && !errorMessage.includes('timeout')) {
      logger.warn(`[Auto Backup] Retry ${retryCount + 1}/${MAX_RETRIES}:`, { userId, trigger, error: errorMessage });
      
      // 지수 백오프: 1초, 2초, 4초
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return callAutoBackup(userId, trigger, retryCount + 1);
    }

    // 최종 실패
    logger.error('[Auto Backup] Final failure:', { userId, trigger, retryCount, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * 비동기 백업 호출 (논블로킹)
 * 메인 로직에 영향을 주지 않도록 백그라운드에서 실행
 */
export function callAutoBackupAsync(
  userId: number | string,
  trigger: string = 'auto'
): void {
  // 비동기로 실행하여 메인 로직을 블로킹하지 않음
  callAutoBackup(userId, trigger).catch((error) => {
    logger.error('[Auto Backup] Async call failed:', { userId, trigger, error });
  });
}

