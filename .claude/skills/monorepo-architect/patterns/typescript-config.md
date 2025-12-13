# TypeScript Configuration

## Base Configuration

```json
// tsconfig.base.json (루트)
{
  "compilerOptions": {
    // 기본 설정
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",

    // 엄격 모드
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    // 출력 설정
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // 상호 운용성
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,

    // 경로 매핑
    "baseUrl": ".",
    "paths": {
      "@myapp/shared": ["packages/shared/src"],
      "@myapp/shared/*": ["packages/shared/src/*"],
      "@myapp/ui": ["packages/ui/src"],
      "@myapp/ui/*": ["packages/ui/src/*"],
      "@myapp/api-client": ["packages/api-client/src"],
      "@myapp/config": ["packages/config"]
    }
  },
  "exclude": [
    "node_modules",
    "dist",
    "build",
    ".next",
    ".expo",
    "coverage"
  ]
}
```

## App-specific Configurations

### Backend (NestJS)

```json
// apps/backend/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### Web (Next.js)

```json
// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@myapp/shared": ["../../packages/shared/src"],
      "@myapp/shared/*": ["../../packages/shared/src/*"],
      "@myapp/ui": ["../../packages/ui/src"],
      "@myapp/api-client": ["../../packages/api-client/src"]
    }
  },
  "include": ["src/**/*", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Mobile (Expo)

```json
// apps/mobile/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"],
      "@myapp/shared": ["../../packages/shared/src"],
      "@myapp/shared/*": ["../../packages/shared/src/*"],
      "@myapp/ui": ["../../packages/ui/src"],
      "@myapp/api-client": ["../../packages/api-client/src"]
    }
  },
  "include": ["src/**/*", "expo-env.d.ts"],
  "exclude": ["node_modules"]
}
```

### Shared Package

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Path Alias Summary

| Alias | Points To | Used In |
|-------|-----------|---------|
| `@myapp/shared` | packages/shared/src | All apps |
| `@myapp/ui` | packages/ui/src | web, mobile |
| `@myapp/api-client` | packages/api-client/src | web, mobile |
| `@/*` | ./src/* | Each app internally |

## Module Resolution

| Package Type | module | moduleResolution |
|--------------|--------|------------------|
| NestJS | CommonJS | Node |
| Next.js | ESNext | Bundler |
| Expo | ESNext | Bundler |
| Packages | NodeNext | NodeNext |
