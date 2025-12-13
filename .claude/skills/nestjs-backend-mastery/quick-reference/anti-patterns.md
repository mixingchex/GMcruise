# Anti-Patterns

> NestJS + Zod + Monorepo에서 피해야 할 패턴들

---

## 1. 타입 관련 안티패턴

### ❌ Inline Interface 사용

```typescript
// BAD - 각 프로젝트에서 개별 정의
// apps/backend/src/users/users.controller.ts
@Post()
create(@Body() body: { email: string; password: string; name: string }) {}

// apps/web/src/components/UserForm.tsx
interface CreateUserData {
  email: string;
  password: string;
  name: string;  // 오타 가능: 'nmae'
}

// 문제점:
// - 3곳에서 동일한 타입 정의 → 유지보수 x3
// - 하나를 수정하면 다른 곳 누락 가능
// - build로 불일치 감지 불가
```

```typescript
// GOOD - Shared 패키지에서 import
import { createUserSchema, type CreateUserInput } from '@myapp/shared';

// Backend
class CreateUserDto extends createZodDto(createUserSchema) {}

// Frontend
const form = useForm<CreateUserInput>({
  resolver: zodResolver(createUserSchema),
});
```

### ❌ 스키마와 타입 분리 정의

```typescript
// BAD - 동기화 보장 안 됨
interface User {
  id: string;
  email: string;
  age: number;
}

const userSchema = z.object({
  id: z.number(),   // 타입과 불일치! (string vs number)
  email: z.string(),
  age: z.string(),  // 타입과 불일치! (number vs string)
});
```

```typescript
// GOOD - 스키마에서 타입 추론
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().positive(),
});

type User = z.infer<typeof userSchema>;
// → { id: string; email: string; age: number; }
```

### ❌ any 타입 사용

```typescript
// BAD
@Post()
async create(@Body() body: any) {
  return this.usersService.create(body);
}

// BAD
const data: any = await response.json();
```

```typescript
// GOOD
@Post()
async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
  return this.usersService.create(createUserDto);
}

// GOOD
const data = userResponseSchema.parse(await response.json());
```

---

## 2. NestJS Controller 안티패턴

### ❌ Swagger 데코레이터 누락

```typescript
// BAD - 문서화 불완전
@Controller('users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

```typescript
// GOOD - 완전한 문서화
@Controller('users')
@ApiTags('Users')
@ApiBearerAuth('access-token')
export class UsersController {
  @Post()
  @ApiOperation({ summary: '사용자 생성' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 400, description: '검증 실패' })
  @ApiResponse({ status: 409, description: '이메일 중복' })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }
}
```

### ❌ 반환 타입 미명시

```typescript
// BAD - 타입 추론에 의존
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.usersService.findOne(id);
}
```

```typescript
// GOOD - 명시적 반환 타입
@Get(':id')
async findOne(
  @Param('id', ParseUUIDPipe) id: string,
): Promise<UserResponseDto> {
  return this.usersService.findOne(id);
}
```

### ❌ 파이프 없이 파라미터 사용

```typescript
// BAD - 런타임 검증 없음
@Get(':id')
findOne(@Param('id') id: string) {  // 어떤 문자열이든 통과
  return this.usersService.findOne(id);
}

@Get()
findAll(
  @Query('page') page: string,      // "abc"도 통과
  @Query('limit') limit: string,
) {}
```

```typescript
// GOOD - ParsePipe로 검증
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {
  return this.usersService.findOne(id);
}

@Get()
findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
) {}
```

---

## 3. Zod 안티패턴

### ❌ 런타임 검증 없이 타입만 사용

```typescript
// BAD - 런타임 에러 발생 가능
interface User {
  email: string;
  name: string;
}

const user: User = JSON.parse(jsonString);  // 검증 없음!
console.log(user.email.toLowerCase());      // user가 null이면 에러
```

```typescript
// GOOD - Zod로 런타임 검증
const userSchema = z.object({
  email: z.string().email(),
  name: z.string(),
});

const result = userSchema.safeParse(JSON.parse(jsonString));
if (!result.success) {
  throw new BadRequestException(result.error.flatten());
}
const user = result.data;  // 타입 안전 보장
```

### ❌ 중복 검증 (class-validator + Zod)

```typescript
// BAD - 두 시스템 혼용
export class CreateUserDto {
  @IsEmail()           // class-validator
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// + Zod 스키마 별도 관리
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

```typescript
// GOOD - Zod만 사용
// packages/shared/src/schemas/user.schema.ts
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// apps/backend/src/users/dto/create-user.dto.ts
export class CreateUserDto extends createZodDto(createUserSchema) {}
```

---

## 4. 모노레포 구조 안티패턴

### ❌ 역방향 의존성

```typescript
// BAD - shared가 apps에 의존
// packages/shared/src/utils/api.ts
import { UsersService } from '@myapp/backend';  // ❌ 금지!
```

```
허용된 의존성 방향:
apps/backend → packages/shared ✅
apps/web     → packages/shared ✅
apps/mobile  → packages/shared ✅

금지된 의존성 방향:
packages/shared → apps/*       ❌
apps/backend → apps/web        ❌
```

### ❌ shared에 프레임워크 코드 포함

```typescript
// BAD - NestJS 의존성
// packages/shared/src/decorators/roles.ts
import { SetMetadata } from '@nestjs/common';  // ❌

export const Roles = (...roles: string[]) =>
  SetMetadata('roles', roles);
```

```typescript
// GOOD - 순수 TypeScript만
// packages/shared/src/constants/roles.ts
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
```

---

## 5. API Client 안티패턴

### ❌ 수동 타입 정의

```typescript
// BAD - API 변경 시 수동 동기화 필요
// apps/web/src/types/api.ts
interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
}

interface UserResponse {
  id: string;
  email: string;
  // ... 백엔드와 다를 수 있음!
}
```

```typescript
// GOOD - Orval로 자동 생성
import { useCreateUser, type CreateUserBody } from '@myapp/api-client';

const mutation = useCreateUser();
// CreateUserBody는 OpenAPI 스펙에서 자동 추론
```

### ❌ fetch/axios 직접 호출

```typescript
// BAD - 타입 안전성 없음
const response = await fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify(userData),
});
const user = await response.json();  // any 타입
```

```typescript
// GOOD - 자동 생성된 훅 사용
const createUser = useCreateUser();

const user = await createUser.mutateAsync({
  data: userData,  // 타입 체크됨
});
// user는 UserResponse 타입으로 추론됨
```

---

## 6. 에러 처리 안티패턴

### ❌ as 타입 단언 남용

```typescript
// BAD - 타입 시스템 우회
const user = await this.userRepo.findOne({ where: { id } }) as User;
user.email.toLowerCase();  // user가 null이면 에러!
```

```typescript
// GOOD - 타입 가드 사용
const user = await this.userRepo.findOne({ where: { id } });
if (!user) {
  throw new NotFoundException(`User ${id} not found`);
}
// 이 시점에서 user는 User 타입 (null 아님)
user.email.toLowerCase();  // 안전
```

### ❌ 외부 데이터 무검증 사용

```typescript
// BAD - 외부 API 응답 신뢰
const response = await axios.get('/external-api/user');
const user: ExternalUser = response.data;  // 실제 구조가 다르면?
```

```typescript
// GOOD - Zod로 검증
const externalUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});

const response = await axios.get('/external-api/user');
const result = externalUserSchema.safeParse(response.data);

if (!result.success) {
  throw new ExternalApiException('Invalid response', result.error);
}

const user = result.data;  // 타입 안전
```

---

## 7. 요약 표

| 안티패턴 | 문제점 | 해결책 |
|---------|--------|--------|
| Inline interface | 유지보수 x3 | Shared 패키지 |
| 스키마/타입 분리 | 불일치 | z.infer<> |
| any 타입 | 타입 안전성 없음 | 명시적 타입 |
| Swagger 누락 | 문서화 불완전 | 데코레이터 필수 |
| 파이프 없음 | 런타임 검증 없음 | ParsePipe |
| 중복 검증 | 복잡도 증가 | Zod만 사용 |
| 역방향 의존성 | 순환 참조 | 단방향 강제 |
| 수동 타입 정의 | 동기화 안 됨 | Orval 자동 생성 |
| as 타입 단언 | 타입 시스템 우회 | 타입 가드 |

---

**Version**: 1.0.0
