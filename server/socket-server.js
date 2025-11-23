// Socket.io 서버 (JavaScript 버전 - 더 간단함)
const { Server } = require('socket.io');
const { createServer } = require('http');

// HTTP 서버 생성
const httpServer = createServer();

// Socket.io 서버 생성
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_BASE_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/api/video/ws',
});

// 방 관리 (roomId -> Map<userId, participant>)
const rooms = new Map();

io.on('connection', (socket) => {
  const { roomId, userId, userName } = socket.handshake.query;

  if (!roomId || !userId) {
    socket.disconnect();
    return;
  }

  console.log(`[Socket] User ${userId} (${userName}) joined room ${roomId}`);

  // 방이 없으면 생성
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }

  const room = rooms.get(roomId);
  room.set(userId, { socket, userName });

  // 같은 방의 다른 참가자들에게 알림
  room.forEach((participant, id) => {
    if (id !== userId) {
      participant.socket.emit('user-joined', {
        userId: userId,
        userName: userName,
      });
    }
  });

  // Offer 수신 및 전달
  socket.on('offer', (data) => {
    const target = room.get(data.to);
    if (target && target.socket) {
      target.socket.emit('offer', {
        ...data,
        from: userId,
      });
    }
  });

  // Answer 수신 및 전달
  socket.on('answer', (data) => {
    const target = room.get(data.to);
    if (target && target.socket) {
      target.socket.emit('answer', {
        ...data,
        from: userId,
      });
    }
  });

  // ICE Candidate 수신 및 전달
  socket.on('ice-candidate', (data) => {
    const target = room.get(data.to);
    if (target && target.socket) {
      target.socket.emit('ice-candidate', {
        ...data,
        from: userId,
      });
    }
  });

  // 채팅 메시지 수신 및 전달
  socket.on('chat-message', (data) => {
    // 같은 방의 모든 참가자에게 전달
    room.forEach((participant) => {
      if (participant.socket) {
        participant.socket.emit('chat-message', {
          ...data,
          userName: userName,
        });
      }
    });
  });

  // 대기실 승인
  socket.on('approve-participant', (data) => {
    const target = room.get(data.userId);
    if (target && target.socket) {
      target.socket.emit('approved', {
        roomId: roomId,
      });
    }
  });

  // 연결 종료
  socket.on('disconnect', () => {
    console.log(`[Socket] User ${userId} left room ${roomId}`);
    
    room.delete(userId);

    // 다른 참가자들에게 알림
    room.forEach((participant) => {
      if (participant.socket) {
        participant.socket.emit('user-left', {
          userId: userId,
        });
      }
    });

    // 방이 비어있으면 삭제
    if (room.size === 0) {
      rooms.delete(roomId);
      console.log(`[Socket] Room ${roomId} deleted (empty)`);
    }
  });
});

// 서버 시작
const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Socket Server] Listening on port ${PORT}`);
  console.log(`[Socket Server] WebSocket path: /api/video/ws`);
  console.log(`[Socket Server] Ready for connections!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Socket Server] Shutting down...');
  httpServer.close(() => {
    console.log('[Socket Server] Closed');
    process.exit(0);
  });
});







