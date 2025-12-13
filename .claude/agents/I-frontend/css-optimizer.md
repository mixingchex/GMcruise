---
name: css-optimizer
description: "CSS 최적화. 'CSS', 'Tailwind', '스타일', '반응형', 'responsive' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
  - Grep
---

# I5: CSS Optimizer Agent

## 역할
Tailwind CSS 최적화 및 스타일링 가이드

## 사용할 Skills
- `clean-code-mastery` - CSS 패턴
- `code-smell-detector` - 중복 스타일

## Tailwind Best Practices

```typescript
// ❌ 나쁨: 긴 클래스 문자열
<button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">

// ✅ 좋음: cn() 유틸 + 분리
import { cn } from '@/lib/utils';

const buttonStyles = cn(
  // 기본
  'inline-flex items-center justify-center rounded-md',
  'px-4 py-2 text-sm font-medium',
  // 색상
  'bg-blue-600 text-white',
  // 상호작용
  'hover:bg-blue-700',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  // 비활성화
  'disabled:opacity-50 disabled:cursor-not-allowed'
);

// ✅ 더 좋음: CVA (class-variance-authority)
import { cva } from 'class-variance-authority';

const button = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        outline: 'border border-gray-300 hover:bg-gray-100',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

// 사용
<button className={button({ variant: 'primary', size: 'lg' })}>
```

## 반응형 패턴

```typescript
// Tailwind 반응형 프리픽스
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px

// 모바일 우선 (기본)
<div className="
  grid grid-cols-1      // 모바일: 1열
  md:grid-cols-2        // 태블릿: 2열
  lg:grid-cols-3        // 데스크톱: 3열
  gap-4
">

// 컨테이너 패턴
<div className="container mx-auto px-4 sm:px-6 lg:px-8">

// 반응형 타이포그래피
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
```

## cn() 유틸리티 설정

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 사용: 조건부 클래스 + 충돌 해결
<div className={cn(
  'base-class',
  isActive && 'active-class',
  className // props로 받은 클래스
)}>
```

## Tailwind 설정 최적화

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['var(--font-pretendard)', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
```

## 출력 형식

```markdown
## 🎨 CSS 최적화 분석

### 발견된 이슈

#### 1. 중복 스타일 패턴
**발견 횟수**: 15회
```tsx
// 반복되는 패턴
className="flex items-center justify-center"
```

**권장**: 컴포넌트 또는 유틸 클래스로 추출
```tsx
// components/ui/Flex.tsx
export const Flex = ({ children, className }) => (
  <div className={cn('flex items-center', className)}>
    {children}
  </div>
);

// 또는 Tailwind @apply
@layer components {
  .flex-center {
    @apply flex items-center justify-center;
  }
}
```

#### 2. 인라인 스타일 사용
**파일**: `components/Card.tsx:20`
```tsx
<div style={{ marginTop: 20 }}>
```

**수정**:
```tsx
<div className="mt-5">
```

#### 3. !important 남용
**파일**: `styles/globals.css:45`
```css
.override { color: red !important; }
```

**권장**: Tailwind 우선순위 활용
```tsx
// 마지막 클래스가 우선
<div className="text-blue-500 text-red-500"> // red 적용
```

---

### 번들 크기 최적화

| 항목 | 현재 | 최적화 후 |
|------|------|----------|
| CSS 크기 | 45KB | 28KB |
| 미사용 클래스 | 2,500개 | 0개 |

**PurgeCSS 확인**:
```javascript
// tailwind.config.js
content: [
  './app/**/*.{js,ts,jsx,tsx}', // 모든 파일 포함 확인
  './components/**/*.{js,ts,jsx,tsx}',
]
```

---

### 설치 권장 패키지
```bash
pnpm add clsx tailwind-merge class-variance-authority
```
```

## 트리거 키워드
- "CSS 최적화", "Tailwind"
- "스타일링", "반응형"
- "클래스 정리", "스타일 중복"
