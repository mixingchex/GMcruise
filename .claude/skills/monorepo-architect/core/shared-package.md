# Shared Package Design

## What Goes in shared/

### Types

```typescript
// packages/shared/src/types/user.ts

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'user' | 'admin' | 'super-admin';

// API 요청/응답 타입
export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;  // ISO string for JSON
}
```

### Validation (Zod)

```typescript
// packages/shared/src/validation/user.schema.ts

import { z } from 'zod';

export const emailSchema = z
  .string()
  .email('유효한 이메일 형식이 아닙니다')
  .max(255);

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상')
  .max(72)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    '대소문자와 숫자를 포함해야 합니다'
  );

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100),
  password: passwordSchema,
});

// 타입 추론
export type CreateUserInput = z.infer<typeof createUserSchema>;
```

### Utils

```typescript
// packages/shared/src/utils/date.ts

export function formatDate(date: Date | string, locale = 'ko-KR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function isExpired(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() < Date.now();
}
```

### Constants

```typescript
// packages/shared/src/constants/index.ts

export const USER_ROLES = ['user', 'admin', 'super-admin'] as const;

export const API_ENDPOINTS = {
  USERS: '/api/users',
  AUTH: '/api/auth',
  ORDERS: '/api/orders',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
```

### Barrel Export

```typescript
// packages/shared/src/index.ts

// Types
export * from './types/user';
export * from './types/order';
export * from './types/common';

// Validation
export * from './validation/user.schema';
export * from './validation/order.schema';

// Utils
export * from './utils/date';
export * from './utils/format';

// Constants
export * from './constants';
```

## Package Configuration

```json
// packages/shared/package.json
{
  "name": "@myapp/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Using Shared in Apps

### Backend (NestJS)

```typescript
import {
  User,
  CreateUserInput,
  createUserSchema,
} from '@myapp/shared';

@Injectable()
export class UsersService {
  async create(input: unknown): Promise<User> {
    const validated = createUserSchema.parse(input);
    return this.usersRepository.save(validated);
  }
}
```

### Web (Next.js)

```typescript
import { User, formatDate } from '@myapp/shared';

export default function UsersPage() {
  const users: User[] = await fetchUsers();

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>
          {user.name} - {formatDate(user.createdAt)}
        </li>
      ))}
    </ul>
  );
}
```

### Mobile (Expo)

```typescript
import { User, formatDate } from '@myapp/shared';

export function ProfileScreen({ user }: { user: User }) {
  return (
    <View>
      <Text>{user.name}</Text>
      <Text>가입일: {formatDate(user.createdAt)}</Text>
    </View>
  );
}
```
