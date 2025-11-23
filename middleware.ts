import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { checkRateLimit, RateLimitPolicies } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip-utils';
import { securityLogger } from '@/lib/logger';

const PUBLIC = [
  '/login',
  '/admin/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/public', // 공개 쇼핑몰 API
  '/products', // 상품 페이지 (공개)
  '/youtube', // 유튜브 페이지 (공개)
  '/reviews', // 후기 페이지 (공개)
  '/community', // 커뮤니티 페이지 (공개)
  '/p', // 숏링크 리다이렉트 (공개)
  '/favicon.ico',
  '/assets',
  '/public',
  '/_next',
];

const PROTECTED = ['/chat', '/chat-test', '/onboarding', '/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 공개 경로는 통과
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  // API Rate Limiting (AI 요청은 더 엄격하게)
  if (pathname.startsWith('/api/')) {
    // Rate limiting에서 제외할 API (자주 호출되지만 보안상 위험하지 않은 API)
    const excludedFromRateLimit = [
      '/api/auth/me', // 인증 확인 API (자주 호출됨)
      '/api/analytics/track', // 분석 추적 API (자주 호출됨)
    ];
    
    // 제외 목록에 있으면 rate limiting 건너뛰기
    if (excludedFromRateLimit.some(excluded => pathname.startsWith(excluded))) {
      return NextResponse.next();
    }
    
    const clientIp = getClientIp(req);
    const isAiRequest = pathname.startsWith('/api/ai/') || 
                        pathname.startsWith('/api/ask') || 
                        pathname.startsWith('/api/chat');
    
    const policy = isAiRequest ? RateLimitPolicies.AI : RateLimitPolicies.API;
    const rateLimitKey = `api:${clientIp}:${pathname}`;
    
    const { limited, resetTime } = checkRateLimit(rateLimitKey, policy);
    
    if (limited) {
      // 보안 로그 기록
      securityLogger.rateLimitExceeded(clientIp, pathname, policy.limit);
      
      const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
      return NextResponse.json(
        { 
          ok: false, 
          error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
          retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          }
        }
      );
    }
  }

  // CSRF 토큰 검증은 각 API route에서 처리
  // (Edge Runtime에서는 Prisma를 사용할 수 없음)

  // 보호 경로: 세션 쿠키 없으면 로그인으로
  // (실제 세션 검증은 각 페이지에서 getSession()을 통해 처리)
  if (PROTECTED.some(p => pathname.startsWith(p))) {
    const sessionId = req.cookies.get('cg.sid.v2')?.value;
    if (!sessionId) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }
  // 보안 헤더 추가
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
