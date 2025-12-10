'use client';

import { useState } from 'react';
import { FaTaxi, FaCamera, FaMapMarkedAlt, FaMicrophone, FaRobot, FaChevronRight } from 'react-icons/fa';
import Image from 'next/image';

// 기능 컴포넌트 Import
import MagicTaxi from '@/components/en/MagicTaxi';
import PriceLens from '@/components/en/PriceLens';
import VocalGenie from '@/components/en/VocalGenie';
import PathFinder from '@/components/en/PathFinder';
import ConciergeChat from '@/components/en/ConciergeChat';

// 럭셔리 버튼 컴포넌트
const LuxuryButton = ({ icon: Icon, title, sub, onClick }: any) => (
  <button
    onClick={onClick}
    className="group relative w-full max-w-lg flex items-center justify-between p-5 mb-4
               bg-black/30 backdrop-blur-md border border-white/10 rounded-xl
               hover:bg-black/50 hover:border-[#D4AF37]/50 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]
               active:scale-[0.98] transition-all duration-300 ease-out"
  >
    <div className="flex items-center gap-5">
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-[#D4AF37] group-hover:border-[#D4AF37] transition-colors">
        <Icon className="text-xl text-white/90 group-hover:text-black transition-colors" />
      </div>
      <div className="text-left">
        <h3 className="text-lg font-serif font-medium text-white tracking-wide group-hover:text-[#D4AF37] transition-colors">
          {title}
        </h3>
        <p className="text-xs text-gray-400 font-light tracking-widest uppercase opacity-70">
          {sub}
        </p>
      </div>
    </div>
    <FaChevronRight className="text-white/20 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
  </button>
);

export default function GlobalPage() {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">

      {/* 배경 이미지 */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/site-main.webp"
          alt="Seoul Cruise"
          fill
          className="object-cover"
          style={{ filter: "brightness(0.5)" }}
          priority
        />
      </div>

      {/* 오버레이 그라디언트 */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050B14]/90 via-transparent to-[#050B14]/40" />

      {/* 메인 컨텐츠 */}
      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">

        {/* 로고 영역 */}
        <div className="mb-10 text-center">
          {/* 로고 */}
          <div className="bg-white px-4 py-2 rounded-xl mx-auto mb-4 inline-block shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            <Image
              src="/images/ai-cruise-logo.png"
              alt="CruiseDot"
              width={80}
              height={28}
              className="object-contain"
              priority
            />
          </div>

          <h2 className="text-xs text-[#D4AF37] font-bold tracking-[0.3em] mb-2 uppercase">
            ⚓ Premium Cruise Concierge
          </h2>

          <p className="text-[#D4AF37] text-2xl sm:text-3xl font-bold tracking-[0.5em] uppercase mb-2">
            KOREA
          </p>

          <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight drop-shadow-xl mb-2">
            Cruise<span className="text-[#D4AF37] italic"> Dot</span>.AI
          </h1>

          <p className="text-white/60 text-xs font-light tracking-wider">
            Navigate Seoul with Elegance
          </p>
        </div>

        {/* 버튼 리스트 */}
        <div className="w-full flex flex-col gap-1">
          <LuxuryButton
            icon={FaTaxi} title="Royal Chauffeur" sub="Show Driver Card"
            onClick={() => setActiveFeature('taxi')}
          />
          <LuxuryButton
            icon={FaCamera} title="Price Guardian" sub="Avoid Tourist Traps"
            onClick={() => setActiveFeature('price')}
          />
          <LuxuryButton
            icon={FaMapMarkedAlt} title="Noble Path" sub="Smart Navigation"
            onClick={() => setActiveFeature('path')}
          />
          <LuxuryButton
            icon={FaMicrophone} title="Elite Translator" sub="Speak Like a Local"
            onClick={() => setActiveFeature('voice')}
          />
        </div>

        {/* CTA 버튼 */}
        <div className="mt-8">
          <button
            onClick={() => setShowChat(true)}
            className="flex items-center gap-2 px-8 py-3 bg-[#D4AF37] hover:bg-[#E5C04B] text-[#050B14] font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(212,175,55,0.4)]"
          >
            <FaRobot /> TALK TO CONCIERGE
          </button>
        </div>

        {/* 카피라이트 */}
        <p className="mt-10 text-[10px] text-white/20">© 2024 CRUISEDOT GLOBAL. ALL RIGHTS RESERVED.</p>
      </div>

      {/* 기능 모달 */}
      {activeFeature === 'taxi' && <MagicTaxi onClose={() => setActiveFeature(null)} />}
      {activeFeature === 'price' && <PriceLens onClose={() => setActiveFeature(null)} />}
      {activeFeature === 'voice' && <VocalGenie onClose={() => setActiveFeature(null)} />}
      {activeFeature === 'path' && <PathFinder onClose={() => setActiveFeature(null)} />}

      {/* 플로팅 챗봇 */}
      {showChat && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowChat(false)} />
          <div className="absolute bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[400px]">
            <ConciergeChat />
          </div>
        </div>
      )}

      {/* 플로팅 채팅 버튼 (항상 표시) */}
      <ConciergeChat />

    </main>
  );
}
