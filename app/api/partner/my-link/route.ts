export const dynamic = 'force-dynamic';

/**
 * GET /api/partner/my-link
 * 판매원 전용 어필리에이트 링크 조회
 *
 * 링크 전략: 판매원당 베이스 링크 1개 (상품별 링크 폭증 방지)
 *   기본 링크: https://cruisedot.co.kr?ref=AGENT_CODE
 *   상품 지정: https://cruisedot.co.kr/products/PRODUCT_CODE?ref=AGENT_CODE
 *
 * 쿠키 만료: 30일 (고객이 나중에 다른 상품 구매해도 귀속 유지)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext } from '@/lib/partner-auth';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { profile } = await requirePartnerContext();

    if (!profile.affiliateCode) {
      return NextResponse.json(
        { ok: false, error: '어필리에이트 코드가 없습니다. 관리자에게 문의하세요.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr';
    const code = profile.affiliateCode;

    // 현재 판매 중인 상품 목록 (링크 생성용)
    const products = await prisma.cruiseProduct.findMany({
      where: { saleStatus: '판매중' },
      select: {
        productCode: true,
        packageName: true,
        MallProductContent: {
          select: { thumbnail: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 링크 클릭 통계 (AffiliateLinkEvent 기반)
    const clickStats = await prisma.affiliateLinkEvent.groupBy({
      by: ['type'],
      where: {
        AffiliateLink: {
          OR: [{ agentId: profile.id }, { managerId: profile.id }],
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 최근 30일
        },
      },
      _count: { id: true },
    }).catch(() => []);

    const totalClicks = clickStats.reduce((sum, s) => sum + s._count.id, 0);

    return NextResponse.json({
      ok: true,
      link: {
        // 베이스 링크 (상품 무관)
        baseUrl: `${baseUrl}?ref=${code}`,
        // 전체 상품 목록 링크
        mallUrl: `${baseUrl}/products?ref=${code}`,
        affiliateCode: code,
        // 상품별 링크 생성 패턴 안내
        productLinkPattern: `${baseUrl}/products/{PRODUCT_CODE}?ref=${code}`,
      },
      // 현재 판매중 상품별 링크
      productLinks: products.map(p => ({
        productCode: p.productCode,
        productName: p.packageName,
        thumbnail: p.MallProductContent?.thumbnail ?? null,
        url: `${baseUrl}/products/${p.productCode}?ref=${code}`,
      })),
      stats: {
        totalClicks30d: totalClicks,
      },
    });
  } catch (error: unknown) {
    logger.error('[Partner My-Link] Error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: '링크 조회 실패' },
      { status: 500 }
    );
  }
}
