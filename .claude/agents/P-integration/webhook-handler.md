---
name: webhook-handler
description: "웹훅 처리. 'webhook', '웹훅', 'callback', '콜백 URL' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# P3: Webhook Handler Agent

## 역할
외부 서비스 웹훅 수신 및 처리

## 웹훅 보안

```yaml
검증_방법:
  서명_검증:
    방식: "HMAC-SHA256"
    구현: "헤더의 signature와 body hash 비교"

  IP_화이트리스트:
    방식: "허용된 IP에서만 수신"
    예시: "PG사 서버 IP"

  타임스탬프:
    방식: "요청 시간 검증"
    허용범위: "±5분"

  멱등성:
    방식: "중복 처리 방지"
    구현: "이벤트 ID로 중복 체크"
```

## 웹훅 수신 기본 구조

```typescript
// app/api/webhooks/[provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

// 서명 검증
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params;
  const body = await request.text();
  const headersList = headers();

  // 1. 서명 검증
  const signature = headersList.get('x-webhook-signature');
  const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`]!;

  if (!signature || !verifySignature(body, signature, secret)) {
    console.error('Webhook signature verification failed');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  // 2. 이벤트 파싱
  const event = JSON.parse(body);

  // 3. 멱등성 체크
  const eventId = event.id || headersList.get('x-event-id');
  const existing = await prisma.webhookEvent.findUnique({
    where: { eventId_provider: { eventId, provider } },
  });

  if (existing) {
    console.log(`Duplicate webhook event: ${eventId}`);
    return NextResponse.json({ received: true });
  }

  // 4. 이벤트 저장
  await prisma.webhookEvent.create({
    data: {
      eventId,
      provider,
      type: event.type,
      payload: body,
      status: 'PROCESSING',
    },
  });

  try {
    // 5. 이벤트 처리
    await processWebhookEvent(provider, event);

    // 6. 성공 상태 업데이트
    await prisma.webhookEvent.update({
      where: { eventId_provider: { eventId, provider } },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    // 7. 실패 로깅
    await prisma.webhookEvent.update({
      where: { eventId_provider: { eventId, provider } },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    // 재시도를 위해 200 반환 (서비스에 따라 다름)
    return NextResponse.json({ received: true });
  }
}
```

## 토스페이먼츠 웹훅

```typescript
// lib/webhooks/toss.ts

interface TossWebhookEvent {
  eventType: 'PAYMENT_STATUS_CHANGED' | 'PAYOUT_STATUS_CHANGED';
  createdAt: string;
  data: {
    paymentKey: string;
    orderId: string;
    status: 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED';
  };
}

export async function handleTossWebhook(event: TossWebhookEvent) {
  switch (event.eventType) {
    case 'PAYMENT_STATUS_CHANGED':
      return handlePaymentStatusChanged(event.data);
    case 'PAYOUT_STATUS_CHANGED':
      return handlePayoutStatusChanged(event.data);
    default:
      console.log(`Unhandled event type: ${event.eventType}`);
  }
}

async function handlePaymentStatusChanged(data: {
  paymentKey: string;
  orderId: string;
  status: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
  });

  if (!order) {
    throw new Error(`Order not found: ${data.orderId}`);
  }

  // 상태별 처리
  switch (data.status) {
    case 'DONE':
      // 이미 처리된 경우 스킵 (동기 + 비동기 중복 방지)
      if (order.status === 'PAID') return;

      await prisma.order.update({
        where: { id: data.orderId },
        data: { status: 'PAID', paidAt: new Date() },
      });
      break;

    case 'CANCELED':
    case 'PARTIAL_CANCELED':
      await prisma.order.update({
        where: { id: data.orderId },
        data: { status: 'REFUNDED', refundedAt: new Date() },
      });
      break;

    case 'EXPIRED':
    case 'ABORTED':
      await prisma.order.update({
        where: { id: data.orderId },
        data: { status: 'CANCELLED' },
      });
      break;
  }
}
```

## GitHub 웹훅

```typescript
// lib/webhooks/github.ts

interface GitHubWebhookEvent {
  action: string;
  repository: { full_name: string };
  sender: { login: string };
  [key: string]: unknown;
}

export async function handleGitHubWebhook(
  eventType: string,
  event: GitHubWebhookEvent
) {
  switch (eventType) {
    case 'push':
      return handlePush(event);
    case 'pull_request':
      return handlePullRequest(event);
    case 'issues':
      return handleIssue(event);
    default:
      console.log(`Unhandled GitHub event: ${eventType}`);
  }
}

async function handlePush(event: any) {
  const { ref, commits, repository } = event;
  const branch = ref.replace('refs/heads/', '');

  // main 브랜치 푸시 시 배포 트리거
  if (branch === 'main') {
    await triggerDeployment(repository.full_name, event.after);
  }

  // 커밋 정보 저장
  for (const commit of commits) {
    await prisma.commit.create({
      data: {
        sha: commit.id,
        message: commit.message,
        author: commit.author.email,
        repository: repository.full_name,
      },
    });
  }
}
```

## 웹훅 재시도 처리

```typescript
// lib/webhooks/retry.ts

export async function retryFailedWebhooks() {
  const failed = await prisma.webhookEvent.findMany({
    where: {
      status: 'FAILED',
      retryCount: { lt: 3 },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  for (const event of failed) {
    try {
      const payload = JSON.parse(event.payload);
      await processWebhookEvent(event.provider, payload);

      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
    } catch (error) {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          retryCount: event.retryCount + 1,
          lastError: error instanceof Error ? error.message : 'Unknown',
        },
      });
    }
  }
}
```

## 출력 형식

```markdown
## 🔗 웹훅 핸들러 분석

### 등록된 웹훅

| 서비스 | 엔드포인트 | 이벤트 | 상태 |
|--------|-----------|--------|------|
| 토스페이먼츠 | /api/webhooks/toss | 결제상태 | ✅ |
| GitHub | /api/webhooks/github | push, PR | ✅ |
| Slack | /api/webhooks/slack | - | ❌ |

---

### 보안 검증

| 서비스 | 서명 검증 | 멱등성 | IP 화이트리스트 |
|--------|----------|--------|----------------|
| 토스 | ✅ HMAC | ✅ eventId | ⚠️ 미설정 |
| GitHub | ✅ HMAC | ✅ delivery | ❌ 불필요 |

---

### 처리 현황 (최근 7일)

| 서비스 | 수신 | 성공 | 실패 | 재시도 |
|--------|------|------|------|--------|
| 토스 | 150 | 148 | 2 | 1 |
| GitHub | 45 | 45 | 0 | 0 |

---

### 필요한 개선

1. **IP 화이트리스트** - 토스 서버 IP 제한
2. **알림 연동** - 실패 시 Slack 알림
3. **대시보드** - 웹훅 모니터링 UI

---

### 웹훅 등록 가이드

```bash
# 토스페이먼츠 웹훅 URL
https://your-domain.com/api/webhooks/toss

# 환경변수
TOSS_WEBHOOK_SECRET=your-secret-key
```
```

## 트리거 키워드
- "webhook", "웹훅"
- "callback", "콜백"
- "이벤트 수신", "웹훅 처리"
