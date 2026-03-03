import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'xs': '0.875rem',      // 14px
        'sm': '1rem',          // 16px
        'base': '1.125rem',    // 18px ⭐ 기본 크기 상향
        'lg': '1.25rem',       // 20px
        'xl': '1.5rem',        // 24px
        '2xl': '1.75rem',      // 28px
        '3xl': '2rem',         // 32px
        '4xl': '2.5rem',       // 40px
        '5xl': '3rem',         // 48px
      },
      colors: {
        // 브랜드 색상 유지
        'brand-red': '#E50914',
        'brand-dark': '#141414',
        'brand-light-dark': '#2F2F2F',
        'brand-neutral': '#F5F5F1',
        'magic-gold': '#FFD700',
        // Nano Banana Theme Colors (Premium Redesign)
        'banana-gold': '#D4AF37', // Metallic Luxury Gold
        'banana-cream': '#F9F7F2', // Very Subtle Warm White (Luxury Paper)
        'ocean-deep': '#051C2C',   // Darker Premium Navy
        // 고대비 텍스트 색상 추가 (WCAG AA 기준)
        'text': {
          'primary': '#111827',    // gray-900 (검정에 가까움)
          'secondary': '#374151',  // gray-700 (진한 회색)
          'tertiary': '#6B7280',   // gray-500 (중간 회색)
        },
        'surface': {
          'primary': '#FFFFFF',    // 흰색 배경
          'secondary': '#F9F7F2',  // banana-cream (Subtle)
          'tertiary': '#F3F4F6',   // gray-100
        },
        // 크루즈닷 럭셔리 디자인 시스템
        'cruise': {
          'navy':      '#0A2342',  // Primary — 신뢰·권위
          'navy-mid':  '#1B5FA8',  // Secondary — 연결·링크
          'navy-deep': '#051C2C',  // Dark sections
          'gold':      '#D4AF37',  // Accent — 럭셔리
          'gold-light':'#F5D76E',  // Hover/shimmer
          'sky':       '#EEF5FF',  // 섹션 교차 배경
          'cream':     '#F9F7F2',  // 따뜻한 배경 (후기)
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        // 럭셔리 히어로 오버레이
        'luxury-hero': 'linear-gradient(180deg, rgba(5,28,44,0.2) 0%, rgba(5,28,44,0.65) 60%, rgba(5,28,44,0.9) 100%)',
        // 골드 그라데이션
        'gold-gradient': 'linear-gradient(135deg, #b8860b 0%, #D4AF37 50%, #FFD700 100%)',
      },
      animation: {
        'gold-shimmer': 'gold-shimmer 3s linear infinite',
        'float':        'float 4s ease-in-out infinite',
        'slide-up-fade':'slide-up-fade 0.6s ease-out forwards',
        'scroll-down':  'scroll-down 1.5s ease-in-out infinite',
      },
      keyframes: {
        'gold-shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'slide-up-fade': {
          'from': { opacity: '0', transform: 'translateY(32px)' },
          'to':   { opacity: '1', transform: 'translateY(0)' },
        },
        'scroll-down': {
          '0%':        { transform: 'translateY(0)',   opacity: '1' },
          '75%':       { transform: 'translateY(8px)', opacity: '0' },
          '76%':       { transform: 'translateY(-8px)',opacity: '0' },
          '100%':      { transform: 'translateY(0)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
