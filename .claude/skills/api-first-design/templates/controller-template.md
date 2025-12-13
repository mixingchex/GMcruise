# Complete Controller Template

```typescript
// apps/backend/src/modules/users/users.controller.ts

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
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  UserResponseDto,
  UsersListResponseDto,
  GetUsersQueryDto,
  ApiErrorResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';
import { ApiStandardResponse, ApiPaginatedResponse } from '@/common/decorators';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============================================================
  // CREATE
  // ============================================================

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '사용자 생성',
    description: `
## 설명
새로운 사용자 계정을 생성합니다.

## 권한
- \`ADMIN\` 역할만 사용 가능

## 제약 조건
- 이메일은 시스템 내 유일해야 함
- 비밀번호: 8자 이상, 대소문자/숫자/특수문자 포함
    `,
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      basic: {
        summary: '기본 사용자',
        value: {
          email: 'user@example.com',
          password: 'SecurePass123!',
          name: '홍길동',
        },
      },
      admin: {
        summary: '관리자',
        value: {
          email: 'admin@example.com',
          password: 'AdminPass123!',
          name: '관리자',
          role: 'ADMIN',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '사용자 생성 성공',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청 (검증 오류)',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '이메일 중복',
    type: ApiErrorResponseDto,
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    return this.wrapResponse(user);
  }

  // ============================================================
  // READ (List)
  // ============================================================

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '사용자 목록 조회',
    description: '페이지네이션이 적용된 사용자 목록을 조회합니다.',
  })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiPaginatedResponse(UserDto)
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '인증 실패',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '권한 없음',
    type: ApiErrorResponseDto,
  })
  async findAll(@Query() query: GetUsersQueryDto): Promise<UsersListResponseDto> {
    const { data, total } = await this.usersService.findAll(query);
    return this.wrapPaginatedResponse(data, query, total);
  }

  // ============================================================
  // READ (Single)
  // ============================================================

  @Get(':id')
  @ApiOperation({
    summary: '사용자 상세 조회',
    description: '특정 사용자의 상세 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: '사용자 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiStandardResponse(UserDto)
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '사용자를 찾을 수 없음',
    type: ApiErrorResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    // 본인 또는 관리자만 조회 가능
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('자신의 정보만 조회할 수 있습니다');
    }
    const user = await this.usersService.findOne(id);
    return this.wrapResponse(user);
  }

  // ============================================================
  // UPDATE
  // ============================================================

  @Put(':id')
  @ApiOperation({
    summary: '사용자 정보 수정',
    description: '사용자 정보를 수정합니다.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: '사용자 ID',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiStandardResponse(UserDto)
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '사용자를 찾을 수 없음',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '이메일 중복',
    type: ApiErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    // 본인 또는 관리자만 수정 가능
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('자신의 정보만 수정할 수 있습니다');
    }
    // 일반 사용자는 역할 변경 불가
    if (currentUser.role !== UserRole.ADMIN && updateUserDto.role) {
      throw new ForbiddenException('역할을 변경할 권한이 없습니다');
    }
    const user = await this.usersService.update(id, updateUserDto);
    return this.wrapResponse(user);
  }

  // ============================================================
  // DELETE
  // ============================================================

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '사용자 삭제',
    description: '사용자 계정을 삭제합니다 (Soft Delete).',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: '사용자 ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '삭제 성공',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '사용자를 찾을 수 없음',
    type: ApiErrorResponseDto,
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.remove(id);
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private wrapResponse(user: User): UserResponseDto {
    return {
      success: true,
      data: this.toDto(user),
      timestamp: new Date().toISOString(),
    };
  }

  private wrapPaginatedResponse(
    users: User[],
    query: GetUsersQueryDto,
    total: number,
  ): UsersListResponseDto {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: users.map((u) => this.toDto(u)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
```
