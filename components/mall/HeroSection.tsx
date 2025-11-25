// components/mall/HeroSection.tsx
'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

interface HeroConfig {
  videoUrl?: string;
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

export default function HeroSection({ config }: { config?: HeroConfig }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 기본값 (동영상 → 이미지로 변경하여 로딩 속도 개선)
  const heroConfig = config || {
    // videoUrl: '/videos/hero-video.mp4',  // 동영상 비활성화 (느린 로딩)
    backgroundImage: '/크루즈정보사진/크루즈배경이미지/크루즈배경이미지 (1).png',  // 고화질 이미지 사용
    logoUrl: '/images/ai-cruise-logo.png',
    title: '크루즈닷 AI 지니',
    subtitle: '여행 준비부터 여행 중까지\nAI가 함께하는 특별한 크루즈 여행',
    buttons: [
      { text: '지금 시작하기', link: '/login?next=/chat', backgroundColor: '#2563eb', textColor: '#ffffff' }, // 파란색 - 로그인 후 채팅으로 이동
      { text: '라이브방송참여', link: '#live-broadcast', backgroundColor: '#dc2626', textColor: '#ffffff' }, // 빨간색 - 라이브 방송 섹션으로 이동
      { text: '상품 둘러보기', link: '#popular-cruises', backgroundColor: '#eab308', textColor: '#000000' }, // 노란색 - 인기 크루즈 섹션으로 이동
    ],
  };

  useEffect(() => {
    // 비디오 자동 재생 설정
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.log('Video autoplay failed:', error);
      });
    }
  }, []);

  return (
    <div
      className="relative text-white py-16 md:py-24 overflow-hidden cursor-pointer"
      onClick={() => window.location.href = '/login-test'}
    >
      {/* 배경 이미지 (동영상 대신 사용 - 빠른 로딩) */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center z-0 animate-subtle-zoom"
        style={{
          backgroundImage: `url(${heroConfig.backgroundImage || '/크루즈정보사진/크루즈배경이미지/크루즈배경이미지 (1).png'})`,
        }}
      />
      
      {/* 어두운 오버레이 (가독성 향상) */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>
      
      {/* 컨텐츠 */}
      <div className="relative z-20 container mx-auto px-4 pb-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* AI 지니 로고/아이콘 */}
          {heroConfig.logoUrl && (
            <div className="mb-6">
              <img 
                src={heroConfig.logoUrl} 
                alt="크루즈닷 AI 지니" 
                className="mx-auto h-20 md:h-24"
                onError={(e) => {
                  // 이미지 로드 실패 시 기본 로고로 대체
                  (e.target as HTMLImageElement).src = '/images/ai-cruise-logo.png';
                }}
              />
            </div>
          )}

          {/* 메인 타이틀 */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-4 md:mb-6 drop-shadow-2xl leading-tight">
            {heroConfig.title}
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl mb-8 md:mb-10 text-white font-semibold drop-shadow-lg whitespace-pre-line leading-relaxed px-2">
            {heroConfig.subtitle}
          </p>

          {/* 주요 기능 소개 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-8 md:mb-10 text-sm md:text-base lg:text-lg">
            <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 md:p-5 lg:p-6 border-2 border-white/40 shadow-xl hover:bg-white/30 transition-all">
              <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">🗺️</div>
              <div className="font-bold text-white text-base md:text-lg lg:text-xl drop-shadow-lg">지니야 가자</div>
              <div className="text-xs md:text-sm lg:text-base text-white/95 mt-1 md:mt-2 drop-shadow-md">경로 안내</div>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 md:p-5 lg:p-6 border-2 border-white/40 shadow-xl hover:bg-white/30 transition-all">
              <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">📸</div>
              <div className="font-bold text-white text-base md:text-lg lg:text-xl drop-shadow-lg">지니야 보여줘</div>
              <div className="text-xs md:text-sm lg:text-base text-white/95 mt-1 md:mt-2 drop-shadow-md">관광지 정보</div>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 md:p-5 lg:p-6 border-2 border-white/40 shadow-xl hover:bg-white/30 transition-all">
              <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">💰</div>
              <div className="font-bold text-white text-base md:text-lg lg:text-xl drop-shadow-lg">지니야 가계부</div>
              <div className="text-xs md:text-sm lg:text-base text-white/95 mt-1 md:mt-2 drop-shadow-md">경비 관리</div>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 md:p-5 lg:p-6 border-2 border-white/40 shadow-xl hover:bg-white/30 transition-all">
              <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">📝</div>
              <div className="font-bold text-white text-base md:text-lg lg:text-xl drop-shadow-lg">지니야 다이어리</div>
              <div className="text-xs md:text-sm lg:text-base text-white/95 mt-1 md:mt-2 drop-shadow-md">여행 기록</div>
            </div>
          </div>

          {/* CTA 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 lg:gap-6 justify-center px-2">
            {heroConfig.buttons?.map((btn, idx) => {
              // 버튼 스타일 생성
              const buttonStyle: React.CSSProperties = {};
              let buttonClass = "px-6 py-3 md:px-8 md:py-4 lg:px-10 lg:py-5 text-base md:text-lg lg:text-xl font-black rounded-xl transition-all shadow-2xl drop-shadow-2xl min-h-[48px] md:min-h-[56px] flex items-center justify-center hover:scale-105 active:scale-95";
              
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
                  // 지금 시작하기 버튼은 새 창으로 열기
                  e.preventDefault();
                  window.open(btn.link || '/login-test', '_blank');
                } else {
                  // 기타 버튼은 기존 동작
                  window.location.href = btn.link || '/login-test';
                }
              };
              
              return (
                <a
                  key={idx}
                  href={btn.text === '라이브방송참여' ? '#live-broadcast' : btn.text === '상품 둘러보기' ? '#products' : btn.link || '/login-test'}
                  onClick={handleButtonClick}
                  className={buttonClass}
                  style={buttonStyle}
                >
                  {btn.text}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}




