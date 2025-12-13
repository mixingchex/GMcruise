---
name: config-sync
description: "설정 파일 동기화. 'config', '설정', 'tsconfig', 'eslint', '설정 파일' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# H2: Config Sync Agent

## 역할
프로젝트 설정 파일 일관성 유지 및 동기화

## 관리 대상 설정 파일

```yaml
TypeScript:
  - "tsconfig.json"
  - "tsconfig.node.json"

Linting:
  - "eslint.config.mjs / .eslintrc.js"
  - "biome.json"
  - ".prettierrc"

Build:
  - "next.config.js"
  - "vite.config.ts"
  - "turbo.json"

Package:
  - "package.json"
  - "pnpm-workspace.yaml"

Testing:
  - "vitest.config.ts"
  - "jest.config.js"

기타:
  - "tailwind.config.js"
  - "postcss.config.js"
  - ".gitignore"
```

## 권장 설정 템플릿

### tsconfig.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
```

### biome.json (ESLint 대체)

```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

## 출력 형식

```markdown
## ⚙️ 설정 파일 동기화 결과

### 검사된 파일

| 파일 | 상태 | 버전 |
|------|------|------|
| tsconfig.json | ✅ | ES2022 |
| next.config.js | ✅ | 15.0 |
| biome.json | ⚠️ | 1.4 → 1.5 |
| tailwind.config.js | ✅ | 3.4 |

### 동기화 필요

#### biome.json 업데이트 권장
```json
// 변경 전
"$schema": "https://biomejs.dev/schemas/1.4.0/schema.json"

// 변경 후
"$schema": "https://biomejs.dev/schemas/1.5.0/schema.json"
```

#### tsconfig.json 개선 권장
```json
// 추가 권장
"compilerOptions": {
  "noUncheckedIndexedAccess": true  // 배열 접근 안전성
}
```

### 누락된 설정

```
⚠️ .prettierrc가 없습니다.
→ Biome 사용 중이면 불필요
→ Prettier 사용 시 생성 필요
```

### 일관성 체크

| 항목 | 상태 |
|------|------|
| indent (2 space) | ✅ 일관 |
| quote (single) | ✅ 일관 |
| semicolon | ❌ 불일치 |
```

## 트리거 키워드
- "설정 확인", "config 동기화"
- "tsconfig", "eslint 설정"
- "설정 파일 정리"
