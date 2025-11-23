import { NextRequest } from 'next/server';

// WebSocket 서버는 별도로 구현해야 합니다
// Next.js API Routes는 WebSocket을 직접 지원하지 않으므로
// 별도의 WebSocket 서버를 만들거나, 간단한 폴링 방식으로 구현할 수 있습니다

export async function GET(request: NextRequest) {
  // WebSocket 연결은 별도 서버에서 처리해야 합니다
  // 여기서는 간단한 폴링 방식의 API를 제공합니다
  return new Response('WebSocket endpoint - use /api/video/rooms for room management', {
    status: 200,
  });
}







