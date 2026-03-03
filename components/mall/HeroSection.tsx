// components/mall/HeroSection.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface HeroConfig {
  videoUrl?: string;
  backgroundImage?: string; // 배경 이미지 URL
  logoUrl?: string; // 로고 이미지 URL
  title?: string;
  subtitle?: string;
  buttons?: Array<{
    text: string;
    link: string;
    backgroundColor?: string; // 버튼 배경색
    textColor?: string; // 버튼 글씨색
  }>;
}

export default function HeroSection({ config, hideButtons = false }: { config?: HeroConfig; hideButtons?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // 기본값 (동영상 → 이미지로 변경하여 로딩 속도 개선)
  const heroConfig = config || {
    // videoUrl: '/videos/hero-video.mp4',  // 동영상 비활성화 (느린 로딩)
    backgroundImage: '/크루즈정보사진/크루즈배경이미지/고화질배경이미지 (1).png',  // 고화질 이미지 사용
    logoUrl: '/images/ai-cruise-logo.png',
    title: '크루즈닷AI',
    subtitle: '여행 준비부터 여행 중까지\nAI가 함께하는 특별한 크루즈 여행',
    buttons: [
      { text: '지금 시작하기', link: 'https://www.cruiseai.co.kr', backgroundColor: '#2563eb', textColor: '#ffffff' }, // 파란색 - 크루즈닷AI 이동
      { text: '라이브방송참여', link: '#live-broadcast', backgroundColor: '#dc2626', textColor: '#ffffff' }, // 빨간색 - 라이브 방송 섹션으로 이동
      { text: '상품 둘러보기', link: '#products', backgroundColor: '#eab308', textColor: '#000000' }, // 노란색 - 상품 섹션으로 이동
    ],
  };

  // 이미지 사전 로드 및 에러 핸들링
  useEffect(() => {
    const img = new Image();
    const imageUrl = heroConfig.backgroundImage || '/크루즈정보사진/크루즈배경이미지/고화질배경이미지 (1).png';

    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };

    img.onerror = () => {
      console.error('[HeroSection] 이미지 로드 실패:', imageUrl);
      setImageError(true);
      setImageLoaded(false);
      // 대체 이미지 시도
      const fallbackUrl = '/크루즈정보사진/크루즈배경이미지/크루즈배경이미지 (1).png';
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        setImageLoaded(true);
        setImageError(false);
        if (imgRef.current) {
          imgRef.current.src = fallbackUrl;
        }
      };
      fallbackImg.src = fallbackUrl;
    };

    img.src = imageUrl;
    if (imgRef.current) {
      imgRef.current.src = imageUrl;
    }
  }, [heroConfig.backgroundImage]);

  return (
    <div
      className="relative text-white py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden cursor-pointer min-h-[500px] sm:min-h-[600px] md:min-h-[700px] flex items-center"
      onClick={() => window.location.href = 'https://www.cruiseai.co.kr'}
    >
      {/* 배경 이미지 (동영상 대신 사용 - 빠른 로딩) */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        {/* 숨겨진 이미지로 사전 로드 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={heroConfig.backgroundImage || '/크루즈정보사진/크루즈배경이미지/고화질배경이미지 (1).png'}
          alt=""
          className="hidden"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
        {/* 배경 이미지 */}
        <div
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${imageError ? 'hidden' : ''} animate-subtle-zoom`}
          style={{
            backgroundImage: imageLoaded
              ? `url('${encodeURI(heroConfig.backgroundImage || '/크루즈정보사진/크루즈배경이미지/고화질배경이미지 (1).png')}')`
              : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* 로딩 중 배경 (그라데이션) */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 animate-pulse"></div>
        )}
        {/* 에러 시 대체 배경 */}
        {imageError && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800"></div>
        )}
      </div>

      {/* 어두운 오버레이 (가독성 향상) */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>

      {/* 컨텐츠 */}
      <div className="relative z-20 container mx-auto px-4 pb-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* AI 지니 로고/아이콘 */}
          {heroConfig.logoUrl && (
            <div className="mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroConfig.logoUrl}
                alt="크루즈닷AI"
                className="mx-auto h-20 md:h-24"
                onError={(e) => {
                  // 이미지 로드 실패 시 기본 로고로 대체
                  (e.target as HTMLImageElement).src = '/images/ai-cruise-logo.png';
                }}
              />
            </div>
          )}

          {/* 메인 타이틀 - 모바일 가독성 향상 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-3 sm:mb-4 md:mb-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-tight px-2">
            {heroConfig.title}
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl mb-6 sm:mb-8 md:mb-10 text-white font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] whitespace-pre-line leading-relaxed px-2 sm:px-4">
            {heroConfig.subtitle}
          </p>

          {/* 주요 기능 소개 - 모바일에서 블록별로 표시 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8 lg:mb-10 text-sm md:text-base lg:text-lg">
            <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 md:p-5 lg:p-6 border-2 border-white/40 shadow-xl hover:bg-white/30 transition-all">
              <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">🗺️</div>
              <div className="font-bold text-white text-base md:text-lg lg:text-xl drop-shadow-lg">크루즈닷 가자</div>
              <div className="text-xs md:text-sm lg:text-base text-white/95 mt-1 md:mt-2 drop-shadow-md">경로 안내</div>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 md:p-5 lg:p-6 border-2 border-white/40 shadow-xl hover:bg-white/30 transition-all">
              <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">📸</div>
              <div className="font-bold text-white text-base md:text-lg lg:text-xl drop-shadow-lg">크루즈닷 보여줘</div>
              <div className="text-xs md:text-sm lg:text-base text-white/95 mt-1 md:mt-2 drop-shadow-md">관광지 정보</div>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 md:p-5 lg:p-6 border-2 border-white/40 shadow-xl hover:bg-white/30 transition-all">
              <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">💰</div>
              <div className="font-bold text-white text-base md:text-lg lg:text-xl drop-shadow-lg">크루즈닷 가계부</div>
              <div className="text-xs md:text-sm lg:text-base text-white/95 mt-1 md:mt-2 drop-shadow-md">경비 관리</div>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 md:p-5 lg:p-6 border-2 border-white/40 shadow-xl hover:bg-white/30 transition-all">
              <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">📝</div>
              <div className="font-bold text-white text-base md:text-lg lg:text-xl drop-shadow-lg">크루즈닷 다이어리</div>
              <div className="text-xs md:text-sm lg:text-base text-white/95 mt-1 md:mt-2 drop-shadow-md">여행 기록</div>
            </div>
          </div>

          {/* CTA 버튼 - 모바일에서 세로로, 데스크톱에서 가로로 */}
          {!hideButtons && (
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 lg:gap-6 justify-center px-2 sm:px-4">
              {heroConfig.buttons?.map((btn, idx) => {
                // 버튼 스타일 생성
                const buttonStyle: React.CSSProperties = {};
                let buttonClass = "px-6 py-3 md:px-8 md:py-4 lg:px-10 lg:py-5 text-base md:text-lg lg:text-xl font-black rounded-xl transition-all shadow-lg hover:shadow-xl min-h-[48px] md:min-h-[56px] flex items-center justify-center hover:scale-105 active:scale-95 border-2 border-white/20 backdrop-blur-sm";

                // 배경색 처리
                if (btn.backgroundColor) {
                  if (btn.backgroundColor.startsWith('#')) {
                    buttonStyle.backgroundColor = btn.backgroundColor;
                  } else {
                    buttonStyle.backgroundColor = '#2563eb';
                  }
                } else {
                  buttonStyle.backgroundColor = '#2563eb';
                }

                // 글씨색 처리
                if (btn.textColor) {
                  if (btn.textColor.startsWith('#')) {
                    buttonStyle.color = btn.textColor;
                  } else {
                    buttonStyle.color = '#ffffff';
                  }
                } else {
                  buttonStyle.color = '#ffffff';
                }

                // 버튼별 동작 처리
                const handleButtonClick = (e: React.MouseEvent) => {
                  e.stopPropagation();

                  if (btn.text === '라이브방송참여') {
                    // 라이브 방송 섹션으로 스크롤
                    const liveSection = document.getElementById('live-broadcast');
                    if (liveSection) {
                      liveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  } else if (btn.text === '상품 둘러보기') {
                    // 프로모션 배너 섹션으로 스크롤 (크루즈닷 지니 TV영상 밑)
                    const promotionSection = document.getElementById('promotion-banner');
                    if (promotionSection) {
                      promotionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                      // 프로모션 배너 섹션을 찾을 수 없으면 products 섹션으로
                      const productsSection = document.getElementById('products');
                      if (productsSection) {
                        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }
                  } else if (btn.text === '지금 시작하기') {
                    // 지금 시작하기 버튼 → 크루즈닷AI 이동
                    e.preventDefault();
                    window.location.href = 'https://www.cruiseai.co.kr';
                  } else {
                    // 기타 버튼은 기존 동작
                    window.location.href = btn.link || '/login';
                  }
                };

                return (
                  <a
                    key={idx}
                    href={btn.text === '라이브방송참여' ? '#live-broadcast' : btn.text === '상품 둘러보기' ? '#products' : btn.link || 'https://www.cruiseai.co.kr'}
                    onClick={handleButtonClick}
                    className={buttonClass}
                    style={buttonStyle}
                  >
                    {btn.text}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




