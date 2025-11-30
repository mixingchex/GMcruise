# 🚀 크루즈가이드 지니 성능 최적화 가이드 (1000명+ 대비)

## 📊 현재 최적화 상태

### ✅ 이미 적용된 최적화
1. **응답 압축** (`compress: true`)
2. **이미지 최적화** (AVIF/WebP 자동 변환)
3. **패키지 임포트 최적화** (react-icons, lodash 등)
4. **프로덕션 console.log 제거**
5. **번들 파일 트래킹 최적화**

---

## 🏎️ 랜딩페이지 속도 개선 방법

### 1. Vercel Edge 캐싱 설정 (권장)

Vercel 배포 시 `vercel.json`에 다음을 추가하세요:

```json
{
  "headers": [
    {
      "source": "/store/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "s-maxage=3600, stale-while-revalidate=86400" }
      ]
    },
    {
      "source": "/landing/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "s-maxage=3600, stale-while-revalidate=86400" }
      ]
    },
    {
      "source": "/(.*).js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*).css",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### 2. ISR (Incremental Static Regeneration) 적용

랜딩페이지에 ISR을 적용하여 정적 페이지로 변환:

```typescript
// app/store/[affiliateCode]/[landingSlug]/page.tsx
export const revalidate = 3600; // 1시간마다 재생성

// 또는 더 공격적인 캐싱
export const revalidate = 86400; // 24시간마다 재생성
```

### 3. 데이터베이스 쿼리 최적화

```typescript
// 인덱스 추가 (Prisma)
// prisma/schema.prisma에 추가:

@@index([affiliateCode])
@@index([landingSlug])
@@index([status])
```

### 4. CDN 이미지 프리로딩

```html
<!-- 중요 이미지 프리로드 -->
<link rel="preload" as="image" href="/images/hero-image.webp" />
```

---

## 📈 1000명+ 동시 접속 대비

### 1. 데이터베이스 연결 풀 설정

`.env` 파일에 추가:
```env
DATABASE_URL="postgresql://...?connection_limit=100&pool_timeout=20"
```

### 2. Vercel Pro/Enterprise 업그레이드 권장

- **Vercel Hobby**: 동시 연결 10개
- **Vercel Pro**: 동시 연결 100개+
- **Vercel Enterprise**: 무제한

### 3. Redis 캐싱 도입 (선택)

세션 및 자주 조회되는 데이터 캐싱:
```typescript
// lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// 세션 캐싱
export async function cacheSession(sessionId: string, data: any) {
  await redis.set(`session:${sessionId}`, JSON.stringify(data), 'EX', 3600);
}
```

### 4. API 응답 캐싱

```typescript
// app/api/public/products/route.ts
export const revalidate = 300; // 5분 캐싱

export async function GET() {
  // ...
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }
  });
}
```

---

## 🔧 즉시 적용 가능한 최적화

### 1. 이미지 Lazy Loading 확인
모든 `<Image>` 컴포넌트에 `loading="lazy"` 또는 `priority={false}` 설정

### 2. Font 최적화
```typescript
// app/layout.tsx
import { Noto_Sans_KR } from 'next/font/google';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  display: 'swap', // FOUT 방지
  preload: true,
});
```

### 3. 번들 분석
```bash
ANALYZE=true npm run build
```

---

## 📋 모니터링 체크리스트

### 배포 전
- [ ] `npm run build` 성공 확인
- [ ] 번들 크기 확인 (First Load JS < 100kB 권장)
- [ ] Lighthouse 점수 확인 (Performance > 80)

### 배포 후
- [ ] Vercel Analytics 모니터링
- [ ] 에러 로그 확인
- [ ] 응답 시간 확인 (< 500ms 권장)

---

## 🎯 예상 성능 지표

| 지표 | 현재 | 목표 |
|-----|------|------|
| LCP (Largest Contentful Paint) | ~2.5s | < 1.5s |
| FID (First Input Delay) | ~100ms | < 50ms |
| CLS (Cumulative Layout Shift) | ~0.1 | < 0.05 |
| TTFB (Time to First Byte) | ~300ms | < 200ms |

---

## 🚨 긴급 상황 대응

### 서버 과부하 시
1. Vercel Dashboard에서 Function 로그 확인
2. 필요시 ISR 캐시 시간 증가 (revalidate)
3. 불필요한 API 호출 제거

### 데이터베이스 과부하 시
1. PlanetScale/Supabase Dashboard에서 쿼리 분석
2. 느린 쿼리에 인덱스 추가
3. 연결 풀 설정 조정

---

*마지막 업데이트: 2025년 11월 30일*


