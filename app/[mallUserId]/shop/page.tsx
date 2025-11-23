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
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <AffiliateTracker 
          mallUserId={String(partner.mallUserId)} 
          affiliateCode={affiliateCode} 
        />
        <div className="max-w-7xl mx-auto px-6 py-10">
          <ProductList partnerContext={partnerContext} />
        </div>
        <PublicFooter />
      </div>
    );
  } catch (error) {
    console.error('[PersonalShopPage] Error:', error);
    notFound();
  }
}




