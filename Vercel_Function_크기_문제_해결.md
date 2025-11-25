# Vercel Function 크기 초과 문제 해결

## 🚨 발생했던 에러

```
Error: The Vercel Function "api/admin/affiliate/contracts/[contractId]/approve"
is 456.53mb which exceeds the maximum size limit of 300mb
```

## 🔍 원인

Next.js 빌드 시 Vercel Function에 불필요한 파일들이 포함되어 번들 크기가 초과됨:
- 사용하지 않는 node_modules 바이너리
- public 디렉토리의 대용량 정적 파일들
- 빌드 스크립트 및 마크다운 문서

## ✅ 해결 방법

### 1. next.config.mjs 수정

**추가한 설정:**

```javascript
experimental: {
  missingSuspenseWithCSRBailout: false,
  // Vercel Function 크기 줄이기 위해 불필요한 파일 제외
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/linux-x64',
      'node_modules/webpack',
      'node_modules/terser',
      '.git',
      '.next/cache',
      'public/videos',
      'public/크루즈정보사진',
      'public/크루즈사진',
      'scripts',
      '*.md',
    ],
  },
},

// 서버 컴포넌트 외부 패키지 최적화
serverExternalPackages: ['@prisma/client', '@node-rs/argon2'],
```

### 2. /chat/history 라우트 수정

`app/chat/history/route.ts` 파일에 dynamic export 추가:

```typescript
export const dynamic = 'force-dynamic';
```

## 📊 예상 효과

### 제외된 파일들:

1. **Node.js 바이너리 (약 150MB 감소)**
   - @swc/core-linux-x64-gnu
   - @swc/core-linux-x64-musl
   - @esbuild/linux-x64

2. **빌드 도구 (약 50MB 감소)**
   - webpack
   - terser

3. **정적 파일 (약 100MB 감소)**
   - public/videos/* (동영상 파일)
   - public/크루즈정보사진/*
   - public/크루즈사진/*

4. **기타 (약 10MB 감소)**
   - .git
   - .next/cache
   - scripts
   - *.md 파일들

### 총 예상 감소량: **약 310MB**

**결과:** 456MB → **약 145MB** (목표: 300MB 이하)

## 🎯 최적화 설명

### outputFileTracingExcludes
Next.js가 서버리스 함수를 생성할 때 어떤 파일을 추적하고 포함할지 결정합니다. 이 설정으로 런타임에 필요하지 않은 파일들을 제외합니다.

### serverExternalPackages
특정 패키지를 번들에 포함시키지 않고 node_modules에서 직접 로드하도록 합니다:
- `@prisma/client`: 네이티브 바이너리 포함
- `@node-rs/argon2`: 네이티브 바이너리 포함

## ✅ 확인 사항

### 배포 후 테스트:

1. **정적 파일 접근 확인**
   - 동영상 재생 확인 (CDN을 통해 제공됨)
   - 이미지 로드 확인

2. **API 라우트 동작 확인**
   - /api/admin/affiliate/contracts/* 엔드포인트
   - /chat/history 엔드포인트

3. **Vercel 함수 크기 확인**
   - Vercel 대시보드 → Functions 탭
   - 각 함수의 크기가 300MB 이하인지 확인

## 📝 참고 문서

- [Next.js Output File Tracing](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Vercel Function Size Limits](https://vercel.com/docs/functions/serverless-functions/runtimes#maximum-bundle-size)
- [Next.js Server External Packages](https://nextjs.org/docs/app/api-reference/next-config-js/serverExternalPackages)

## 🚀 배포 모니터링

### Vercel 대시보드 확인:

1. **배포 진행 상황**
   - Deployments 탭
   - Building... → Ready 확인

2. **함수 크기 확인**
   - Functions 탭
   - 모든 함수가 300MB 이하인지 확인

3. **배포 로그 확인**
   - 에러 메시지 없는지 확인
   - "✓ Generating static pages" 메시지 확인

## ⚠️ 문제 발생 시

만약 여전히 크기 초과 에러가 발생하면:

### 추가 최적화 옵션:

1. **Edge Runtime 사용**
   ```typescript
   export const runtime = 'edge';
   export const dynamic = 'force-dynamic';
   ```

2. **더 많은 파일 제외**
   ```javascript
   outputFileTracingExcludes: {
     '*': [
       // 기존 항목들...
       'node_modules/@next/swc-*',
       'node_modules/prettier',
       'node_modules/eslint',
     ],
   }
   ```

3. **함수 분할**
   - 큰 함수를 여러 개의 작은 함수로 분할
   - 각 함수가 독립적으로 번들링됨

## ✅ 최종 체크리스트

- [x] next.config.mjs에 outputFileTracingExcludes 추가
- [x] serverExternalPackages 설정 추가
- [x] /chat/history 라우트 dynamic export 추가
- [x] 로컬 빌드 테스트 성공
- [x] Git 커밋 및 푸시
- [ ] Vercel 배포 완료 확인
- [ ] 함수 크기 300MB 이하 확인
- [ ] 정적 파일 정상 로드 확인
- [ ] API 라우트 정상 작동 확인

배포 완료까지 5-7분 소요 예상! 🚀
