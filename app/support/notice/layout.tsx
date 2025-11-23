// app/support/notice/layout.tsx
// 공지사항 페이지 SEO 메타데이터

import type { Metadata } from 'next';
import { generateMetadata as generateSeoMetadata } from '@/lib/seo/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const pagePath = '/support/notice';
  return generateSeoMetadata(pagePath, {
    title: '공지사항 - 크루즈 가이드 | 크루즈 여행 이벤트, 업데이트 안내',
    description: '크루즈 가이드의 최신 공지사항과 이벤트 정보를 확인하세요. 특별 할인, 업데이트, 중요 안내사항을 놓치지 마세요.',
    image: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/images/ai-cruise-logo.png`,
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/support/notice`,
  });
}

export default function NoticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}






