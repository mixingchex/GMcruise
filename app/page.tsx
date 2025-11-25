// app/page.tsx
// 메인페이지 - 공개 쇼핑몰 (로그인 불필요)
// 서버 컴포넌트: 캐싱 방지 및 동적 렌더링 설정

import HomeClientPage from '@/components/home/HomeClientPage';

// 서버 사이드 설정 (캐시 방지)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return <HomeClientPage />;
}
