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
export default async function PersonalShopPage({ params }: { params: Promise<{ mallUserId: string }> }) {
  const { mallUserId } = await params;

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
    
    // 판매중인 전체 상품을 노출 기준으로 사용
    // AffiliateLink/AffiliateProduct는 수당 정산 전용 — 몰 노출 기준이 아님
    // 어필리에이트 승인 여부와 무관하게 saleStatus='판매중' 상품은 모두 노출
    const saleProducts = await prisma.cruiseProduct.findMany({
      where: { saleStatus: '판매중' },
      select: { productCode: true },
    });

    const featuredProductCodes: string[] = saleProducts.map(p => p.productCode);
    
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




