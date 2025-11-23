// app/products/layout.tsx
// 상품 목록 페이지 SEO 메타데이터 및 구조화된 데이터

import type { Metadata } from 'next';
import Script from 'next/script';
import { generateMetadata as generateSeoMetadata } from '@/lib/seo/metadata';
import { generateItemList } from '@/lib/seo/structured-data';
import prisma from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  const pagePath = '/products';
  return generateSeoMetadata(pagePath, {
    title: '크루즈 상품 - 크루즈 가이드 | 다양한 크루즈 여행 상품 예약',
    description: '꿈꾸던 크루즈 여행, 지금 시작하세요. 일본 크루즈, 지중해 크루즈, 알래스카 크루즈 등 다양한 크루즈 상품을 확인하고 예약하세요.',
    image: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/images/ai-cruise-logo.png`,
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/products`,
  });
}

export default async function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 인기 상품 목록 가져오기 (구조화된 데이터용)
  let popularProducts: any[] = [];
  try {
    const products = await prisma.cruiseProduct.findMany({
      where: {
        saleStatus: {
          not: 'SOLD_OUT',
        },
      },
      select: {
        productCode: true,
        packageName: true,
        cruiseLine: true,
        shipName: true,
        description: true,
        basePrice: true,
        MallProductContent: {
          select: {
            thumbnail: true,
          },
        },
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    popularProducts = products.map((product) => ({
      name: `${product.cruiseLine} ${product.shipName} - ${product.packageName}`,
      description: product.description || `${product.packageName} 크루즈 여행 상품입니다.`,
      url: `/products/${product.productCode}`,
      image: product.MallProductContent?.thumbnail || '/images/ai-cruise-logo.png',
      price: product.basePrice,
    }));
  } catch (error) {
    console.error('[ProductsLayout] Error loading products:', error);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr';
  const itemListData = popularProducts.length > 0
    ? generateItemList(popularProducts.map((p) => ({
        ...p,
        image: p.image.startsWith('http') ? p.image : `${baseUrl}${p.image}`,
        url: p.url,
      })))
    : null;

  return (
    <>
      {/* 구조화된 데이터 (JSON-LD) - ItemList */}
      {itemListData && (
        <Script
          id="products-itemlist-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemListData),
          }}
        />
      )}
      {children}
    </>
  );
}
