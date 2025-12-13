# API Client Generation

> Orval을 사용한 타입 안전 API Client 자동 생성

## 핵심 흐름

```
NestJS + Swagger → OpenAPI Spec → Orval → React Query Hooks + Types
```

```yaml
Benefits:
  - Single Source of Truth (OpenAPI)
  - TypeScript 타입 자동 생성
  - React Query 훅 자동 생성
  - MSW Mock 자동 생성
  - 스펙 변경 시 컴파일 에러로 감지
```

---

## 1. NestJS Swagger 설정

### main.ts

```typescript
// apps/backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Zod Validation
  app.useGlobalPipes(new ZodValidationPipe());

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('My App API')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addServer('http://localhost:3000', 'Local')
    .addServer('https://api.myapp.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // OpenAPI JSON 파일로 저장 (Orval용)
  fs.writeFileSync(
    './swagger.json',
    JSON.stringify(document, null, 2),
  );

  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

---

## 2. Orval 설정

### 설치

```bash
cd packages/api-client
pnpm add -D orval
pnpm add axios @tanstack/react-query
```

### orval.config.ts

```typescript
// packages/api-client/orval.config.ts

import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: '../../apps/backend/swagger.json',
    },
    output: {
      target: './src/generated/api.ts',
      client: 'react-query',
      mode: 'tags-split',        // 태그별 파일 분리
      mock: true,                // MSW mock 생성
      schemas: './src/generated/schemas',
      prettier: true,
      clean: true,               // 재생성 시 이전 파일 삭제
      override: {
        mutator: {
          path: './src/axios-instance.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,          // AbortController 지원
          version: 5,            // TanStack Query v5
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
```

### axios-instance.ts

```typescript
// packages/api-client/src/axios-instance.ts

import Axios, { AxiosRequestConfig, AxiosError } from 'axios';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

// 인터셉터: 토큰 자동 첨부
AXIOS_INSTANCE.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 인터셉터: 에러 처리
AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // 토큰 만료 처리
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Orval mutator 함수
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-ignore
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};
```

---

## 3. package.json 스크립트

```json
// packages/api-client/package.json
{
  "name": "@myapp/api-client",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "scripts": {
    "generate": "orval",
    "generate:watch": "orval --watch",
    "build": "pnpm generate && tsc"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "orval": "^6.30.0",
    "msw": "^2.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}

// 루트 package.json
{
  "scripts": {
    "api:generate": "turbo run generate --filter=@myapp/api-client",
    "backend:swagger": "cd apps/backend && pnpm build && node dist/main.js --swagger-only"
  }
}
```

---

## 4. 생성된 코드 사용

### Frontend (Next.js)

```typescript
// apps/web/src/app/users/page.tsx

'use client';

import { useGetUsers, useCreateUser, useDeleteUser } from '@myapp/api-client';
import { CreateUserInput } from '@myapp/shared';
import { useState } from 'react';

export default function UsersPage() {
  const [page, setPage] = useState(1);

  // 자동 생성된 훅 사용
  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useGetUsers({ page, limit: 20 });

  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const handleCreate = async (input: CreateUserInput) => {
    try {
      await createUser.mutateAsync({ data: input });
      refetch();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser.mutateAsync({ id });
      refetch();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users?.data.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email})
            <button onClick={() => handleDelete(user.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <button onClick={() => setPage((p) => p + 1)}>Next Page</button>
    </div>
  );
}
```

### 타입 안전성 확인

```typescript
// 타입 에러 예시 - 컴파일 타임에 감지!

// ❌ 잘못된 필드명
createUser.mutateAsync({
  data: {
    emial: 'test@test.com',  // 에러: 'emial' does not exist
    password: '12345678',
    name: 'Test',
  },
});

// ❌ 잘못된 타입
createUser.mutateAsync({
  data: {
    email: 123,              // 에러: Type 'number' is not assignable to 'string'
    password: '12345678',
    name: 'Test',
  },
});

// ❌ 필수 필드 누락
createUser.mutateAsync({
  data: {
    email: 'test@test.com',  // 에러: Property 'password' is missing
    name: 'Test',
  },
});
```

---

## 5. MSW Mock 사용

```typescript
// packages/api-client/src/generated/users.msw.ts (자동 생성됨)

import { http, HttpResponse } from 'msw';

export const getUsersHandler = http.get('/users', () => {
  return HttpResponse.json({
    data: [
      { id: '1', email: 'user1@test.com', name: 'User 1' },
      { id: '2', email: 'user2@test.com', name: 'User 2' },
    ],
    meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
  });
});

// apps/web/src/mocks/handlers.ts

import { getUsersHandler, createUserHandler } from '@myapp/api-client/mocks';

export const handlers = [
  getUsersHandler,
  createUserHandler,
  // ... 다른 핸들러들
];
```

---

## 6. CI/CD 통합

```yaml
# .github/workflows/api-client.yml

name: Generate API Client

on:
  push:
    paths:
      - 'apps/backend/src/**'
      - 'packages/shared/src/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Build backend
        run: pnpm --filter @myapp/backend build

      - name: Generate Swagger
        run: |
          cd apps/backend
          node dist/main.js --swagger-only &
          sleep 5
          curl http://localhost:3000/api-docs-json -o swagger.json

      - name: Generate API Client
        run: pnpm --filter @myapp/api-client generate

      - name: Commit changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add packages/api-client/src/generated
          git diff --staged --quiet || git commit -m "chore: regenerate api client"
          git push
```

---

## 7. 체크리스트

```markdown
## API Client 생성 체크리스트

- [ ] NestJS Swagger 설정 완료
- [ ] swagger.json 파일 생성됨
- [ ] orval.config.ts 설정
- [ ] axios-instance.ts 토큰/에러 처리
- [ ] package.json generate 스크립트
- [ ] 생성된 훅 Frontend에서 import 가능
- [ ] 타입 에러 시 컴파일 에러 발생 확인
- [ ] MSW mock 설정 (선택)
- [ ] CI/CD 자동 생성 설정 (선택)
```

---

**Version**: 1.0.0
