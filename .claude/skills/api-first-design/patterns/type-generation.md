# Type Generation

## swagger-typescript-api 설정

```typescript
// packages/shared/api/scripts/generate-types.ts

import { generateApi } from 'swagger-typescript-api';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_PATH = path.resolve(__dirname, '../generated');
const OPENAPI_PATH = path.resolve(__dirname, '../openapi/openapi.yaml');

async function generateTypes() {
  // 출력 디렉토리 정리
  if (fs.existsSync(OUTPUT_PATH)) {
    fs.rmSync(OUTPUT_PATH, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });

  await generateApi({
    name: 'api.ts',
    output: OUTPUT_PATH,
    input: OPENAPI_PATH,
    httpClientType: 'axios',
    generateClient: true,
    generateRouteTypes: true,
    generateResponses: true,
    extractRequestParams: true,
    extractRequestBody: true,
    extractEnums: true,
    unwrapResponseData: true,
    prettier: {
      printWidth: 100,
      tabWidth: 2,
      singleQuote: true,
      trailingComma: 'all',
    },
    hooks: {
      onFormatTypeName: (typeName: string) => typeName,
      onFormatRouteName: (routeInfo: any) => {
        return routeInfo.operationId || routeInfo.route;
      },
    },
  });

  console.log('Types generated at:', OUTPUT_PATH);
}

generateTypes().catch(console.error);
```

## package.json 스크립트

```json
{
  "name": "@monorepo/shared-api",
  "version": "1.0.0",
  "scripts": {
    "generate": "ts-node scripts/generate-types.ts",
    "generate:watch": "nodemon --watch openapi -e yaml,json --exec 'pnpm generate'",
    "validate": "openapi-generator-cli validate -i openapi/openapi.yaml",
    "lint": "spectral lint openapi/openapi.yaml"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "swagger-typescript-api": "^13.0.0",
    "@openapitools/openapi-generator-cli": "^2.7.0",
    "@stoplight/spectral-cli": "^6.11.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.3.0",
    "nodemon": "^3.0.0"
  }
}
```

## 생성된 타입 활용

```typescript
// apps/web/src/lib/api-client.ts

import { Api, HttpClient } from '@monorepo/shared-api/generated';

// 기본 Axios 인스턴스 설정
const httpClient = new HttpClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인증 토큰 인터셉터
httpClient.instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 에러 인터셉터
httpClient.instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        return httpClient.instance(error.config);
      }
      logout();
    }
    return Promise.reject(error);
  },
);

// API 클라이언트 인스턴스
export const api = new Api(httpClient);

// 타입 안전한 사용 예시
async function fetchUser(userId: string) {
  const response = await api.users.getUserById(userId);
  return response.data; // UserDto 타입
}
```

## React Query 통합

```typescript
// apps/web/src/hooks/use-users.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateUserDto, UpdateUserDto, GetUsersQueryDto } from '@monorepo/shared-api';

// Query Keys 중앙 관리
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: GetUsersQueryDto) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

/**
 * 사용자 목록 조회 훅
 */
export function useUsers(query: GetUsersQueryDto = {}) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: async () => {
      const response = await api.users.getUsers(query);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}

/**
 * 단일 사용자 조회 훅
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: async () => {
      const response = await api.users.getUserById(userId);
      return response.data;
    },
    enabled: !!userId,
  });
}

/**
 * 사용자 생성 뮤테이션
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      const response = await api.users.createUser(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * 사용자 수정 뮤테이션
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserDto }) => {
      const response = await api.users.updateUser(id, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * 사용자 삭제 뮤테이션
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.users.deleteUser(userId);
    },
    onSuccess: (_, userId) => {
      queryClient.removeQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
```
