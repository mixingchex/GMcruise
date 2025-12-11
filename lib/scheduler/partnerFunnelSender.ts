// lib/scheduler/partnerFunnelSender.ts
// 퍼널 메시지 자동 발송 스케줄러
// AdminMessage 테이블의 예약 메시지를 파트너/관리자별 알리고 설정으로 자동 발송
// - partner_funnel: 파트너(대리점장/판매원) SMS 설정 사용
// - admin_funnel: 관리자 SMS 설정 사용

import cron from 'node-cron';
import prisma from '@/lib/prisma';

const ALIGO_BASE_URL = 'https://apis.aligo.in';

interface SmsConfig {
  apiKey: string;
  userId: string;
  senderPhone: string;
  provider: string;
  kakaoSenderKey?: string | null;
  kakaoChannelId?: string | null;
}

/**
 * 파트너의 SMS 설정 조회
 * BRANCH_MANAGER는 PartnerSmsConfig, AGENT는 AffiliateSmsConfig 사용
 */
async function getPartnerSmsConfig(profileId: number): Promise<SmsConfig | null> {
  try {
    // 먼저 프로필 타입 확인
    const profile = await prisma.affiliateProfile.findUnique({
      where: { id: profileId },
      select: { type: true },
    });

    if (!profile) {
      console.log(`[Funnel Sender] Profile ${profileId} not found`);
      return null;
    }

    const isManager = profile.type === 'BRANCH_MANAGER';

    if (isManager) {
      const config = await prisma.partnerSmsConfig.findUnique({
        where: { profileId },
      });
      if (!config || !config.isActive) {
        console.log(`[Funnel Sender] PartnerSmsConfig not found or inactive for profile ${profileId}`);
        return null;
      }
      return {
        apiKey: config.apiKey,
        userId: config.userId,
        senderPhone: config.senderPhone,
        provider: config.provider || 'aligo',
        kakaoSenderKey: config.kakaoSenderKey,
        kakaoChannelId: config.kakaoChannelId,
      };
    } else {
      const config = await prisma.affiliateSmsConfig.findUnique({
        where: { profileId },
      });
      if (!config || !config.isActive) {
        console.log(`[Funnel Sender] AffiliateSmsConfig not found or inactive for profile ${profileId}`);
        return null;
      }
      return {
        apiKey: config.apiKey,
        userId: config.userId,
        senderPhone: config.senderPhone,
        provider: config.provider || 'aligo',
        kakaoSenderKey: config.kakaoSenderKey,
        kakaoChannelId: config.kakaoChannelId,
      };
    }
  } catch (error) {
    console.error(`[Funnel Sender] Error getting SMS config for profile ${profileId}:`, error);
    return null;
  }
}

/**
 * 관리자의 SMS 설정 조회
 */
async function getAdminSmsConfig(adminId: number): Promise<SmsConfig | null> {
  try {
    const config = await prisma.adminSmsConfig.findUnique({
      where: { adminId },
    });

    if (!config || !config.isActive) {
      console.log(`[Funnel Sender] AdminSmsConfig not found or inactive for admin ${adminId}`);
      return null;
    }

    return {
      apiKey: config.apiKey,
      userId: config.userId,
      senderPhone: config.senderPhone,
      provider: config.provider || 'aligo',
      kakaoSenderKey: config.kakaoSenderKey,
      kakaoChannelId: config.kakaoChannelId,
    };
  } catch (error) {
    console.error(`[Funnel Sender] Error getting SMS config for admin ${adminId}:`, error);
    return null;
  }
}

/**
 * User 테이블에서 전화번호 조회
 */
async function getUserPhone(userId: number): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    return user?.phone || null;
  } catch (error) {
    console.error(`[Funnel Sender] Error getting phone for user ${userId}:`, error);
    return null;
  }
}

/**
 * 알리고 API로 SMS 발송
 */
async function sendSmsViaAligo(
  config: SmsConfig,
  phone: string,
  message: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const messageByteLength = new Blob([message]).size;
    const msgType = messageByteLength > 90 ? 'LMS' : 'SMS';

    const formData = new URLSearchParams();
    formData.append('key', config.apiKey);
    formData.append('user_id', config.userId);
    formData.append('sender', config.senderPhone);
    formData.append('receiver', phone.replace(/[^0-9]/g, ''));
    formData.append('msg', message);
    formData.append('msg_type', msgType);

    const response = await fetch(`${ALIGO_BASE_URL}/send/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `알리고 API 요청 실패 (${response.status}): ${text}` };
    }

    const result = await response.json();

    if (result.result_code !== '1') {
      return { success: false, error: result.message || `알리고 오류 (코드: ${result.result_code})`, result };
    }

    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 파트너 퍼널 메시지 발송 처리
 * AdminMessage 테이블에서 발송 시간이 된 파트너 퍼널 메시지를 처리
 */
async function processPartnerFunnelMessages() {
  try {
    const now = new Date();
    console.log('[Partner Funnel Sender] 🔔 Processing partner funnel messages...', { now: now.toISOString() });

    // 발송 대기 중인 파트너 퍼널 메시지 조회
    // sendAt <= now, isActive = true, metadata.source = 'partner_funnel'
    const pendingMessages = await prisma.adminMessage.findMany({
      where: {
        isActive: true,
        sendAt: {
          lte: now,
        },
      },
    });

    // 파트너 퍼널 메시지만 필터링
    const partnerFunnelMessages = pendingMessages.filter((msg) => {
      const metadata = msg.metadata as any;
      return metadata?.source === 'partner_funnel' && metadata?.leadPhone && metadata?.profileId;
    });

    console.log(`[Partner Funnel Sender] Found ${partnerFunnelMessages.length} pending partner funnel message(s)`);

    if (partnerFunnelMessages.length === 0) {
      return;
    }

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // 프로필별로 그룹화하여 SMS 설정 캐싱
    const smsConfigCache: Map<number, SmsConfig | null> = new Map();

    for (const message of partnerFunnelMessages) {
      try {
        const metadata = message.metadata as any;
        const profileId = metadata.profileId as number;
        const leadPhone = metadata.leadPhone as string;
        const leadId = metadata.leadId as number;

        // SMS 설정 가져오기 (캐싱)
        if (!smsConfigCache.has(profileId)) {
          smsConfigCache.set(profileId, await getPartnerSmsConfig(profileId));
        }
        const smsConfig = smsConfigCache.get(profileId);

        if (!smsConfig) {
          console.log(`[Partner Funnel Sender] No SMS config for profile ${profileId}, skipping message ${message.id}`);

          // SMS 설정 없음 - 메시지 비활성화
          await prisma.adminMessage.update({
            where: { id: message.id },
            data: {
              isActive: false,
              metadata: {
                ...metadata,
                sendError: 'SMS API 설정이 없거나 비활성화됨',
                sendAttemptedAt: now.toISOString(),
              },
            },
          });
          skippedCount++;
          continue;
        }

        // SMS 발송
        console.log(`[Partner Funnel Sender] Sending SMS to ${leadPhone} for message ${message.id}`);

        const sendResult = await sendSmsViaAligo(smsConfig, leadPhone, message.content);

        if (sendResult.success) {
          // 발송 성공 - 메시지 비활성화 및 발송 횟수 증가
          await prisma.adminMessage.update({
            where: { id: message.id },
            data: {
              isActive: false,
              totalSent: { increment: 1 },
              metadata: {
                ...metadata,
                sentAt: now.toISOString(),
                aligoResult: sendResult.result,
              },
            },
          });

          // 발송 로그 기록
          await prisma.adminActionLog.create({
            data: {
              adminId: message.adminId,
              targetUserId: null,
              action: 'partner_funnel.sms.sent',
              details: {
                messageId: message.id,
                leadId,
                profileId,
                phone: leadPhone,
                messageLength: message.content.length,
                funnelMessageId: metadata.funnelMessageId,
                stageNumber: metadata.stageNumber,
                aligoResult: sendResult.result,
              },
            },
          });

          sentCount++;
          console.log(`[Partner Funnel Sender] ✅ SMS sent successfully to ${leadPhone}`);
        } else {
          // 발송 실패
          console.error(`[Partner Funnel Sender] ❌ SMS failed to ${leadPhone}:`, sendResult.error);

          await prisma.adminMessage.update({
            where: { id: message.id },
            data: {
              metadata: {
                ...metadata,
                lastSendError: sendResult.error,
                lastSendAttemptAt: now.toISOString(),
                sendAttemptCount: (metadata.sendAttemptCount || 0) + 1,
              },
            },
          });

          // 3회 이상 실패하면 비활성화
          if ((metadata.sendAttemptCount || 0) + 1 >= 3) {
            await prisma.adminMessage.update({
              where: { id: message.id },
              data: {
                isActive: false,
                metadata: {
                  ...metadata,
                  finalError: '3회 발송 실패로 비활성화됨',
                  sendAttemptCount: (metadata.sendAttemptCount || 0) + 1,
                },
              },
            });
            console.log(`[Partner Funnel Sender] Message ${message.id} deactivated after 3 failed attempts`);
          }

          failedCount++;
        }
      } catch (msgError: any) {
        console.error(`[Partner Funnel Sender] Error processing message ${message.id}:`, msgError);
        failedCount++;
      }
    }

    console.log(`[Partner Funnel Sender] ✅ Processing completed: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped`);
  } catch (error) {
    console.error('[Partner Funnel Sender] ❌ Error processing partner funnel messages:', error);
  }
}

/**
 * Partner Funnel Sender 시작
 */
export function startPartnerFunnelSender() {
  console.log('[Partner Funnel Sender] 🚀 Starting Partner Funnel Sender...');

  // 매 5분마다 실행 (cron: '*/5 * * * *')
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Partner Funnel Sender] ⏰ Running partner funnel message check...');
    await processPartnerFunnelMessages();
  });

  console.log('[Partner Funnel Sender] ✅ Scheduler started');
  console.log('[Partner Funnel Sender]    - Check interval: Every 5 minutes');

  // 서버 시작 시 한 번 실행
  processPartnerFunnelMessages();
}

/**
 * 수동 실행 함수 (테스트용)
 */
export async function manualProcessPartnerFunnelMessages() {
  return processPartnerFunnelMessages();
}
