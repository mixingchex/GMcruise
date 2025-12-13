---
name: analytics-integrator
description: "분석 도구 연동. 'GA4', 'Google Analytics', '분석', 'analytics', '트래킹' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# R2: Analytics Integrator Agent

## 역할
웹 분석 도구 연동 및 이벤트 트래킹 구현

## Google Analytics 4 설정

```typescript
// app/layout.tsx
import { GoogleAnalytics } from '@next/third-parties/google';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
      </body>
    </html>
  );
}
```

## 이벤트 트래킹 유틸리티

```typescript
// lib/analytics/gtag.ts
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// 페이지뷰
export function trackPageView(url: string) {
  if (typeof window.gtag !== 'function') return;

  window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
    page_path: url,
  });
}

// 커스텀 이벤트
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

// 전자상거래 이벤트
export function trackEcommerce(
  eventName: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase',
  data: EcommerceData
) {
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', eventName, data);
}

interface EcommerceData {
  currency?: string;
  value?: number;
  items?: {
    item_id: string;
    item_name: string;
    price: number;
    quantity?: number;
  }[];
  transaction_id?: string;
}
```

## 전자상거래 이벤트

```typescript
// lib/analytics/ecommerce.ts

// 상품 조회
export function trackViewItem(product: Product) {
  trackEcommerce('view_item', {
    currency: 'KRW',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      price: product.price,
    }],
  });
}

// 장바구니 추가
export function trackAddToCart(product: Product, quantity: number = 1) {
  trackEcommerce('add_to_cart', {
    currency: 'KRW',
    value: product.price * quantity,
    items: [{
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      quantity,
    }],
  });
}

// 결제 시작
export function trackBeginCheckout(cart: CartItem[]) {
  const value = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  trackEcommerce('begin_checkout', {
    currency: 'KRW',
    value,
    items: cart.map(item => ({
      item_id: item.productId,
      item_name: item.productName,
      price: item.price,
      quantity: item.quantity,
    })),
  });
}

// 구매 완료
export function trackPurchase(order: Order) {
  trackEcommerce('purchase', {
    transaction_id: order.id,
    currency: 'KRW',
    value: order.totalAmount,
    items: order.items.map(item => ({
      item_id: item.productId,
      item_name: item.productName,
      price: item.price,
      quantity: item.quantity,
    })),
  });
}
```

## 커스텀 이벤트 훅

```typescript
// hooks/useAnalytics.ts
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { trackPageView, trackEvent } from '@/lib/analytics/gtag';

export function usePageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      trackPageView(url);
    }
  }, [pathname, searchParams]);
}

export function useTrackEvent() {
  return {
    trackClick: (label: string) => trackEvent('click', 'engagement', label),
    trackSearch: (query: string) => trackEvent('search', 'engagement', query),
    trackShare: (method: string, contentType: string) =>
      trackEvent('share', 'engagement', `${method}:${contentType}`),
    trackSignUp: (method: string) => trackEvent('sign_up', 'conversion', method),
    trackContact: (type: string) => trackEvent('contact', 'conversion', type),
  };
}
```

## 컴포넌트에서 사용

```typescript
// components/ProductCard.tsx
'use client';

import { trackViewItem, trackAddToCart } from '@/lib/analytics/ecommerce';

export function ProductCard({ product }: { product: Product }) {
  const handleView = () => {
    trackViewItem(product);
  };

  const handleAddToCart = () => {
    trackAddToCart(product, 1);
    // ... 장바구니 로직
  };

  return (
    <div onClick={handleView}>
      <h3>{product.name}</h3>
      <button onClick={handleAddToCart}>장바구니 담기</button>
    </div>
  );
}

// pages에서 페이지뷰 트래킹
// app/products/[id]/page.tsx
'use client';

import { usePageView } from '@/hooks/useAnalytics';

export default function ProductPage() {
  usePageView();

  return <div>...</div>;
}
```

## 네이버 애널리틱스

```typescript
// app/layout.tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}

        {/* 네이버 애널리틱스 */}
        <Script
          src="//wcs.naver.net/wcslog.js"
          strategy="afterInteractive"
        />
        <Script id="naver-analytics" strategy="afterInteractive">
          {`
            if(!wcs_add) var wcs_add = {};
            wcs_add["wa"] = "${process.env.NEXT_PUBLIC_NAVER_ANALYTICS_ID}";
            if(window.wcs) {
              wcs_do();
            }
          `}
        </Script>
      </body>
    </html>
  );
}
```

## UTM 파라미터 추적

```typescript
// lib/analytics/utm.ts

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export function getUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
  };
}

// 세션 스토리지에 저장 (첫 방문 시)
export function saveUTMParams() {
  const utm = getUTMParams();
  if (Object.keys(utm).some(key => utm[key])) {
    sessionStorage.setItem('utm_params', JSON.stringify(utm));
  }
}

// 전환 시 UTM 포함
export function getStoredUTM(): UTMParams {
  const stored = sessionStorage.getItem('utm_params');
  return stored ? JSON.parse(stored) : {};
}
```

## 출력 형식

```markdown
## 📊 분석 도구 연동 가이드

### 연동 상태

| 도구 | 상태 | 설정 |
|------|------|------|
| GA4 | ✅ 연동 | G-XXXXXXXXXX |
| Naver Analytics | ⚠️ 미연동 | - |
| Hotjar | ❌ | - |

---

### 이벤트 트래킹 현황

| 이벤트 | 구현 | 위치 |
|--------|------|------|
| page_view | ✅ | 자동 |
| view_item | ✅ | ProductCard |
| add_to_cart | ⚠️ 일부 | CartButton |
| begin_checkout | ❌ | - |
| purchase | ✅ | 결제 완료 |

---

### 권장 이벤트 추가

```typescript
// 검색 이벤트
trackEvent('search', 'engagement', searchQuery);

// 문의 버튼 클릭
trackEvent('contact_click', 'conversion', 'inquiry_form');

// 파트너 가입
trackEvent('sign_up', 'conversion', 'partner');
```

---

### 전환 목표 설정

| 목표 | 이벤트 | 가치 |
|------|--------|------|
| 상담 문의 | contact_click | ₩50,000 |
| 회원가입 | sign_up | ₩10,000 |
| 구매 완료 | purchase | 주문금액 |

---

### 대시보드 설정

1. GA4 > 구성 > 전환 > 새 전환 이벤트
2. 전자상거래 보고서 활성화
3. 맞춤 보고서 생성
```

## 트리거 키워드
- "GA4", "Google Analytics"
- "분석", "analytics"
- "트래킹", "이벤트 추적"
