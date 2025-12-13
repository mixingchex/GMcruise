# Shared Package Structure

> packages/shared 디렉토리 설계 가이드

## 핵심 원칙

```yaml
Principles:
  1. "순수 TypeScript & Zod만 포함"
  2. "프레임워크 의존성 없음 (no NestJS, no React)"
  3. "Node.js 특정 코드 없음"
  4. "모든 앱에서 import 가능"
```

---

## 1. 디렉토리 구조

```
packages/
└── shared/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts              # Barrel export (진입점)
    │   │
    │   ├── schemas/              # Zod 스키마 (핵심!)
    │   │   ├── index.ts
    │   │   ├── user.schema.ts
    │   │   ├── auth.schema.ts
    │   │   ├── order.schema.ts
    │   │   ├── product.schema.ts
    │   │   └── common.schema.ts  # 공용 스키마
    │   │
    │   ├── types/                # Zod에서 추론된 타입
    │   │   ├── index.ts
    │   │   ├── user.types.ts
    │   │   ├── auth.types.ts
    │   │   ├── order.types.ts
    │   │   └── api.types.ts      # API 응답 타입
    │   │
    │   ├── validators/           # 재사용 검증 로직
    │   │   ├── index.ts
    │   │   ├── email.ts
    │   │   ├── password.ts
    │   │   ├── phone.ts
    │   │   └── date.ts
    │   │
    │   ├── constants/            # 상수 정의
    │   │   ├── index.ts
    │   │   ├── roles.ts
    │   │   ├── status.ts
    │   │   ├── error-codes.ts
    │   │   └── endpoints.ts      # API 엔드포인트 경로
    │   │
    │   └── utils/                # 공용 유틸리티
    │       ├── index.ts
    │       ├── date.ts
    │       ├── format.ts
    │       └── transform.ts
    │
    └── dist/                     # 빌드 결과물
```

---

## 2. package.json 설정

```json
{
  "name": "@myapp/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./schemas": {
      "import": "./dist/schemas/index.mjs",
      "require": "./dist/schemas/index.js",
      "types": "./dist/schemas/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.mjs",
      "require": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  }
}
```

---

## 3. tsconfig.json 설정

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 4. Barrel Export 패턴

### src/index.ts (진입점)

```typescript
// 모든 하위 모듈 re-export
export * from './schemas';
export * from './types';
export * from './validators';
export * from './constants';
export * from './utils';
```

### src/schemas/index.ts

```typescript
// 개별 스키마 export
export * from './user.schema';
export * from './auth.schema';
export * from './order.schema';
export * from './product.schema';
export * from './common.schema';
```

### src/types/index.ts

```typescript
// 개별 타입 export
export * from './user.types';
export * from './auth.types';
export * from './order.types';
export * from './api.types';
```

---

## 5. 사용 예시

### Backend (NestJS)

```typescript
// apps/backend/src/users/users.controller.ts

import { createUserSchema, type CreateUserInput } from '@myapp/shared';
import { createZodDto } from 'nestjs-zod';

// Zod 스키마 → NestJS DTO
class CreateUserDto extends createZodDto(createUserSchema) {}

@Controller('users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    // dto는 이미 검증됨
  }
}
```

### Frontend (Next.js)

```typescript
// apps/web/src/components/UserForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, type CreateUserInput } from '@myapp/shared';

export function UserForm() {
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('email')} />
      {form.formState.errors.email && (
        <span>{form.formState.errors.email.message}</span>
      )}
    </form>
  );
}
```

### Mobile (Expo/React Native)

```typescript
// apps/mobile/src/screens/RegisterScreen.tsx

import { createUserSchema, type CreateUserInput } from '@myapp/shared';

const validateForm = (data: unknown): CreateUserInput => {
  return createUserSchema.parse(data);
};
```

---

## 6. 워크스페이스 설정

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 루트 package.json

```json
{
  "name": "myapp-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

---

## 7. 의존성 방향 검증

```yaml
Allowed_Dependencies:
  ✅ apps/backend → packages/shared
  ✅ apps/web     → packages/shared
  ✅ apps/mobile  → packages/shared
  ✅ packages/api-client → packages/shared

Forbidden_Dependencies:
  ❌ packages/shared → apps/*
  ❌ packages/shared → node 특정 모듈
  ❌ apps/backend → apps/web
  ❌ apps/web → apps/backend
```

### 의존성 검증 스크립트

```bash
# package.json scripts
"check:deps": "depcheck && madge --circular src/"
```

---

## 8. 체크리스트

```markdown
## packages/shared 생성 시
- [ ] package.json의 name이 @myapp/shared 형식
- [ ] main, module, types, exports 필드 설정
- [ ] tsconfig.json이 루트의 base를 extends
- [ ] zod만 dependencies에 포함 (프레임워크 없음)
- [ ] src/index.ts에서 모든 모듈 re-export
- [ ] 루트 pnpm-workspace.yaml에 등록
- [ ] turbo.json의 build pipeline에 포함
```

---

**Version**: 1.0.0
