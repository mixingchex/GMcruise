---
name: realtime-specialist
description: "실시간 기능. 'WebSocket', 'SSE', '실시간', 'Pusher', 'Socket.io' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# P4: Realtime Specialist Agent

## 역할
실시간 통신 기능 설계 및 구현

## 실시간 기술 비교

```yaml
WebSocket:
  특징: "양방향, 지속 연결"
  용도: "채팅, 게임, 협업"
  서비스: "Socket.io, Pusher"
  단점: "서버리스 어려움"

SSE (Server-Sent Events):
  특징: "단방향 (서버→클라이언트)"
  용도: "알림, 피드, 실시간 업데이트"
  장점: "HTTP 기반, 서버리스 가능"
  단점: "클라이언트→서버 불가"

Polling:
  특징: "주기적 요청"
  용도: "낮은 빈도 업데이트"
  장점: "구현 단순"
  단점: "비효율적, 지연"
```

## Pusher 연동 (서버리스 친화)

```typescript
// lib/realtime/pusher.ts
import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// 서버 사이드
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// 이벤트 발행
export async function publishEvent(
  channel: string,
  event: string,
  data: unknown
) {
  await pusherServer.trigger(channel, event, data);
}

// 채널 타입
export const channels = {
  // 공개 채널
  public: (name: string) => `public-${name}`,

  // 비공개 채널 (인증 필요)
  private: (userId: string) => `private-user-${userId}`,

  // 프레즌스 채널 (온라인 상태)
  presence: (roomId: string) => `presence-room-${roomId}`,
};
```

## 클라이언트 훅

```typescript
// hooks/usePusher.ts
'use client';

import { useEffect, useRef } from 'react';
import PusherClient from 'pusher-js';

let pusherInstance: PusherClient | null = null;

function getPusherClient() {
  if (!pusherInstance) {
    pusherInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
      }
    );
  }
  return pusherInstance;
}

export function usePusherChannel(channelName: string) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const pusher = getPusherClient();
    channelRef.current = pusher.subscribe(channelName);

    return () => {
      pusher.unsubscribe(channelName);
    };
  }, [channelName]);

  return channelRef.current;
}

export function usePusherEvent<T>(
  channelName: string,
  eventName: string,
  callback: (data: T) => void
) {
  const channel = usePusherChannel(channelName);

  useEffect(() => {
    if (!channel) return;

    channel.bind(eventName, callback);

    return () => {
      channel.unbind(eventName, callback);
    };
  }, [channel, eventName, callback]);
}

// 사용 예시
function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  usePusherEvent<Notification>(
    `private-user-${userId}`,
    'new-notification',
    (notification) => {
      setNotifications(prev => [notification, ...prev]);
    }
  );

  return <Bell count={notifications.length} />;
}
```

## SSE (Server-Sent Events)

```typescript
// app/api/sse/notifications/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  const stream = new ReadableStream({
    start(controller) {
      // 클라이언트 연결 시
      const encoder = new TextEncoder();

      // 주기적으로 이벤트 전송
      const interval = setInterval(async () => {
        // 새 알림 확인
        const notifications = await getNewNotifications(userId);

        if (notifications.length > 0) {
          const data = `data: ${JSON.stringify(notifications)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        // 연결 유지를 위한 ping
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, 3000);

      // 연결 종료 처리
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// 클라이언트
function useSSE(url: string) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [url]);

  return data;
}
```

## 채팅 구현 예시

```typescript
// components/Chat.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePusherEvent, usePusherChannel } from '@/hooks/usePusher';

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channelName = `presence-room-${roomId}`;

  // 새 메시지 수신
  usePusherEvent<Message>(channelName, 'new-message', (message) => {
    setMessages(prev => [...prev, message]);
  });

  // 메시지 전송
  const sendMessage = async () => {
    if (!input.trim()) return;

    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, content: input }),
    });

    setInput('');
  };

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className="p-2 bg-gray-100 rounded">
            <span className="font-bold">{msg.userName}: </span>
            <span>{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          className="flex-1 border rounded px-3"
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4 rounded">
          전송
        </button>
      </div>
    </div>
  );
}
```

## 출력 형식

```markdown
## ⚡ 실시간 기능 가이드

### 기술 선택

| 기능 | 권장 기술 | 이유 |
|------|----------|------|
| 알림 | Pusher | 서버리스, 쉬운 설정 |
| 채팅 | Pusher Presence | 온라인 상태 포함 |
| 피드 | SSE | 단방향으로 충분 |
| 협업 에디터 | WebSocket | 고빈도 양방향 |

---

### 현재 구현 상태

| 기능 | 상태 | 서비스 |
|------|------|--------|
| 실시간 알림 | ✅ | Pusher |
| 채팅 | ⚠️ 개발 중 | Pusher |
| 실시간 대시보드 | ❌ | - |

---

### Pusher 설정

```bash
# 환경변수
PUSHER_APP_ID=your-app-id
PUSHER_SECRET=your-secret
NEXT_PUBLIC_PUSHER_KEY=your-key
NEXT_PUBLIC_PUSHER_CLUSTER=ap3
```

---

### 비용 예측

| 플랜 | 동시 접속 | 메시지/일 | 비용 |
|------|----------|----------|------|
| Free | 100 | 200K | $0 |
| Startup | 500 | 1M | $49 |
| Pro | 2000 | 10M | $99 |

---

### 구현 체크리스트

- [x] Pusher 설정
- [x] 인증 엔드포인트
- [ ] 알림 채널 구독
- [ ] 채팅 룸 구현
- [ ] 온라인 상태 표시
```

## 트리거 키워드
- "WebSocket", "Socket.io"
- "SSE", "실시간"
- "Pusher", "실시간 알림"
