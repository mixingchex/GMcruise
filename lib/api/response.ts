// lib/api/response.ts
// 통일된 API 응답 형식

import { NextResponse } from 'next/server';

/**
 * 성공 응답 타입
 */
export interface SuccessResponse<T> {
  ok: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
  timestamp: string;
}

/**
 * 에러 응답 타입
 */
export interface ErrorResponse {
  ok: false;
  error: string;
  details?: any;
  timestamp: string;
}

/**
 * 성공 응답 생성
 */
export function successResponse<T>(
  data: T,
  meta?: SuccessResponse<T>['meta']
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      ok: true as const,
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
 * 에러 응답 생성
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      ok: false as const,
      error: message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * 페이지네이션 메타 정보 생성
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 성공 응답 (페이지네이션 포함)
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  extraMeta?: Record<string, any>
) {
  return successResponse(data, {
    ...createPaginationMeta(page, limit, total),
    ...extraMeta,
  });
}










