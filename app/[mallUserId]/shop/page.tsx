import { notFound } from 'next/navigation';
import ProductList from '@/components/mall/ProductList';
import PublicFooter from '@/components/layout/PublicFooter';
import AffiliateTracker from '@/components/affiliate/AffiliateTracker';
import prisma from '@/lib/prisma';

/**
 * 개인 판매몰 페이지
 * /[mallUserId]/shop 형식으로 접근
 * 예: /user1/shop, /boss1/shop
 */
export default async function PersonalShopPage({ params }: { params: { mallUserId: string } }) {
  const { mallUserId } = params;

  if (!mallUserId) {
    notFound();
  }

  try {
    const partner = await prisma.user.findFirst({
      where: { mallUserId },
      select: {
        id: true,
        mallUserId: true,
        mallNickname: true,
        AffiliateProfile: {
          select: {
            id: true,
            affiliateCode: true,
            profileTitle: true,
            landingAnnouncement: true,
            welcomeMessage: true,
            profileImage: true,
            coverImage: true,
            displayName: true,
          },
        },
      },
    });

    if (!partner?.mallUserId) {
      notFound();
    }

    const partnerProfile = partner.AffiliateProfile;
    const affiliateCode = partnerProfile?.affiliateCode 
      ? String(partnerProfile.affiliateCode) 
      : null;
    
    // 파트너의 개인 링크 조회
    // 1. 공통 링크 (managerId와 agentId가 모두 null인 링크)
    // 2. 판매원에게 할당된 개인 링크 (agentId = partnerProfile.id)
    // 3. 대리점장에게 할당된 개인 링크 (managerId = partnerProfile.id)
    const profileId = partnerProfile?.id;
    
    const personalProductLinks = await prisma.affiliateLink.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          {
            OR: [
              // productCode가 직접 설정된 링크
              { productCode: { not: null } },
              // AffiliateProduct를 통해 productCode를 가져올 수 있는 링크
              { affiliateProductId: { not: null } },
            ],
          },
          {
            OR: [
              // 공통 링크
              { managerId: null, agentId: null },
              // 판매원 개인 링크
              ...(profileId ? [{ agentId: profileId }] : []),
              // 대리점장 개인 링크
              ...(profileId ? [{ managerId: profileId }] : []),
            ],
          },
        ],
      },
      select: {
        productCode: true,
        affiliateProductId: true,
        AffiliateProduct: {
          select: {
            id: true,
            productCode: true,
            title: true,
          },
        },
      },
    });
    
    // 개인 링크로 등록된 상품 코드 목록 (중복 제거)
    // productCode가 직접 있으면 사용, 없으면 AffiliateProduct에서 가져오기
    const featuredProductCodes: string[] = Array.from(
      new Set(
        personalProductLinks
          .map(link => {
            // 직접 productCode가 있으면 사용
            if (link.productCode) {
              return link.productCode;
            }
            // AffiliateProduct를 통해 productCode 가져오기
            if (link.AffiliateProduct?.productCode) {
              return link.AffiliateProduct.productCode;
            }
            return null;
          })
          .filter((code): code is string => code !== null)
      )
    );
    
    // 디버깅: 어필리에이트 링크 조회 결과 로그
    console.log('[PersonalShopPage] 어필리에이트 링크 조회 결과:', {
      mallUserId,
      profileId,
      affiliateCode,
      personalProductLinksCount: personalProductLinks.length,
      featuredProductCodesCount: featuredProductCodes.length,
      featuredProductCodes,
    });
    
    // 완전히 직렬화 가능한 객체로 변환
    const partnerContext = {
      mallUserId: String(partner.mallUserId || ''),
      profileTitle: partnerProfile?.profileTitle 
        ? String(partnerProfile.profileTitle) 
        : partnerProfile?.displayName
        ? String(partnerProfile.displayName)
        : partner.mallNickname 
        ? String(partner.mallNickname) 
        : `파트너 ${partner.mallUserId}`,
      landingAnnouncement: partnerProfile?.landingAnnouncement 
        ? (partnerProfile.landingAnnouncement ? String(partnerProfile.landingAnnouncement) : null)
        : null,
      welcomeMessage: partnerProfile?.welcomeMessage 
        ? (partnerProfile.welcomeMessage ? String(partnerProfile.welcomeMessage) : null)
        : null,
      // 판매몰에는 프로필 이미지 표시하지 않음 (리틀리 전용)
      profileImage: null,
      coverImage: null,
      featuredProductCodes, // 개인 링크로 등록된 상품 코드 목록
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <AffiliateTracker 
          mallUserId={String(partner.mallUserId)} 
          affiliateCode={affiliateCode} 
        />
        <div className="max-w-7xl mx-auto px-6 py-10">
          <ProductList 
            partnerContext={partnerContext} 
            featuredProductCodes={featuredProductCodes}
          />
        </div>
        <PublicFooter />
      </div>
    );
  } catch (error) {
    console.error('[PersonalShopPage] Error:', error);
    notFound();
  }
}




