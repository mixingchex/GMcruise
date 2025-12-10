'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function EnglishPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const tools = [
    {
      id: 'taxi',
      icon: '🚕',
      title: 'Magic Taxi',
      desc: 'Summon your ride',
      // 데몬 헌터스(카운터) 느낌의 강렬한 붉은/주황 빛
      gradient: 'from-red-500 to-orange-500',
      shadow: 'shadow-[0_0_30px_-5px_rgba(239,68,68,0.6)]',
    },
    {
      id: 'price',
      icon: '👁️',
      title: 'Truth Lens', // 이름 변경: 가격을 꿰뚫어본다는 느낌
      desc: 'Scan for scams',
      // 사이버펑크 민트/그린
      gradient: 'from-emerald-400 to-teal-400',
      shadow: 'shadow-[0_0_30px_-5px_rgba(52,211,153,0.6)]',
    },
    {
      id: 'path',
      icon: '🧭',
      title: 'Ghost Path', // 이름 변경: 유령처럼 빠르게 이동
      desc: 'Fastest route',
      // 서울의 밤하늘 같은 딥 블루/퍼플
      gradient: 'from-blue-500 to-indigo-500',
      shadow: 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)]',
    },
    {
      id: 'voice',
      icon: '🔮',
      title: 'Soul Voice', // 이름 변경: 언어의 장벽을 녹임
      desc: 'Speak freely',
      // 신비로운 마젠타/핑크
      gradient: 'from-fuchsia-500 to-pink-500',
      shadow: 'shadow-[0_0_30px_-5px_rgba(217,70,239,0.6)]',
    },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black font-sans">

      {/* 배경 이미지: 남산타워 야경 (Unsplash 무료 이미지 사용) */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1546806177-430133055767?q=80&w=2574&auto=format&fit=crop"
          alt="Namsan Tower at night"
          className="object-cover w-full h-full opacity-60 mix-blend-overlay"
        />
        {/* 어두운 오버레이로 텍스트 가독성 확보 및 분위기 조성 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90" />
      </div>

      {/* 콘텐츠 레이어 */}
      <div className="relative z-10 flex flex-col h-screen px-6 py-6 max-w-md mx-auto">

        {/* 상단 헤더: K-POP 뮤직비디오 타이틀 느낌 */}
        <header className="mt-4 mb-8">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-bold text-green-400 tracking-widest">SEOUL ONLINE</span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">23°C RAINY</div>
          </div>

          <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            CRUISE<br/>DOT.AI
          </h1>
          <p className="text-gray-300 mt-2 text-sm font-light tracking-wide border-l-2 border-red-500 pl-3">
            Survive the night in <span className="text-white font-bold text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">SEOUL</span>
          </p>
        </header>

        {/* 메인 그리드 */}
        <div className="grid grid-cols-2 gap-4 flex-1 content-start">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`group relative flex flex-col items-start justify-between p-5 h-40 w-full rounded-2xl
                border border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-300
                hover:border-white/40 hover:-translate-y-1 active:scale-95 overflow-hidden
                ${activeTool === tool.id ? 'ring-1 ring-white' : ''}
              `}
            >
              {/* 호버 시 나타나는 배경 글로우 (Demon Hunter Territory 느낌) */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${tool.gradient}`} />

              {/* 상단 아이콘 */}
              <div className="relative z-10 text-3xl mb-2 filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                {tool.icon}
              </div>

              {/* 텍스트 */}
              <div className="relative z-10 text-left w-full">
                <h3 className={`font-bold text-lg leading-none mb-1 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r ${tool.gradient}`}>
                  {tool.title}
                </h3>
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider group-hover:text-gray-200">
                  {tool.desc}
                </p>
              </div>

              {/* 장식용 라인 (테크 느낌) */}
              <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${tool.gradient} opacity-50`} />
              <div className={`absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl ${tool.gradient} opacity-20 blur-xl rounded-full`} />
            </button>
          ))}
        </div>

        {/* 하단 검색바 (AI 채팅) */}
        <div className="mt-auto mb-6">
          <div className="relative group w-full">
            {/* 배경에서 숨쉬는 글로우 효과 */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded-full opacity-70 group-hover:opacity-100 blur transition duration-1000 animate-pulse"></div>

            <button
              onClick={() => setActiveTool('chat')}
              className="relative flex items-center justify-between w-full px-6 py-4 bg-black rounded-full border border-white/10 leading-none text-gray-300 group-hover:text-white transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="text-xl animate-bounce">🔥</span>
                <span className="font-medium tracking-wide">Ask the Genie...</span>
              </span>
              <div className="p-1.5 bg-white/10 rounded-full">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </div>
            </button>
          </div>
        </div>

        <footer className="text-center text-[9px] text-gray-600 font-mono tracking-widest uppercase">
          System Online • v.2.0.4 • Seoul
        </footer>
      </div>
    </main>
  );
}
