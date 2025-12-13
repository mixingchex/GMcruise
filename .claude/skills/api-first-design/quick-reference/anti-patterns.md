# API Design Anti-Patterns

## 피해야 할 패턴들

### 1. 불완전한 Swagger 문서화

```typescript
// ❌ Bad
@Get()
getUsers() {}  // 데코레이터 없음!

// ✅ Good
@Get()
@ApiOperation({ summary: '사용자 목록 조회' })
@ApiResponse({ status: 200, type: UsersListResponseDto })
@ApiResponse({ status: 401, type: ApiErrorResponseDto })
getUsers() {}
```

### 2. 일관성 없는 응답 포맷

```typescript
// ❌ Bad
return { user, success: true };       // 때로는 user
return { data: user };                 // 때로는 data
return user;                           // 때로는 직접

// ✅ Good: 항상 표준 포맷 사용
return {
  success: true,
  data: user,
  timestamp: new Date().toISOString(),
};
```

### 3. any 타입 사용

```typescript
// ❌ Bad
@ApiProperty()
data: any;

// ✅ Good
@ApiProperty({ type: UserDto })
data: UserDto;
```

### 4. 예시 없는 DTO

```typescript
// ❌ Bad
@ApiProperty()
email: string;

// ✅ Good
@ApiProperty({
  description: '사용자 이메일',
  example: 'user@example.com',
  format: 'email',
})
email: string;
```

### 5. 에러 응답 미정의

```typescript
// ❌ Bad
@ApiResponse({ status: 200, type: UserDto })
getUser() {}

// ✅ Good
@ApiResponse({ status: 200, type: UserDto })
@ApiResponse({ status: 400, type: ApiErrorResponseDto })
@ApiResponse({ status: 401, type: ApiErrorResponseDto })
@ApiResponse({ status: 404, type: ApiErrorResponseDto })
getUser() {}
```

### 6. 직접 에러 throw

```typescript
// ❌ Bad
throw new Error('User not found');

// ✅ Good
throw new NotFoundException('User', userId);
```

### 7. 하드코딩된 에러 메시지/코드

```typescript
// ❌ Bad
return { error: { code: 'NOT_FOUND', message: '...' } };

// ✅ Good
throw new ApiException(ErrorCodes.USER_NOT_FOUND, message);
```

### 8. 버전 없는 API

```typescript
// ❌ Bad
@Controller('users')

// ✅ Good
@Controller({ path: 'users', version: '1' })
```

### 9. 문서와 코드 불일치

```typescript
// ❌ Bad
@ApiProperty({ required: false })  // 선택적
email: string;                      // 코드에서는 필수

// ✅ Good
@ApiPropertyOptional()
email?: string;
```

### 10. 검증과 문서 불일치

```typescript
// ❌ Bad
@ApiProperty({ minLength: 8 })
@MinLength(6)  // 서로 다른 값!
password: string;

// ✅ Good
@ApiProperty({ minLength: 8 })
@MinLength(8)
password: string;
```

## Anti-Pattern 탐지 정규식

```typescript
const API_DESIGN_ANTIPATTERNS = [
  // Swagger 문서화 누락
  {
    pattern: /@(Get|Post|Put|Patch|Delete)\([^)]*\)\s*\n\s*(?!@Api)/,
    message: 'HTTP 메서드에 Swagger 데코레이터 누락',
    severity: 'error',
  },

  // any 타입 사용
  {
    pattern: /@ApiProperty\([^)]*\)\s*\n\s*\w+:\s*any/,
    message: 'ApiProperty에 any 타입 사용 금지',
    severity: 'error',
  },

  // 예시 없는 ApiProperty
  {
    pattern: /@ApiProperty\(\s*\)\s*\n/,
    message: 'ApiProperty에 description과 example 필수',
    severity: 'warning',
  },

  // 직접 Error throw
  {
    pattern: /throw new Error\(/,
    message: 'Error 대신 커스텀 예외 클래스 사용',
    severity: 'error',
  },

  // 하드코딩된 에러 코드
  {
    pattern: /code:\s*['"`][A-Z_]+['"`]/,
    message: 'ErrorCodes enum 사용 필요',
    severity: 'warning',
  },

  // 일관성 없는 응답
  {
    pattern: /return\s*\{\s*(?!success|data)/,
    message: '표준 응답 포맷 사용 필요',
    severity: 'warning',
  },
];
```

## Quick Detection Commands

```bash
# Swagger 데코레이터 없는 메서드 찾기
grep -rn "@(Get|Post|Put|Delete)" --include="*.controller.ts" | \
  grep -v "@Api"

# any 타입 사용 찾기
grep -rn ": any" --include="*.dto.ts"

# throw new Error 찾기
grep -rn "throw new Error" --include="*.ts"

# 하드코딩된 에러 코드 찾기
grep -rn "code: ['\"]" --include="*.ts"
```
