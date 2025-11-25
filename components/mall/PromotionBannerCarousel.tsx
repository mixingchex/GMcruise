// components/mall/PromotionBannerCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface Banner {
  id: number;
  image?: string;
  video?: string; // 비디오 파일 경로
  title?: string;
  subtitle?: string;
  button1Text?: string;
  button1Link?: string;
  button2Text?: string;
  button2Link?: string;
  link?: string; // 전체 배너 링크 (하위 호환성)
}

// 배너 데이터 (고화질 이미지 사용 - 빠른 로딩을 위해 동영상 대체)
const defaultBanners: Banner[] = [
  {
    id: 1,
    image: '/크루즈정보사진/크루즈배경이미지/고화질배경이미지 (1).png',  // 첫 번째 배너 - 고화질 배경 이미지
    title: '크루즈닷 지니 AI 출시',
    subtitle: '3일 무료 체험',
    link: '/login-test',
  },
  {
    id: 2,
    image: '/크루즈정보사진/크루즈배경이미지/고화질배경이미지 (3).png',  // 고화질 이미지 사용 (빠른 로딩)
    title: '크루즈닷 회원이라면?',
    subtitle: '프리미엄 혜택 즐기기',
    link: '/community',
  },
  {
    id: 3,
    image: '/크루즈정보사진/코스타세레나/코스타 내부시설/코스타세레나호 중앙 로비.jpg',  // 크루즈 내부 고화질 사진
    title: '크루즈닷과',
    subtitle: '행복한 크루즈여행 하기',
    link: 'https://www.cruisedot.co.kr/i/6nx',
  },
];

export default function PromotionBannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false); // 자동 재생 비활성화
  const [isLoading, setIsLoading] = useState(true);
  
  // 스와이프를 위한 상태
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // DB에서 배너 데이터 로드
  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    // 항상 기본 배너 사용 (DB에서 가져오지 않음)
    setBanners(defaultBanners);
    setIsLoading(false);
    
    /* DB에서 배너 데이터 로드 (주석 처리)
    try {
      const response = await fetch('/api/admin/mall/hero-banner?section=hero-banner');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[PromotionBanner] API Response:', data);

      if (data.ok && data.banners && data.banners.length > 0) {
        console.log('[PromotionBanner] Loaded banners:', data.banners.length);
        // 이미지 URL 검증
        const validBanners = data.banners.filter((banner: Banner) => {
          if (!banner.image) {
            console.warn('[PromotionBanner] Banner missing image:', banner);
            return false;
          }
          return true;
        });
        
        if (validBanners.length > 0) {
          setBanners(validBanners);
        } else {
          console.warn('[PromotionBanner] No valid banners, using defaults');
          setBanners(defaultBanners);
        }
      } else {
        console.log('[PromotionBanner] No banners in DB, using defaults');
        // DB에 데이터가 없으면 기본 배너 사용
        setBanners(defaultBanners);
      }
    } catch (error) {
      console.error('[PromotionBanner] Failed to load banners:', error);
      // 에러 발생 시 기본 배너 사용
      setBanners(defaultBanners);
    } finally {
      setIsLoading(false);
    }
    */
  };

  // 자동 슬라이드 비활성화 (주석 처리)
  /*
  useEffect(() => {
    if (!isAutoPlaying || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // 5초마다 자동 이동

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length]);
  */

  // 스와이프 제스처 처리
  const minSwipeDistance = 50;
  const [isSwiping, setIsSwiping] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    if (touchStart !== null && touchEnd !== null) {
      const distance = Math.abs(touchStart - e.targetTouches[0].clientX);
      if (distance > 10) {
        setIsSwiping(true);
      }
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && banners.length > 1) {
      goToNext();
      setIsSwiping(true);
    }
    if (isRightSwipe && banners.length > 1) {
      goToPrevious();
      setIsSwiping(true);
    }
    
    // 스와이프가 끝나면 잠시 후 상태 리셋
    setTimeout(() => {
      setIsSwiping(false);
      setTouchStart(null);
      setTouchEnd(null);
    }, 100);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (isLoading) {
    return (
      <div className="relative w-full h-80 md:h-96 lg:h-[500px] rounded-xl overflow-hidden shadow-2xl bg-gray-200 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (banners.length === 0) return null;

  return (
    <div 
      className="relative w-full h-80 md:h-96 lg:h-[500px] rounded-xl overflow-hidden shadow-2xl"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 배너 이미지 */}
      <div className="relative w-full h-full">
        {banners.map((banner, index) => {
          const hasButtons = banner.button1Text || banner.button2Text;
          const bannerLink = banner.link || banner.button1Link || '/products';
          
          return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={(e) => {
                // 스와이프 중이면 링크 클릭 방지
                if (isSwiping) {
                  return;
                }
                
                // 버튼이 있으면 전체 배너 클릭 비활성화 (버튼 클릭만 동작)
                if (hasButtons) {
                  return;
                }
                
                // 첫 번째 배너(크루즈닷 지니 AI 출시)는 무조건 /login-test로 이동
                if (banner.id === 1) {
                  window.open('/login-test', '_blank', 'noopener,noreferrer');
                  return;
                }
                
                // 세 번째 배너(크루즈닷과 행복한 크루즈여행 하기)는 외부 링크로 새 창 열기
                if (banner.id === 3 && banner.link) {
                  window.open(banner.link, '_blank', 'noopener,noreferrer');
                  return;
                }
                
                // link가 있고 버튼이 없으면 클릭 허용
                if (banner.link && !hasButtons) {
                  window.open(banner.link, '_blank', 'noopener,noreferrer');
                }
              }}
            >
            {/* 이미지 프리로더 */}
            {banner.image && (
              <img
                src={banner.image}
                alt=""
                className="hidden"
                onError={(e) => {
                  console.error('[PromotionBanner] Image load error:', banner.image);
                  // 기본 이미지로 대체
                  (e.target as HTMLImageElement).src = '/images/promotion-banner-bg.png';
                }}
              />
            )}
            <div className="w-full h-full relative flex items-center justify-center text-white">
              {/* 배경 이미지 (동영상 대신 사용 - 빠른 로딩 + 부드러운 애니메이션) */}
              {banner.image && (
                <div
                  className="absolute inset-0 w-full h-full bg-cover bg-center animate-subtle-zoom"
                  style={{
                    backgroundImage: `url('${encodeURI(banner.image)}')`,
                  }}
                />
              )}
              
              {/* 세련된 그라데이션 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>
              
              {/* 컨텐츠 */}
              <div className="relative z-10 text-center px-6 md:px-8 max-w-5xl mx-auto">
                <h3 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-4 md:mb-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-tight">
                  {banner.title || `배너 ${index + 1}`}
                </h3>
                {banner.subtitle && (
                  <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] mb-8 md:mb-10 font-bold tracking-tight">
                    {banner.subtitle}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-8 md:mt-10">
                  {banner.button1Text && (
                    <a
                      href={banner.button1Link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!banner.button1Link || banner.button1Link === '#') {
                          e.preventDefault();
                        }
                      }}
                      className="bg-white/20 backdrop-blur-lg px-8 py-4 rounded-full text-base md:text-lg font-black shadow-[0_8px_32px_rgba(0,0,0,0.3)] border-2 border-white/60 hover:bg-white/30 hover:border-white/80 hover:scale-105 transition-all duration-300 cursor-pointer"
                    >
                      ✓ {banner.button1Text}
                    </a>
                  )}
                  {banner.button2Text && (
                    <a
                      href={banner.button2Link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!banner.button2Link || banner.button2Link === '#') {
                          e.preventDefault();
                        }
                      }}
                      className="bg-white/20 backdrop-blur-lg px-8 py-4 rounded-full text-base md:text-lg font-black shadow-[0_8px_32px_rgba(0,0,0,0.3)] border-2 border-white/60 hover:bg-white/30 hover:border-white/80 hover:scale-105 transition-all duration-300 cursor-pointer"
                    >
                      ✓ {banner.button2Text}
                    </a>
                  )}
                  {/* 하위 호환성: 버튼이 없고 link만 있는 경우 */}
                  {!banner.button1Text && !banner.button2Text && (
                    <>
                      <a
                        href={banner.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (banner.link && banner.link !== '#') {
                            e.stopPropagation(); // 배너 클릭 이벤트와 충돌 방지
                            window.open(banner.link, '_blank', 'noopener,noreferrer');
                            e.preventDefault();
                          } else {
                            e.preventDefault();
                          }
                        }}
                        className="bg-white/20 backdrop-blur-lg px-8 py-4 rounded-full text-base md:text-lg font-black shadow-[0_8px_32px_rgba(0,0,0,0.3)] border-2 border-white/60 hover:bg-white/30 hover:border-white/80 hover:scale-105 transition-all duration-300 cursor-pointer"
                      >
                        ✓ 프리미엄 서비스
                      </a>
                      <a
                        href={banner.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (banner.link && banner.link !== '#') {
                            e.stopPropagation(); // 배너 클릭 이벤트와 충돌 방지
                            window.open(banner.link, '_blank', 'noopener,noreferrer');
                            e.preventDefault();
                          } else {
                            e.preventDefault();
                          }
                        }}
                        className="bg-white/20 backdrop-blur-lg px-8 py-4 rounded-full text-base md:text-lg font-black shadow-[0_8px_32px_rgba(0,0,0,0.3)] border-2 border-white/60 hover:bg-white/30 hover:border-white/80 hover:scale-105 transition-all duration-300 cursor-pointer"
                      >
                        ✓ 신뢰할 수 있는 여행사
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
            </div>
          );
        })}
      </div>

      {/* 좌우 화살표 - 세련된 디자인 */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-gray-900 rounded-full p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-all duration-300 min-w-[56px] min-h-[56px] flex items-center justify-center hover:scale-110 active:scale-95"
            aria-label="이전 배너"
          >
            <FiChevronLeft size={28} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-gray-900 rounded-full p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-all duration-300 min-w-[56px] min-h-[56px] flex items-center justify-center hover:scale-110 active:scale-95"
            aria-label="다음 배너"
          >
            <FiChevronRight size={28} />
          </button>
        </>
      )}

      {/* 인디케이터 - 세련된 디자인 */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex gap-3 items-center">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-10 bg-white shadow-[0_4px_12px_rgba(255,255,255,0.5)]'
                  : 'w-3 bg-white/50 hover:bg-white/70 hover:scale-110'
              }`}
              aria-label={`배너 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}










