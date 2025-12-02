// components/home/HomeClientPage.tsx
// 메인페이지 클라이언트 컴포넌트 - 공개 쇼핑몰 (로그인 불필요)

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamicImport from 'next/dynamic';
import { FiX } from 'react-icons/fi';

// 정적 컴포넌트 import
import HeroSection from '@/components/mall/HeroSection';
import ProductList from '@/components/mall/ProductList';
import ReviewSlider from '@/components/mall/ReviewSlider';
import CruiseSearchBlock from '@/components/mall/CruiseSearchBlock';
import PublicFooter from '@/components/layout/PublicFooter';
import CompanyStatsSection from '@/components/mall/CompanyStatsSection';
import CommunitySection from '@/components/mall/CommunitySection';
import ThemeProductSection from '@/components/mall/ThemeProductSection';
import KakaoChannelButton from '@/components/KakaoChannelButton';
import PWAInstallButtonMall from '@/components/PWAInstallButtonMall';
import PWAInstallButtonGenie from '@/components/PWAInstallButtonGenie';

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
    const authAbortController = new AbortController();
    const authTimeoutId = setTimeout(() => {
      authAbortController.abort();
      if (isMounted) {
        setUser(null);
      }
    }, 5000); // 5초로 증가 (로그인 후 세션 설정 시간 고려)

    // 로그인 직후일 수 있으므로 약간의 딜레이 후 사용자 정보 조회
    const checkAuth = async () => {
      try {
        // 로그인 직후인 경우 더 긴 대기 시간 (800ms), 아닌 경우 기본 대기 (300ms)
        const delay = isJustLoggedIn ? 800 : 300;
        await new Promise(resolve => setTimeout(resolve, delay));

        const apiUrl = '/api/auth/me';
        const res = await fetch(apiUrl, {
          credentials: 'include',
          signal: authAbortController.signal
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${apiUrl}`);
        }

        const data = await res.json();
        clearTimeout(authTimeoutId);

        if (!isMounted) return;

        if (data.ok && data.user) {
          console.log('[HomePage] 사용자 정보 로드 성공:', data.user.name);
          setUser(data.user);
        } else {
          // 로그인 직후인 경우 한 번 더 재시도
          if (isJustLoggedIn && !user) {
            console.log('[HomePage] 로그인 직후 사용자 정보 없음, 재시도...');
            setTimeout(async () => {
              if (!isMounted) return;
              try {
                const retryApiUrl = '/api/auth/me';
                const retryRes = await fetch(retryApiUrl, {
                  credentials: 'include',
                  signal: authAbortController.signal
                });
                if (retryRes.ok) {
                  const retryData = await retryRes.json();
                  if (retryData.ok && retryData.user) {
                    console.log('[HomePage] 재시도 성공:', retryData.user.name);
                    setUser(retryData.user);
                    return;
                  }
                } else {
                  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${retryApiUrl}` : retryApiUrl;
                  console.error('[HomePage] 재시도 API 에러:', fullUrl, `HTTP ${retryRes.status}`);
                }
              } catch (retryError) {
                const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/auth/me` : '/api/auth/me';
                console.error('[HomePage] 재시도 실패:', fullUrl, retryError);
              }
              if (!isMounted) return;
              setUser(null);
            }, 500);
          } else {
            console.log('[HomePage] 사용자 정보 없음');
            setUser(null);
          }
        }
      } catch (error: any) {
        clearTimeout(authTimeoutId);
        if (!isMounted) return;
        if (error.name !== 'AbortError') {
          const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/auth/me` : '/api/auth/me';
          console.error('[HomePage] 로그인 상태 확인 실패:', fullUrl, error);
        }
        // 로그인 직후인 경우 재시도
        if (isJustLoggedIn && !user) {
          setTimeout(async () => {
            if (!isMounted) return;
            try {
              const retryApiUrl = '/api/auth/me';
              const retryRes = await fetch(retryApiUrl, {
                credentials: 'include',
                signal: authAbortController.signal
              });
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                if (retryData.ok && retryData.user) {
                  console.log('[HomePage] 재시도 성공:', retryData.user.name);
                  setUser(retryData.user);
                  return;
                }
              } else {
                const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${retryApiUrl}` : retryApiUrl;
                console.error('[HomePage] 재시도 API 에러:', fullUrl, `HTTP ${retryRes.status}`);
              }
            } catch (retryError) {
              const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/auth/me` : '/api/auth/me';
              console.error('[HomePage] 재시도 실패:', fullUrl, retryError);
            }
            if (!isMounted) return;
            setUser(null);
          }, 500);
        } else {
          setUser(null);
        }
      }
    };

    checkAuth();

    // 페이지 설정 로드 (병렬로 실행)
    loadPageConfig();

    // 페이지 포커스 시 사용자 정보 다시 확인 (로그인 후 리다이렉트 대응)
    const handleFocus = () => {
      if (!isMounted) return;
      // 포커스 시에도 약간의 딜레이를 주어 쿠키가 설정될 시간을 확보
      setTimeout(() => {
        if (!isMounted) return;
        const focusAbortController = new AbortController();
        const focusApiUrl = '/api/auth/me';
        fetch(focusApiUrl, {
          credentials: 'include',
          signal: focusAbortController.signal
        })
          .then(res => {
            if (!res.ok) {
              const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${focusApiUrl}` : focusApiUrl;
              console.error('[HomePage] 포커스 시 API 에러:', fullUrl, `HTTP ${res.status}`);
              return null;
            }
            return res.json();
          })
          .then(data => {
            if (!isMounted) return;
            if (data?.ok && data?.user) {
              console.log('[HomePage] 포커스 시 사용자 정보 확인:', data.user.name);
              setUser(data.user);
            }
          })
          .catch((error) => {
            const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${focusApiUrl}` : focusApiUrl;
            console.error('[HomePage] 포커스 시 API 호출 실패:', fullUrl, error);
          });
      }, 200);
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
      const response = await fetch(logoutApiUrl, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${logoutApiUrl}`);
      }

      setUser(null);
      // 크루즈가이드 지니에서는 로그아웃 후 크루즈몰로만 이동 (온보딩으로 절대 이동하지 않음)
      window.location.href = '/';
    } catch (error) {
      const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/auth/logout` : '/api/auth/logout';
      console.error('[HomePage] 로그아웃 실패:', fullUrl, error);
      // 에러가 발생해도 크루즈몰로 이동
      setUser(null);
      window.location.href = '/';
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
                <img
                  src="/images/ai-cruise-logo.png"
                  alt="크루즈닷 로고"
                  className="h-8 sm:h-10 object-contain drop-shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder.png';
                  }}
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
      <HeroSection config={pageConfig?.hero} />

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
      {pageConfig?.companyStats?.enabled && (
        <section className="container mx-auto px-4 py-12 bg-white">
          <CompanyStatsSection config={pageConfig.companyStats} />
        </section>
      )}

      {/* 크루즈닷 지니 쇼츠 */}
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

      {/* 라이브 방송 */}
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

      {/* 프로모션 배너 (양싱 베너) */}
      {pageConfig?.promotionBanner?.enabled !== false && (
        <section id="promotion-banner" className="container mx-auto px-4 py-12 bg-white">
          <PromotionBannerCarousel />
        </section>
      )}

      {/* 커뮤니티 하이라이트 - 항상 표시 */}
      <CommunitySection config={pageConfig?.communitySection} />

      {/* 크루즈닷 지니 AI 출시 3일 무료체험 배너 */}
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

            <div className="mb-6 space-y-4">
              <a
                href="/login-test"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/login-test';
                }}
                className="inline-block bg-gradient-to-r from-[#D4AF37] via-yellow-400 to-[#D4AF37] bg-[length:200%_auto] animate-gradient text-[#051C2C] font-bold text-xl md:text-2xl px-12 py-6 rounded-2xl shadow-2xl hover:scale-105 transition-all duration-300 transform border border-yellow-300/50"
              >
                크루즈 지니 AI 3일 무료체험 구경하기 🎉
              </a>
              <div className="mt-6">
                <p className="text-lg md:text-xl text-blue-100 font-semibold mb-4">
                  무료 체험은 본사 문의 해 주세요
                </p>
                <a
                  href="/login-test"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/login-test';
                  }}
                  className="inline-block bg-white/10 backdrop-blur-sm text-white border border-white/30 font-bold text-xl px-10 py-5 rounded-2xl shadow-lg hover:bg-white/20 hover:scale-105 transition-all duration-300 transform"
                >
                  무료체험 신청하기 🚀
                </a>
              </div>
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
