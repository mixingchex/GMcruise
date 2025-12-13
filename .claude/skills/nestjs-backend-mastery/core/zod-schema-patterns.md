# Zod Schema Patterns

> Zod 스키마를 Single Source of Truth로 사용하는 패턴

## 핵심 원칙

```yaml
Schema_First_Principle:
  1. "Zod 스키마를 먼저 정의"
  2. "z.infer<>로 TypeScript 타입 추론"
  3. "스키마와 타입을 분리하지 않음"
  4. "런타임 검증 + 컴파일 타임 타입 안전성"
```

---

## 1. 기본 스키마 패턴

### 1.1 Entity 스키마 (DB와 1:1 매핑)

```typescript
// packages/shared/src/schemas/user.schema.ts

import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin', 'super-admin']),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof userSchema>;
```

### 1.2 Request DTO 스키마 (API 입력)

```typescript
// Create DTO - 필요한 필드만 pick
export const createUserSchema = userSchema
  .pick({ email: true, name: true })
  .extend({
    password: z.string()
      .min(8, '비밀번호는 최소 8자 이상')
      .regex(/[A-Z]/, '대문자 포함 필요')
      .regex(/[a-z]/, '소문자 포함 필요')
      .regex(/[0-9]/, '숫자 포함 필요'),
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Update DTO - 모든 필드 optional
export const updateUserSchema = createUserSchema.partial();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Login DTO
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, '비밀번호를 입력하세요'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

### 1.3 Response DTO 스키마 (API 출력)

```typescript
// password 제외, 날짜는 ISO string으로 변환
export const userResponseSchema = userSchema
  .omit({ createdAt: true, updatedAt: true })
  .extend({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .omit({ password: true }); // 보안: password 노출 금지

export type UserResponse = z.infer<typeof userResponseSchema>;
```

### 1.4 Query DTO 스키마 (페이지네이션/필터)

```typescript
export const getUsersQuerySchema = z.object({
  // 페이지네이션
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  // 필터
  role: z.enum(['user', 'admin', 'super-admin']).optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),

  // 정렬
  sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
```

---

## 2. 공용 스키마 패턴

### 2.1 Pagination 스키마

```typescript
// packages/shared/src/schemas/common.schema.ts

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// 페이지네이션 응답 메타
export const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
```

### 2.2 API 응답 스키마

```typescript
// 표준 성공 응답
export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: paginationMetaSchema.optional(),
    timestamp: z.string().datetime(),
  });

// 표준 에러 응답
export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({
      field: z.string(),
      message: z.string(),
    })).optional(),
  }),
  timestamp: z.string().datetime(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
```

---

## 3. 재사용 가능한 검증기

### 3.1 이메일 검증기

```typescript
// packages/shared/src/validators/email.validator.ts

export const emailSchema = z
  .string()
  .email('유효한 이메일 형식이 아닙니다')
  .min(5)
  .max(255)
  .transform(val => val.toLowerCase().trim());
```

### 3.2 비밀번호 검증기

```typescript
// packages/shared/src/validators/password.validator.ts

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상')
  .max(50, '비밀번호는 최대 50자')
  .regex(/[A-Z]/, '대문자 1개 이상 포함')
  .regex(/[a-z]/, '소문자 1개 이상 포함')
  .regex(/[0-9]/, '숫자 1개 이상 포함')
  .regex(/[!@#$%^&*]/, '특수문자 1개 이상 포함');

// 비밀번호 확인 스키마
export const passwordConfirmSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });
```

### 3.3 전화번호 검증기

```typescript
// packages/shared/src/validators/phone.validator.ts

export const phoneSchema = z
  .string()
  .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '유효한 전화번호 형식이 아닙니다')
  .transform(val => val.replace(/-/g, '')); // 하이픈 제거
```

---

## 4. 고급 패턴

### 4.1 조건부 필드

```typescript
const orderSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('delivery'),
    address: z.string().min(1),  // 배송일 때 필수
    zipCode: z.string().length(5),
  }),
  z.object({
    type: z.literal('pickup'),
    storeId: z.string().uuid(),  // 픽업일 때 필수
    pickupTime: z.string().datetime(),
  }),
]);
```

### 4.2 상속/확장 패턴

```typescript
// 기본 스키마
const baseProductSchema = z.object({
  name: z.string(),
  price: z.number().positive(),
});

// 확장 스키마
const physicalProductSchema = baseProductSchema.extend({
  weight: z.number().positive(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
    depth: z.number(),
  }),
});

const digitalProductSchema = baseProductSchema.extend({
  downloadUrl: z.string().url(),
  fileSize: z.number().positive(),
});
```

### 4.3 Transform 패턴

```typescript
const dateRangeSchema = z.object({
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().transform(val => new Date(val)),
}).refine(
  data => data.startDate < data.endDate,
  { message: '시작일은 종료일보다 이전이어야 합니다' }
);
```

---

## 5. Barrel Export 패턴

```typescript
// packages/shared/src/schemas/index.ts

export * from './user.schema';
export * from './order.schema';
export * from './common.schema';

// packages/shared/src/types/index.ts

export * from './user.types';
export * from './order.types';
export * from './api.types';

// packages/shared/src/index.ts

export * from './schemas';
export * from './types';
export * from './validators';
export * from './constants';
```

---

## 6. 안티패턴

### ❌ 타입과 스키마 분리

```typescript
// BAD - 동기화 안 됨!
interface User {
  id: string;
  email: string;
}

const userSchema = z.object({
  id: z.number(),  // 타입 불일치!
  email: z.string(),
});
```

### ❌ 검증 없이 타입만 사용

```typescript
// BAD - 런타임 검증 없음
const user: User = JSON.parse(userJson);  // 위험!

// GOOD - 런타임 검증
const user = userSchema.parse(JSON.parse(userJson));
```

### ❌ any 사용

```typescript
// BAD
const schema = z.any();

// GOOD
const schema = z.unknown(); // 최소한 unknown 사용
```

---

**Version**: 1.0.0
