import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../globals.css"; // 상위 폴더의 전역 스타일 import

/**
 * /en - Global Extension Layout
 * Isolated from Korean version
 */
const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "CruiseDot AI - Korea Travel Survival Tool",
  description: "AI-powered travel assistant for foreigners in Korea",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// ✨ 핵심: suppressHydrationWarning 추가
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-black text-white antialiased selection:bg-purple-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
