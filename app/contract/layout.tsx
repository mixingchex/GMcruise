import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
  title: '여행계약서',
};

// P1-09: 모바일 서명 시 pinch-zoom 방지
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ContractLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
