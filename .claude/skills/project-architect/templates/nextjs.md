# Next.js Project Template

## 권장 구조 (App Router)

```
my-nextjs-app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 인증 필요 라우트 그룹
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (public)/                 # 공개 라우트 그룹
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   └── pricing/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   └── v1/
│   │   │       └── [resource]/
│   │   │           └── route.ts
│   │   │
│   │   ├── globals.css
│   │   ├── layout.tsx                # Root Layout
│   │   ├── page.tsx                  # Home Page
│   │   ├── loading.tsx               # Global Loading
│   │   ├── error.tsx                 # Global Error
│   │   └── not-found.tsx             # 404 Page
│   │
│   ├── features/                     # Feature 모듈
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── SignupForm.tsx
│   │   │   │   └── AuthGuard.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useSession.ts
│   │   │   ├── services/
│   │   │   │   └── authService.ts
│   │   │   ├── types/
│   │   │   │   └── auth.types.ts
│   │   │   └── index.ts              # Public exports
│   │   │
│   │   └── [feature-name]/           # 다른 기능들
│   │
│   ├── shared/                       # 공유 모듈
│   │   ├── components/
│   │   │   ├── ui/                   # 기본 UI 컴포넌트
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── index.ts
│   │   │   ├── layout/               # 레이아웃 컴포넌트
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── index.ts
│   │   │   └── feedback/             # 피드백 컴포넌트
│   │   │       ├── Toast.tsx
│   │   │       ├── Alert.tsx
│   │   │       └── index.ts
│   │   │
│   │   ├── hooks/                    # 공통 훅
│   │   │   ├── useMediaQuery.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                    # 유틸리티
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   ├── cn.ts                 # className merger
│   │   │   └── index.ts
│   │   │
│   │   ├── types/                    # 공통 타입
│   │   │   ├── api.types.ts
│   │   │   ├── common.types.ts
│   │   │   └── index.ts
│   │   │
│   │   └── constants/                # 상수
│   │       ├── routes.ts
│   │       ├── messages.ts
│   │       └── index.ts
│   │
│   ├── services/                     # 외부 서비스
│   │   ├── api/
│   │   │   ├── client.ts             # API 클라이언트 설정
│   │   │   ├── endpoints.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── database/                 # DB (Prisma 등)
│   │   │   ├── prisma.ts
│   │   │   └── index.ts
│   │   │
│   │   └── external/                 # 외부 API
│   │       ├── stripe.ts
│   │       ├── sendgrid.ts
│   │       └── index.ts
│   │
│   ├── lib/                          # 라이브러리 설정
│   │   ├── auth.ts                   # NextAuth 설정
│   │   └── prisma.ts                 # Prisma 클라이언트
│   │
│   └── config/                       # 설정
│       ├── env.ts                    # 환경변수 타입 안전하게
│       ├── site.ts                   # 사이트 메타데이터
│       └── index.ts
│
├── public/                           # 정적 파일
│   ├── images/
│   ├── fonts/
│   └── favicon.ico
│
├── prisma/                           # Prisma 스키마
│   ├── schema.prisma
│   └── migrations/
│
├── tests/                            # 테스트
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example                      # 환경변수 템플릿
├── .env.local                        # 로컬 환경변수 (gitignore)
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
└── README.md
```

## 설정 파일들

### tsconfig.json (경로 alias)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/services/*": ["./src/services/*"],
      "@/config/*": ["./src/config/*"]
    }
  }
}
```

### .env.example

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MyApp

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# External APIs
STRIPE_SECRET_KEY=sk_test_xxx
SENDGRID_API_KEY=SG.xxx
```

### config/env.ts

```typescript
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
] as const;

// 필수 환경변수 검증
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});

export const env = {
  // Public (클라이언트 노출 가능)
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'MyApp',
  
  // Private (서버만)
  database: {
    url: process.env.DATABASE_URL!,
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
  },
} as const;
```

## 초기화 명령어

```bash
# 1. 프로젝트 생성
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir

# 2. 추가 패키지
npm install @tanstack/react-query axios zod
npm install -D @types/node prisma

# 3. Prisma 초기화
npx prisma init

# 4. UI 라이브러리 (선택)
npx shadcn-ui@latest init
```
