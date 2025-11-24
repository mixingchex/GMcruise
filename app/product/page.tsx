'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicFooter from '@/components/layout/PublicFooter';
import ProductList from '@/components/mall/ProductList';
import AffiliateTracker from '@/components/affiliate/AffiliateTracker';

/**
 * 공개 크루즈 상품 목록 페이지 (단수형)
 * 로그인 불필요, 누구나 접근 가능
 * 판매 중인 상품들을 진열하여 표시
 * 
 * URL 파라미터로 partner 정보를 받아 추적 가능:
 * - /product?partner=mallUserId 또는 /product?partner=affiliateCode
 */
function ProductPageContent() {
  const searchParams = useSearchParams();
  const partnerParam = searchParams?.get('partner');
  const [partnerContext, setPartnerContext] = useState<{
    mallUserId: string;
    affiliateCode?: string | null;
  } | null>(null);

  useEffect(() => {
    // URL 파라미터에서 partner 정보 추출
    if (partnerParam) {
      // partner 파라미터가 있으면 추적 설정
      // mallUserId로 사용 (affiliateCode는 별도로 전달되지 않으면 null)
      setPartnerContext({
        mallUserId: decodeURIComponent(partnerParam),
        affiliateCode: null, // URL에 affiliateCode가 별도로 없으면 null
      });
    }
  }, [partnerParam]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 파트너 추적 (URL 파라미터가 있을 때만) */}
      {partnerContext && (
        <AffiliateTracker 
          mallUserId={partnerContext.mallUserId}
          affiliateCode={partnerContext.affiliateCode}
        />
      )}

      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-4">
            <h1 className="text-4xl font-bold mb-4">크루즈 상품</h1>
            <p className="text-xl opacity-90 mb-6">
              지금 판매되는 크루즈 상품을 만나보세요
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 크루즈몰 상품 목록 컴포넌트 사용 */}
        {/* partner 파라미터가 있으면 partnerContext 전달 */}
        <ProductList 
          partnerContext={partnerContext ? {
            mallUserId: partnerContext.mallUserId,
            profileTitle: null,
            landingAnnouncement: null,
            welcomeMessage: null,
            profileImage: null,
            coverImage: null,
          } : null}
        />
      </div>

      <PublicFooter />
    </div>
  );
}

export default function ProductPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-800">로딩 중...</p>
        </div>
      </div>
    }>
      <ProductPageContent />
    </Suspense>
  );
}

