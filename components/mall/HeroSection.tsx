// components/mall/HeroSection.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

// 히어로 슬라이더 이미지 (Vercel 배포 보장 경로)
const HERO_SLIDES = [
  { src: '/images/hero/hero-bg.jpg',   ken: 'animate-kb-zoom-tl' },
  { src: '/images/hero/hero-bg-2.jpg', ken: 'animate-kb-zoom-tr' },
];

// 포함 사항 아이콘 띠
const INCLUDES = [
  { icon: '🍽️', label: '식사 포함' },
  { icon: '⚓',  label: '기항지 투어' },
  { icon: '🛳️', label: '선상 시설' },
  { icon: '📞', label: '한국어 지원' },
];

// 어드민 비주얼 에디터 호환용 config 타입 (선택적)
interface HeroConfig {
  backgroundImage?: string;
  logoUrl?: string;
  title?: string;
  subtitle?: string;
  buttons?: Array<{
    text: string;
    link: string;
    backgroundColor?: string;
    textColor?: string;
  }>;
}

export default function HeroSection({
  config,
  hideButtons = false,
}: {
  config?: HeroConfig;
  hideButtons?: boolean;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  // 슬라이드 전환 시 Ken Burns 재시작을 위한 key
  const [slideKey, setSlideKey] = useState(0);

  // config.backgroundImage가 있으면 슬라이더 비활성화 (어드민 커스텀 이미지 사용)
  const useSlider = !config?.backgroundImage;
  const singleBg = config?.backgroundImage;

  // 슬라이더 타이머 (5초 간격)
  useEffect(() => {
    if (!useSlider) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
      setSlideKey(prev => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [useSlider]);

  const scrollToProducts = () => {
    const el = document.getElementById('products');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openKakao = () => {
    window.open('https://open.kakao.com/o/plREDDUh', '_blank', 'noopener noreferrer');
  };

  const openLiveBroadcast = () => {
    const el = document.getElementById('live-broadcast');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // config.buttons가 있으면 기존 버튼 동작 유지 (어드민 호환)
  const hasConfigButtons = config?.buttons && config.buttons.length > 0;

  const title    = config?.title    || '꿈의 크루즈 여행,\n크루즈닷과 함께';
  const subtitle = config?.subtitle || '일본·지중해·카리브해 등 전 세계 크루즈 상품을\n한국어 전담 매니저와 함께 준비하세요';

  return (
    <div className="relative text-white overflow-hidden min-h-[580px] sm:min-h-[650px] md:min-h-[750px] flex items-center">

      {/* ── 배경 이미지 ── */}
      <div className="absolute inset-0 z-0">
        {/* 기본 다크 배경 (이미지 로드 전) */}
        <div className="absolute inset-0 bg-[#051C2C]" />

        {useSlider ? (
          // 슬라이더 모드
          HERO_SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-[900ms] ${
                i === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div
                key={i === currentSlide ? slideKey : undefined}
                className={`absolute inset-0 bg-cover bg-center ${
                  i === currentSlide ? slide.ken : ''
                }`}
                style={{ backgroundImage: `url('${slide.src}')` }}
              />
            </div>
          ))
        ) : (
          // 어드민 커스텀 이미지 (단일)
          <div
            className="absolute inset-0 bg-cover bg-center animate-subtle-zoom"
            style={{ backgroundImage: `url('${encodeURI(singleBg!)}')` }}
          />
        )}
      </div>

      {/* ── 럭셔리 오버레이 ── */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(5,28,44,0.25) 0%, rgba(5,28,44,0.60) 55%, rgba(5,28,44,0.88) 100%)',
        }}
      />

      {/* ── 콘텐츠 ── */}
      <div className="relative z-20 w-full container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center">

          {/* 신뢰 배지 */}
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/20 border border-[#D4AF37]/50 rounded-full px-4 py-1.5 mb-6 text-sm font-bold text-[#F5D76E]">
            ✦ 크루즈 전문 여행사 No.1
          </div>

          {/* 로고 (어드민 설정 시) */}
          {config?.logoUrl && (
            <div className="mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={config.logoUrl}
                alt="크루즈닷"
                className="mx-auto h-20 md:h-24"
              />
            </div>
          )}

          {/* 타이틀 */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-tight whitespace-pre-line px-2">
            {title.includes('\n') ? (
              <>
                {title.split('\n')[0]}
                <br />
                <span className="text-gradient-gold">{title.split('\n')[1]}</span>
              </>
            ) : title}
          </h1>

          {/* 서브타이틀 */}
          <p className="text-lg sm:text-xl md:text-2xl mb-8 text-white/90 font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] leading-relaxed whitespace-pre-line px-2 sm:px-4">
            {subtitle}
          </p>

          {/* ── CTA 버튼 ── */}
          {!hideButtons && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 px-2">
              {hasConfigButtons ? (
                // 어드민 커스텀 버튼
                config!.buttons!.map((btn, idx) => {
                  const style: React.CSSProperties = {
                    backgroundColor: btn.backgroundColor || '#D4AF37',
                    color: btn.textColor || '#051C2C',
                  };
                  const handleClick = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (btn.text === '라이브방송참여') openLiveBroadcast();
                    else if (btn.text === '상품 둘러보기') scrollToProducts();
                    else if (btn.link?.startsWith('http')) {
                      window.open(btn.link, '_blank', 'noopener noreferrer');
                    } else {
                      window.location.href = btn.link || '/';
                    }
                  };
                  return (
                    <button
                      key={idx}
                      onClick={handleClick}
                      className="px-8 py-4 text-base md:text-lg font-black rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 hover:opacity-90"
                      style={style}
                    >
                      {btn.text}
                    </button>
                  );
                })
              ) : (
                // 기본 럭셔리 CTA
                <>
                  {/* 모바일 + 데스크톱 공통 */}
                  <button
                    onClick={scrollToProducts}
                    className="btn-luxury-gold text-base md:text-lg"
                  >
                    인기 상품 보기
                  </button>
                  {/* 데스크톱만 추가 */}
                  <button
                    onClick={openKakao}
                    className="hidden sm:flex items-center justify-center gap-2 bg-[#FEE500] text-[#3A1D1D] font-black px-8 py-4 rounded-full hover:bg-[#FFD700] active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl text-base md:text-lg"
                  >
                    <span>💬</span> 카카오 상담하기
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── 포함 사항 아이콘 띠 ── */}
          <div className="grid grid-cols-4 gap-2 max-w-xl mx-auto">
            {INCLUDES.map(({ icon, label }) => (
              <div key={label} className="glass-panel rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-white text-xs font-bold leading-tight">{label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── 슬라이드 도트 ── */}
      {useSlider && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentSlide(i); setSlideKey(prev => prev + 1); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'bg-[#D4AF37] w-6' : 'bg-white/40 w-2'
              }`}
              aria-label={`슬라이드 ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
