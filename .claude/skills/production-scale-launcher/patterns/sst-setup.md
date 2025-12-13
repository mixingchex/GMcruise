# SST (Ion) 프로젝트 설정 패턴

## 1. SST 설치 및 초기화

```bash
# 새 프로젝트 생성
pnpm create sst@latest my-saas
cd my-saas

# 기존 프로젝트에 SST 추가
pnpm add sst@latest
```

## 2. 프로젝트 구조

```
my-saas/
├── sst.config.ts           # SST 메인 설정
├── sst-env.d.ts            # 환경 변수 타입 (자동 생성)
├── package.json
├── tsconfig.json
│
├── packages/
│   ├── core/               # 공유 비즈니스 로직
│   │   ├── src/
│   │   │   ├── user.ts     # 사용자 서비스
│   │   │   ├── db.ts       # Prisma 클라이언트
│   │   │   └── index.ts    # 배럴 익스포트
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── functions/          # Lambda 함수
│   │   ├── src/
│   │   │   ├── api/        # API 핸들러
│   │   │   │   ├── users.ts
│   │   │   │   └── orders.ts
│   │   │   └── events/     # 이벤트 핸들러
│   │   │       └── user-created.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                # Next.js 앱
│       ├── src/
│       │   ├── app/
│       │   └── components/
│       ├── next.config.js
│       └── package.json
│
└── infra/                  # 추가 인프라 (선택)
    └── dns.ts
```

## 3. sst.config.ts 기본 설정

```typescript
// sst.config.ts
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'my-saas',
      removal: input?.stage === 'prod' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: {
          region: 'ap-northeast-2',
        },
      },
    };
  },
  async run() {
    // 인프라 정의
    const secrets = await import('./infra/secrets');
    const database = await import('./infra/database');
    const api = await import('./infra/api');
    const web = await import('./infra/web');

    return {
      api: api.api.url,
      web: web.site.url,
    };
  },
});
```

## 4. 인프라 모듈 분리

### 시크릿 관리
```typescript
// infra/secrets.ts
export const databaseUrl = new sst.Secret('DatabaseUrl');
export const stripeSecretKey = new sst.Secret('StripeSecretKey');
export const stripeWebhookSecret = new sst.Secret('StripeWebhookSecret');

// 시크릿 설정 명령어
// pnpm sst secret set DatabaseUrl "postgresql://..."
// pnpm sst secret set StripeSecretKey "sk_live_..."
```

### 데이터베이스
```typescript
// infra/database.ts
import { databaseUrl } from './secrets';

// RDS PostgreSQL (프로덕션)
export const database = new sst.aws.Postgres('Database', {
  scaling: {
    min: '0.5 ACU',
    max: '4 ACU',
  },
});

// 또는 외부 DB 연결 (Supabase/Neon)
// 이 경우 databaseUrl 시크릿 사용
```

### API
```typescript
// infra/api.ts
import { databaseUrl, stripeSecretKey, stripeWebhookSecret } from './secrets';

export const api = new sst.aws.ApiGatewayV2('Api', {
  transform: {
    route: {
      handler: {
        link: [databaseUrl, stripeSecretKey],
      },
    },
  },
});

// 라우트 정의
api.route('GET /users', 'packages/functions/src/api/users.list');
api.route('POST /users', 'packages/functions/src/api/users.create');
api.route('GET /users/{id}', 'packages/functions/src/api/users.get');

api.route('POST /checkout', 'packages/functions/src/api/checkout.create');
api.route('POST /webhooks/stripe', {
  handler: 'packages/functions/src/api/webhooks/stripe.handler',
  link: [stripeWebhookSecret],
});
```

### 웹 프론트엔드
```typescript
// infra/web.ts
import { api } from './api';

export const site = new sst.aws.Nextjs('Web', {
  path: 'packages/web',
  environment: {
    NEXT_PUBLIC_API_URL: api.url,
  },
  domain: {
    name: 'myapp.com',
    dns: sst.aws.dns(),
  },
});
```

## 5. Lambda 함수 패턴

```typescript
// packages/functions/src/api/users.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Resource } from 'sst';
import { z } from 'zod';
import { UserService } from '@my-saas/core/user';

// 타입 안전한 시크릿 접근
const dbUrl = Resource.DatabaseUrl.value;

// 입력 스키마
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export const list: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const users = await UserService.list();
    return {
      statusCode: 200,
      body: JSON.stringify(users),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};

export const create: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const input = CreateUserSchema.parse(body);

    const user = await UserService.create(input);

    return {
      statusCode: 201,
      body: JSON.stringify(user),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ errors: error.flatten() }),
      };
    }
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};

export const get: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'ID required' }),
    };
  }

  const user = await UserService.get(id);

  if (!user) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(user),
  };
};
```

## 6. 공유 Core 패키지

```typescript
// packages/core/src/user.ts
import { db } from './db';

export namespace UserService {
  export interface CreateInput {
    email: string;
    name: string;
  }

  export async function list() {
    return db.user.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
  }

  export async function create(input: CreateInput) {
    return db.user.create({ data: input });
  }

  export async function get(id: string) {
    return db.user.findUnique({ where: { id } });
  }
}
```

## 7. 환경별 배포

```bash
# 개발 환경 (Live Lambda Dev)
pnpm sst dev

# 스테이징 배포
pnpm sst deploy --stage staging

# 프로덕션 배포
pnpm sst deploy --stage prod

# 특정 스테이지 삭제
pnpm sst remove --stage pr-123
```

## 8. 환경별 설정 분기

```typescript
// sst.config.ts
export default $config({
  app(input) {
    return {
      name: 'my-saas',
      removal: input?.stage === 'prod' ? 'retain' : 'remove',
      home: 'aws',
    };
  },
  async run() {
    const stage = $app.stage;

    // 환경별 설정
    const config = {
      dev: {
        memory: '512 MB',
        timeout: '10 seconds',
        domain: undefined,
      },
      staging: {
        memory: '1024 MB',
        timeout: '30 seconds',
        domain: 'staging.myapp.com',
      },
      prod: {
        memory: '2048 MB',
        timeout: '30 seconds',
        domain: 'myapp.com',
      },
    }[stage] || config.dev;

    // API 생성
    const api = new sst.aws.ApiGatewayV2('Api', {
      transform: {
        route: {
          handler: {
            memory: config.memory,
            timeout: config.timeout,
          },
        },
      },
    });

    // 웹 생성
    const site = new sst.aws.Nextjs('Web', {
      path: 'packages/web',
      domain: config.domain ? {
        name: config.domain,
        dns: sst.aws.dns(),
      } : undefined,
    });

    return { api: api.url, web: site.url };
  },
});
```

## 9. GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-northeast-2

      - name: Deploy
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            pnpm sst deploy --stage prod
          else
            pnpm sst deploy --stage pr-${{ github.event.pull_request.number }}
          fi
```

## 10. 로컬 개발 (sst dev)

```bash
# Live Lambda Development 시작
pnpm sst dev

# 특징:
# - 로컬에서 Lambda 함수 실행 (AWS에 배포 없이)
# - 코드 변경 시 자동 리로드
# - 실제 AWS 리소스 (DB, S3 등) 연결
# - 브레이크포인트 디버깅 지원
```

## 11. 유용한 명령어

```bash
# 시크릿 설정
pnpm sst secret set DatabaseUrl "postgresql://..."

# 시크릿 목록 확인
pnpm sst secret list

# 출력 확인
pnpm sst output

# 콘솔 열기 (CloudWatch Logs 등)
pnpm sst console

# 특정 함수만 배포
pnpm sst deploy --filter Api
```
