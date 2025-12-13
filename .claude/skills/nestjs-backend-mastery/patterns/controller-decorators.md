# Controller Decorators Standard

> NestJS Controller에서 필수 데코레이터와 타입 안전성 가이드

## 핵심 원칙

```yaml
Type_Strict_Principle:
  목표: "웹/모바일에서 DTO를 가져다 쓸 수 있도록 완전하게"
  이유:
    - 타입/endpoint 미추출 시 inline interface 사용
    - 수정 시 유지보수 x3 (Backend + Web + Mobile)
    - build로 문제 캐치 불가 → 런타임 버그
```

---

## 1. 필수 데코레이터 체크리스트

### Controller 레벨

| 데코레이터 | 필수 | 용도 |
|-----------|-----|------|
| `@Controller('path')` | ✅ | 라우트 경로 |
| `@ApiTags('Resources')` | ✅ | Swagger 그룹 (복수형) |
| `@ApiBearerAuth('access-token')` | 조건부 | 인증 필요 시 |
| `@UseGuards(JwtAuthGuard)` | 조건부 | 인증 가드 |

### Method 레벨

| 데코레이터 | 필수 | 용도 |
|-----------|-----|------|
| `@Get/@Post/@Put/@Delete` | ✅ | HTTP 메서드 |
| `@ApiOperation({ summary })` | ✅ | API 설명 |
| `@ApiResponse({ status, type })` | ✅ | 모든 응답 타입 |
| `@ApiParam()` | 조건부 | Path 파라미터 |
| `@ApiQuery()` | 조건부 | Query 파라미터 |
| `@ApiBody({ type })` | 조건부 | Request Body |
| `@HttpCode(HttpStatus.*)` | 조건부 | 상태 코드 지정 |

### Parameter 레벨

| 데코레이터 | 필수 | 용도 |
|-----------|-----|------|
| `@Body()` | 조건부 | Request Body |
| `@Param('id', ParseUUIDPipe)` | 조건부 | Path 파라미터 + 파이프 |
| `@Query()` | 조건부 | Query 파라미터 |

---

## 2. 완전한 Controller 템플릿

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  GetUsersQueryDto,
  UserResponseDto,
} from './dto';
import { ApiSuccessResponse, ApiErrorResponse } from '@/common/dto';

@Controller('users')
@ApiTags('Users')                          // 1. 복수형 리소스명
@ApiBearerAuth('access-token')             // 2. 인증 스키마명
@UseGuards(JwtAuthGuard, RolesGuard)       // 3. 가드 적용
@ApiExtraModels(UserResponseDto)           // 4. 추가 모델 등록
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ════════════════════════════════════════
  // CREATE
  // ════════════════════════════════════════
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)            // 201 명시
  @ApiOperation({
    summary: '사용자 생성',
    description: '새로운 사용자 계정을 생성합니다. 관리자 권한 필요.',
  })
  @ApiBody({ type: CreateUserDto })        // Request Body 타입
  @ApiResponse({
    status: 201,
    description: '생성 성공',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '검증 실패',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음',
  })
  @ApiResponse({
    status: 409,
    description: '이메일 중복',
  })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {            // 반환 타입 명시!
    return this.usersService.create(createUserDto);
  }

  // ════════════════════════════════════════
  // READ (List)
  // ════════════════════════════════════════
  @Get()
  @ApiOperation({
    summary: '사용자 목록 조회',
    description: '페이지네이션이 적용된 사용자 목록',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    example: 1,
    description: '페이지 번호',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    example: 20,
    description: '페이지당 항목 수',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: '검색어',
  })
  @ApiQuery({
    name: 'role',
    enum: ['user', 'admin', 'super-admin'],
    required: false,
    description: '역할 필터',
  })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: [UserResponseDto],               // 배열 표시
  })
  async findAll(
    @Query() query: GetUsersQueryDto,
  ): Promise<UserResponseDto[]> {
    return this.usersService.findAll(query);
  }

  // ════════════════════════════════════════
  // READ (Single)
  // ════════════════════════════════════════
  @Get(':id')
  @ApiOperation({ summary: '사용자 상세 조회' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',                        // UUID 형식 명시
    description: '사용자 고유 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '사용자 없음',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,  // UUID 파이프로 검증
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  // ════════════════════════════════════════
  // UPDATE
  // ════════════════════════════════════════
  @Put(':id')
  @ApiOperation({ summary: '사용자 정보 수정' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: '수정 성공',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: '검증 실패' })
  @ApiResponse({ status: 404, description: '사용자 없음' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  // ════════════════════════════════════════
  // DELETE
  // ════════════════════════════════════════
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)         // 204 No Content
  @ApiOperation({ summary: '사용자 삭제' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 204, description: '삭제 성공' })
  @ApiResponse({ status: 404, description: '사용자 없음' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.usersService.remove(id);
  }
}
```

---

## 3. DTO 클래스 정의 (nestjs-zod)

```typescript
// users/dto/create-user.dto.ts

import { createZodDto } from 'nestjs-zod';
import { createUserSchema } from '@myapp/shared';

export class CreateUserDto extends createZodDto(createUserSchema) {}

// users/dto/update-user.dto.ts

import { createZodDto } from 'nestjs-zod';
import { updateUserSchema } from '@myapp/shared';

export class UpdateUserDto extends createZodDto(updateUserSchema) {}

// users/dto/get-users-query.dto.ts

import { createZodDto } from 'nestjs-zod';
import { getUsersQuerySchema } from '@myapp/shared';

export class GetUsersQueryDto extends createZodDto(getUsersQuerySchema) {}
```

---

## 4. Response DTO with ApiProperty

```typescript
// users/dto/user-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({
    description: '사용자 고유 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '이메일 주소',
    example: 'user@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: '사용자 이름',
    example: '홍길동',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: '사용자 역할',
    enum: ['user', 'admin', 'super-admin'],
    example: 'user',
  })
  @Expose()
  role: string;

  @ApiProperty({
    description: '계정 활성화 상태',
    example: true,
  })
  @Expose()
  isActive: boolean;

  @Exclude()  // 응답에서 제외!
  password: string;

  @ApiProperty({
    description: '생성일시',
    example: '2024-01-15T09:30:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional({
    description: '프로필 이미지 URL',
    example: 'https://example.com/avatar.jpg',
  })
  @Expose()
  avatarUrl?: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
```

---

## 5. ParsePipe 활용

```typescript
import {
  ParseIntPipe,
  ParseUUIDPipe,
  ParseBoolPipe,
  ParseArrayPipe,
  DefaultValuePipe,
  ParseEnumPipe,
} from '@nestjs/common';

@Controller('products')
export class ProductsController {
  @Get()
  findAll(
    // 기본값 + 타입 변환
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page: number,

    @Query('limit', new DefaultValuePipe(20), ParseIntPipe)
    limit: number,

    @Query('active', new DefaultValuePipe(true), ParseBoolPipe)
    active: boolean,

    // Enum 검증
    @Query('status', new ParseEnumPipe(ProductStatus))
    status: ProductStatus,

    // 배열 파싱
    @Query('ids', new ParseArrayPipe({ items: String, separator: ',' }))
    ids: string[],
  ) {}

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,  // UUID 검증
  ) {}
}
```

---

## 6. 체크리스트

```markdown
## Controller 작성 시 체크리스트

### Controller 레벨
- [ ] @ApiTags('복수형') 적용
- [ ] @ApiBearerAuth() 인증 필요시 적용
- [ ] @UseGuards() 가드 적용

### 각 Method
- [ ] @ApiOperation({ summary }) 작성
- [ ] @ApiResponse({ status, type }) 모든 응답 코드 정의
- [ ] @ApiParam() Path 파라미터 문서화
- [ ] @ApiQuery() Query 파라미터 문서화
- [ ] @ApiBody({ type }) Request Body 타입 명시
- [ ] 반환 타입 Promise<T> 명시
- [ ] ParsePipe로 런타임 검증

### DTO
- [ ] Request DTO는 nestjs-zod로 정의
- [ ] Response DTO는 @ApiProperty() 포함
- [ ] 민감 정보 @Exclude() 처리
```

---

**Version**: 1.0.0
