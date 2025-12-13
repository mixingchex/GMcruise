# Dependency Direction Rules

## Dependency Direction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     의존성 방향 규칙                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ✅ 허용된 방향 (위에서 아래로)                                 │
│                                                                 │
│   apps/backend ──────┐                                         │
│   apps/web ──────────┼──► packages/shared                      │
│   apps/mobile ───────┘    packages/ui                          │
│                           packages/api-client                   │
│                           packages/config                       │
│                                                                 │
│   packages/ui ───────────► packages/shared                     │
│   packages/api-client ───► packages/shared                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│   ❌ 금지된 방향                                                │
│                                                                 │
│   packages/* ──X──► apps/*                                     │
│   apps/backend ──X──► apps/web                                 │
│   apps/web ──X──► apps/mobile                                  │
│   apps/mobile ──X──► apps/backend                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Import Rules

```yaml
Allowed_Imports:
  apps_backend:
    can_import:
      - "@myapp/shared"
      - "@myapp/config"
      - "node_modules packages"
    cannot_import:
      - "@myapp/ui"          # 백엔드에서 UI 불필요
      - "@myapp/api-client"  # 백엔드가 API 서버임
      - "apps/web/*"
      - "apps/mobile/*"

  apps_web:
    can_import:
      - "@myapp/shared"
      - "@myapp/ui"
      - "@myapp/api-client"
      - "@myapp/config"
    cannot_import:
      - "apps/backend/*"
      - "apps/mobile/*"

  apps_mobile:
    can_import:
      - "@myapp/shared"
      - "@myapp/ui"
      - "@myapp/api-client"
      - "@myapp/config"
    cannot_import:
      - "apps/backend/*"
      - "apps/web/*"

  packages_shared:
    can_import:
      - "node_modules only"
    cannot_import:
      - "Any @myapp/* package"
      - "Any apps/*"
```

## ESLint Configuration

```javascript
// eslint.config.mjs (루트)
import * as importPlugin from 'eslint-plugin-import';

export default [
  {
    plugins: {
      'import': importPlugin,
    },
    rules: {
      'import/no-restricted-paths': ['error', {
        zones: [
          // packages는 apps를 import할 수 없음
          {
            target: './packages',
            from: './apps',
            message: 'packages는 apps를 import할 수 없습니다.',
          },
          // apps 간 import 금지
          {
            target: './apps/backend',
            from: './apps/web',
            message: 'backend는 web을 import할 수 없습니다.',
          },
          {
            target: './apps/backend',
            from: './apps/mobile',
          },
          {
            target: './apps/web',
            from: './apps/mobile',
          },
          {
            target: './apps/mobile',
            from: './apps/web',
          },
        ],
      }],

      // 순환 의존성 방지
      'import/no-cycle': ['error', { maxDepth: Infinity }],
    },
  },
];
```

## Path Alias Convention

```yaml
Workspace_Packages:
  format: "@myapp/{package-name}"
  examples:
    - "@myapp/shared"
    - "@myapp/ui"
    - "@myapp/api-client"

App_Internal:
  format: "@/*"
  scope: "각 앱 내부에서만"
  examples:
    - "@/components/Button"
    - "@/lib/utils"

Import_Order:
  1. External: "react, next, zod"
  2. Workspace: "@myapp/*"
  3. Internal: "@/*"
  4. Relative: "./"

Example: |
  // 1. External
  import { useState } from 'react';
  import { z } from 'zod';

  // 2. Workspace
  import { User, formatDate } from '@myapp/shared';
  import { Button } from '@myapp/ui';

  // 3. Internal
  import { useAuth } from '@/hooks/useAuth';

  // 4. Relative
  import styles from './UserCard.module.css';
```

## Relative Import Rule

```yaml
Rule: "같은 패키지 내에서만 상대 경로 사용"

Good: |
  // apps/web/src/components/Button.tsx
  import { cn } from '../lib/utils';  // 같은 앱 내

Bad: |
  // apps/web/src/components/Button.tsx
  import { User } from '../../../packages/shared/src/types';  // 금지!

Correct: |
  import { User } from '@myapp/shared';  // 워크스페이스 별칭 사용
```
