// app/page.tsx
// 메인페이지 - 공개 쇼핑몰 (로그인 불필요)
// 서버 컴포넌트: 정적 렌더링 + CDN 캐싱 (실제 데이터는 클라이언트에서 fetch)

import HomeClientPage from '@/components/home/HomeClientPage';

export default function Page() {
  return <HomeClientPage />;
}
