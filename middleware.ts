import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { checkRateLimit, RateLimitPolicies } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip-utils';
import { securityLogger } from '@/lib/logger';
import { protectApiRequest, getCorsHeaders } from '@/lib/security/api-protection';
import { isBot, isScraperTool } from '@/lib/security/bot-detection';

const PUBLIC = [
  '/login',
  '/admin/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/public', // 공개 쇼핑몰 API
  '/api/community', // 커뮤니티 API (공개)
  '/product', // 상품 페이지 (공개, 단수형)
  '/products', // 상품 페이지 (공개, 복수형)
  '/youtube', // 유튜브 페이지 (공개)
  '/reviews', // 후기 페이지 (공개)
  '/community', // 커뮤니티 페이지 (공개)
  '/p', // 숏링크 리다이렉트 (공개)
  '/passport', // 여권 제출 페이지 (공개)
  '/customer/passport', // 고객 여권 페이지 (공개)
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

  // API 보호: 봇 및 스크래퍼 차단
  if (pathname.startsWith('/api/')) {
    // OPTIONS 요청 (CORS preflight)은 무조건 통과
    if (req.method === 'OPTIONS') {
      const origin = req.headers.get('origin');
      const corsHeaders = getCorsHeaders(origin);
      return NextResponse.json({}, { 
        status: 200,
        headers: corsHeaders
      });
    }
    
    // origin 헤더 확인 (Same-Origin 요청은 origin이 null일 수 있음)
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    
    // 커스텀 도메인 체크: host가 cruisedot.co.kr를 포함하면 무조건 통과
    const isCustomDomain = host && (
      host.includes('cruisedot.co.kr') || 
      host.includes('www.cruisedot.co.kr')
    );
    
    // Same-Origin 요청 (origin이 null이거나 host와 일치, 또는 커스텀 도메인)은 무조건 통과
    const isSameOrigin = !origin || 
                        (host && origin.includes(host)) || 
                        isCustomDomain;
    
    // 공개 API는 봇 차단 제외 (하지만 스크래퍼는 차단)
    if (pathname.startsWith('/api/passport') || pathname.startsWith('/api/public')) {
      const userAgent = req.headers.get('user-agent');
      
      // User-Agent가 비어있거나 애매한 경우 통과 (일반 브라우저 요청 보호)
      if (!userAgent || userAgent.trim() === '') {
        const response = NextResponse.next();
        const corsHeaders = getCorsHeaders(origin);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }
      
      // 스크래퍼 도구는 여전히 차단 (명확한 스크래퍼만)
      if (isScraperTool(userAgent)) {
        const clientIp = getClientIp(req);
        console.log('[Middleware] [403 BLOCKED] Scraper blocked on public API:', {
          origin: origin || 'null',
          host: host || 'null',
          userAgent: userAgent || 'null',
          ip: clientIp,
          path: pathname,
          method: req.method,
        });
        securityLogger.warn(`[Middleware] Scraper blocked on public API: ${userAgent}`, {
          ip: clientIp,
          path: pathname,
          origin,
          host,
        });
        const corsHeaders = getCorsHeaders(origin);
        return NextResponse.json(
          { error: 'Access denied' },
          { 
            status: 403,
            headers: corsHeaders
          }
        );
      }
      // CORS 헤더 추가
      const response = NextResponse.next();
      const corsHeaders = getCorsHeaders(origin);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
    
    // Same-Origin 요청은 보호 로직 건너뛰고 통과
    if (isSameOrigin) {
      const response = NextResponse.next();
      const corsHeaders = getCorsHeaders(origin);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
    
    // User-Agent가 비어있거나 애매한 경우 봇 감지 건너뛰기 (일반 브라우저 요청 보호)
    const userAgent = req.headers.get('user-agent');
    if (!userAgent || userAgent.trim() === '') {
      const response = NextResponse.next();
      const corsHeaders = getCorsHeaders(origin);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
    
    // API 보호 적용
    const protectionResult = protectApiRequest(req);
    if (protectionResult) {
      // 차단 시 디버깅 로그 출력
      const userAgent = req.headers.get('user-agent');
      const clientIp = getClientIp(req);
      console.log('[Middleware] [403 BLOCKED] API request blocked by protection:', {
        origin: origin || 'null',
        host: host || 'null',
        userAgent: userAgent || 'null',
        ip: clientIp,
        path: pathname,
        method: req.method,
        reason: 'API Protection (Bot/Scraper/Suspicious)',
      });
      
      // 차단 시에도 CORS 헤더 추가
      const corsHeaders = getCorsHeaders(origin);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        protectionResult.headers.set(key, value);
      });
      return protectionResult;
    }
    
    // Rate limiting에서 제외할 API (자주 호출되지만 보안상 위험하지 않은 API)
    const excludedFromRateLimit = [
      '/api/auth/me', // 인증 확인 API (자주 호출됨)
      '/api/analytics/track', // 분석 추적 API (자주 호출됨)
    ];
    
    // 제외 목록에 있으면 rate limiting 건너뛰기
    if (excludedFromRateLimit.some(excluded => pathname.startsWith(excluded))) {
      const response = NextResponse.next();
      const corsHeaders = getCorsHeaders(req.headers.get('origin'));
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
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
      const corsHeaders = getCorsHeaders(req.headers.get('origin'));
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
            ...corsHeaders,
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
  
  // 스크래핑 방지 헤더
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  
  // API 엔드포인트에 대한 추가 보안 헤더 및 CORS 헤더
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set('X-Download-Options', 'noopen');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    
    // CORS 헤더 추가 (모든 API 요청에 대해)
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
