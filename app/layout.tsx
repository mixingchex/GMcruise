import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { validateEnv } from "@/lib/env";
import { initializeApp } from "@/lib/init";
import Providers from "./providers";
import ConditionalBottomNavBar from "@/components/layout/ConditionalBottomNavBar";
import ConditionalBottomPadding from "@/components/layout/ConditionalBottomPadding";
import ConditionalPushNotification from "@/components/ConditionalPushNotification";
import MarketingPixelsLoader from "@/components/marketing/MarketingPixelsLoader";
import ConditionalSEO from "@/components/seo/ConditionalSEO";
import PWASetup from "@/components/PWASetup";
import Script from "next/script";

if (typeof window === "undefined") {
  validateEnv();
  initializeApp().catch((err) => console.error("[Layout] 초기화 오류:", err));
}

const inter = Inter({ subsets: ["latin"] });

// 기본 메타데이터 (SEO 최적화)
export const metadata: Metadata = {
  metadataBase: new URL('https://www.cruisedot.co.kr'),
  title: "크루즈 가이드 - AI 여행 도우미 | 크루즈 예약, 여행 준비, 실시간 안내",
  description: "AI 가이드 지니와 함께하는 특별한 크루즈 여행. 크루즈 상품 예약, 여행 준비, 실시간 안내까지 모든 것을 한 곳에서. 일본 크루즈, 지중해 크루즈, 알래스카 크루즈 등 다양한 크루즈 여행 상품을 확인하세요.",
  keywords: [
    "크루즈", "크루즈 여행", "AI 여행 도우미", "크루즈 가이드", "크루즈 상품", "크루즈 예약",
    "일본 크루즈", "해외 크루즈", "지중해 크루즈", "알래스카 크루즈", "카리브 크루즈",
    "크루즈 여행 패키지", "크루즈 선박", "크루즈 항구", "크루즈 터미널", "크루즈 여행 준비",
    "크루즈 체크리스트", "크루즈 여행 후기", "크루즈 커뮤니티", "크루즈닷", "cruisedot", "크루즈닷지니AI",
    "크루즈 여행 가이드", "크루즈 여행 팁", "크루즈 여행 정보", "크루즈 여행 상담",
    "MSC 크루즈", "로열캐리비안 크루즈", "노르웨이 크루즈", "프린세스 크루즈", "코스타 크루즈",
    "부산 크루즈", "인천 크루즈", "제주 크루즈", "크루즈 여행 일정", "크루즈 여행 가격"
  ],
  manifest: "/manifest.json",
  openGraph: {
    title: "크루즈 가이드 - AI 여행 도우미",
    description: "AI 가이드 지니와 함께하는 특별한 크루즈 여행",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://cruisedot.co.kr",
    siteName: "크루즈 가이드",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://cruisedot.co.kr"}/images/ai-cruise-logo.png`,
        width: 1200,
        height: 630,
        alt: "크루즈 가이드",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "크루즈 가이드 - AI 여행 도우미",
    description: "AI 가이드 지니와 함께하는 특별한 크루즈 여행",
    images: [`${process.env.NEXT_PUBLIC_BASE_URL || "https://cruisedot.co.kr"}/images/ai-cruise-logo.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // SEO 전역 설정에서 소셜 미디어 링크, 연락처 정보, Google Search Console verification 가져오기
  let socialLinks: string[] = ['https://www.youtube.com/@cruisedotgini'];
  let contactPhone = '010-3289-3800';
  let googleSearchConsoleVerification: string | null = null;
  
  try {
    const prisma = (await import('@/lib/prisma')).default;
    const seoConfig = await prisma.seoGlobalConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    
    if (seoConfig) {
      // 소셜 미디어 링크
      socialLinks = [];
      if (seoConfig.youtubeUrl) socialLinks.push(seoConfig.youtubeUrl);
      if (seoConfig.facebookUrl) socialLinks.push(seoConfig.facebookUrl);
      if (seoConfig.instagramUrl) socialLinks.push(seoConfig.instagramUrl);
      if (seoConfig.twitterUrl) socialLinks.push(seoConfig.twitterUrl);
      if (seoConfig.naverBlogUrl) socialLinks.push(seoConfig.naverBlogUrl);
      if (seoConfig.kakaoChannelUrl) socialLinks.push(seoConfig.kakaoChannelUrl);
      
      // 소셜 링크가 없으면 기본값 사용
      if (socialLinks.length === 0) {
        socialLinks = ['https://www.youtube.com/@cruisedotgini'];
      }
      
      // 연락처 정보
      if (seoConfig.contactPhone) {
        contactPhone = seoConfig.contactPhone;
      }
      
      // Google Search Console Verification
      if (seoConfig.googleSearchConsoleVerification) {
        googleSearchConsoleVerification = seoConfig.googleSearchConsoleVerification;
      }
    }
  } catch (error) {
    console.error('[Layout] Error loading SEO config:', error);
  }

  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#E50914" />
        <meta name="pinterest" content="nopin" />
        <meta name="pinterest-rich-pin" content="false" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* 보안 메타 태그 */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        {/* X-Frame-Options는 HTTP 헤더로만 설정 가능하므로 제거 (middleware에서 처리) */}
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        {/* 스크래핑 방지 메타 태그 */}
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="bingbot" content="noindex, nofollow" />
        {/* 개발자 도구 접근 제한 (선택사항) */}
        <meta name="format-detection" content="telephone=no, address=no, email=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/images/ai-cruise-logo.png" type="image/png" sizes="512x512" />
        {/* Google Search Console Verification */}
        {googleSearchConsoleVerification && (
          <meta name="google-site-verification" content={googleSearchConsoleVerification} />
        )}
      </head>
      <body className={inter.className}>
        {/* 구조화된 데이터 (JSON-LD) - Organization */}
        <Script
          id="organization-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: '크루즈닷',
              alternateName: 'CruiseDot',
              url: process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr',
              logo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/images/ai-cruise-logo.png`,
              description: 'AI 가이드 지니와 함께하는 특별한 크루즈 여행. 크루즈 상품 예약, 여행 준비, 실시간 안내까지 모든 것을 한 곳에서.',
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: contactPhone,
                contactType: 'customer service',
                areaServed: 'KR',
                availableLanguage: 'Korean'
              },
              sameAs: socialLinks,
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/products?search={search_term_string}`
                },
                'query-input': 'required name=search_term_string'
              }
            })
          }}
        />
        
        {/* 구조화된 데이터 (JSON-LD) - WebSite */}
        <Script
          id="website-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: '크루즈 가이드',
              alternateName: 'Cruise Guide',
              url: process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr',
              description: 'AI 가이드 지니와 함께하는 특별한 크루즈 여행. 크루즈 상품 예약, 여행 준비, 실시간 안내까지 모든 것을 한 곳에서.',
              publisher: {
                '@type': 'Organization',
                name: '크루즈닷',
                logo: {
                  '@type': 'ImageObject',
                  url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/images/ai-cruise-logo.png`
                }
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/products?search={search_term_string}`
                },
                'query-input': 'required name=search_term_string'
              }
            })
          }}
        />
        
        <ConditionalSEO />
        <PWASetup />
        <Providers>
          <MarketingPixelsLoader />
          <ConditionalBottomPadding>
            {children}
          </ConditionalBottomPadding>
          <ConditionalBottomNavBar />
          <ConditionalPushNotification />
        </Providers>
      </body>
    </html>
  );
}

