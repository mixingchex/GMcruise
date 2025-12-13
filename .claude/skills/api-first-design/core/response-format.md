# Standard Response Format

## 성공 응답 (Success Response)

```typescript
// packages/shared/api/types/response.ts

/**
 * 표준 성공 응답 포맷
 * 모든 API는 이 포맷을 따라야 함
 */
export interface ApiResponse<T> {
  /** 성공 여부 */
  success: true;
  /** 응답 데이터 */
  data: T;
  /** 메타 정보 (페이지네이션 등) */
  meta?: ApiMeta;
  /** 응답 시간 (ISO 8601) */
  timestamp: string;
}

export interface ApiMeta {
  /** 현재 페이지 (1부터 시작) */
  page?: number;
  /** 페이지당 항목 수 */
  limit?: number;
  /** 전체 항목 수 */
  total?: number;
  /** 전체 페이지 수 */
  totalPages?: number;
  /** 다음 페이지 존재 여부 */
  hasNext?: boolean;
  /** 이전 페이지 존재 여부 */
  hasPrev?: boolean;
}

// 사용 예시
type UserResponse = ApiResponse<User>;
type UsersListResponse = ApiResponse<User[]>;
```

## 에러 응답 (Error Response)

```typescript
/**
 * 표준 에러 응답 포맷
 * 모든 에러는 이 포맷을 따라야 함
 */
export interface ApiErrorResponse {
  /** 성공 여부 */
  success: false;
  /** 에러 정보 */
  error: ApiError;
  /** 응답 시간 (ISO 8601) */
  timestamp: string;
}

export interface ApiError {
  /** HTTP 상태 코드 */
  statusCode: number;
  /** 에러 코드 (앱 내부 코드) */
  code: string;
  /** 사용자에게 표시할 메시지 */
  message: string;
  /** 개발자용 상세 메시지 (production에서 숨김) */
  details?: string;
  /** 필드별 검증 에러 */
  errors?: FieldError[];
  /** 에러 추적 ID (로그 조회용) */
  traceId?: string;
}

export interface FieldError {
  /** 필드명 (e.g., "email", "user.address.zipCode") */
  field: string;
  /** 에러 메시지 */
  message: string;
  /** 검증 실패한 값 (민감 정보 제외) */
  value?: unknown;
  /** 검증 규칙 (e.g., "isEmail", "minLength") */
  rule?: string;
}
```

## Response DTO for Swagger

```typescript
// Wrapped Response DTO (Standard Format)

@ApiExtraModels(UserDto)
export class UserResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: UserDto })
  data!: UserDto;

  @ApiProperty({ example: '2024-01-15T09:30:00.000Z' })
  timestamp!: string;
}

@ApiExtraModels(UserDto)
export class UsersListResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: [UserDto] })
  data!: UserDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta!: ApiMetaDto;

  @ApiProperty({ example: '2024-01-15T09:30:00.000Z' })
  timestamp!: string;
}

export class ApiMetaDto {
  @ApiProperty({ example: 1, description: '현재 페이지' })
  page!: number;

  @ApiProperty({ example: 20, description: '페이지당 항목 수' })
  limit!: number;

  @ApiProperty({ example: 100, description: '전체 항목 수' })
  total!: number;

  @ApiProperty({ example: 5, description: '전체 페이지 수' })
  totalPages!: number;

  @ApiProperty({ example: true, description: '다음 페이지 존재 여부' })
  hasNext!: boolean;

  @ApiProperty({ example: false, description: '이전 페이지 존재 여부' })
  hasPrev!: boolean;
}
```

## Generic Response Helper

```typescript
// Generic 타입을 Swagger에서 처리하기 위한 헬퍼

import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';

/**
 * 표준 성공 응답 데코레이터
 */
export const ApiStandardResponse = <TModel extends Type<any>>(
  model: TModel,
  isArray = false,
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              timestamp: { type: 'string', example: '2024-01-15T09:30:00.000Z' },
            },
          },
          {
            properties: {
              data: isArray
                ? { type: 'array', items: { $ref: getSchemaPath(model) } }
                : { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
};

/**
 * 페이지네이션 응답 데코레이터
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              timestamp: { type: 'string', example: '2024-01-15T09:30:00.000Z' },
            },
          },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'number', example: 1 },
                  limit: { type: 'number', example: 20 },
                  total: { type: 'number', example: 100 },
                  totalPages: { type: 'number', example: 5 },
                  hasNext: { type: 'boolean', example: true },
                  hasPrev: { type: 'boolean', example: false },
                },
              },
            },
          },
        ],
      },
    }),
  );
};

// 사용 예시
@Controller('users')
export class UsersController {
  @Get(':id')
  @ApiStandardResponse(UserDto)  // 단일 객체
  getUser(@Param('id') id: string) {}

  @Get()
  @ApiPaginatedResponse(UserDto)  // 배열 + 페이지네이션
  getUsers(@Query() query: GetUsersQueryDto) {}
}
```
