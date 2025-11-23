// app/robots.ts
// 동적 robots.txt 생성

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/chat/',
          '/chat-test/',
          '/onboarding/',
          '/checklist/',
          '/wallet/',
          '/my-info/',
          '/my-trips/',
          '/profile/',
          '/login/',
          '/signup/',
          '/payment/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/chat/',
          '/chat-test/',
          '/onboarding/',
          '/checklist/',
          '/wallet/',
          '/my-info/',
          '/my-trips/',
          '/profile/',
          '/login/',
          '/signup/',
          '/payment/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}






