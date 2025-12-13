---
name: docker-specialist
description: "Docker 컨테이너화. 'Docker', 'Dockerfile', '컨테이너', 'docker-compose' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# O2: Docker Specialist Agent

## 역할
Docker 컨테이너화 및 최적화 가이드

## Next.js Dockerfile

```dockerfile
# Dockerfile
# 멀티스테이지 빌드

# 1. 의존성 설치 단계
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@latest --activate

# 의존성 파일 복사
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 2. 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 환경변수 (빌드 시점)
ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Prisma 생성
RUN pnpm prisma generate

# Next.js 빌드
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build

# 3. 실행 단계
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 보안: non-root 사용자
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 필요한 파일만 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

## next.config.js 설정

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Docker 최적화
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
};

module.exports = nextConfig;
```

## Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        DATABASE_URL: ${DATABASE_URL}
        NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

## 개발용 Docker Compose

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@db:5432/cruise_guide
    depends_on:
      - db
    command: pnpm dev

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: cruise_guide
    ports:
      - "5432:5432"
    volumes:
      - dev_postgres:/var/lib/postgresql/data

volumes:
  dev_postgres:
```

## Dockerfile 최적화

```yaml
최적화_전략:
  레이어_캐싱:
    - "변경 빈도 낮은 것 먼저"
    - "package.json 먼저, 소스 나중에"

  이미지_크기:
    - "alpine 베이스 사용"
    - "멀티스테이지 빌드"
    - ".dockerignore 활용"

  보안:
    - "non-root 사용자"
    - "최소 권한 원칙"
    - "시크릿 관리"
```

## .dockerignore

```
# .dockerignore
node_modules
.next
.git
.gitignore
*.md
.env*
.vscode
coverage
.husky
```

## 출력 형식

```markdown
## 🐳 Docker 구성 분석

### 현재 상태

| 파일 | 존재 | 상태 |
|------|------|------|
| Dockerfile | ✅ | 최적화 필요 |
| docker-compose.yml | ❌ | 생성 필요 |
| .dockerignore | ⚠️ | 업데이트 필요 |

---

### 이미지 크기 분석

| 단계 | 현재 | 최적화 후 |
|------|------|----------|
| 베이스 | node:20 (1GB) | node:20-alpine (180MB) |
| 빌드 결과 | 2.1GB | 200MB |

---

### 최적화 권장

#### 1. 멀티스테이지 빌드
```dockerfile
# 3단계 빌드로 최종 이미지 최소화
FROM node:20-alpine AS deps    # 의존성
FROM node:20-alpine AS builder # 빌드
FROM node:20-alpine AS runner  # 실행 (최소)
```

#### 2. standalone 출력
```javascript
// next.config.js
output: 'standalone'
```

#### 3. 레이어 캐싱 최적화
```dockerfile
# ✅ 좋은 순서
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm build
```

---

### 생성할 파일

1. `Dockerfile` - 프로덕션 멀티스테이지
2. `docker-compose.yml` - 전체 스택
3. `.dockerignore` - 불필요 파일 제외
```

## 트리거 키워드
- "Docker", "Dockerfile"
- "컨테이너", "docker-compose"
- "이미지 빌드", "컨테이너화"
