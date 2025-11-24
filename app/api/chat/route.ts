import { NextRequest, NextResponse } from 'next/server';
import { handleShowPhotos } from './handlers/photos';
import { handleDirections } from './handlers/directions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, mode, from, to } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'text is required' },
        { status: 400 }
      );
    }

    // show 모드: 이미지 검색
    if (mode === 'show') {
      const messages = await handleShowPhotos(text);
      return NextResponse.json({ ok: true, messages });
    }

    // go 모드: 경로 안내
    if (mode === 'go') {
      // from과 to가 있으면 사용, 없으면 text에서 파싱
      const searchText = (from && to) ? `${from}에서 ${to}까지` : text;
      const messages = handleDirections(searchText);
      return NextResponse.json({ ok: true, messages });
    }

    // translate 모드나 기타 모드는 일반 대화로 처리 (stream API 사용)
    // 여기서는 구조화된 응답이 필요한 경우만 처리
    return NextResponse.json(
      { ok: false, error: 'Unsupported mode. Use /api/chat/stream for general chat.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

