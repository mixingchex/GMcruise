// @ts-ignore - ESM import
import { Server } from 'socket.io';
import { createServer } from 'http';

// HTTP 서버 생성 (Next.js와 함께 사용 가능)
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
const rooms = new Map<string, Map<string, any>>();
// 호스트 관리 (roomId -> hostId)
const roomHosts = new Map<string, string>();

io.on('connection', (socket) => {
  const { roomId, userId, userName, isHost } = socket.handshake.query;

  if (!roomId || !userId) {
    socket.disconnect();
    return;
  }

  console.log(`[Socket] User ${userId} (${userName}) joined room ${roomId}`);

  // 방이 없으면 생성
  if (!rooms.has(roomId as string)) {
    rooms.set(roomId as string, new Map());
  }

  const room = rooms.get(roomId as string)!;
  
  // 첫 번째 참가자가 호스트
  if (room.size === 0 || isHost === 'true') {
    roomHosts.set(roomId as string, userId as string);
    console.log(`[Socket] User ${userId} is now host of room ${roomId}`);
  }
  
  room.set(userId as string, { socket, userName, isHost: roomHosts.get(roomId as string) === userId });

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
  socket.on('offer', (data: any) => {
    const target = room.get(data.to);
    if (target && target.socket) {
      target.socket.emit('offer', {
        ...data,
        from: userId,
      });
    }
  });

  // Answer 수신 및 전달
  socket.on('answer', (data: any) => {
    const target = room.get(data.to);
    if (target && target.socket) {
      target.socket.emit('answer', {
        ...data,
        from: userId,
      });
    }
  });

  // ICE Candidate 수신 및 전달
  socket.on('ice-candidate', (data: any) => {
    const target = room.get(data.to);
    if (target && target.socket) {
      target.socket.emit('ice-candidate', {
        ...data,
        from: userId,
      });
    }
  });

  // 채팅 메시지 수신 및 전달
  socket.on('chat-message', (data: any) => {
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
  socket.on('approve-participant', (data: any) => {
    // 호스트만 승인 가능
    const currentHost = roomHosts.get(roomId as string);
    if (currentHost !== userId) {
      socket.emit('error', { message: '호스트만 참가자를 승인할 수 있습니다.' });
      return;
    }
    
    const target = room.get(data.userId);
    if (target && target.socket) {
      target.socket.emit('approved', {
        roomId: roomId,
      });
    }
  });

  // 참가자 제거 (호스트만 가능)
  socket.on('remove-participant', (data: any) => {
    const currentHost = roomHosts.get(roomId as string);
    if (currentHost !== userId) {
      socket.emit('error', { message: '호스트만 참가자를 제거할 수 있습니다.' });
      return;
    }

    const target = room.get(data.userId);
    if (target && target.socket) {
      // 제거 대상에게 알림
      target.socket.emit('removed', {
        reason: '호스트에 의해 제거되었습니다.',
      });
      // 연결 종료
      target.socket.disconnect();
      
      // 다른 참가자들에게 알림
      room.forEach((participant, id) => {
        if (id !== userId && id !== data.userId && participant.socket) {
          participant.socket.emit('user-left', {
            userId: data.userId,
          });
        }
      });
      
      room.delete(data.userId as string);
      console.log(`[Socket] User ${data.userId} removed from room ${roomId} by host ${userId}`);
    }
  });

  // 호스트 전환
  socket.on('transfer-host', (data: any) => {
    const currentHost = roomHosts.get(roomId as string);
    if (currentHost !== userId) {
      socket.emit('error', { message: '호스트만 권한을 전환할 수 있습니다.' });
      return;
    }

    const newHost = room.get(data.newHostId);
    if (newHost && newHost.socket) {
      roomHosts.set(roomId as string, data.newHostId);
      
      // 기존 호스트에게 알림
      const oldHost = room.get(userId as string);
      if (oldHost) {
        oldHost.isHost = false;
      }
      
      // 새 호스트에게 알림
      newHost.isHost = true;
      newHost.socket.emit('host-transferred', {
        roomId: roomId,
      });
      
      // 모든 참가자에게 호스트 변경 알림
      room.forEach((participant) => {
        if (participant.socket) {
          participant.socket.emit('host-changed', {
            newHostId: data.newHostId,
            newHostName: newHost.userName,
          });
        }
      });
      
      console.log(`[Socket] Host transferred from ${userId} to ${data.newHostId} in room ${roomId}`);
    }
  });

  // 연결 종료
  socket.on('disconnect', () => {
    console.log(`[Socket] User ${userId} left room ${roomId}`);
    
    room.delete(userId as string);

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
      rooms.delete(roomId as string);
      roomHosts.delete(roomId as string);
      console.log(`[Socket] Room ${roomId} deleted (empty)`);
    } else {
      // 호스트가 나간 경우, 첫 번째 참가자를 새 호스트로 지정
      const currentHost = roomHosts.get(roomId as string);
      if (currentHost === userId) {
        const firstParticipant = Array.from(room.entries())[0];
        if (firstParticipant) {
          const [newHostId, newHostData] = firstParticipant;
          roomHosts.set(roomId as string, newHostId);
          newHostData.isHost = true;
          
          // 새 호스트에게 알림
          if (newHostData.socket) {
            newHostData.socket.emit('host-transferred', {
              roomId: roomId,
            });
          }
          
          // 모든 참가자에게 호스트 변경 알림
          room.forEach((participant) => {
            if (participant.socket) {
              participant.socket.emit('host-changed', {
                newHostId: newHostId,
                newHostName: newHostData.userName,
              });
            }
          });
          
          console.log(`[Socket] Host auto-transferred to ${newHostId} in room ${roomId}`);
        }
      }
    }
  });
});

// 서버 시작
const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Socket Server] Listening on port ${PORT}`);
  console.log(`[Socket Server] WebSocket path: /api/video/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Socket Server] Shutting down...');
  httpServer.close(() => {
    console.log('[Socket Server] Closed');
    process.exit(0);
  });
});

