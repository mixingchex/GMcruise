export const dynamic = 'force-dynamic';

/**
 * GET /api/partner/my-link
 * 판매원 전용 어필리에이트 링크 조회
 *
 * 링크 전략: 판매원당 베이스 링크 1개 (상품별 링크 폭증 방지)
 *   기본 링크: https://cruisedot.co.kr?affiliate=AGENT_CODE
 *   상품 지정: https://cruisedot.co.kr/products/PRODUCT_CODE?affiliate=AGENT_CODE
 *
 * 쿠키 만료: 30일 (고객이 나중에 다른 상품 구매해도 귀속 유지)
 * 추적 파라미터: ?affiliate= (payment/inquiry 페이지에서 인식)
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext } from '@/lib/partner-auth';
import { logger } from '@/lib/logger';

const LINK_STATS_DAYS = 30;

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
    // [수정] by: ['eventType'] — 스키마 필드명 일치
    const clickStats = await prisma.affiliateLinkEvent
      .groupBy({
        by: ['eventType'],
        where: {
          AffiliateLink: {
            OR: [{ agentId: profile.id }, { managerId: profile.id }],
          },
          createdAt: {
            gte: new Date(Date.now() - LINK_STATS_DAYS * 24 * 60 * 60 * 1000),
          },
        },
        _count: { id: true },
      })
      .catch(() => []);

    const totalClicks = clickStats.reduce((sum, s) => sum + s._count.id, 0);

    return NextResponse.json({
      ok: true,
      link: {
        // [수정] ?ref= → ?affiliate= (payment/inquiry 페이지 추적 파라미터)
        baseUrl: `${baseUrl}?affiliate=${code}`,
        mallUrl: `${baseUrl}/products?affiliate=${code}`,
        affiliateCode: code,
        productLinkPattern: `${baseUrl}/products/{PRODUCT_CODE}?affiliate=${code}`,
      },
      productLinks: products.map((p) => ({
        productCode: p.productCode,
        productName: p.packageName,
        thumbnail: p.MallProductContent?.thumbnail ?? null,
        url: `${baseUrl}/products/${p.productCode}?affiliate=${code}`,
      })),
      stats: {
        totalClicks30d: totalClicks,
      },
    });
  } catch (error: unknown) {
    logger.error('[Partner My-Link] Error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: '링크 조회 실패' }, { status: 500 });
  }
}
