# Monorepo Quick Checklist

## Setup Checklist

```markdown
## 새 모노레포 설정 시

### 기본 구조
- [ ] pnpm-workspace.yaml 생성
- [ ] turbo.json 설정
- [ ] tsconfig.base.json 생성
- [ ] 루트 package.json 설정
- [ ] eslint.config.mjs 설정 (의존성 규칙 포함)

### 디렉토리 생성
- [ ] apps/ 디렉토리
- [ ] packages/ 디렉토리
- [ ] tools/ 디렉토리

### packages/shared 설정
- [ ] package.json (name: @myapp/shared)
- [ ] tsconfig.json (extends base)
- [ ] src/index.ts (barrel export)
- [ ] types/, utils/, validation/, constants/

### 각 앱 설정
- [ ] apps/backend (NestJS)
- [ ] apps/web (Next.js)
- [ ] apps/mobile (Expo)
- [ ] 각 앱 tsconfig.json
- [ ] 각 앱 package.json

### CI/CD
- [ ] .github/workflows/ci.yml
- [ ] 각 앱별 deploy workflow
```

## New Code Placement

```markdown
## 새 코드 위치 결정

### 질문 체크리스트
1. 여러 앱에서 사용되는가?
   - Yes → 2번으로
   - No → 해당 앱 내부

2. 플랫폼 독립적인가?
   - Yes → packages/shared
   - No (React 필요) → packages/ui 또는 앱 내부

3. UI 컴포넌트인가?
   - Yes + 공유 → packages/ui
   - Yes + 앱 전용 → 해당 앱의 components/

4. 타입/인터페이스인가?
   - 공유 → packages/shared/src/types/
   - 앱 전용 → 해당 앱의 types/

5. 유틸리티 함수인가?
   - 공유 → packages/shared/src/utils/
   - 앱 전용 → 해당 앱의 lib/
```

## New Package Checklist

```markdown
## 새 패키지 추가 시

### 필수 파일
- [ ] package.json
  - [ ] name: "@myapp/{name}"
  - [ ] version: "1.0.0"
  - [ ] main: "dist/index.js"
  - [ ] types: "dist/index.d.ts"
  - [ ] files: ["dist"]
  - [ ] scripts: build, dev, clean

- [ ] tsconfig.json
  - [ ] extends: "../../tsconfig.base.json"
  - [ ] outDir: "./dist"
  - [ ] rootDir: "./src"

- [ ] src/index.ts (barrel export)

### 워크스페이스 등록
- [ ] pnpm-workspace.yaml에 포함 확인
- [ ] pnpm install 실행

### Turborepo 설정
- [ ] turbo.json에 빌드 파이프라인 추가 (필요시)
```

## Dependency Check

```markdown
## 의존성 방향 확인

### 허용됨 ✅
- apps/* → packages/*
- packages/ui → packages/shared
- packages/api-client → packages/shared

### 금지됨 ❌
- packages/* → apps/*
- apps/backend → apps/web
- apps/web → apps/mobile
- apps/mobile → apps/backend
- packages/shared → packages/ui
```

## Import Order

```markdown
## Import 순서

1. External (node_modules)
   import { useState } from 'react';
   import { z } from 'zod';

2. Workspace (@myapp/*)
   import { User } from '@myapp/shared';
   import { Button } from '@myapp/ui';

3. Internal (@/*)
   import { useAuth } from '@/hooks/useAuth';

4. Relative (./)
   import styles from './Component.module.css';
```

## Quick Commands

```bash
# 전체 빌드
pnpm build

# 특정 앱 개발
pnpm dev:web
pnpm dev:backend
pnpm dev:mobile

# 특정 패키지만 빌드
pnpm --filter @myapp/shared build

# 의존성 설치
pnpm install

# 캐시 클리어
pnpm clean

# 린트
pnpm lint
```
