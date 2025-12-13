# Package Templates

## New Package Script

```bash
#!/bin/bash
# tools/scripts/create-package.sh

PACKAGE_NAME=$1

if [ -z "$PACKAGE_NAME" ]; then
  echo "Usage: pnpm create:package <package-name>"
  exit 1
fi

mkdir -p "packages/$PACKAGE_NAME/src"

# package.json
cat > "packages/$PACKAGE_NAME/package.json" << EOF
{
  "name": "@myapp/$PACKAGE_NAME",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "test": "jest"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
EOF

# tsconfig.json
cat > "packages/$PACKAGE_NAME/tsconfig.json" << EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# index.ts
cat > "packages/$PACKAGE_NAME/src/index.ts" << EOF
// @myapp/$PACKAGE_NAME
// Export your package contents here

export {};
EOF

echo "Created package: packages/$PACKAGE_NAME"
echo "Run 'pnpm install' to update workspace"
```

## App Package.json Templates

### Backend (NestJS)

```json
{
  "name": "@myapp/backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@myapp/shared": "workspace:*",
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "typescript": "^5.3.0"
  }
}
```

### Web (Next.js)

```json
{
  "name": "@myapp/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest"
  },
  "dependencies": {
    "@myapp/shared": "workspace:*",
    "@myapp/ui": "workspace:*",
    "@myapp/api-client": "workspace:*",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0"
  }
}
```

### Mobile (Expo)

```json
{
  "name": "@myapp/mobile",
  "version": "1.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "build": "eas build",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "jest"
  },
  "dependencies": {
    "@myapp/shared": "workspace:*",
    "@myapp/ui": "workspace:*",
    "@myapp/api-client": "workspace:*",
    "expo": "~49.0.0",
    "expo-router": "~2.0.0",
    "react": "18.2.0",
    "react-native": "0.72.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.0",
    "typescript": "^5.3.0"
  }
}
```

## Workspace Configuration

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools'
```

### Root package.json

```json
{
  "name": "myapp-monorepo",
  "private": true,
  "packageManager": "pnpm@8.10.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean && rm -rf node_modules",

    "dev:backend": "pnpm --filter @myapp/backend dev",
    "dev:web": "pnpm --filter @myapp/web dev",
    "dev:mobile": "pnpm --filter @myapp/mobile dev",

    "generate:api": "pnpm --filter @myapp/api-client generate",
    "db:migrate": "pnpm --filter @myapp/backend db:migrate"
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "typescript": "^5.3.0"
  }
}
```
