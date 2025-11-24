// lib/api/cache.ts
// API 응답 캐싱 레이어

import { NextResponse } from 'next/server';

// 간단한 메모리 캐시 (프로덕션에서는 Redis 사용 권장)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = 300): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 만료된 항목 정리
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

const memoryCache = new MemoryCache();

// 주기적으로 만료된 항목 정리 (5분마다)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    memoryCache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * 캐시 키 생성
 */
export function createCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}

/**
 * 캐시와 함께 데이터 가져오기
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number }
): Promise<T> {
  // 캐시에서 조회
  const cached = memoryCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // 캐시 미스 - 데이터 가져오기
  const data = await fetcher();

  // 캐시에 저장
  memoryCache.set(key, data, options?.ttl || 300); // 기본 5분

  return data;
}

/**
 * 캐시 무효화
 */
export function invalidateCache(key: string): void {
  memoryCache.delete(key);
}

/**
 * 패턴으로 캐시 무효화 (예: "dashboard:*")
 */
export function invalidateCachePattern(pattern: string): void {
  // 간단한 구현: 메모리 캐시에서는 전체 삭제
  // Redis를 사용하면 더 정교한 패턴 매칭 가능
  if (pattern.includes('*')) {
    memoryCache.clear();
  }
}

/**
 * Next.js 캐시 헤더 설정
 */
export function setCacheHeaders(
  response: NextResponse,
  options?: { maxAge?: number; staleWhileRevalidate?: number }
): NextResponse {
  const maxAge = options?.maxAge || 300; // 기본 5분
  const staleWhileRevalidate = options?.staleWhileRevalidate || 600; // 기본 10분

  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );

  return response;
}

export { memoryCache };










