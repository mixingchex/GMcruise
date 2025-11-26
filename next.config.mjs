/** @type {import('next').NextConfig} */
import bundleAnalyzer from '@next/bundle-analyzer';

const isDev = process.env.NODE_ENV !== 'production';

// 번들 분석기 설정 (ANALYZE=true일 때만 활성화)
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const devCsp = [
  "default-src 'self'",
  // ✅ dev에서는 inline/eval 허용 + blob: (HMR/Next runtime용)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://developers.kakao.com https://t1.kakaocdn.net",
  // 외부 CSS를 쓰면 CDN 도메인 추가
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  // HMR/서버 호출 허용 (포트 바뀌는 경우 모두 허용)
  "connect-src 'self' http://localhost:* ws://localhost:* https: https://developers.kakao.com https://t1.kakaocdn.net",
  "media-src 'self' blob: data:",
  // YouTube iframe 허용
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join('; ');

const prodCsp = [
  "default-src 'self'",
  // Next.js 정상 작동을 위해 unsafe-inline 허용 (hydration에 필요)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://developers.kakao.com https://t1.kakaocdn.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: https://developers.kakao.com https://t1.kakaocdn.net",
  "media-src 'self' data:",
  // YouTube iframe 허용
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join('; ');

const nextConfig = {
  // 성능 최적화: 응답 압축 활성화
  compress: true,
  
  // 성능 최적화: X-Powered-By 헤더 제거 (보안 및 성능)
  poweredByHeader: false,
  
  // TypeScript 타입 체크 무시 (임시)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint 빌드 에러 무시 (따옴표 이스케이프 등)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // useSearchParams를 Suspense 없이 사용 가능하도록 설정 (동적 라우팅 자동 적용)
  experimental: {
    missingSuspenseWithCSRBailout: false,
    // 성능 최적화: 패키지 임포트 최적화
    optimizePackageImports: [
      'react-icons',
      'lodash',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
    ],
    // Vercel Function 크기 줄이기 위해 불필요한 파일 제외 (강화 버전)
    outputFileTracingExcludes: {
      '*': [
        // Node.js 바이너리 제외
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@swc/core-darwin-x64',
        'node_modules/@swc/core-darwin-arm64',
        'node_modules/@esbuild/**',
        'node_modules/@next/swc-linux-x64-gnu',
        'node_modules/@next/swc-linux-x64-musl',
        'node_modules/@next/swc-darwin-x64',
        'node_modules/@next/swc-darwin-arm64',
        // 빌드 도구 제외
        'node_modules/webpack',
        'node_modules/terser',
        'node_modules/prettier',
        'node_modules/eslint',
        'node_modules/typescript',
        // Git 및 캐시
        '.git',
        '.next/cache',
        // 정적 파일 (동영상은 이미지로 대체되어 제외)
        'public/videos/**',  // 모든 동영상을 고화질 이미지로 대체 (빠른 로딩)
        'public/크루즈정보사진/**',
        'public/크루즈사진/**',
        'public/audio/**',
        // 스크립트 및 문서
        'scripts/**',
        '**/*.md',
        'docs/**',
        // 테스트 파일
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '__tests__/**',
      ],
    },
  },

  // Next.js 14+는 외부 패키지를 자동으로 처리하므로 serverExternalPackages 제거
  // @prisma/client, @node-rs/argon2, sharp, canvas는 자동으로 최적화됨

  // 라이브러리 임포트 최적화
  modularizeImports: {
    'react-icons': {
      transform: 'react-icons/{{member}}',
    },
    'lodash': {
      transform: 'lodash/{{member}}',
    },
  },

  // 프로덕션 빌드 시 console.log/warn/debug/info 제거 (에러는 유지)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'], // console.error는 유지
    } : false,
  },

  // Turbopack 설정 제거 (workspace root 문제로 인해 일시적으로 비활성화)
  // 필요시 나중에 다시 활성화 가능

  // ⚠️ outputFileTracingExcludes는 Next.js 14에서 deprecated되었거나 문제를 일으킬 수 있음
  // 큰 정적 파일들은 자동으로 제외되므로 명시적 설정 불필요
  
  // React Flow를 외부 패키지로 처리하여 SSR 문제 방지
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
//     // 프로덕션 빌드 시 console.log/warn/debug/info 제거 (에러는 유지)
//     if (!dev && config.optimization && config.optimization.minimizer) {
//       
//       // 기존 minimizer 찾기
//       const terserIndex = config.optimization.minimizer.findIndex(
//         (plugin) => plugin.constructor.name === 'TerserPlugin'
//       );
//       
//       if (terserIndex !== -1) {
//         // 기존 TerserPlugin 설정 수정
//         const existingTerser = config.optimization.minimizer[terserIndex];
//         existingTerser.options = {
//           ...existingTerser.options,
//           terserOptions: {
//             ...existingTerser.options?.terserOptions,
//             compress: {
//               ...existingTerser.options?.terserOptions?.compress,
//               drop_console: true, // console.log/warn/debug/info 제거
//               drop_debugger: true, // debugger 제거
//               pure_funcs: ['console.log', 'console.warn', 'console.debug', 'console.info'],
//             },
//           },
//         };
//       } else {
//         // TerserPlugin이 없으면 추가
//         config.optimization.minimizer.push(
//           new TerserPlugin({
//             terserOptions: {
//               compress: {
//                 drop_console: true,
//                 drop_debugger: true,
//                 pure_funcs: ['console.log', 'console.warn', 'console.debug', 'console.info'],
//               },
//             },
//           })
//         );
//       }
//     }
    
    return config;
  },
  
  // 이미지 최적화 설정 (작업자 C - 성능 개선)
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1년으로 증가 (정적 이미지 캐싱 강화)
    unoptimized: false, // 이미지 최적화 활성화
    loader: 'default', // Next.js 기본 로더 사용
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // 구글 드라이브 및 구글 전체 도메인
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/uc/**',
      },
      {
        protocol: 'https',
        hostname: '**.google.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // 유튜브 전체 도메인
      {
        protocol: 'https',
        hostname: '**.youtube.com',
      },
      // 유튜브 썸네일
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      },
      // 유튜브 프로필 이미지
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
      },
      // 카카오 CDN
      {
        protocol: 'https',
        hostname: '**.kakaocdn.net',
      },
    ],
  },
  
  async headers() {
    // 개발 환경에서는 보안 헤더를 완전히 비활성화하여 디버깅 가능하도록 함
    if (isDev) {
      return [
        {
          source: '/(.*)',
          headers: [
            // 개발 환경에서 캐시 비활성화
            { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
            { key: 'Pragma', value: 'no-cache' },
            { key: 'Expires', value: '0' },
          ],
        },
      ];
    }
    
    // 프로덕션 환경에서는 보안 헤더 유지
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy (XSS 방지)
          { key: 'Content-Security-Policy', value: prodCsp },
          
          // X-Frame-Options (Clickjacking 방지)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          
          // X-Content-Type-Options (MIME 타입 스니핑 방지)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          
          // X-XSS-Protection (레거시 브라우저 XSS 필터 활성화)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          
          // Referrer-Policy (리퍼러 정보 제어 - YouTube embed를 위해 조정)
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          
          // Permissions-Policy (브라우저 기능 제어)
          { 
            key: 'Permissions-Policy', 
            value: 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()' 
          },
          
          // Strict-Transport-Security (HTTPS 강제)
          { 
            key: 'Strict-Transport-Security', 
            value: 'max-age=31536000; includeSubDomains; preload' 
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
