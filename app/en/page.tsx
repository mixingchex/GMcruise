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
      gradient: 'from-red-500 to-orange-500',
      shadow: 'shadow-[0_0_30px_-5px_rgba(239,68,68,0.6)]',
    },
    {
      id: 'price',
      icon: '👁️',
      title: 'Truth Lens',
      desc: 'Scan for scams',
      gradient: 'from-emerald-400 to-teal-400',
      shadow: 'shadow-[0_0_30px_-5px_rgba(52,211,153,0.6)]',
    },
    {
      id: 'path',
      icon: '🧭',
      title: 'Ghost Path',
      desc: 'Fastest route',
      gradient: 'from-blue-500 to-indigo-500',
      shadow: 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)]',
    },
    {
      id: 'voice',
      icon: '🔮',
      title: 'Soul Voice',
      desc: 'Speak freely',
      gradient: 'from-fuchsia-500 to-pink-500',
      shadow: 'shadow-[0_0_30px_-5px_rgba(217,70,239,0.6)]',
    },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black font-sans">

      {/* 배경 이미지 - Next/Image로 최적화 */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/en-main.png"
          alt="Seoul background"
          fill
          className="object-cover opacity-60 mix-blend-overlay"
          priority
          quality={75}
        />
        {/* 텍스트 가독성을 위한 어두운 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90" />
      </div>

      {/* 콘텐츠 레이어 */}
      <div className="relative z-10 flex flex-col h-screen px-6 py-6 max-w-md mx-auto">

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
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${tool.gradient}`} />

              <div className="relative z-10 text-3xl mb-2 filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                {tool.icon}
              </div>

              <div className="relative z-10 text-left w-full">
                <h3 className={`font-bold text-lg leading-none mb-1 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r ${tool.gradient}`}>
                  {tool.title}
                </h3>
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider group-hover:text-gray-200">
                  {tool.desc}
                </p>
              </div>

              <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${tool.gradient} opacity-50`} />
              <div className={`absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl ${tool.gradient} opacity-20 blur-xl rounded-full`} />
            </button>
          ))}
        </div>

        <div className="mt-auto mb-6">
          <div className="relative group w-full">
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
