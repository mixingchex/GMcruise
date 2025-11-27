/**
 * 파트너 대시보드 통계 캐싱 유틸리티
 * 1만명 규모에서 통계 조회 성능 개선을 위한 캐싱 레이어
 */

import { logger } from '@/lib/logger';
import { getCache, setCache, deleteCache, deleteCachePattern } from '@/lib/redis';

// 메모리 캐시 (Redis가 없는 경우 사용)
const memoryCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  keyPrefix?: string;
}

/**
 * 캐시 키 생성
 */
function getCacheKey(profileId: number, type: string, options?: CacheOptions): string {
  const prefix = options?.keyPrefix || 'partner-stats';
  return `${prefix}:${profileId}:${type}`;
}

/**
 * 메모리 캐시에서 데이터 조회
 */
function getFromMemoryCache<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

/**
 * 메모리 캐시에 데이터 저장
 */
function setToMemoryCache<T>(key: string, data: T, ttl: number = CACHE_TTL_MS): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * 통계 데이터 조회 (캐시 우선)
 */
export async function getCachedStats<T>(
  profileId: number,
  type: string,
  fetchFn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const cacheKey = getCacheKey(profileId, type, options);
  const ttl = options?.ttl || CACHE_TTL_MS;

  // 1. Redis 캐시 확인 (있는 경우) - Upstash 사용
  try {
    const cached = await getCache<T>(cacheKey);
    if (cached) {
      logger.log(`[Partner Stats Cache] Redis hit: ${cacheKey}`);
      return cached;
    }
  } catch (error) {
    logger.error('[Partner Stats Cache] Redis error:', error);
    // Redis 에러 시 메모리 캐시로 폴백
  }

  // 2. 메모리 캐시 확인
  const memoryCached = getFromMemoryCache<T>(cacheKey);
  if (memoryCached) {
    logger.log(`[Partner Stats Cache] Memory hit: ${cacheKey}`);
    return memoryCached;
  }

  // 3. 캐시 미스 - 원본 데이터 조회
  logger.log(`[Partner Stats Cache] Cache miss: ${cacheKey}`);
  const data = await fetchFn();

  // 4. 캐시에 저장 - Upstash 사용
  try {
    const saved = await setCache(cacheKey, data, Math.floor(ttl / 1000));
    if (!saved) {
      // Redis 저장 실패 시 메모리 캐시에 저장
      setToMemoryCache(cacheKey, data, ttl);
    }
  } catch (error) {
    logger.error('[Partner Stats Cache] Redis set error:', error);
    // Redis 저장 실패 시 메모리 캐시에 저장
    setToMemoryCache(cacheKey, data, ttl);
  }

  return data;
}

/**
 * 통계 캐시 무효화
 */
export async function invalidateStatsCache(
  profileId: number,
  type?: string,
  options?: CacheOptions
): Promise<void> {
  const prefix = options?.keyPrefix || 'partner-stats';
  
  if (type) {
    // 특정 타입만 무효화
    const cacheKey = getCacheKey(profileId, type, options);
    
    // Redis 캐시 무효화 - Upstash 사용
    try {
      await deleteCache(cacheKey);
    } catch (error) {
      logger.error('[Partner Stats Cache] Redis delete error:', error);
    }
    
    // 메모리 캐시 무효화
    memoryCache.delete(cacheKey);
  } else {
    // 해당 프로필의 모든 통계 캐시 무효화
    const pattern = `${prefix}:${profileId}:*`;
    
    // Redis 캐시 무효화 - Upstash 사용
    try {
      await deleteCachePattern(pattern);
    } catch (error) {
      logger.error('[Partner Stats Cache] Redis delete pattern error:', error);
    }
    
    // 메모리 캐시 무효화
    for (const key of memoryCache.keys()) {
      if (key.startsWith(`${prefix}:${profileId}:`)) {
        memoryCache.delete(key);
      }
    }
  }
}

/**
 * 메모리 캐시 정리 (만료된 항목 제거)
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, cached] of memoryCache.entries()) {
    if (now > cached.expiresAt) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.log(`[Partner Stats Cache] Cleaned ${cleaned} expired cache entries`);
  }
}

// 🔵 정기적으로 만료된 캐시 정리 (10분마다, 서버 환경에서만 실행)
// 메모리 누수 방지: 전역 변수로 interval ID 저장하여 중복 실행 방지
let cacheCleanupInterval: NodeJS.Timeout | null = null;

if (typeof setInterval !== 'undefined' && !cacheCleanupInterval) {
  cacheCleanupInterval = setInterval(() => {
    cleanExpiredCache();
  }, 10 * 60 * 1000); // 10분마다
}

// 프로세스 종료 시 정리
if (typeof process !== 'undefined' && process.on) {
  process.on('SIGINT', () => {
    if (cacheCleanupInterval) {
      clearInterval(cacheCleanupInterval);
      cacheCleanupInterval = null;
    }
  });

  process.on('SIGTERM', () => {
    if (cacheCleanupInterval) {
      clearInterval(cacheCleanupInterval);
      cacheCleanupInterval = null;
    }
  });
}

