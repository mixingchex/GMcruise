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

  // 기본값
  const heroConfig = config || {
    videoUrl: '/videos/hero-video.mp4',
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
    <div className="relative bg-white overflow-hidden">
      {/* 상단: 로고 섹션 (흰색 배경) */}
      <div className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* 크루즈 선박 로고 (빨간색) */}
            {heroConfig.logoUrl && (
              <div className="mb-6">
                <img 
                  src={heroConfig.logoUrl} 
                  alt="크루즈닷 로고" 
                  className="mx-auto h-32 md:h-40 lg:h-48 object-contain"
                  style={{ filter: 'none' }}
                  onError={(e) => {
                    // 이미지 로드 실패 시 기본 로고로 대체
                    (e.target as HTMLImageElement).src = '/images/ai-cruise-logo.png';
                  }}
                />
              </div>
            )}

            {/* 서브타이틀 */}
            <p className="text-lg md:text-xl lg:text-2xl mb-8 md:mb-10 text-gray-700 font-semibold whitespace-pre-line leading-relaxed px-2">
              {heroConfig.subtitle || '여행 준비부터 여행 중까지\nAI가 함께하는 특별한 크루즈 여행'}
            </p>

            {/* 주요 기능 소개 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-8 md:mb-10 text-sm md:text-base lg:text-lg">
              <div className="bg-gray-50 rounded-xl p-4 md:p-5 lg:p-6 border-2 border-gray-200 shadow-md hover:bg-gray-100 hover:shadow-lg transition-all">
                <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">🗺️</div>
                <div className="font-bold text-gray-900 text-base md:text-lg lg:text-xl">지니야 가자</div>
                <div className="text-xs md:text-sm lg:text-base text-gray-600 mt-1 md:mt-2">경로 안내</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 md:p-5 lg:p-6 border-2 border-gray-200 shadow-md hover:bg-gray-100 hover:shadow-lg transition-all">
                <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">📸</div>
                <div className="font-bold text-gray-900 text-base md:text-lg lg:text-xl">지니야 보여줘</div>
                <div className="text-xs md:text-sm lg:text-base text-gray-600 mt-1 md:mt-2">관광지 정보</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 md:p-5 lg:p-6 border-2 border-gray-200 shadow-md hover:bg-gray-100 hover:shadow-lg transition-all">
                <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">💰</div>
                <div className="font-bold text-gray-900 text-base md:text-lg lg:text-xl">지니야 가계부</div>
                <div className="text-xs md:text-sm lg:text-base text-gray-600 mt-1 md:mt-2">경비 관리</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 md:p-5 lg:p-6 border-2 border-gray-200 shadow-md hover:bg-gray-100 hover:shadow-lg transition-all">
                <div className="text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3">📝</div>
                <div className="font-bold text-gray-900 text-base md:text-lg lg:text-xl">지니야 다이어리</div>
                <div className="text-xs md:text-sm lg:text-base text-gray-600 mt-1 md:mt-2">여행 기록</div>
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
              
              // #로 시작하는 앵커 링크는 같은 페이지 내 이동이므로 새 창으로 열지 않음
              if (btn.link.startsWith('#')) {
                return (
                  <Link
                    key={idx}
                    href={btn.link}
                    className={buttonClass}
                    style={buttonStyle}
                  >
                    {btn.text}
                  </Link>
                );
              }
              // "지금 시작하기" 버튼은 로그인 페이지를 새 창으로 열기
              if (btn.text === '지금 시작하기' && btn.link.startsWith('/login')) {
                return (
                  <a
                    key={idx}
                    href={btn.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass}
                    style={buttonStyle}
                  >
                    {btn.text}
                  </a>
                );
              }
              // 외부 링크(http/https로 시작)만 새 창에서 열기
              if (btn.link.startsWith('http://') || btn.link.startsWith('https://')) {
                return (
                  <a
                    key={idx}
                    href={btn.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass}
                    style={buttonStyle}
                  >
                    {btn.text}
                  </a>
                );
              }
              // 내부 링크 (예: /login, /chat 등) - 같은 창에서 열기
              return (
                <Link
                  key={idx}
                  href={btn.link}
                  className={buttonClass}
                  style={buttonStyle}
                >
                  {btn.text}
                </Link>
              );
            })}
            </div>
          </div>
        </div>
      </div>
      
      {/* 하단: 크루즈 선박 이미지 섹션 */}
      <div className="relative w-full h-64 md:h-96 lg:h-[500px] overflow-hidden">
        {/* 배경 이미지 (크루즈 선박 사진) */}
        <img 
          src="/크루즈정보사진/크루즈배경이미지/크루즈배경이미지 (1).png" 
          alt="크루즈 선박" 
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            // 이미지 로드 실패 시 대체 이미지 시도
            const img = e.target as HTMLImageElement;
            const fallbacks = [
              '/크루즈정보사진/크루즈배경이미지/크루즈배경이미지 (2).png',
              '/크루즈정보사진/크루즈배경이미지/크루즈배경이미지 (3).png',
              '/크루즈정보사진/크루즈배경이미지/크루즈배경이미지 (4).png',
            ];
            const currentSrc = img.src;
            const currentIndex = fallbacks.findIndex(f => currentSrc.includes(f.split('/').pop() || ''));
            if (currentIndex < fallbacks.length - 1) {
              img.src = fallbacks[currentIndex + 1];
            } else {
              // 모든 이미지 실패 시 그라데이션 배경 사용
              img.style.display = 'none';
              const gradientDiv = document.createElement('div');
              gradientDiv.className = 'absolute inset-0 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600';
              img.parentElement?.appendChild(gradientDiv);
            }
          }}
        />
      </div>
    </div>
  );
}




