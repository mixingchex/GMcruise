// lib/api/middleware.ts
// 공통 API 미들웨어 - 인증, 권한, 에러 처리

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

const SESSION_COOKIE = 'cg.sid.v2';

// 사용자 정보 타입
export interface ApiUser {
  id: number;
  role: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

// API 핸들러 타입
export type ApiHandler<T = any> = (
  req: NextRequest,
  user: ApiUser,
  context?: any
) => Promise<NextResponse<T>>;

// 인증 옵션
export interface AuthOptions {
  required?: boolean; // 기본값: true
  roles?: string[]; // 허용된 역할 목록
}

/**
 * 인증 미들웨어
 * 세션에서 사용자 정보를 가져와서 핸들러에 전달
 */
export async function withAuth<T = any>(
  handler: ApiHandler<T>,
  options: AuthOptions = {}
): Promise<(req: NextRequest) => Promise<NextResponse<T>>> {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    try {
      // 세션 쿠키 확인
      const sid = cookies().get(SESSION_COOKIE)?.value;
      
      if (!sid) {
        if (options.required !== false) {
          return errorResponse('인증이 필요합니다. 다시 로그인해 주세요.', 401) as NextResponse<T>;
        }
        // 인증이 선택적이면 user를 null로 전달
        return handler(req, null as any);
      }

      // 세션에서 사용자 정보 조회
      const session = await prisma.session.findUnique({
        where: { id: sid },
        include: {
          User: {
            select: {
              id: true,
              role: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      });

      if (!session || !session.User) {
        if (options.required !== false) {
          return errorResponse('인증이 필요합니다. 다시 로그인해 주세요.', 401) as NextResponse<T>;
        }
        return handler(req, null as any);
      }

      const user: ApiUser = {
        id: session.User.id,
        role: session.User.role,
        name: session.User.name,
        phone: session.User.phone,
        email: session.User.email,
      };

      // 역할 체크
      if (options.roles && !options.roles.includes(user.role)) {
        return errorResponse('권한이 없습니다.', 403) as NextResponse<T>;
      }

      // 핸들러 실행
      return await handler(req, user);
    } catch (error) {
      logger.error('[API Middleware] Auth error:', error);
      return handleError(error) as NextResponse<T>;
    }
  };
}

/**
 * 관리자 권한 미들웨어
 */
export async function withAdmin<T = any>(
  handler: ApiHandler<T>
): Promise<(req: NextRequest) => Promise<NextResponse<T>>> {
  return withAuth(handler, { roles: ['admin'] });
}

/**
 * 파트너 권한 미들웨어 (기존 requirePartnerContext와 유사)
 */
export async function withPartner<T = any>(
  handler: (req: NextRequest, user: ApiUser, profile: any) => Promise<NextResponse<T>>
): Promise<(req: NextRequest) => Promise<NextResponse<T>>> {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    try {
      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        return errorResponse('로그인이 필요합니다.', 401) as NextResponse<T>;
      }

      // 파트너 프로필 조회
      const profile = await prisma.affiliateProfile.findFirst({
        where: {
          userId: sessionUser.id,
          status: 'ACTIVE',
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              mallUserId: true,
              mallNickname: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (!profile) {
        return errorResponse('파트너 권한이 필요합니다. 관리자에게 문의해주세요.', 403) as NextResponse<T>;
      }

      const user: ApiUser = {
        id: sessionUser.id,
        role: sessionUser.role || '',
        name: sessionUser.name,
        phone: sessionUser.phone,
        email: null, // SessionUser에 email이 없으므로 null로 설정
      };

      return await handler(req, user, profile);
    } catch (error) {
      logger.error('[API Middleware] Partner auth error:', error);
      return handleError(error) as NextResponse<T>;
    }
  };
}

/**
 * 통일된 성공 응답
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, any>
): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * 통일된 에러 응답
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * 에러 처리
 */
export function handleError(error: unknown): NextResponse {
  logger.error('[API Middleware] Error:', error);

  if (error instanceof Error) {
    // Prisma 에러
    if (error.name === 'PrismaClientKnownRequestError') {
      return errorResponse('데이터베이스 오류가 발생했습니다.', 500, {
        code: (error as any).code,
      });
    }

    // 일반 에러
    return errorResponse(
      error.message || '서버 오류가 발생했습니다.',
      500,
      process.env.NODE_ENV === 'development' ? error.stack : undefined
    );
  }

  return errorResponse('알 수 없는 오류가 발생했습니다.', 500);
}

/**
 * 요청 본문 파싱
 */
export async function parseBody<T = any>(req: NextRequest): Promise<T> {
  try {
    return await req.json();
  } catch (error) {
    throw new Error('요청 본문을 파싱할 수 없습니다.');
  }
}

/**
 * 쿼리 파라미터 파싱
 */
export function parseQuery(req: NextRequest): URLSearchParams {
  return new URL(req.url).searchParams;
}













