// components/home/HomeClientPage.tsx
// 메인페이지 클라이언트 컴포넌트 - 공개 쇼핑몰 (로그인 불필요)

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamicImport from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FiX, FiChevronRight, FiYoutube } from 'react-icons/fi';

// 정적 컴포넌트 import (Above the fold)
import HeroSection from '@/components/mall/HeroSection';
import PWAInstallButtonMall from '@/components/PWAInstallButtonMall';
import PWAInstallButtonGenie from '@/components/PWAInstallButtonGenie';
import KakaoChannelButton from '@/components/KakaoChannelButton';

// 동적 임포트 컴포넌트 (성능 최적화: 무거운 컴포넌트는 필요할 때만 로드)
const ProductList = dynamicImport(() => import('@/components/mall/ProductList'), {
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />,
});
const ReviewSlider = dynamicImport(() => import('@/components/mall/ReviewSlider'), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});
const CruiseSearchBlock = dynamicImport(() => import('@/components/mall/CruiseSearchBlock'), {
  loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />,
});
const CompanyStatsSection = dynamicImport(() => import('@/components/mall/CompanyStatsSection'), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});
const CommunitySection = dynamicImport(() => import('@/components/mall/CommunitySection'), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});
const ThemeProductSection = dynamicImport(() => import('@/components/mall/ThemeProductSection'), {
  loading: () => <div className="h-80 bg-gray-100 animate-pulse rounded-lg" />,
});
const PublicFooter = dynamicImport(() => import('@/components/layout/PublicFooter'), {
  loading: () => <div className="h-32 bg-gray-100 animate-pulse" />,
});

// 동적 임포트 컴포넌트 (성능 최적화: 무거운 컴포넌트는 필요할 때만 로드)
const YoutubeShortsSlider = dynamicImport(() => import('@/components/mall/YoutubeShortsSlider'), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});
const YoutubeVideosSlider = dynamicImport(() => import('@/components/mall/YoutubeVideosSlider'), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});
const YoutubeLiveSection = dynamicImport(() => import('@/components/mall/YoutubeLiveSection'), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});
const PromotionBannerCarousel = dynamicImport(() => import('@/components/mall/PromotionBannerCarousel'), {
  loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />,
});

export default function HomeClientPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string | null; role: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pageConfig, setPageConfig] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    // URL 파라미터에서 로그인 직후인지 확인
    const urlParams = new URLSearchParams(window.location.search);
    const isJustLoggedIn = urlParams.get('loggedIn') === 'true';

    // 로그인 직후인 경우 URL에서 파라미터 제거 (히스토리 정리)
    if (isJustLoggedIn) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // 페이지 설정 로드 함수 (비동기, 실패해도 페이지는 표시)
    const loadPageConfig = async () => {
      try {
        const configAbortController = new AbortController();
        const configTimeoutId = setTimeout(() => configAbortController.abort(), 3000); // 3초로 단축

        const apiUrl = '/api/public/page-config';
        const response = await fetch(apiUrl, {
          signal: configAbortController.signal,
        });

        clearTimeout(configTimeoutId);

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${apiUrl}`);
        }
        const data = await response.json();
        if (data.ok && data.config) {
          setPageConfig(data.config);
        } else {
          setPageConfig(null);
        }
      } catch (error: any) {
        if (!isMounted) return;
        if (error.name !== 'AbortError') {
          const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/public/page-config` : '/api/public/page-config';
          console.error('[HomePage] 페이지 설정 로드 실패:', fullUrl, error);
        }
        setPageConfig(null);
      }
    };

    // 로그인 상태 확인 (비동기, 실패해도 페이지는 표시)
    // 성능 최적화: 단순화된 인증 로직 (재시도 최대 1회)
    const authAbortController = new AbortController();
    const authTimeoutId = setTimeout(() => {
      authAbortController.abort();
      if (isMounted) setUser(null);
    }, 3000); // 3초 타임아웃 (단축)

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          signal: authAbortController.signal
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        clearTimeout(authTimeoutId);
        if (!isMounted) return;

        if (data.ok && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error: any) {
        clearTimeout(authTimeoutId);
        if (!isMounted) return;
        if (error.name !== 'AbortError') {
          setUser(null);
        }
      }
    };

    checkAuth();

    // 페이지 설정 로드 (병렬로 실행)
    loadPageConfig();

    // 페이지 포커스 시 사용자 정보 다시 확인 (로그인 후 리다이렉트 대응)
    // 성능 최적화: 60초 이상 경과 시에만 API 호출 (불필요한 요청 90% 감소)
    let lastFocusCheck = Date.now();
    const handleFocus = () => {
      if (!isMounted) return;
      const now = Date.now();
      // 60초 이내에 이미 체크했으면 스킵
      if (now - lastFocusCheck < 60000) return;
      lastFocusCheck = now;

      const focusAbortController = new AbortController();
      const focusApiUrl = '/api/auth/me';
      fetch(focusApiUrl, {
        credentials: 'include',
        signal: focusAbortController.signal
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!isMounted) return;
          if (data?.ok && data?.user) {
            setUser(data.user);
          } else {
            // 포커스 시 세션이 만료되었으면 로그아웃 처리
            setUser(null);
          }
        })
        .catch(() => { }); // 에러 무시
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearTimeout(authTimeoutId);
      abortController.abort();
      authAbortController.abort();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      const logoutApiUrl = '/api/auth/logout';
      await fetch(logoutApiUrl, {
        method: 'POST',
        credentials: 'include',
      });

      setUser(null);
      // 로그아웃 후 메인으로 이동 및 새로고침 (쿠키 삭제 반영)
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('[HomePage] 로그아웃 실패:', error);
      setUser(null);
      router.push('/');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* 배경 장식 도형 (Responsive Shapes) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-banana-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute top-[20%] left-0 w-[300px] h-[300px] bg-ocean-deep/5 rounded-full blur-3xl -translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-banana-gold/5 rounded-full blur-3xl translate-y-1/3 translate-x-1/3 pointer-events-none" />

      {/* 상단 헤더 - 세련된 디자인 */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-banana-gold/20 shadow-sm">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            {/* 왼쪽: 로고 및 환영 메시지 */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link href="/" className="flex items-center flex-shrink-0 transform hover:scale-105 transition-transform duration-200">
                <Image
                  src="/images/ai-cruise-logo.png"
                  alt="크루즈닷 로고"
                  width={120}
                  height={40}
                  className="h-8 sm:h-10 w-auto object-contain drop-shadow-md"
                  priority
                />
              </Link>
              {user ? (
                <Link
                  href="/community/my-info"
                  className="flex items-center gap-1 sm:gap-2 transition-all duration-200 cursor-pointer min-w-0 hover:scale-105"
                >
                  <span className="text-sm sm:text-base font-bold truncate bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    {user.name?.trim() || '고객'}
                  </span>
                  <span className="text-sm sm:text-base font-semibold whitespace-nowrap text-gray-700">
                    님 환영합니다! 👋
                  </span>
                </Link>
              ) : (
                <span className="text-sm sm:text-base font-semibold text-gray-700">
                  크루즈닷에 오신 것을 환영합니다! ✨
                </span>
              )}
            </div>

            {/* 오른쪽: 메뉴 버튼들 - 세련된 그라데이션 버튼 */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              {!user ? (
                <>
                  <Link
                    href="/mall/login"
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 min-h-[44px] flex items-center justify-center text-ocean-deep hover:text-ocean-deep/80 bg-white border border-banana-gold/40 hover:border-banana-gold shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/mall/signup"
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 min-h-[44px] flex items-center justify-center bg-gradient-to-r from-banana-gold via-yellow-400 to-banana-gold bg-[length:200%_auto] animate-gradient text-ocean-deep shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 border border-yellow-400/20"
                  >
                    회원가입
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/community/my-info"
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 min-h-[44px] flex items-center justify-center text-ocean-deep hover:text-ocean-deep/80 bg-white border border-banana-gold/40 hover:border-banana-gold shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                  >
                    내정보
                  </Link>
                  <Link
                    href="/community"
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 min-h-[44px] flex items-center justify-center bg-gradient-to-r from-banana-gold via-yellow-400 to-banana-gold bg-[length:200%_auto] animate-gradient text-ocean-deep shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 border border-yellow-400/20"
                  >
                    우리끼리크루즈닷
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 min-h-[44px] bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    로그아웃
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      {/* 히어로 섹션 */}
      <div className="relative">
        <HeroSection config={pageConfig?.hero} />
      </div>



      {/* 카카오톡 채널 추가 배너 */}
      <div className="container mx-auto px-4 py-4">
        <KakaoChannelButton variant="banner" />
      </div>

      {/* 바탕화면 추가하기 (내 정보와 크루즈 상품 검색 위) */}
      <section className="container mx-auto px-4 py-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <PWAInstallButtonMall />
        </div>
      </section>

      {/* 크루즈 상품 검색 */}
      {pageConfig?.cruiseSearch?.enabled !== false && (
        <section className="container mx-auto px-4 py-8 md:py-12 bg-white">
          <CruiseSearchBlock />
        </section>
      )}

      {/* 크루즈 후기 */}
      {pageConfig?.reviewSection?.enabled !== false && (
        <section className="container mx-auto px-4 py-12 bg-gray-50">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              {pageConfig?.reviewSection?.title || '⭐ 크루즈 후기'}
            </h2>
            <p className="text-gray-600 mb-4 text-lg">
              {pageConfig?.reviewSection?.description || '실제 고객들이 남긴 생생한 크루즈 여행 후기를 만나보세요'}
            </p>
            <a
              href={pageConfig?.reviewSection?.linkUrl || '/community'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-blue-600 hover:text-blue-700 font-semibold text-lg"
            >
              {pageConfig?.reviewSection?.linkText || '더 많은 후기 보기 →'}
            </a>
          </div>
          <ReviewSlider />
        </section>
      )}



      {/* 크루즈닷의 경험과 신뢰 */}
      {pageConfig?.companyStats?.enabled !== false && (
        <section className="container mx-auto px-4 py-12 bg-white">
          <CompanyStatsSection config={pageConfig?.companyStats} />
        </section>
      )}

      {/* 크루즈닷 지니 쇼츠 (통계 바로 아래) */}
      {pageConfig?.youtubeShorts?.enabled !== false && (
        <section className="container mx-auto px-4 py-12 bg-white">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              {pageConfig?.youtubeShorts?.title || '🎬 크루즈닷 지니 쇼츠'}
            </h2>
            <p className="text-gray-600 text-lg">
              {pageConfig?.youtubeShorts?.description || '크루즈 여행의 모든 순간을 Shorts로 만나보세요'}
            </p>
          </div>
          <YoutubeShortsSlider />
        </section>
      )}

      {/* 라이브 방송 (쇼츠 아래) */}
      {pageConfig?.youtubeLive?.enabled !== false && (
        <section id="live-broadcast" className="container mx-auto px-4 py-12 bg-white">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              {pageConfig?.youtubeLive?.title || '📡 라이브 방송'}
            </h2>
            <p className="text-gray-600 text-lg">
              {pageConfig?.youtubeLive?.description || '지금 이 순간, 크루즈닷 지니와 함께하세요'}
            </p>
          </div>
          <YoutubeLiveSection />
        </section>
      )}

      {/* 카카오톡 & 유튜브 그리드 섹션 (럭셔리 디자인) - 라이브 방송 하단에 배치 */}
      <section className="container mx-auto px-4 py-12 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {/* 카카오톡 참여하기 (Solid Yellow) */}
          <a
            href="https://open.kakao.com/o/plREDDUh"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-xl bg-[#FEE500] p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 flex flex-col items-center justify-center text-center h-64"
          >
            <div className="absolute top-4 right-4 opacity-50">
              <span className="text-4xl text-yellow-600">✨</span>
            </div>
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md mb-6 group-hover:scale-110 transition-transform">
              <span className="text-5xl text-[#3c1e1e]">💬</span>
            </div>
            <h3 className="text-3xl font-black text-[#3c1e1e] mb-2">
              카카오톡 참여하기
            </h3>
          </a>

          {/* 유튜브 구독하기 (Solid Red) */}
          <a
            href="https://www.youtube.com/@cruisedotgini?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-xl bg-[#E50914] p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 flex flex-col items-center justify-center text-center h-64"
          >
            <div className="absolute top-4 right-4 opacity-30">
              <div className="w-8 h-8 rounded-full bg-white/20"></div>
            </div>
            <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center shadow-inner mb-6 group-hover:scale-110 transition-transform backdrop-blur-sm border border-white/20">
              <div className="w-20 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-[#E50914] border-b-[10px] border-b-transparent ml-1"></div>
              </div>
            </div>
            <h3 className="text-3xl font-black text-white mb-2">
              유튜브 구독하기
            </h3>
            <p className="text-white/90 font-bold text-lg">
              크루즈닷가이드지니AI
            </p>
          </a>
        </div>
      </section>



      {/* 크루즈닷 지니 영상 */}
      {pageConfig?.youtubeVideos?.enabled !== false && (
        <section className="container mx-auto px-4 py-12 bg-gray-50">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              {pageConfig?.youtubeVideos?.title || '📺 크루즈닷 지니 영상'}
            </h2>
            <p className="text-gray-600 text-lg">
              {pageConfig?.youtubeVideos?.description || '크루즈 여행의 특별한 영상을 만나보세요'}
            </p>
          </div>
          <YoutubeVideosSlider />
        </section>
      )}

      {/* 인기 크루즈 & 추천 크루즈 */}
      {pageConfig?.productList?.enabled !== false && (
        <section id="products" className="container mx-auto px-4 py-12 bg-white">
          <ProductList />
        </section>
      )}

      {Array.isArray(pageConfig?.themeSections) && pageConfig.themeSections.some((section: any) => section?.enabled) && (
        <div className="bg-surface-secondary/50">
          {pageConfig.themeSections
            .filter((section: any) => section?.enabled)
            .map((section: any) => (
              <ThemeProductSection key={section.id} section={section} />
            ))}
        </div>
      )}



      {/* 커뮤니티 하이라이트 - 항상 표시 */}
      <CommunitySection config={pageConfig?.communitySection} />

      {/* 프로모션 배너 (양싱 베너) - 상품 밑으로 이동 */}
      {pageConfig?.promotionBanner?.enabled !== false && (
        <section id="promotion-banner" className="container mx-auto px-4 py-12 bg-white">
          <PromotionBannerCarousel />
        </section>
      )}

      {/* 크루즈닷 지니 AI 출시 3일 무료체험 배너 (하단 신규 디자인) */}
      <section className="w-full bg-gradient-to-r from-[#051C2C] via-[#0f2c44] to-[#051C2C] py-16 md:py-20 cursor-pointer relative overflow-hidden" onClick={() => window.location.href = '/login-test'}>
        <div className="absolute inset-0 bg-[url('/images/pattern-overlay.png')] opacity-5"></div>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                크루즈닷 지니 AI 출시
              </h2>
              <h3 className="text-3xl md:text-4xl font-bold text-[#D4AF37] mb-6 drop-shadow-sm">
                3일 무료체험
              </h3>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 font-medium">
                AI 채팅, 체크리스트, 여행 지도, 가계부까지
              </p>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/login-test';
                }}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] bg-[length:200%_auto] animate-gradient text-[#051C2C] text-lg font-black rounded-full shadow-[0_0_20px_rgba(212,175,55,0.6)] hover:shadow-[0_0_35px_rgba(212,175,55,0.9)] transform hover:scale-105 transition-all border-2 border-[#fff]/40 backdrop-blur-md ring-2 ring-[#FFD700]/50"
              >
                크루즈 지니 AI 3일 무료체험 구경하기
              </button>
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              <p className="text-gray-300 text-sm md:text-base font-medium">
                무료체험은 본사 문의 해 주세요
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open('https://www.cruisedot.co.kr/landing/landing-1763789419546', '_blank');
                }}
                className="w-full sm:w-auto px-8 py-3 bg-white/10 hover:bg-white/20 text-white text-base font-bold rounded-full border border-white/30 backdrop-blur-sm transition-all"
              >
                무료체험 신청하기 🚀
              </button>
            </div>
          </div>
        </div>
      </section>



      {/* 푸터 */}
      <PublicFooter />

      {/* 팝업 메시지 */}
      {pageConfig?.popup?.enabled && <PopupMessage config={pageConfig.popup} />}
    </div>
  );
}

// 팝업 메시지 컴포넌트
function PopupMessage({ config }: { config: any }) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);

  useEffect(() => {
    // localStorage에서 이미 본 팝업인지 확인
    const seen = localStorage.getItem(`popup-seen-${config.title || 'default'}`);
    if (seen === 'true') {
      setIsVisible(false);
      setHasSeen(true);
    } else {
      setIsVisible(true);
    }
  }, [config]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(`popup-seen-${config.title || 'default'}`, 'true');
  };

  if (!isVisible || hasSeen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative">
        {config.showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          >
            <FiX size={24} />
          </button>
        )}
        {config.type === 'image' ? (
          <div>
            {config.link ? (
              <a href={config.link} target="_blank" rel="noopener noreferrer" onClick={handleClose}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.imageUrl}
                  alt={config.title}
                  className="w-full rounded-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder.png';
                  }}
                />
              </a>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={config.imageUrl}
                alt={config.title}
                className="w-full rounded-2xl cursor-pointer"
                onClick={handleClose}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder.png';
                }}
              />
            )}
          </div>
        ) : (
          <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">{config.title}</h3>
            <div className="text-gray-700 mb-6 whitespace-pre-line">{config.content}</div>
            {config.link && (
              <a
                href={config.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center font-semibold"
                onClick={handleClose}
              >
                자세히 보기
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
