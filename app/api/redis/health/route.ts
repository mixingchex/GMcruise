// app/api/redis/health/route.ts
// Redis 연결 상태 확인 API

import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/redis';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const testKey = `health:check:${Date.now()}`;
    const testValue = { timestamp: Date.now(), status: 'ok' };
    
    // 쓰기 테스트
    const writeResult = await setCache(testKey, testValue, 10);
    
    if (!writeResult) {
      return NextResponse.json({
        connected: false,
        error: 'Redis 쓰기 실패 - 연결되지 않았거나 캐싱이 비활성화되었습니다',
      }, { status: 503 });
    }
    
    // 읽기 테스트
    const readValue = await getCache<typeof testValue>(testKey);
    
    if (!readValue || readValue.status !== 'ok') {
      return NextResponse.json({
        connected: false,
        error: 'Redis 읽기 실패 - 데이터가 일치하지 않습니다',
      }, { status: 503 });
    }
    
    // 삭제 테스트
    await getCache(testKey); // 한 번 더 읽기
    
    logger.log('[Redis Health Check] 연결 성공');
    
    return NextResponse.json({
      connected: true,
      status: 'ok',
      message: 'Upstash Redis 연결 정상',
      timestamp: Date.now(),
      test: {
        write: writeResult,
        read: !!readValue,
        data: readValue,
      },
    });
    
  } catch (error) {
    logger.error('[Redis Health Check] 오류:', error);
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    }, { status: 503 });
  }
}

