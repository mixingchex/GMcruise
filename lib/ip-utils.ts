// lib/ip-utils.ts
// IP 주소 추출 유틸리티

import { NextRequest } from 'next/server';

/**
 * 클라이언트 IP 추출 — 신뢰도 높은 순서로 우선순위 적용
 *
 * 1. request.ip    — Next.js/Vercel이 TCP 소켓으로부터 직접 주입 (위조 불가)
 * 2. x-real-ip     — Vercel이 단일 실제 IP로 설정
 * 3. cf-connecting-ip — Cloudflare 앞단 시 실제 클라이언트 IP
 * 4. x-forwarded-for 마지막 값 — rightmost-trusted (첫 번째는 클라이언트 위조 가능)
 */
export function getClientIp(request: NextRequest): string {
  if (request.ip) return request.ip;

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',');
    return ips[ips.length - 1].trim(); // rightmost (클라이언트 위조 불가 영역)
  }

  return 'unknown';
}

/**
 * Standard Request 객체에서 IP 주소 추출
 */
export function getClientIpFromRequest(request: Request, headers?: Headers): string {
  const headersToUse = headers || (request.headers as Headers);

  const forwardedFor = headersToUse.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headersToUse.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const cfIp = headersToUse.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  return 'unknown';
}

