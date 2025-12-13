# NestJS Swagger Decorators

## Controller Level Decorators

```typescript
import {
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

/**
 * @ApiTags - 컨트롤러를 그룹화
 * Swagger UI에서 태그별로 API 그룹핑
 */
@ApiTags('Users')  // 반드시 복수형 사용
@Controller('users')
export class UsersController {}

/**
 * @ApiBearerAuth - JWT 인증 필요 표시
 * 인증이 필요한 컨트롤러/메서드에 적용
 */
@ApiBearerAuth('access-token')  // security scheme 이름
@Controller('users')
export class UsersController {}
```

## Method Level Decorators

```typescript
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

/**
 * @ApiOperation - API 설명
 */
@ApiOperation({
  summary: '사용자 목록 조회',
  description: `
    ## 설명
    페이지네이션이 적용된 사용자 목록을 조회합니다.

    ## 권한
    - 관리자: 모든 사용자 조회 가능
    - 일반 사용자: 본인 정보만 조회 가능

    ## 필터링
    - \`role\`: 역할별 필터링
    - \`status\`: 상태별 필터링
  `,
})

/**
 * @ApiResponse - 응답 스키마 정의
 * 가능한 모든 응답 상태 코드를 정의해야 함
 */
@ApiResponse({
  status: 200,
  description: '성공',
  type: UserResponseDto,
})
@ApiResponse({
  status: 400,
  description: '잘못된 요청',
  type: ApiErrorResponseDto,
})
@ApiResponse({
  status: 401,
  description: '인증 실패',
  type: ApiErrorResponseDto,
})
@ApiResponse({
  status: 404,
  description: '사용자를 찾을 수 없음',
  type: ApiErrorResponseDto,
})

/**
 * @ApiParam - Path Parameter 정의
 */
@ApiParam({
  name: 'id',
  type: 'string',
  format: 'uuid',
  description: '사용자 고유 ID',
  example: '550e8400-e29b-41d4-a716-446655440000',
})

/**
 * @ApiQuery - Query Parameter 정의
 */
@ApiQuery({
  name: 'page',
  type: 'number',
  required: false,
  description: '페이지 번호 (1부터 시작)',
  example: 1,
})
@ApiQuery({
  name: 'limit',
  type: 'number',
  required: false,
  description: '페이지당 항목 수',
  example: 20,
})
@ApiQuery({
  name: 'role',
  enum: UserRole,
  required: false,
  description: '역할 필터',
})

/**
 * @ApiBody - Request Body 정의
 */
@ApiBody({
  type: CreateUserDto,
  description: '사용자 생성 정보',
  examples: {
    basic: {
      summary: '기본 예시',
      value: {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: '홍길동',
      },
    },
    withPhone: {
      summary: '전화번호 포함',
      value: {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: '홍길동',
        phone: '010-1234-5678',
      },
    },
  },
})
```

## DTO Decorators

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';

// Request DTO
export class CreateUserDto {
  /**
   * @ApiProperty - 필수 필드
   */
  @ApiProperty({
    description: '사용자 이메일 주소',
    example: 'user@example.com',
    format: 'email',
    maxLength: 255,
  })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    description: '비밀번호 (8자 이상, 대소문자/숫자/특수문자 포함)',
    example: 'SecurePass123!',
    minLength: 8,
    maxLength: 100,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$',
  })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다' })
  @MaxLength(100)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    { message: '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다' },
  )
  password!: string;

  @ApiProperty({
    description: '사용자 이름',
    example: '홍길동',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  /**
   * @ApiPropertyOptional - 선택적 필드
   */
  @ApiPropertyOptional({
    description: '전화번호',
    example: '010-1234-5678',
    pattern: '^01[0-9]-\\d{3,4}-\\d{4}$',
  })
  @IsOptional()
  @Matches(/^01[0-9]-\d{3,4}-\d{4}$/, {
    message: '올바른 전화번호 형식이 아닙니다'
  })
  phone?: string;

  @ApiPropertyOptional({
    description: '사용자 역할',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

// Response DTO
export class UserDto {
  @ApiProperty({
    description: '사용자 고유 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: '이메일 주소',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: '사용자 이름',
    example: '홍길동',
  })
  name!: string;

  @ApiPropertyOptional({
    description: '전화번호',
    example: '010-1234-5678',
  })
  phone?: string;

  @ApiProperty({
    description: '사용자 역할',
    enum: UserRole,
    example: UserRole.USER,
  })
  role!: UserRole;

  @ApiProperty({
    description: '계정 생성일',
    example: '2024-01-15T09:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: '마지막 수정일',
    example: '2024-01-15T09:30:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
```

## Swagger 설정 (main.ts)

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('MonoRepo API')
  .setDescription('API Documentation')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Enter JWT token',
      in: 'header',
    },
    'access-token',
  )
  .addTag('Auth', '인증 관련 API')
  .addTag('Users', '사용자 관련 API')
  .addServer('http://localhost:3000', 'Local Development')
  .addServer('https://api.example.com', 'Production')
  .build();

const document = SwaggerModule.createDocument(app, config);

SwaggerModule.setup('api/docs', app, document, {
  swaggerOptions: {
    persistAuthorization: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
  },
  customSiteTitle: 'MonoRepo API Docs',
});
```
