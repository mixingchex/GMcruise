# Error Codes System

## 에러 코드 체계

```typescript
/**
 * 애플리케이션 에러 코드
 * 형식: DOMAIN_ACTION_REASON
 */
export const ErrorCodes = {
  // Authentication (AUTH_*)
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_REFRESH_FAILED: 'AUTH_REFRESH_FAILED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // User (USER_*)
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_EMAIL_TAKEN: 'USER_EMAIL_TAKEN',
  USER_INVALID_PASSWORD: 'USER_INVALID_PASSWORD',
  USER_DEACTIVATED: 'USER_DEACTIVATED',

  // Validation (VALIDATION_*)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',

  // Resource (RESOURCE_*)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Server (SERVER_*)
  SERVER_INTERNAL_ERROR: 'SERVER_INTERNAL_ERROR',
  SERVER_SERVICE_UNAVAILABLE: 'SERVER_SERVICE_UNAVAILABLE',
  SERVER_TIMEOUT: 'SERVER_TIMEOUT',

  // Rate Limit (RATE_*)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

## HTTP 상태 코드 매핑

```typescript
/**
 * 에러 코드 → HTTP 상태 코드 매핑
 */
export const ErrorCodeToStatus: Record<ErrorCode, number> = {
  // 400 Bad Request
  [ErrorCodes.VALIDATION_FAILED]: 400,
  [ErrorCodes.VALIDATION_MISSING_FIELD]: 400,
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 400,

  // 401 Unauthorized
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCodes.AUTH_TOKEN_INVALID]: 401,
  [ErrorCodes.AUTH_UNAUTHORIZED]: 401,

  // 403 Forbidden
  [ErrorCodes.AUTH_FORBIDDEN]: 403,
  [ErrorCodes.USER_DEACTIVATED]: 403,

  // 404 Not Found
  [ErrorCodes.USER_NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,

  // 409 Conflict
  [ErrorCodes.USER_ALREADY_EXISTS]: 409,
  [ErrorCodes.USER_EMAIL_TAKEN]: 409,
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCodes.RESOURCE_CONFLICT]: 409,

  // 429 Too Many Requests
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,

  // 500 Internal Server Error
  [ErrorCodes.SERVER_INTERNAL_ERROR]: 500,

  // 503 Service Unavailable
  [ErrorCodes.SERVER_SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.SERVER_TIMEOUT]: 503,
};
```

## Custom Exception Classes

```typescript
// apps/backend/src/exceptions/api.exception.ts

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodeToStatus, FieldError } from '@monorepo/shared-api';

export class ApiException extends HttpException {
  constructor(
    code: ErrorCode,
    message: string,
    errors?: FieldError[],
  ) {
    const status = ErrorCodeToStatus[code] || HttpStatus.INTERNAL_SERVER_ERROR;
    super(
      {
        code,
        message,
        errors,
      },
      status,
    );
  }
}

// 편의 클래스들
export class ValidationException extends ApiException {
  constructor(errors: FieldError[]) {
    super(
      ErrorCodes.VALIDATION_FAILED,
      'Validation failed',
      errors,
    );
  }
}

export class NotFoundException extends ApiException {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(ErrorCodes.RESOURCE_NOT_FOUND, message);
  }
}

export class UnauthorizedException extends ApiException {
  constructor(message = 'Unauthorized') {
    super(ErrorCodes.AUTH_UNAUTHORIZED, message);
  }
}

export class ForbiddenException extends ApiException {
  constructor(message = 'Access denied') {
    super(ErrorCodes.AUTH_FORBIDDEN, message);
  }
}

export class ConflictException extends ApiException {
  constructor(resource: string, field: string) {
    super(
      ErrorCodes.RESOURCE_CONFLICT,
      `${resource} with this ${field} already exists`,
    );
  }
}

// 사용 예시
throw new NotFoundException('User', userId);
throw new ConflictException('User', 'email');
throw new ValidationException([
  { field: 'email', message: 'Invalid email format', rule: 'isEmail' },
]);
```

## Global Exception Filter

```typescript
// apps/backend/src/filters/http-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId = uuidv4();
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ErrorCodes.SERVER_INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: string | undefined;
    let errors: FieldError[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, any>;
        message = res.message || message;
        errorCode = res.code || this.statusToErrorCode(statusCode);
        errors = res.errors;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      details = process.env.NODE_ENV === 'development'
        ? exception.stack
        : undefined;
    }

    // 로깅
    this.logger.error(
      `[${traceId}] ${request.method} ${request.url} - ${statusCode}`,
      {
        traceId,
        statusCode,
        errorCode,
        message,
        path: request.url,
        method: request.method,
        ip: request.ip,
        userAgent: request.get('user-agent'),
        userId: (request as any).user?.id,
        stack: exception instanceof Error ? exception.stack : undefined,
      },
    );

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        statusCode,
        code: errorCode,
        message,
        details,
        errors,
        traceId,
      },
      timestamp,
    };

    response.status(statusCode).json(errorResponse);
  }

  private statusToErrorCode(status: number): string {
    const mapping: Record<number, string> = {
      400: ErrorCodes.VALIDATION_FAILED,
      401: ErrorCodes.AUTH_UNAUTHORIZED,
      403: ErrorCodes.AUTH_FORBIDDEN,
      404: ErrorCodes.RESOURCE_NOT_FOUND,
      409: ErrorCodes.RESOURCE_CONFLICT,
      429: ErrorCodes.RATE_LIMIT_EXCEEDED,
      500: ErrorCodes.SERVER_INTERNAL_ERROR,
      503: ErrorCodes.SERVER_SERVICE_UNAVAILABLE,
    };
    return mapping[status] || ErrorCodes.SERVER_INTERNAL_ERROR;
  }
}
```
