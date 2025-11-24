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
      // trial 링크인 경우 (3일 체험 초대 링크) - 전체 구매몰이 아닌 로그인 페이지로 리다이렉트
      if (linkCode.startsWith('trial-')) {
        // trial 링크는 /login-test?trial=... 형식으로 리다이렉트
        const params = new URLSearchParams();
        params.append('trial', linkCode);
        if (agent) {
          params.append('affiliate', agent);
        }
        if (affiliate) {
          params.append('affiliate', affiliate);
        }
        const loginUrl = `/login-test?${params.toString()}`;
        router.replace(loginUrl);
        return;
      }

      // 일반 어필리에이트 링크 처리
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


