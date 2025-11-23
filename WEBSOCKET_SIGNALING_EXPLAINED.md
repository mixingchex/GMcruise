# WebSocket Signaling 서버 설명

## 🤔 WebSocket Signaling 서버란?

### 간단한 설명
화상 회의에서 여러 사람이 서로 연결되려면 **"누가 누구와 연결해야 하는지"** 정보를 주고받아야 합니다. 이 정보 교환을 **Signaling**이라고 하고, 이를 처리하는 서버가 **Signaling 서버**입니다.

### 비유로 설명
- **WebRTC**: 실제 화상 통화 (P2P 연결)
- **Signaling 서버**: 전화번호부 역할 (누구와 연결할지 알려줌)

## 💰 비용

### ✅ 완전 무료
- **자체 서버에 구현**: 무료
- **오픈소스 라이브러리 사용**: 무료
- **별도 유료 서비스 불필요**

## 🔧 구현 방법

### 옵션 1: Socket.io 사용 (가장 쉬움) ⭐ 권장

```bash
npm install socket.io
```

**장점**:
- Next.js와 호환성 좋음
- 구현이 간단함
- 자동 재연결 지원
- 무료

**구현 예시**:
```typescript
// server/socket-server.ts
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  const { roomId, userId, userName } = socket.handshake.query;
  
  socket.join(roomId);
  
  // 다른 참가자들에게 알림
  socket.to(roomId).emit('user-joined', { userId, userName });
  
  // 메시지 전달
  socket.on('offer', (data) => {
    socket.to(data.to).emit('offer', { ...data, from: userId });
  });
  
  socket.on('disconnect', () => {
    socket.to(roomId).emit('user-left', { userId });
  });
});

httpServer.listen(3001);
```

### 옵션 2: 순수 WebSocket (ws 라이브러리)

```bash
npm install ws @types/ws
```

**장점**:
- 가벼움
- 빠른 성능
- 무료

### 옵션 3: Next.js API Routes + 폴링 (간단하지만 비효율적)

WebSocket 대신 주기적으로 서버에 요청하는 방식

**장점**:
- 구현이 매우 간단
- 별도 서버 불필요
- 무료

**단점**:
- 실시간성이 떨어짐
- 서버 부하 증가

## 📋 구현 단계

### 1단계: Socket.io 설치
```bash
cd /home/userhyeseon28/projects/cruise-guide
npm install socket.io socket.io-client
```

### 2단계: Signaling 서버 파일 생성
`server/socket-server.ts` 파일 생성

### 3단계: Next.js 설정 수정
`next.config.mjs`에 커스텀 서버 설정 추가

### 4단계: 클라이언트 코드 수정
`VideoConference.tsx`에서 WebSocket 대신 Socket.io 사용

## 🎯 실제 구현 예시

### 서버 사이드 (Node.js)
```typescript
// server/socket-server.ts
import { Server } from 'socket.io';

const io = new Server(3001, {
  cors: { origin: '*' }
});

const rooms = new Map();

io.on('connection', (socket) => {
  const { roomId, userId, userName } = socket.handshake.query;
  
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  
  const room = rooms.get(roomId);
  room.set(userId, { socket, userName });
  
  // 다른 참가자들에게 알림
  room.forEach((participant, id) => {
    if (id !== userId) {
      participant.socket.emit('user-joined', { userId, userName });
    }
  });
  
  // 메시지 전달
  socket.on('offer', (data) => {
    const target = room.get(data.to);
    if (target) {
      target.socket.emit('offer', { ...data, from: userId });
    }
  });
  
  socket.on('disconnect', () => {
    room.delete(userId);
    room.forEach((participant) => {
      participant.socket.emit('user-left', { userId });
    });
  });
});
```

### 클라이언트 사이드 (React)
```typescript
// components/video/VideoConference.tsx
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  query: { roomId, userId, userName }
});

socket.on('user-joined', (data) => {
  // 새 참가자 처리
});

socket.emit('offer', { to: userId, offer: offerData });
```

## 💡 왜 필요한가?

### WebRTC의 작동 방식
1. **Signaling**: "누구와 연결할지" 정보 교환
2. **ICE Candidate**: 네트워크 경로 찾기
3. **Offer/Answer**: 연결 설정
4. **P2P 연결**: 실제 화상 통화

**Signaling 서버 없이는 1단계가 불가능**하므로 화상 회의가 작동하지 않습니다.

## 🚀 빠른 시작 가이드

### 가장 간단한 방법 (5분 안에)

1. **Socket.io 설치**
   ```bash
   npm install socket.io socket.io-client
   ```

2. **간단한 서버 파일 생성**
   - `server/socket-server.ts` 파일 생성
   - 위의 예시 코드 복사

3. **package.json에 스크립트 추가**
   ```json
   "scripts": {
     "socket": "ts-node server/socket-server.ts"
   }
   ```

4. **서버 실행**
   ```bash
   npm run socket
   ```

5. **클라이언트 코드 수정**
   - `VideoConference.tsx`에서 Socket.io 사용

## 📊 비용 비교

| 방법 | 비용 | 구현 난이도 | 성능 |
|------|------|------------|------|
| Socket.io (자체 서버) | **무료** | ⭐ 쉬움 | ⭐⭐⭐ 우수 |
| ws 라이브러리 | **무료** | ⭐⭐ 보통 | ⭐⭐⭐ 우수 |
| 폴링 방식 | **무료** | ⭐ 매우 쉬움 | ⭐ 낮음 |
| 외부 서비스 (예: Pusher) | 유료 | ⭐ 매우 쉬움 | ⭐⭐⭐ 우수 |

## ✅ 결론

- **WebSocket Signaling 서버 = 완전 무료**
- **자체 서버에 구현 가능**
- **Socket.io 사용 시 구현이 가장 쉬움**
- **별도 유료 서비스 불필요**

## 🎯 다음 단계

1. Socket.io 설치
2. Signaling 서버 파일 생성
3. 클라이언트 코드 수정
4. 테스트

**총 소요 시간**: 약 30분-1시간
**비용**: 0원 (완전 무료)







