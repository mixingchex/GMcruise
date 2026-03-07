export const dynamic = 'force-dynamic';

// app/api/partner/links/route.ts
// 파트너용 링크 관리 API

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requirePartnerContext } from '@/app/api/partner/_utils';

// GET: 파트너의 링크 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { profile } = await requirePartnerContext();

    const mallUserId = profile.User?.mallUserId;
    if (!mallUserId) {
      return NextResponse.json(
        { ok: false, message: '파트너 ID를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // 파트너의 기본 판매 링크 생성
    // 참고: /${mallUserId}/shop 페이지는 AffiliateTracker로 자동 추적됨
    const shareLinks = {
      // 파트너몰 링크 (자동 추적됨 - AffiliateTracker가 쿠키 설정)
      mall: `/${mallUserId}/shop`,
      // 추적 링크는 mall과 동일 (중복 제거)
      // landing: 랜딩 페이지는 별도 구현 필요 시 추가
      landing:
        profile.affiliateCode && profile.landingSlug
          ? `/store/${profile.affiliateCode}/${profile.landingSlug}`
          : null,
    };

    // 쿼리 파라미터에서 필터 가져오기
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // 필터 조건 구성
    // 1. 파트너가 manager 또는 agent로 연결된 링크
    // 2. 관리자가 생성한 공통 링크 (managerId와 agentId가 모두 null인 링크)
    const where: any = {
      OR: [
        { managerId: profile.id },
        { agentId: profile.id },
        // 관리자가 생성한 공통 링크 (모든 파트너가 사용 가능)
        {
          AND: [
            { managerId: null },
            { agentId: null },
            { productCode: { not: null } }, // 상품 코드가 있는 링크만
          ],
        },
      ],
    };

    // 화이트리스트 검증 — 임의 문자열 그대로 Prisma 쿼리에 주입 방지
    const ALLOWED_STATUSES = ['ACTIVE', 'INACTIVE', 'EXPIRED', 'PENDING', 'REVOKED'];
    if (status && status !== 'all' && ALLOWED_STATUSES.includes(status)) {
      where.status = status;
    }

    // 링크 목록 조회
    const links = await prisma.affiliateLink.findMany({
      where,
      include: {
        AffiliateProfile_AffiliateLink_managerIdToAffiliateProfile: {
          select: {
            id: true,
            displayName: true,
            affiliateCode: true,
          },
        },
        AffiliateProfile_AffiliateLink_agentIdToAffiliateProfile: {
          select: {
            id: true,
            displayName: true,
            affiliateCode: true,
          },
        },
        AffiliateProduct: {
          select: {
            id: true,
            productCode: true,
            title: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            AffiliateLead: true,
            AffiliateSale: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 모든 활성 상품에 대한 자동 링크 생성 (DB에 저장)
    const activeProducts = await prisma.cruiseProduct.findMany({
      where: {
        saleStatus: '판매중',
      },
      select: {
        id: true,
        productCode: true,
        packageName: true,
        cruiseLine: true,
        shipName: true,
      },
      orderBy: [
        { updatedAt: 'desc' },
      ],
      take: 100, // 최근 100개 상품
    });

    // 상품별 판매 링크: DB 쓰기 없이 메모리에서 계산
    // ?affiliate=CODE (대리점장) 또는 ?agent=CODE (판매원) 파라미터 하나로 구매 추적 충분
    const autoParams = new URLSearchParams();
    if (profile.type === 'BRANCH_MANAGER' && profile.affiliateCode) {
      autoParams.append('affiliate', profile.affiliateCode);
    } else if (profile.type === 'SALES_AGENT' && profile.affiliateCode) {
      autoParams.append('agent', profile.affiliateCode);
    }
    const autoQueryString = autoParams.toString();

    const productAutoLinks = activeProducts.map((product) => ({
      productCode: product.productCode,
      title: product.packageName,
      url: `/products/${product.productCode}${autoQueryString ? `?${autoQueryString}` : ''}`,
      product: {
        id: product.id,
        productCode: product.productCode,
        title: `${product.cruiseLine} ${product.shipName} - ${product.packageName}`,
      },
      isAutoLink: true,
      isComputedLink: true, // DB 저장 없음 — 클라이언트에서 key로 productCode 사용
      _count: { leads: 0, sales: 0 },
    }));

    // 링크 URL 생성 (클라이언트에서 동적으로 생성하도록 URL 템플릿만 제공)
    const linksWithUrl = links.map((link) => {
      // 클라이언트에서 window.location.origin을 사용하여 URL 생성
      const params = new URLSearchParams();
      
      // 관리자가 생성한 공통 링크인 경우, 현재 파트너의 affiliateCode를 추가
      const isCommonLink = !link.managerId && !link.agentId;
      if (isCommonLink && profile.affiliateCode) {
        // 판매원/대리점장의 affiliateCode를 자동으로 추가
        if (profile.type === 'BRANCH_MANAGER') {
          params.append('affiliate', profile.affiliateCode);
        } else if (profile.type === 'SALES_AGENT') {
          params.append('agent', profile.affiliateCode);
        }
      } else {
        // 개별 할당된 링크는 기존 로직 유지
        if (link.AffiliateProfile_AffiliateLink_managerIdToAffiliateProfile?.affiliateCode) {
          params.append('affiliate', link.AffiliateProfile_AffiliateLink_managerIdToAffiliateProfile.affiliateCode);
        }
        if (link.AffiliateProfile_AffiliateLink_agentIdToAffiliateProfile?.affiliateCode) {
          params.append('agent', link.AffiliateProfile_AffiliateLink_agentIdToAffiliateProfile.affiliateCode);
        }
      }
      
      // trial 링크인 경우 (3일 체험 초대 링크) - 전체 구매몰이 아닌 로그인 페이지로
      if (link.code && link.code.startsWith('trial-')) {
        const trialParams = new URLSearchParams();
        trialParams.append('trial', link.code);
        if (link.AffiliateProfile_AffiliateLink_agentIdToAffiliateProfile?.affiliateCode) {
          trialParams.append('affiliate', link.AffiliateProfile_AffiliateLink_agentIdToAffiliateProfile.affiliateCode);
        } else if (link.AffiliateProfile_AffiliateLink_managerIdToAffiliateProfile?.affiliateCode) {
          trialParams.append('affiliate', link.AffiliateProfile_AffiliateLink_managerIdToAffiliateProfile.affiliateCode);
        }
        const loginUrl = `/login-test?${trialParams.toString()}`;
        return {
          ...link,
          url: loginUrl,
          manager: link.AffiliateProfile_AffiliateLink_managerIdToAffiliateProfile,
          agent: link.AffiliateProfile_AffiliateLink_agentIdToAffiliateProfile,
          product: link.AffiliateProduct,
          issuedBy: link.User,
          isCommonLink,
          _count: {
            leads: link._count.AffiliateLead,
            sales: link._count.AffiliateSale,
          },
        };
      }
      
      if (link.code) {
        params.append('link', link.code);
      }
      const queryString = params.toString();
      const urlTemplate = link.productCode 
        ? `/products/${link.productCode}${queryString ? `?${queryString}` : ''}`
        : `/products${queryString ? `?${queryString}` : ''}`;
      
      // 프론트엔드 형식에 맞게 변환
      return {
        ...link,
        url: urlTemplate,
        manager: link.AffiliateProfile_AffiliateLink_managerIdToAffiliateProfile,
        agent: link.AffiliateProfile_AffiliateLink_agentIdToAffiliateProfile,
        product: link.AffiliateProduct,
        issuedBy: link.User,
        isCommonLink, // 공통 링크 여부 표시
        _count: {
          leads: link._count.AffiliateLead,
          sales: link._count.AffiliateSale,
        },
      };
    });

    return NextResponse.json({
      ok: true,
      shareLinks, // 파트너의 기본 판매 링크
      links: linksWithUrl, // AffiliateLink 테이블의 링크들
      productLinks: productAutoLinks, // 상품별 자동 판매 링크
    });
  } catch (error: any) {
    logger.error('[Partner Links] GET error:', { error: error instanceof Error ? error.message : String(error) });
    if (error.name === 'PartnerApiError') {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.status || 403 }
      );
    }
    return NextResponse.json(
      { ok: false, message: '링크 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
