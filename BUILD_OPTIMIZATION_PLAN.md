# ⚡ 빌드 최적화 계획
**작성일**: 2025-11-23  
**목적**: 번들 크기 감소 및 초기 로딩 속도 개선

---

## 📊 현재 상태 분석

### 무거운 라이브러리 식별
1. **recharts** (차트 라이브러리)
   - 사용 위치: `/app/admin/dashboard/page.tsx`
   - 크기: 약 200KB+
   - 최적화: 동적 임포트

2. **react-simple-maps** (지도 라이브러리)
   - 사용 위치: `/app/map/page.tsx`
   - 크기: 약 150KB+
   - 최적화: 동적 임포트

3. **d3-scale, d3-geo** (데이터 시각화)
   - 사용 위치: `/app/map/page.tsx`
   - 크기: 약 100KB+
   - 최적화: 동적 임포트

4. **framer-motion** (애니메이션)
   - 사용 위치: 여러 컴포넌트
   - 크기: 약 50KB+
   - 최적화: 필요한 컴포넌트만 동적 임포트

5. **topojson-client** (지도 데이터)
   - 사용 위치: `/app/map/page.tsx`
   - 크기: 약 30KB+
   - 최적화: 동적 임포트

---

## 🎯 최적화 작업 계획

### 1단계: 동적 임포트 적용

#### 1.1 관리자 대시보드 차트 컴포넌트
**파일**: `app/admin/dashboard/page.tsx`

**Before**:
```typescript
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
```

**After**:
```typescript
import dynamic from 'next/dynamic';

const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
// ... 나머지도 동일
```

또는 더 나은 방법:
```typescript
const AdminDashboardCharts = dynamic(
  () => import('@/components/admin/DashboardCharts'),
  { ssr: false, loading: () => <div>차트 로딩 중...</div> }
);
```

#### 1.2 지도 페이지 컴포넌트
**파일**: `app/map/page.tsx`

**Before**:
```typescript
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { scaleQuantile } from 'd3-scale';
import { geoCentroid } from 'd3-geo';
import * as topojson from 'topojson-client';
```

**After**:
```typescript
import dynamic from 'next/dynamic';

const MapComponent = dynamic(
  () => import('@/components/MapComponent'),
  { ssr: false, loading: () => <div>지도 로딩 중...</div> }
);
```

#### 1.3 메인 페이지 컴포넌트
**파일**: `app/page.tsx`

**Before**:
```typescript
import YoutubeShortsSlider from '@/components/mall/YoutubeShortsSlider';
import YoutubeVideosSlider from '@/components/mall/YoutubeVideosSlider';
import YoutubeLiveSection from '@/components/mall/YoutubeLiveSection';
```

**After**:
```typescript
import dynamic from 'next/dynamic';

const YoutubeShortsSlider = dynamic(() => import('@/components/mall/YoutubeShortsSlider'));
const YoutubeVideosSlider = dynamic(() => import('@/components/mall/YoutubeVideosSlider'));
const YoutubeLiveSection = dynamic(() => import('@/components/mall/YoutubeLiveSection'));
```

---

### 2단계: Next.js 설정 최적화

#### 2.1 번들 분석 설정
```javascript
// next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer({
  // 기존 설정
});
```

#### 2.2 이미지 최적화 설정
```javascript
// next.config.mjs
export default {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
};
```

#### 2.3 컴파일러 최적화
```javascript
// next.config.mjs
export default {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // ... 기존 설정
};
```

---

### 3단계: 코드 스플리팅

#### 3.1 라우트별 코드 스플리팅
- Next.js가 자동으로 라우트별로 코드 스플리팅
- 추가 최적화: 동적 임포트로 더 세밀한 스플리팅

#### 3.2 컴포넌트별 코드 스플리팅
- 무거운 컴포넌트는 동적 임포트로 분리
- 필요할 때만 로드

---

## 📋 작업 체크리스트

### 동적 임포트 적용
- [ ] 관리자 대시보드 차트 컴포넌트
- [ ] 지도 페이지 컴포넌트
- [ ] 메인 페이지 무거운 컴포넌트
- [ ] 관리자 페이지 무거운 컴포넌트
- [ ] 파트너 페이지 무거운 컴포넌트

### Next.js 설정
- [ ] 번들 분석 설정
- [ ] 이미지 최적화 설정
- [ ] 컴파일러 최적화 설정

### 테스트
- [ ] 빌드 성공 확인
- [ ] 번들 크기 확인
- [ ] 페이지 로딩 속도 확인

---

## 📊 예상 개선 효과

### 번들 크기
- **Before**: 전체 번들 약 2-3MB
- **After**: 초기 번들 약 1-1.5MB (30-50% 감소)
- **차트/지도**: 필요할 때만 로드 (200-300KB 절약)

### 로딩 속도
- **Before**: 초기 로딩 3-5초
- **After**: 초기 로딩 1-2초 (40-60% 개선)

---

## 🚀 다음 단계

1. **동적 임포트 적용** 시작
2. **Next.js 설정 최적화**
3. **번들 분석 및 확인**

---

**작업 시작**: 빌드 최적화부터 진행










