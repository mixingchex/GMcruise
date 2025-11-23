import { notFound } from 'next/navigation';
import ProductList from '@/components/mall/ProductList';
import PublicFooter from '@/components/layout/PublicFooter';
import AffiliateTracker from '@/components/affiliate/AffiliateTracker';
import LandingPageContent from '@/components/landing/LandingPageContent';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 파트너 랜딩 페이지
 * /store/[affiliateCode]/[landingSlug] 형식으로 접근
 * 예: /store/AFF-BOSS1-BECF/boss1
 */
export default async function LandingPage({ 
  params 
}: { 
  params: Promise<{ affiliateCode: string; landingSlug: string }> 
}) {
  const resolvedParams = await params;
  const { affiliateCode, landingSlug } = resolvedParams;

  if (!affiliateCode || !landingSlug) {
    notFound();
  }

  try {
    // landingSlug가 숫자인 경우 (랜딩페이지 ID), LandingPage를 직접 조회
    const landingPageId = parseInt(landingSlug);
    if (!isNaN(landingPageId)) {
      console.log('[LandingPage] Landing page ID detected:', landingPageId, 'affiliateCode:', affiliateCode);
      
      // 랜딩페이지 ID로 조회
      const landingPage = await prisma.landingPage.findUnique({
        where: { id: landingPageId },
        include: {
          User: {
            select: {
              id: true,
              mallUserId: true,
              mallNickname: true,
            },
          },
        },
      });

      console.log('[LandingPage] Landing page found:', {
        exists: !!landingPage,
        isActive: landingPage?.isActive,
        isPublic: landingPage?.isPublic,
        hasContent: !!landingPage?.htmlContent,
      });

      if (!landingPage) {
        console.error('[LandingPage] Landing page not found with ID:', landingPageId);
        notFound();
      }

      if (!landingPage.isActive || !landingPage.isPublic) {
        console.error('[LandingPage] Landing page not active or not public:', {
          isActive: landingPage.isActive,
          isPublic: landingPage.isPublic,
        });
        notFound();
      }

      // AffiliateProfile에서 affiliateCode로 조회 (published 체크 제거 - 링크로 접근하는 경우이므로)
      const profile = await prisma.affiliateProfile.findFirst({
        where: {
          affiliateCode,
        },
        include: {
          User: {
            select: {
              id: true,
              mallUserId: true,
              mallNickname: true,
            },
          },
        },
      });

      console.log('[LandingPage] Profile found:', {
        exists: !!profile,
        hasUser: !!profile?.User,
        hasMallUserId: !!profile?.User?.mallUserId,
      });

      // profile이 없어도 랜딩페이지는 표시 (affiliateCode만 추적)
      const mallUserId = profile?.User?.mallUserId 
        ? String(profile.User.mallUserId)
        : affiliateCode; // fallback으로 affiliateCode 사용
      
      // 랜딩페이지 HTML 콘텐츠 렌더링
      return (
        <div className="min-h-screen bg-gray-50">
          <AffiliateTracker 
            mallUserId={mallUserId} 
            affiliateCode={affiliateCode} 
          />
          <div className="max-w-7xl mx-auto px-6 py-10">
            <LandingPageContent 
              htmlContent={landingPage.htmlContent || ''}
              headerScript={landingPage.headerScript}
            />
          </div>
          <PublicFooter />
        </div>
      );
    }

    // 기존 로직: AffiliateProfile에서 affiliateCode와 landingSlug로 조회
    const profile = await prisma.affiliateProfile.findFirst({
      where: {
        affiliateCode,
        landingSlug,
        published: true, // 발행된 프로필만
      },
      include: {
        User: {
          select: {
            id: true,
            mallUserId: true,
            mallNickname: true,
          },
        },
      },
    });

    if (!profile || !profile.User?.mallUserId) {
      notFound();
    }

    const partner = profile.User;
    const mallUserId = String(partner.mallUserId);
    
    // 완전히 직렬화 가능한 객체로 변환
    const partnerContext = {
      mallUserId,
      profileTitle: profile.profileTitle 
        ? String(profile.profileTitle) 
        : profile.displayName
        ? String(profile.displayName)
        : partner.mallNickname 
        ? String(partner.mallNickname) 
        : `파트너 ${mallUserId}`,
      landingAnnouncement: profile.landingAnnouncement 
        ? (profile.landingAnnouncement ? String(profile.landingAnnouncement) : null)
        : null,
      welcomeMessage: profile.welcomeMessage 
        ? (profile.welcomeMessage ? String(profile.welcomeMessage) : null)
        : null,
      profileImage: profile.profileImage 
        ? (profile.profileImage ? String(profile.profileImage) : null)
        : null,
      coverImage: profile.coverImage 
        ? (profile.coverImage ? String(profile.coverImage) : null)
        : null,
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <AffiliateTracker 
          mallUserId={mallUserId} 
          affiliateCode={affiliateCode} 
        />
        <div className="max-w-7xl mx-auto px-6 py-10">
          <ProductList partnerContext={partnerContext} />
        </div>
        <PublicFooter />
      </div>
    );
  } catch (error: any) {
    console.error('[LandingPage] Error:', error);
    console.error('[LandingPage] Error details:', {
      message: error?.message,
      stack: error?.stack,
      affiliateCode,
      landingSlug,
    });
    // 에러가 발생해도 404 대신 에러 페이지를 표시하거나, 기본 페이지로 리다이렉트
    throw error; // Next.js가 에러를 처리하도록
  }
}



