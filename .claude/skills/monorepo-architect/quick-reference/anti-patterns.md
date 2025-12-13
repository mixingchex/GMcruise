# Monorepo Anti-Patterns

## Common Anti-Patterns

### 1. Circular Dependencies

```yaml
Pattern: "A → B → C → A"
Detection: "import/no-cycle ESLint rule"

Example:
  packages/shared → packages/ui → packages/shared  # 순환!

Solution:
  - 공통 코드를 별도 패키지로 추출
  - 의존 관계 재설계
```

### 2. God Package

```yaml
Pattern: "shared에 모든 코드"
Problem: "변경 시 모든 앱 재빌드"

Bad:
  packages/shared/  # 3000줄짜리 거대 패키지
    - 모든 타입
    - 모든 유틸
    - 모든 검증
    - React 컴포넌트까지

Good:
  packages/shared/       # 코어 타입/유틸
  packages/ui/           # UI 컴포넌트
  packages/validation/   # 검증 스키마
  packages/api-client/   # API 클라이언트
```

### 3. Leaky Abstractions

```yaml
Pattern: "패키지 내부 구조 노출"

Bad: |
  import { helper } from '@myapp/shared/src/internal/helper';
  import { User } from '@myapp/shared/src/types/user';

Good: |
  import { helper, User } from '@myapp/shared';

Fix:
  - index.ts에서만 export
  - 내부 구현은 숨김
```

### 4. Inconsistent Tooling

```yaml
Pattern: "앱마다 다른 설정"

Bad:
  - backend: ESLint + Prettier
  - web: ESLint만
  - mobile: 설정 없음

Good:
  - 루트에 공통 설정
  - 각 앱에서 extends
  - packages/config에서 공유 설정 관리
```

### 5. Direct Cross-App Import

```yaml
Pattern: "앱 간 직접 import"

Bad: |
  // apps/web에서
  import { UserEntity } from '../../apps/backend/src/entities';
  import { formatPrice } from '../../apps/mobile/src/utils';

Good: |
  // 공유 코드는 shared로 추출
  import { User } from '@myapp/shared';
  import { formatPrice } from '@myapp/shared';
```

### 6. Platform-Specific in Shared

```yaml
Pattern: "shared에 플랫폼 특정 코드"

Bad: |
  // packages/shared/src/hooks/useAuth.ts
  import { useState, useEffect } from 'react';  # React 의존!

Good: |
  // packages/shared - 플랫폼 독립 코드만
  export function validateEmail(email: string): boolean { }

  // apps/web/src/hooks/useAuth.ts - React 훅은 앱 내부
  import { useState } from 'react';
```

### 7. Missing workspace:* Protocol

```yaml
Pattern: "버전 직접 지정"

Bad: |
  {
    "dependencies": {
      "@myapp/shared": "^1.0.0"  // npm에서 찾으려 함!
    }
  }

Good: |
  {
    "dependencies": {
      "@myapp/shared": "workspace:*"  // 워크스페이스에서
    }
  }
```

### 8. No Build Order

```yaml
Pattern: "빌드 순서 미정의"

Bad: |
  // turbo.json
  {
    "pipeline": {
      "build": {}  // dependsOn 없음
    }
  }

Good: |
  {
    "pipeline": {
      "build": {
        "dependsOn": ["^build"]  // 의존성 먼저 빌드
      }
    }
  }
```

## Detection Methods

| Anti-Pattern | Detection |
|--------------|-----------|
| Circular Deps | `import/no-cycle` ESLint |
| God Package | 파일 라인 수 > 1000 |
| Leaky Abstraction | `/src/` 포함 import |
| Cross-App Import | `apps/` 간 import |
| Platform in Shared | shared에서 react import |

## Quick Fixes

```bash
# 순환 의존성 찾기
npx madge --circular apps/

# 의존성 그래프 시각화
turbo run build --graph

# 사용하지 않는 의존성 찾기
npx depcheck
```
