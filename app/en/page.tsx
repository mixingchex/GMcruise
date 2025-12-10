'use client';

import { useState } from 'react';

export default function EnglishPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const tools = [
    {
      id: 'taxi',
      icon: '🚕',
      title: 'Magic Taxi',
      desc: 'Summon your ride',
      // 강렬한 붉은/주황 네온
      gradient: 'from-red-500 to-orange-500',
      shadow: 'shadow-[0_0_30px_-5px_rgba(239,68,68,0.6)]',
    },
    {
      id: 'price',
      icon: '👁️',
      title: 'Truth Lens',
      desc: 'Scan for scams',
      // 사이버펑크 민트/그린 네온
      gradient: 'from-emerald-400 to-teal-400',
      shadow: 'shadow-[0_0_30px_-5px_rgba(52,211,153,0.6)]',
    },
    {
      id: 'path',
      icon: '🧭',
      title: 'Ghost Path',
      desc: 'Fastest route',
      // 서울의 밤하늘 같은 딥 블루/퍼플 네온
      gradient: 'from-blue-500 to-indigo-500',
      shadow: 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)]',
    },
    {
      id: 'voice',
      icon: '🔮',
      title: 'Soul Voice',
      desc: 'Speak freely',
      // 신비로운 마젠타/핑크 네온
      gradient: 'from-fuchsia-500 to-pink-500',
      shadow: 'shadow-[0_0_30px_-5px_rgba(217,70,239,0.6)]',
    },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black">

      {/* 배경 이미지: 서울의 밤거리 (Unsplash 무료 이미지 사용) */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1633934542430-0905ccb5f050?q=80&w=2525&auto=format&fit=crop"
          alt="Seoul Night View"
          className="object-cover w-full h-full opacity-60 mix-blend-overlay filter blur-[2px]"
        />
        {/* 어두운 그라데이션 오버레이로 텍스트 가독성 확보 및 분위기 조성 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />
      </div>

      {/* 콘텐츠 레이어 */}
      <div className="relative z-10 flex flex-col h-screen px-6 py-6 max-w-md mx-auto">

        {/* 상단 헤더: 게임 인터페이스 같은 느낌 */}
        <header className="mt-4 mb-10">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-bold text-green-400 tracking-widest">SEOUL ONLINE</span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono tracking-wider">23°C / RAINY</div>
          </div>

          <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            CRUISE<br/>DOT.AI
          </h1>
          <p className="text-gray-300 mt-3 text-sm font-light tracking-wide border-l-2 border-red-600 pl-4 leading-relaxed">
            Survive the neon night in <span className="text-white font-bold text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">SEOUL</span>.
          </p>
        </header>

        {/* 메인 그리드 (네온 글래스모피즘 카드) */}
        <div className="grid grid-cols-2 gap-4 flex-1 content-start">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`group relative flex flex-col items-start justify-between p-5 h-44 w-full rounded-2xl
                border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-500
                hover:border-white/30 hover:-translate-y-1 active:scale-95 overflow-hidden
                ${activeTool === tool.id ? 'ring-1 ring-white' : ''}
              `}
            >
              {/* 호버 시 나타나는 배경 글로우 & 그림자 효과 */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 bg-gradient-to-br ${tool.gradient} blur-xl`} />
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${tool.shadow}`} />

              {/* 아이콘 */}
              <div className="relative z-10 p-2 rounded-xl bg-white/10 text-3xl mb-2 backdrop-blur-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                {tool.icon}
              </div>

              {/* 텍스트 */}
              <div className="relative z-10 text-left w-full">
                <h3 className={`font-bold text-xl leading-none mb-2 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r ${tool.gradient} transition-all duration-300`}>
                  {tool.title}
                </h3>
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider group-hover:text-gray-300 transition-colors duration-300">
                  {tool.desc}
                </p>
              </div>

              {/* 장식용 테크 라인 */}
              <div className={`absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r ${tool.gradient} opacity-30 group-hover:opacity-70 transition-opacity duration-500`} />
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${tool.gradient} opacity-10 blur-2xl rounded-full group-hover:opacity-30 transition-opacity duration-500`} />
            </button>
          ))}
        </div>

        {/* 하단 검색바 (AI 채팅 진입점) */}
        <div className="mt-auto mb-8">
          <div className="relative group w-full">
            {/* 배경에서 숨쉬는 글로우 효과 */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded-full opacity-50 group-hover:opacity-80 blur-md transition duration-1000 animate-pulse"></div>

            <button
              onClick={() => setActiveTool('chat')}
              className="relative flex items-center justify-between w-full px-6 py-5 bg-black rounded-full border border-white/10 leading-none text-gray-300 group-hover:text-white transition-colors backdrop-blur-md"
            >
              <span className="flex items-center gap-4">
                <span className="text-2xl animate-bounce filter drop-shadow-md">🔥</span>
                <span className="font-medium tracking-wider text-sm">Ask the Genie anything...</span>
              </span>
              <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </div>
            </button>
          </div>
        </div>

        <footer className="text-center text-[9px] text-gray-600 font-mono tracking-[0.2em] uppercase">
          System Online • v.2.0.5 • Seoul
        </footer>
      </div>
    </main>
  );
}
