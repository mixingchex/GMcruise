# 화상 회의 시스템 설정 가이드

## 개요

WebRTC 기반 자체 화상 회의 시스템이 구현되었습니다. Zoom과 유사한 기능을 제공하며, 별도의 유료 서비스 없이 사용할 수 있습니다.

## 구현된 기능

### ✅ 완료된 기능

1. **화상 회의 컴포넌트** (`components/video/VideoConference.tsx`)
   - 실시간 비디오/오디오 통화
   - 화면 공유
   - 채팅 기능
   - 비디오/오디오 토글
   - 미팅 최소화/복원

2. **미팅 위젯** (`components/video/VideoMeetingWidget.tsx`)
   - 미팅 방 목록 조회
   - 새 미팅 생성
   - 미팅 참가

3. **API 엔드포인트** (`app/api/video/rooms/route.ts`)
   - 미팅 방 생성 (POST)
   - 미팅 방 목록 조회 (GET)

4. **데이터베이스 모델**
   - `MeetingRoom`: 미팅 방 정보
   - `MeetingParticipant`: 참가자 정보

5. **대시보드 통합**
   - 대리점장 대시보드에 통합 완료
   - 관리자 패널에 통합 완료

## ⚠️ 추가 작업 필요

### 1. WebSocket Signaling 서버

현재 WebRTC Signaling을 위한 WebSocket 서버가 필요합니다. Next.js는 WebSocket을 직접 지원하지 않으므로 다음 중 하나를 선택해야 합니다:

#### 옵션 A: 별도 WebSocket 서버 (권장)

```typescript
// server/websocket-server.ts
import { WebSocketServer } from 'ws';
import { Server } from 'http';

export function createWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/api/video/ws' });
  
  const rooms = new Map<string, Map<string, any>>();

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    const userId = url.searchParams.get('userId');
    const userName = url.searchParams.get('userName');

    if (!roomId || !userId) {
      ws.close();
      return;
    }

    // 방에 참가자 추가
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    const room = rooms.get(roomId)!;
    room.set(userId, { ws, userName });

    // 다른 참가자들에게 알림
    room.forEach((participant, id) => {
      if (id !== userId) {
        participant.ws.send(JSON.stringify({
          type: 'user-joined',
          userId,
          userName,
        }));
      }
    });

    // 메시지 수신
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      // 같은 방의 다른 참가자들에게 전달
      room.forEach((participant, id) => {
        if (id !== userId && participant.ws.readyState === 1) {
          participant.ws.send(JSON.stringify({
            ...message,
            from: userId,
          }));
        }
      });
    });

    // 연결 종료
    ws.on('close', () => {
      room.delete(userId);
      
      // 다른 참가자들에게 알림
      room.forEach((participant) => {
        if (participant.ws.readyState === 1) {
          participant.ws.send(JSON.stringify({
            type: 'user-left',
            userId,
          }));
        }
      });

      if (room.size === 0) {
        rooms.delete(roomId);
      }
    });
  });

  return wss;
}
```

#### 옵션 B: Socket.io 사용

```bash
npm install socket.io @types/socket.io
```

```typescript
// app/api/video/socket/route.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Next.js에서는 커스텀 서버가 필요합니다
```

### 2. STUN/TURN 서버 설정

#### 무료 STUN 서버 (기본 제공)
- Google STUN: `stun:stun.l.google.com:19302`
- 이미 코드에 포함되어 있습니다.

#### TURN 서버 (필요시)
NAT/방화벽 환경에서 필요할 수 있습니다:

**옵션 1: 무료 TURN 서버**
- https://www.metered.ca/stun-turn (무료 티어 제공)

**옵션 2: 자체 TURN 서버 구축**
```bash
# coturn 설치 (Ubuntu/Debian)
sudo apt-get install coturn

# 설정 파일: /etc/turnserver.conf
listening-port=3478
fingerprint
lt-cred-mech
user=username:password
realm=yourdomain.com
```

### 3. 환경 변수 설정

`.env.local`에 추가:

```bash
# WebSocket 서버 URL (옵션 A 사용시)
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# 또는 프로덕션 환경
NEXT_PUBLIC_WS_URL=wss://yourdomain.com
```

### 4. 데이터베이스 마이그레이션

```bash
# Prisma 마이그레이션 실행
npx prisma migrate dev --name add_meeting_rooms
npx prisma generate
```

## 사용 방법

### 1. 대리점장 대시보드

1. 대리점장 대시보드 접속
2. "화상 회의" 섹션에서 "화상 회의" 버튼 클릭
3. 기존 미팅 참가 또는 새 미팅 생성

### 2. 관리자 패널

1. 관리자 대시보드 접속
2. "화상 회의" 섹션에서 "화상 회의" 버튼 클릭
3. 기존 미팅 참가 또는 새 미팅 생성

## 기술 스택

- **WebRTC**: 브라우저 네이티브 WebRTC API
- **Signaling**: WebSocket (구현 필요)
- **UI**: React, Tailwind CSS
- **상태 관리**: React Hooks

## 제한사항

1. **WebSocket 서버 필요**: 현재 Signaling 서버가 구현되지 않았습니다.
2. **TURN 서버**: 복잡한 네트워크 환경에서는 TURN 서버가 필요할 수 있습니다.
3. **브라우저 호환성**: 최신 브라우저에서만 작동합니다 (Chrome, Firefox, Safari, Edge).

## 다음 단계

1. WebSocket Signaling 서버 구현
2. TURN 서버 설정 (필요시)
3. 미팅 녹화 기능 추가 (선택사항)
4. 화면 공유 개선
5. 다중 참가자 지원 개선

## 참고 자료

- [WebRTC 공식 문서](https://webrtc.org/)
- [MDN WebRTC 가이드](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Simple Peer 라이브러리](https://github.com/feross/simple-peer)







