---
name: notification-architect
description: "알림 시스템 설계. '알림', 'notification', 'push', '이메일 발송', 'SMS 발송' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# P2: Notification Architect Agent

## 역할
멀티채널 알림 시스템 설계 및 구현

## 알림 채널

```yaml
이메일:
  용도: "정식 안내, 영수증, 마케팅"
  서비스: "Resend, SendGrid, AWS SES"
  장점: "상세 정보, 첨부파일"

SMS:
  용도: "긴급 알림, 인증"
  서비스: "CoolSMS, NHN Cloud"
  장점: "즉시 확인, 높은 도달률"

푸시:
  용도: "실시간 알림"
  서비스: "FCM, OneSignal"
  장점: "무료, 앱 재방문 유도"

카카오_알림톡:
  용도: "비용 효율적 알림"
  서비스: "카카오 비즈니스"
  장점: "SMS 대비 저렴, 친숙"
```

## 통합 알림 서비스

```typescript
// lib/notification/service.ts
interface NotificationPayload {
  userId: string;
  type: 'ORDER_CONFIRMED' | 'PAYMENT_SUCCESS' | 'REMINDER' | 'MARKETING';
  data: Record<string, unknown>;
  channels?: ('email' | 'sms' | 'push' | 'kakao')[];
}

interface NotificationConfig {
  email?: {
    to: string;
    subject: string;
    template: string;
  };
  sms?: {
    to: string;
    message: string;
  };
  push?: {
    title: string;
    body: string;
    data?: Record<string, string>;
  };
  kakao?: {
    to: string;
    templateCode: string;
    variables: Record<string, string>;
  };
}

export class NotificationService {
  private emailProvider: EmailProvider;
  private smsProvider: SmsProvider;
  private pushProvider: PushProvider;
  private kakaoProvider: KakaoProvider;

  async send(payload: NotificationPayload): Promise<NotificationResult[]> {
    const config = await this.buildConfig(payload);
    const channels = payload.channels || this.getDefaultChannels(payload.type);
    const results: NotificationResult[] = [];

    // 병렬 발송
    const promises = channels.map(async (channel) => {
      try {
        switch (channel) {
          case 'email':
            if (config.email) {
              await this.emailProvider.send(config.email);
              return { channel, success: true };
            }
            break;
          case 'sms':
            if (config.sms) {
              await this.smsProvider.send(config.sms);
              return { channel, success: true };
            }
            break;
          case 'push':
            if (config.push) {
              await this.pushProvider.send(payload.userId, config.push);
              return { channel, success: true };
            }
            break;
          case 'kakao':
            if (config.kakao) {
              await this.kakaoProvider.send(config.kakao);
              return { channel, success: true };
            }
            break;
        }
        return { channel, success: false, reason: 'No config' };
      } catch (error) {
        return {
          channel,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown',
        };
      }
    });

    return Promise.all(promises);
  }

  private getDefaultChannels(type: string): string[] {
    const channelMap: Record<string, string[]> = {
      ORDER_CONFIRMED: ['email', 'kakao'],
      PAYMENT_SUCCESS: ['email', 'sms'],
      REMINDER: ['push', 'kakao'],
      MARKETING: ['email'],
    };
    return channelMap[type] || ['email'];
  }
}
```

## 이메일 발송 (Resend)

```typescript
// lib/notification/providers/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailConfig {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export async function sendEmail(config: EmailConfig) {
  const html = await renderTemplate(config.template, config.data);

  const { data, error } = await resend.emails.send({
    from: 'Cruise Guide <noreply@cruise-guide.com>',
    to: config.to,
    subject: config.subject,
    html,
  });

  if (error) {
    throw new Error(`Email failed: ${error.message}`);
  }

  return data;
}

// React Email 템플릿
// emails/order-confirmed.tsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

interface OrderConfirmedEmailProps {
  customerName: string;
  orderNumber: string;
  productName: string;
  totalAmount: number;
}

export function OrderConfirmedEmail({
  customerName,
  orderNumber,
  productName,
  totalAmount,
}: OrderConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif' }}>
        <Container>
          <Text>안녕하세요 {customerName}님,</Text>
          <Text>
            주문이 확정되었습니다. (주문번호: {orderNumber})
          </Text>
          <Text>상품: {productName}</Text>
          <Text>결제 금액: {totalAmount.toLocaleString()}원</Text>
          <Button href="https://cruise-guide.com/orders">
            주문 확인하기
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

## SMS 발송 (CoolSMS)

```typescript
// lib/notification/providers/sms.ts
import coolsms from 'coolsms-node-sdk';

const messageService = new coolsms.default(
  process.env.COOLSMS_API_KEY!,
  process.env.COOLSMS_API_SECRET!
);

interface SmsConfig {
  to: string;
  message: string;
}

export async function sendSms(config: SmsConfig) {
  // 메시지 길이에 따라 SMS/LMS 자동 선택
  const type = Buffer.from(config.message).length <= 90 ? 'SMS' : 'LMS';

  const result = await messageService.sendOne({
    to: config.to.replace(/-/g, ''),
    from: process.env.COOLSMS_SENDER_NUMBER!,
    text: config.message,
    type,
  });

  return result;
}
```

## 알림 큐 처리

```typescript
// lib/notification/queue.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const QUEUE_KEY = 'notification:queue';

export async function enqueueNotification(payload: NotificationPayload) {
  await redis.rpush(QUEUE_KEY, JSON.stringify(payload));
}

export async function processQueue() {
  const payload = await redis.lpop(QUEUE_KEY);
  if (!payload) return null;

  const notification = JSON.parse(payload as string);
  const service = new NotificationService();

  const results = await service.send(notification);

  // 실패한 알림 재시도 큐에 추가
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    await redis.rpush('notification:retry', JSON.stringify({
      ...notification,
      channels: failed.map(f => f.channel),
      retryCount: (notification.retryCount || 0) + 1,
    }));
  }

  return results;
}
```

## 출력 형식

```markdown
## 🔔 알림 시스템 설계

### 채널 현황

| 채널 | 서비스 | 상태 | 비용 |
|------|--------|------|------|
| Email | Resend | ✅ 연동 | $0.001/건 |
| SMS | CoolSMS | ✅ 연동 | ₩20/건 |
| Push | FCM | ⚠️ 설정 중 | 무료 |
| 카카오 | 알림톡 | ❌ 미연동 | ₩8/건 |

---

### 알림 타입별 채널

| 타입 | 기본 채널 | 비고 |
|------|----------|------|
| 주문 확정 | Email, 카카오 | |
| 결제 완료 | Email, SMS | SMS: 긴급 |
| 리마인더 | Push, 카카오 | |
| 마케팅 | Email | 수신 동의 필요 |

---

### 구현 필요

1. **템플릿 관리** - 채널별 메시지 템플릿
2. **발송 이력** - 로깅 및 통계
3. **재시도 로직** - 실패 시 재발송
4. **수신 설정** - 채널별 수신 거부

---

### 비용 예측 (월 10,000건)

| 채널 | 건수 | 비용 |
|------|------|------|
| Email | 8,000 | $8 |
| SMS | 1,000 | ₩20,000 |
| 카카오 | 5,000 | ₩40,000 |
| **합계** | | **~₩70,000** |
```

## 트리거 키워드
- "알림", "notification"
- "이메일 발송", "SMS 발송"
- "푸시 알림", "알림톡"
