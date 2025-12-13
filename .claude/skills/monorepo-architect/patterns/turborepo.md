# Turborepo Configuration

## turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    "tsconfig.base.json"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "env": ["NODE_ENV"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "env": ["NODE_ENV"]
    },
    "clean": {
      "cache": false
    },

    // 특정 앱 파이프라인
    "@myapp/backend#build": {
      "dependsOn": ["@myapp/shared#build"],
      "outputs": ["dist/**"]
    },
    "@myapp/web#build": {
      "dependsOn": ["@myapp/shared#build", "@myapp/ui#build"],
      "outputs": [".next/**"]
    },
    "@myapp/mobile#build": {
      "dependsOn": ["@myapp/shared#build", "@myapp/ui#build"],
      "outputs": ["build/**"]
    },

    // shared는 다른 것에 의존 없음
    "@myapp/shared#build": {
      "outputs": ["dist/**"]
    },

    // api-client 생성은 캐시 안 함
    "@myapp/api-client#generate": {
      "cache": false
    }
  }
}
```

## Build Order

```
┌─────────────────────────────────────────────────────────────────┐
│                     빌드 순서 (자동)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Stage 1 (병렬):                                               │
│   ├── packages/shared                                          │
│   └── packages/config                                          │
│                                                                 │
│   Stage 2 (packages/shared 완료 후, 병렬):                      │
│   ├── packages/ui                                              │
│   └── packages/api-client                                      │
│                                                                 │
│   Stage 3 (모든 packages 완료 후, 병렬):                        │
│   ├── apps/backend                                             │
│   ├── apps/web                                                 │
│   └── apps/mobile                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Pipeline Concepts

### dependsOn

```yaml
"^build": "의존하는 패키지들의 build 먼저 실행"
"build": "같은 패키지의 build 먼저"
"@myapp/shared#build": "특정 패키지의 build 먼저"
```

### outputs

```yaml
purpose: "캐시할 결과물 지정"
examples:
  - "dist/**"      # TypeScript 빌드 결과
  - ".next/**"     # Next.js 빌드 결과
  - "build/**"     # Expo 빌드 결과
  - "coverage/**"  # 테스트 커버리지
```

### cache

```yaml
"cache": false  # 항상 새로 실행 (dev, clean)
"cache": true   # 기본값, 변경 없으면 캐시 사용
```

### persistent

```yaml
"persistent": true  # dev 서버처럼 계속 실행되는 작업
```

## Common Commands

```bash
# 전체 빌드
pnpm build

# 특정 앱만 빌드
pnpm --filter @myapp/web build

# 전체 개발 서버
pnpm dev

# 변경된 패키지만 빌드
turbo run build --filter=...[HEAD^1]

# 캐시 무시하고 빌드
turbo run build --force

# 그래프 보기
turbo run build --graph
```
