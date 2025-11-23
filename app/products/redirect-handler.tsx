'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * 클라이언트 사이드 리다이렉트 핸들러
 * 링크 코드로 랜딩페이지로 리다이렉트
 */
function LinkRedirectHandlerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const linkCode = searchParams?.get('link');
    const agent = searchParams?.get('agent');
    const affiliate = searchParams?.get('affiliate');
    const product = searchParams?.get('product');

    if (linkCode) {
      // 링크 정보 조회
      fetch(`/api/public/affiliate-link/${linkCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok && data.link) {
            const link = data.link;
            // 랜딩페이지 정보가 있으면 리다이렉트
            if (link.landingPageId && link.landingPage) {
              const landingPage = link.landingPage;
              // 링크에 저장된 affiliateCode 우선 사용, 없으면 URL 파라미터 사용
              const affiliateCode = link.agent?.affiliateCode || link.manager?.affiliateCode || agent || affiliate;
              
              // 랜딩페이지 URL 생성
              let landingUrl = '';
              if (affiliateCode && landingPage.slug) {
                // 파트너별 랜딩페이지: /store/{affiliateCode}/{slug}
                landingUrl = `/store/${affiliateCode}/${landingPage.slug}`;
              } else if (landingPage.slug) {
                // 관리자 랜딩페이지: /landing/{slug}
                landingUrl = `/landing/${landingPage.slug}`;
              }

              if (landingUrl) {
                // 쿼리 파라미터 추가 (링크 코드, 상품 코드)
                const params = new URLSearchParams();
                if (linkCode) {
                  params.append('link', linkCode);
                }
                if (product) {
                  params.append('product', product);
                } else if (link.productCode) {
                  params.append('product', link.productCode);
                }
                const queryString = params.toString();
                if (queryString) {
                  landingUrl += `?${queryString}`;
                }

                // 리다이렉트
                router.replace(landingUrl);
              }
            }
          }
        })
        .catch(error => {
          console.error('[LinkRedirectHandler] Error:', error);
        });
    }
  }, [searchParams, router]);

  return null;
}

export function LinkRedirectHandler() {
  return (
    <Suspense fallback={null}>
      <LinkRedirectHandlerInner />
    </Suspense>
  );
}


