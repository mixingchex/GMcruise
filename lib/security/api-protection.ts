/**
 * API 보호 유틸리티
 * API 엔드포인트 보호 및 스크래핑 방지
 */

import { NextRequest, NextResponse } from 'next/server';
import { isBot, isSuspiciousRequest, isScraperTool } from './bot-detection';
import { securityLogger } from '@/lib/logger';

/**
 * API 요청 보호 미들웨어
 * @param req NextRequest
 * @returns NextResponse | null (차단 시)
 */
export function protectApiRequest(req: NextRequest): NextResponse | null {
  const userAgent = req.headers.get('user-agent');
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // 봇 차단
  if (isBot(userAgent)) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const path = req.nextUrl.pathname;

    securityLogger.warn('[API Protection] Bot blocked', { ip, path });

    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // 스크래퍼 도구 차단
  if (isScraperTool(userAgent)) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const path = req.nextUrl.pathname;

    securityLogger.warn('[API Protection] Scraper blocked', { ip, path });

    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // 의심스러운 요청 차단
  if (isSuspiciousRequest(userAgent, headers)) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const path = req.nextUrl.pathname;

    securityLogger.warn('[API Protection] Suspicious request blocked', { ip, path });

    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  return null; // 통과
}

/**
 * API 응답 데이터 마스킹
 * 민감한 정보를 마스킹하여 노출 방지
 */
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  const masked: any = {};
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'phone',
    'email',
    'creditCard',
    'ssn',
  ];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

    if (isSensitive && typeof value === 'string') {
      masked[key] = value.length > 4
        ? `${value.substring(0, 2)}***${value.substring(value.length - 2)}`
        : '***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * CORS 허용 origin 화이트리스트 — 정확 매칭 (WO-SEC-01)
 * * wildcard + credentials 동시 사용 금지, prefix 매칭(startsWith) 금지
 */
const BASE_ALLOWED_ORIGINS = new Set([
  'https://www.cruisedot.co.kr',
  'https://cruisedot.co.kr',
  'https://mabizcruisedot.com',
  'https://www.mabizcruisedot.com',
]);

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
} as const;

/**
 * CORS 헤더 설정
 * 허용된 도메인만 접근 가능하도록 설정
 * WO-SEC-01: * wildcard + credentials 동시 설정 금지, 정확 매칭 적용
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  // 런타임 허용 목록 (개발/Vercel Preview 동적 추가)
  const allowedOrigins = new Set(BASE_ALLOWED_ORIGINS);
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://localhost:3001');
  }
  if (process.env.VERCEL_URL) {
    allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
  }

  // origin이 null → Same-Origin 요청 (명시적 도메인 반환, * + credentials 조합 금지)
  if (!origin) {
    return {
      ...BASE_CORS_HEADERS,
      'Access-Control-Allow-Origin': 'https://cruisedot.co.kr',
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  // 슬래시 제거 후 정확 매칭 (prefix 매칭 금지 — evil.cruisedot.co.kr 차단)
  const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  const isAllowed = allowedOrigins.has(normalizedOrigin);

  if (isAllowed) {
    return {
      ...BASE_CORS_HEADERS,
      'Access-Control-Allow-Origin': normalizedOrigin,
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  // 허용되지 않은 origin: credentials 미포함, 기본 도메인 반환 (* wildcard 금지)
  return {
    ...BASE_CORS_HEADERS,
    'Access-Control-Allow-Origin': 'https://cruisedot.co.kr',
  };
}


