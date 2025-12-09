'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Anchor } from 'lucide-react';

// 슬라이드 데이터
const SLIDES = [
  {
    id: 1,
    step: 'Class 1',
    title: '퍼널 마케팅 구조',
    subtitle: '크루즈 잠재고객을 탑승객으로',
    color: 'from-blue-500 to-cyan-500',
    content: [
      { stage: '유입', desc: '모르는 사람들에게 크루즈닷을 알리기', color: 'bg-blue-400' },
      { stage: '리드 확보', desc: 'AI 지니 3일 체험권으로 연락처 확보', color: 'bg-indigo-400' },
      { stage: '육성/설득', desc: '챗봇 지니 AI로 맞춤 정보 제공', color: 'bg-violet-400' },
      { stage: '구매 전환', desc: '고객으로 만들기', color: 'bg-fuchsia-400' },
    ],
    videoUrl: 'https://www.youtube.com/embed/acYl4x4E6uw?si=I-I390GGrj-WdfRR',
  },
  {
    id: 2,
    step: 'Class 2',
    title: '크루즈 여행객 모으기',
    subtitle: '트래픽 만들기 & 깔때기 입구 넓히기',
    color: 'from-blue-400 to-indigo-500',
    content: [
      { stage: 'Paid 광고', desc: '인스타그램, 유튜브, 구글 광고', color: 'bg-red-400' },
      { stage: 'Organic 유입', desc: 'SNS 퍼스널 브랜딩 → 검색 유입', color: 'bg-green-400' },
    ],
    highlight: '고객이 스스로 찾아오게 만드는 시스템',
    videoUrl: 'https://www.youtube.com/embed/acYl4x4E6uw?si=I-I390GGrj-WdfRR',
  },
  {
    id: 3,
    step: 'Class 3',
    title: '연락처 확보하기',
    subtitle: 'AI 가이드 지니 3일 체험권 받고 시작하세요',
    color: 'from-indigo-400 to-purple-500',
    content: [
      { stage: '방문자', desc: '크루즈 여행이 궁금한 익명의 고객', color: 'bg-slate-400' },
      { stage: '가치 교환', desc: 'AI 체험 ↔ 연락처', color: 'bg-indigo-500' },
      { stage: '잠재 고객', desc: '체험 시작한 DB 확보 고객', color: 'bg-blue-500' },
    ],
    videoUrl: 'https://www.youtube.com/embed/-p_6G69MgyQ?si=ZkPQIXJbBuylXFQB',
  },
  {
    id: 4,
    step: 'Class 4',
    title: '신뢰 쌓기 (Nurturing)',
    subtitle: '크루즈 가이드 챗봇 지니 AI로 신뢰 형성',
    color: 'from-violet-400 to-purple-500',
    content: [
      { stage: 'Step 1', desc: '지니 AI 시작하기 - 대화 유도', color: 'bg-violet-300', trust: 30 },
      { stage: 'Step 2', desc: '실시간 맞춤 정보 제공', color: 'bg-violet-400', trust: 70 },
      { stage: 'Step 3', desc: '최적의 상품 제안', color: 'bg-violet-500', trust: 95 },
    ],
    videoUrl: 'https://www.youtube.com/embed/AJmcUkNYaTE?si=CVxJLvEy7e45oX6C',
  },
  {
    id: 5,
    step: 'Class 5',
    title: '고객 만들기 (Conversion)',
    subtitle: '지니와 함께라면 예약은 확신이 됩니다',
    color: 'from-emerald-400 to-teal-500',
    content: [
      { stage: '거절할 수 없는 오퍼', desc: 'AI 비서와 함께하는 여행 준비', color: 'bg-emerald-400' },
      { stage: '고객 언어 카피', desc: '고객의 불안을 먼저 읽고 해결', color: 'bg-teal-400' },
      { stage: '후기와 인증', desc: '압도적인 자료로 신뢰 증명', color: 'bg-cyan-400' },
    ],
    videoUrl: 'https://www.youtube.com/embed/EnKJo9Ax6ys?si=tU58ixDOEZAuh9dM',
  },
  {
    id: 6,
    step: 'Class 6',
    title: '재구매/추천 (Retention)',
    subtitle: '한 번 고객을 평생 여행 친구로',
    color: 'from-rose-400 to-pink-500',
    content: [
      { stage: '여행 후 관리', desc: '다녀온 후 경험 관리', color: 'bg-rose-400' },
      { stage: '다음 여행 제안', desc: '얼리버드 혜택, 다른 지역 크루즈', color: 'bg-blue-400' },
      { stage: '친구 추천', desc: '할인 쿠폰 선물, 홍보대사화', color: 'bg-purple-400' },
    ],
    highlight: '한 번 간 사람은 또 갑니다',
  },
];

interface MiniClassViewerProps {
  className?: string;
}

export default function MiniClassViewer({ className = '' }: MiniClassViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  const slide = SLIDES[currentSlide];

  const nextSlide = () => {
    setShowVideo(false);
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    setShowVideo(false);
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* 컨테이너 */}
      <div className="bg-gray-900 rounded-xl md:rounded-2xl overflow-hidden border border-gray-700 shadow-xl">

        {/* 헤더 - 모바일 최적화 */}
        <div className={`bg-gradient-to-r ${slide.color} p-3 md:p-4`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-white/20 p-1.5 md:p-2 rounded-lg flex-shrink-0">
                <Anchor size={16} className="text-white md:w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-white/80 text-[10px] md:text-xs font-medium">{slide.step}</span>
                <h3 className="text-white font-bold text-sm md:text-lg leading-tight truncate">{slide.title}</h3>
              </div>
            </div>
            <div className="text-white/90 text-xs font-medium bg-white/20 px-2 py-0.5 md:px-3 md:py-1 rounded-full flex-shrink-0">
              {currentSlide + 1}/{SLIDES.length}
            </div>
          </div>
          <p className="text-white/80 text-xs md:text-sm mt-1.5 md:mt-2 pl-8 md:pl-11 line-clamp-1">{slide.subtitle}</p>
        </div>

        {/* 콘텐츠 영역 - 모바일 최적화 */}
        <div className="p-3 md:p-5">
          {showVideo && slide.videoUrl ? (
            <div className="relative w-full pb-[56.25%] bg-black rounded-lg md:rounded-xl overflow-hidden">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`${slide.videoUrl}&autoplay=1`}
                title={slide.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {slide.content.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 md:gap-3 bg-gray-800/50 rounded-lg md:rounded-xl p-2.5 md:p-3 border border-gray-700/50"
                >
                  <div className={`${item.color} w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-xs md:text-sm">{item.stage}</h4>
                    <p className="text-gray-400 text-[11px] md:text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    {item.trust && (
                      <div className="mt-1.5 md:mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-700 h-1 md:h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-cyan-400 h-full transition-all duration-500"
                              style={{ width: `${item.trust}%` }}
                            />
                          </div>
                          <span className="text-cyan-400 text-[10px] md:text-xs font-medium">{item.trust}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {slide.highlight && (
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg md:rounded-xl p-2.5 md:p-3 mt-2 md:mt-3">
                  <p className="text-cyan-400 font-bold text-center text-xs md:text-sm">
                    💡 {slide.highlight}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 네비게이션 - 모바일 최적화 */}
        <div className="bg-gray-800/50 p-3 md:p-4 border-t border-gray-700/50">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* 이전 버튼 */}
            <button
              onClick={prevSlide}
              className="flex items-center justify-center gap-1 px-3 py-2 md:px-4 md:py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg md:rounded-xl transition-colors text-xs md:text-sm font-medium"
            >
              <ChevronLeft size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="hidden xs:inline">이전</span>
            </button>

            {/* 영상 보기 버튼 */}
            {slide.videoUrl && (
              <button
                onClick={() => setShowVideo(!showVideo)}
                className={`flex items-center justify-center gap-1 md:gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl transition-colors text-xs md:text-sm font-medium ${
                  showVideo
                    ? 'bg-gray-600 text-white'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
                }`}
              >
                <Play size={14} className={`md:w-4 md:h-4 ${showVideo ? '' : 'fill-current'}`} />
                <span>{showVideo ? '내용' : '영상'}</span>
              </button>
            )}

            {/* 다음 버튼 */}
            <button
              onClick={nextSlide}
              className="flex items-center justify-center gap-1 px-3 py-2 md:px-4 md:py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg md:rounded-xl transition-colors text-xs md:text-sm font-medium"
            >
              <span className="hidden xs:inline">다음</span>
              <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
          </div>

          {/* 진행률 표시 */}
          <div className="flex gap-1 md:gap-1.5 mt-3 md:mt-4 justify-center">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setShowVideo(false);
                  setCurrentSlide(idx);
                }}
                className={`h-1 md:h-1.5 rounded-full transition-all ${
                  idx === currentSlide
                    ? 'w-6 md:w-8 bg-cyan-400'
                    : 'w-1 md:w-1.5 bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
