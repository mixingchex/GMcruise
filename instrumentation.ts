// instrumentation.ts
// Next.js 서버 시작 시 실행되는 초기화 코드

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 [Instrumentation] Initializing server...');

    // 동적 import로 스케줄러 로드 (서버 사이드 전용)
    const { startProactiveEngine, runProactiveEngineNow } = await import('./lib/scheduler/proactiveEngine');
    const { startTripStatusScheduler } = await import('./lib/scheduler/tripStatusUpdater');
    const { startLifecycleManager } = await import('./lib/scheduler/lifecycleManager');
    const { startRePurchaseTriggerScheduler } = await import('./lib/scheduler/rePurchaseTrigger');
    const { startAffiliateLinkCleanupScheduler } = await import('./lib/scheduler/affiliateLinkCleanup');
    const { startScheduledMessageSender } = await import('./lib/scheduler/scheduledMessageSender');
    const { startPartnerFunnelSender } = await import('./lib/scheduler/partnerFunnelSender');
    const { startDatabaseBackupScheduler } = await import('./lib/scheduler/databaseBackup');
    const { startPayslipSenderScheduler } = await import('./lib/scheduler/payslipSender');
    const { startSpreadsheetBackupScheduler } = await import('./lib/scheduler/spreadsheetBackup');

    // 스케줄러 시작
    try {
      console.log('⏰ [Instrumentation] Starting schedulers...');
      
      // 1. Proactive Engine 시작 (매 10분)
      startProactiveEngine();
      
      // 2. Trip Status Updater 시작 (매일 자정)
      startTripStatusScheduler();
      
      // 3. Lifecycle Manager 시작 (동면/재활성화)
      startLifecycleManager();
      
      // 4. RePurchase Trigger Scheduler 시작 (재구매 트리거 생성)
      startRePurchaseTriggerScheduler();
      
      // 5. Affiliate Link Cleanup Scheduler 시작 (매주 월요일 새벽 3시)
      startAffiliateLinkCleanupScheduler();
      
      // 6. Scheduled Message Sender 시작 (매 5분)
      startScheduledMessageSender();

      // 7. Partner Funnel Sender 시작 (매 5분) - 파트너별 알리고 설정으로 퍼널 메시지 자동 발송
      startPartnerFunnelSender();

      // 8. Database Backup Scheduler 시작 (매일 새벽 3시)
      startDatabaseBackupScheduler();

      // 9. Payslip Sender Scheduler 시작 (매월 1일 오전 9시)
      startPayslipSenderScheduler();

      // 10. Spreadsheet Backup Scheduler 시작 (매일 오전 12시)
      startSpreadsheetBackupScheduler();
      
      console.log('✅ [Instrumentation] All schedulers started successfully');
      
      // 4. Proactive Engine 즉시 1회 실행
      console.log('🚀 [Instrumentation] Running Proactive Engine immediately...');
      await runProactiveEngineNow();
      console.log('✅ [Instrumentation] Initial Proactive Engine run completed');
    } catch (error) {
      console.error('❌ [Instrumentation] Failed to start schedulers:', error);
    }
  }
}

