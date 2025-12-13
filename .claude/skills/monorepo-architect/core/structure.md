# Monorepo Folder Structure

## Standard Structure

```
project-root/
├── apps/                        # 애플리케이션들
│   ├── backend/                 # NestJS 백엔드
│   │   ├── src/
│   │   │   ├── modules/         # 기능별 모듈
│   │   │   │   ├── users/
│   │   │   │   │   ├── users.module.ts
│   │   │   │   │   ├── users.controller.ts
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   └── entities/
│   │   │   │   ├── auth/
│   │   │   │   └── orders/
│   │   │   ├── common/          # 백엔드 공통
│   │   │   │   ├── guards/
│   │   │   │   ├── filters/
│   │   │   │   ├── interceptors/
│   │   │   │   └── decorators/
│   │   │   ├── config/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                     # Next.js 웹
│   │   ├── src/
│   │   │   ├── app/             # App Router
│   │   │   │   ├── (auth)/
│   │   │   │   ├── (dashboard)/
│   │   │   │   ├── api/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   ├── forms/
│   │   │   │   └── layouts/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── stores/
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                  # Expo 모바일
│       ├── src/
│       │   ├── app/             # Expo Router
│       │   │   ├── (tabs)/
│       │   │   ├── (auth)/
│       │   │   └── _layout.tsx
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── lib/
│       │   └── stores/
│       ├── assets/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                    # 공유 패키지들
│   ├── shared/                  # 핵심 공유 코드
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   ├── validation/
│   │   │   ├── constants/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                      # 공유 UI 컴포넌트
│   │   ├── src/
│   │   │   ├── Button/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api-client/              # API 클라이언트
│   │   ├── src/
│   │   │   ├── generated/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/                  # 공유 설정
│       ├── eslint/
│       ├── typescript/
│       └── package.json
│
├── tools/                       # 빌드 도구
│   ├── scripts/
│   └── package.json
│
├── .github/workflows/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── tsconfig.base.json
└── eslint.config.mjs
```

## Directory Purposes

```yaml
apps/:
  backend/:
    purpose: "NestJS API 서버"
    contains:
      - "REST/GraphQL API"
      - "비즈니스 로직"
      - "데이터베이스 접근"

  web/:
    purpose: "Next.js 웹 애플리케이션"
    contains:
      - "React 컴포넌트"
      - "페이지/라우팅"
      - "웹 전용 훅"

  mobile/:
    purpose: "Expo 모바일 애플리케이션"
    contains:
      - "React Native 컴포넌트"
      - "모바일 네비게이션"

packages/:
  shared/:
    purpose: "모든 앱에서 공유하는 핵심 코드"
    contains:
      - "타입 정의"
      - "유틸리티 함수"
      - "검증 스키마 (Zod)"
      - "상수"
    should_not_contain:
      - "React 컴포넌트"
      - "플랫폼 특정 코드"

  ui/:
    purpose: "공유 UI 컴포넌트"
    note: "웹/모바일 공유 가능한 경우만"

  api-client/:
    purpose: "타입 안전한 API 클라이언트"
    generated_from: "backend의 Swagger 스펙"

  config/:
    purpose: "공유 설정 (ESLint, TypeScript)"

tools/:
  purpose: "개발 도구 및 스크립트"
```

## Code Placement Decision Tree

```
새 코드 작성 시:

1. 여러 앱에서 사용?
   ├── Yes → 플랫폼 독립적?
   │         ├── Yes → packages/shared
   │         └── No (React) → packages/ui
   └── No → 해당 앱 내부

2. 타입/인터페이스?
   ├── 공유 → packages/shared/src/types/
   └── 앱 전용 → 해당 앱의 types/

3. 유틸리티 함수?
   ├── 공유 → packages/shared/src/utils/
   └── 앱 전용 → 해당 앱의 lib/
```
