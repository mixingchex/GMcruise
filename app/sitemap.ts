// app/sitemap.ts
// 동적 sitemap.xml 생성

import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr';
  
  // 기본 페이지들
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  try {
    // 활성화된 크루즈 상품 페이지들
    const products = await prisma.cruiseProduct.findMany({
      where: {
        saleStatus: {
          not: 'SOLD_OUT',
        },
      },
      select: {
        productCode: true,
        updatedAt: true,
      },
      take: 1000, // 최대 1000개 상품
    });

    const productPages: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}/products/${product.productCode}`,
      lastModified: product.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // SEO 설정에서 추가 페이지들 가져오기
    const seoConfigs = await prisma.seoConfig.findMany({
      where: {
        robots: {
          not: {
            contains: 'noindex',
          },
        },
      },
      select: {
        pagePath: true,
        lastUpdated: true,
      },
      take: 500,
    });

    const seoPages: MetadataRoute.Sitemap = seoConfigs
      .filter(config => !config.pagePath.includes('[')) // 동적 라우트 제외
      .map((config) => ({
        url: `${baseUrl}${config.pagePath}`,
        lastModified: config.lastUpdated || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));

    return [...staticPages, ...productPages, ...seoPages];
  } catch (error) {
    console.error('[Sitemap] Error generating sitemap:', error);
    // 에러 발생 시 기본 페이지만 반환
    return staticPages;
  }
}






