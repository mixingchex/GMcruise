# Bun Integration

> Bun 런타임을 활용한 NestJS + Monorepo 개발 가이드

## Bun vs Node.js 비교

```yaml
Bun_장점:
  성능:
    - "HTTP 처리량 Node.js 대비 4배"
    - "52,000+ req/sec (Hello World)"
    - "패키지 설치 10-20배 빠름"

  개발_경험:
    - "TypeScript 네이티브 실행 (트랜스파일 불필요)"
    - "All-in-One (런타임 + 번들러 + 패키지 매니저 + 테스트 러너)"
    - "bun install - Remix 모노레포 500ms에 설치"

  권장_사용처:
    - "스타트업, MVP, 빠른 프로토타이핑"
    - "새 프로젝트"
    - "간단한 API, 서버리스 함수"

Node.js_장점:
  안정성:
    - "검증된 프로덕션 환경"
    - "최대 규모 에코시스템"
    - "엔터프라이즈 지원"

  권장_사용처:
    - "복잡한 빌드 (Webpack 플러그인, Babel)"
    - "장기 운영 프로덕션"
    - "레거시 의존성 필요"
```

---

## 1. Bun 워크스페이스 설정

### 루트 package.json

```json
{
  "name": "myapp-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "build": "bun run --filter '*' build",
    "test": "bun test",
    "lint": "bun run --filter '*' lint",
    "typecheck": "bun run --filter '*' typecheck"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

### 폴더 구조

```
myapp-monorepo/
├── package.json              # 워크스페이스 설정
├── bun.lockb                 # Bun 락파일 (바이너리)
├── tsconfig.base.json        # 공유 TypeScript 설정
│
├── apps/
│   ├── backend/              # NestJS
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │
│   ├── web/                  # Next.js / React
│   │   ├── package.json
│   │   └── src/
│   │
│   └── mobile/               # Expo
│       ├── package.json
│       └── src/
│
└── packages/
    ├── shared/               # Zod 스키마, 타입
    │   ├── package.json
    │   └── src/
    │
    └── api-client/           # 자동 생성 API 클라이언트
        ├── package.json
        └── src/
```

---

## 2. 패키지 간 의존성

### workspace: 프로토콜 사용

```json
// apps/backend/package.json
{
  "name": "@myapp/backend",
  "dependencies": {
    "@myapp/shared": "workspace:*",
    "@nestjs/core": "^10.0.0",
    "nestjs-zod": "^3.0.0"
  }
}

// apps/web/package.json
{
  "name": "@myapp/web",
  "dependencies": {
    "@myapp/shared": "workspace:*",
    "@myapp/api-client": "workspace:*"
  }
}

// packages/shared/package.json
{
  "name": "@myapp/shared",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "dependencies": {
    "zod": "^3.23.0"
  }
}
```

### 의존성 설치

```bash
# 모든 워크스페이스 의존성 설치
bun install

# 특정 패키지만 설치
bun install --filter "@myapp/backend"

# 특정 패턴 제외
bun install --filter "!@myapp/mobile"
```

---

## 3. NestJS + Bun 실행

### Bun으로 NestJS 실행

```bash
# 개발 모드
cd apps/backend
bun --watch src/main.ts

# 또는 package.json 스크립트
bun run dev
```

### package.json 스크립트

```json
// apps/backend/package.json
{
  "name": "@myapp/backend",
  "scripts": {
    "dev": "bun --watch src/main.ts",
    "build": "bun build src/main.ts --outdir dist --target node",
    "start": "bun dist/main.js",
    "test": "bun test",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  }
}
```

### Bun 테스트 러너

```typescript
// apps/backend/src/users/users.service.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService();
  });

  it('should create a user', async () => {
    const user = await service.create({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(user.email).toBe('test@test.com');
  });
});
```

```bash
# 테스트 실행
bun test

# 특정 파일
bun test users.service.test.ts

# 워치 모드
bun test --watch
```

---

## 4. Bun vs pnpm+Turborepo 비교

```yaml
Bun_단독_사용:
  장점:
    - "설정 간단 (package.json만)"
    - "의존성 설치 초고속"
    - "빌드 도구 내장"
  단점:
    - "캐싱/병렬 빌드 기능 제한적"
    - "원격 캐시 없음"

pnpm_Turborepo_조합:
  장점:
    - "정교한 태스크 파이프라인"
    - "원격 캐시 (Vercel)"
    - "증분 빌드"
  단점:
    - "설정 복잡도 높음"
    - "의존성 설치는 Bun보다 느림"

권장_선택:
  소규모_팀_새_프로젝트: "Bun 단독"
  대규모_팀_복잡한_파이프라인: "pnpm + Turborepo"
  하이브리드: "Bun (런타임/패키지) + Turbo (빌드 오케스트레이션)"
```

---

## 5. Bun + Turbo 하이브리드

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
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

### package.json (하이브리드)

```json
{
  "name": "myapp-monorepo",
  "private": true,
  "packageManager": "bun@1.1.0",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

---

## 6. 주의사항

```yaml
Bun_주의사항:
  NestJS_호환성:
    - "대부분 호환되지만 일부 데코레이터 이슈 가능"
    - "reflect-metadata 정상 작동 확인 필요"
    - "node-gyp 네이티브 모듈 주의"

  프로덕션_고려:
    - "아직 Node.js만큼 검증되지 않음"
    - "보안 기능 (샌드박싱) 미성숙"
    - "관측성 도구 제한적"

  권장_접근법:
    - "개발 환경: Bun 적극 활용"
    - "프로덕션: 철저한 테스트 후 결정"
    - "점진적 마이그레이션: Node.js → Bun"
```

---

## 7. 체크리스트

```markdown
## Bun 모노레포 설정
- [ ] bun init 또는 package.json 생성
- [ ] workspaces 배열 설정
- [ ] tsconfig.base.json 공유 설정
- [ ] 각 패키지 package.json 생성
- [ ] workspace:* 프로토콜로 내부 의존성 연결
- [ ] bun install 실행

## NestJS + Bun
- [ ] NestJS 프로젝트 생성
- [ ] bun --watch로 개발 서버 실행 확인
- [ ] reflect-metadata 정상 작동 확인
- [ ] Swagger 생성 확인
- [ ] bun test로 테스트 실행

## 프로덕션 배포
- [ ] bun build로 번들링 테스트
- [ ] 프로덕션 환경 호환성 테스트
- [ ] 성능 벤치마크
- [ ] 모니터링 도구 연동
```

---

**Version**: 1.0.0
**Sources**:
- [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces)
- [Bun vs Node.js Performance Guide](https://strapi.io/blog/bun-vs-nodejs-performance-comparison-guide)
