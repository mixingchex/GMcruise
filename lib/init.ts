/**
 * 애플리케이션 초기화 함수
 * 서버 시작 시 한 번만 실행됨
 */

import { startProactiveEngine } from './scheduler/proactiveEngine';
import { startPartnerFunnelSender } from './scheduler/partnerFunnelSender';
import { startScheduledMessageSender } from './scheduler/scheduledMessageSender';
import { startAffiliateLinkCleanupScheduler } from './scheduler/affiliateLinkCleanup';
import { startSpreadsheetBackupScheduler } from './scheduler/spreadsheetBackup';
import { startTripStatusScheduler } from './scheduler/tripStatusUpdater';
import { startRePurchaseTriggerScheduler } from './scheduler/rePurchaseTrigger';
import { startLifecycleManager } from './scheduler/lifecycleManager';
import { startDatabaseBackupScheduler } from './scheduler/databaseBackup';
import { startPayslipSenderScheduler } from './scheduler/payslipSender';

let initialized = false;

export async function initializeApp() {
  if (initialized) {
    console.log('[Init] 이미 초기화되었습니다');
    return;
  }

  try {
    console.log('[Init] 애플리케이션 초기화 시작...');

    // Proactive Engine 시작
    startProactiveEngine();

    // 메시지 스케줄러 시작
    startPartnerFunnelSender();
    startScheduledMessageSender();
    startPayslipSenderScheduler();

    // 정리 및 유지보수 스케줄러 시작
    startAffiliateLinkCleanupScheduler();
    startSpreadsheetBackupScheduler();
    startTripStatusScheduler();
    startRePurchaseTriggerScheduler();
    startLifecycleManager();

    // 백업 스케줄러 시작
    startDatabaseBackupScheduler();

    initialized = true;
    console.log('[Init] 애플리케이션 초기화 완료 ✓');
  } catch (error) {
    console.error('[Init] 초기화 중 오류:', error);
  }
}

/**
 * 초기화 상태 확인
 */
export function isInitialized(): boolean {
  return initialized;
}
