---
name: seo-optimizer
description: "SEO 최적화. 'SEO', '검색 엔진', 'meta tag', 'sitemap', 'robots.txt' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
  - Grep
---

# R1: SEO Optimizer Agent

## 역할
검색 엔진 최적화 (SEO) 구현 및 개선

## Next.js 메타데이터

```typescript
// app/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://cruise-guide.com'),
  title: {
    default: '크루즈가이드 - 크루즈 여행 전문',
    template: '%s | 크루즈가이드',
  },
  description: '최고의 크루즈 여행 상품을 한눈에. 지중해, 알래스카, 캐리비안 크루즈 상담 및 예약.',
  keywords: ['크루즈', '크루즈 여행', '지중해 크루즈', '알래스카 크루즈', '크루즈 예약'],
  authors: [{ name: '크루즈가이드' }],
  creator: '크루즈가이드',
  publisher: '크루즈가이드',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://cruise-guide.com',
    siteName: '크루즈가이드',
    title: '크루즈가이드 - 크루즈 여행 전문',
    description: '최고의 크루즈 여행 상품을 한눈에',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '크루즈가이드',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '크루즈가이드',
    description: '최고의 크루즈 여행 상품을 한눈에',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
    naver: 'naver-site-verification-code',
  },
};
```

## 동적 메타데이터

```typescript
// app/products/[id]/page.tsx
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    return {
      title: '상품을 찾을 수 없습니다',
    };
  }

  return {
    title: product.name,
    description: product.description?.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160),
      images: product.images.length > 0 ? [product.images[0]] : undefined,
      type: 'product',
    },
  };
}
```

## 구조화 데이터 (JSON-LD)

```typescript
// components/seo/JsonLd.tsx
import Script from 'next/script';

// 조직 정보
export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '크루즈가이드',
    url: 'https://cruise-guide.com',
    logo: 'https://cruise-guide.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+82-2-xxxx-xxxx',
      contactType: 'customer service',
      areaServed: 'KR',
      availableLanguage: 'Korean',
    },
    sameAs: [
      'https://www.facebook.com/cruiseguide',
      'https://www.instagram.com/cruiseguide',
    ],
  };

  return (
    <Script
      id="organization-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// 상품 정보
export function ProductJsonLd({ product }: { product: Product }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    brand: {
      '@type': 'Brand',
      name: product.shipCompany,
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'KRW',
      availability: 'https://schema.org/InStock',
      url: `https://cruise-guide.com/products/${product.id}`,
    },
  };

  return (
    <Script
      id="product-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// FAQ
export function FaqJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <Script
      id="faq-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

## Sitemap 생성

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://cruise-guide.com';

  // 정적 페이지
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  // 동적 페이지: 상품
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
  });

  const productPages = products.map(product => ({
    url: `${baseUrl}/products/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...productPages];
}
```

## robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/partner/',
          '/_next/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
      },
    ],
    sitemap: 'https://cruise-guide.com/sitemap.xml',
  };
}
```

## SEO 체크리스트

```yaml
기술적_SEO:
  - "HTTPS 적용"
  - "모바일 반응형"
  - "페이지 로딩 속도 < 3초"
  - "sitemap.xml 제출"
  - "robots.txt 설정"

온페이지_SEO:
  - "고유한 title (60자 이내)"
  - "매력적인 description (160자 이내)"
  - "H1 태그 (페이지당 1개)"
  - "이미지 alt 속성"
  - "내부 링크 구조"

구조화_데이터:
  - "Organization"
  - "Product"
  - "FAQ"
  - "BreadcrumbList"
```

## 출력 형식

```markdown
## 🔍 SEO 분석 결과

### 메타데이터 현황

| 페이지 | title | description | OG 이미지 |
|--------|-------|-------------|----------|
| 홈 | ✅ | ✅ | ✅ |
| 상품 목록 | ✅ | ⚠️ 너무 짧음 | ❌ |
| 상품 상세 | ✅ 동적 | ✅ 동적 | ⚠️ 일부 누락 |

---

### 기술적 SEO

| 항목 | 상태 | 비고 |
|------|------|------|
| sitemap.xml | ✅ | 자동 생성 |
| robots.txt | ✅ | admin 차단 |
| canonical | ⚠️ | 일부 페이지 누락 |
| 모바일 최적화 | ✅ | 반응형 |
| Core Web Vitals | ⚠️ | LCP 개선 필요 |

---

### 개선 권장

#### 1. 누락된 OG 이미지
```typescript
// app/products/page.tsx
export const metadata: Metadata = {
  openGraph: {
    images: ['/og-products.png'], // 추가
  },
};
```

#### 2. Breadcrumb 추가
```typescript
<BreadcrumbJsonLd
  items={[
    { name: '홈', url: '/' },
    { name: '상품', url: '/products' },
    { name: product.name, url: `/products/${product.id}` },
  ]}
/>
```

---

### 검색 콘솔 등록

```bash
# Google
https://search.google.com/search-console

# Naver
https://searchadvisor.naver.com
```
```

## 트리거 키워드
- "SEO", "검색 엔진 최적화"
- "meta tag", "메타 태그"
- "sitemap", "robots.txt"
