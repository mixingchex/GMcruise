'use client';
import { useState } from 'react';
import { FaTaxi, FaTimes, FaSearch, FaMapMarkerAlt } from 'react-icons/fa';

export default function MagicTaxi({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!input) return;
    setLoading(true);

    try {
      const res = await fetch('/api/en/genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I want to go to ${input}. Create a taxi card json.`
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert("Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 흐림 처리 */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md z-10 animate-in fade-in zoom-in duration-300">

        {/* 닫기 버튼 */}
        <button onClick={onClose} className="absolute -top-12 right-0 text-white/50 hover:text-white text-3xl transition-colors">
          <FaTimes />
        </button>

        {!result ? (
          // [State 1] 입력 화면 (Dark Glass Theme)
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                <FaTaxi className="text-3xl text-white" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-white">Where to?</h2>
              <p className="text-slate-400 text-sm">Show this card to the driver.</p>
            </div>

            <div className="relative mb-6">
              <FaSearch className="absolute left-4 top-4 text-slate-500" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Grand Hyatt, Gangnam Station"
                className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-4 rounded-xl outline-none focus:border-yellow-500 transition-colors placeholder:text-slate-600"
                autoFocus
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-black font-bold py-4 rounded-xl text-lg transition-all shadow-lg shadow-orange-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"/>
                  Asking Genie...
                </span>
              ) : "Create Magic Card ✨"}
            </button>
          </div>
        ) : (
          // [State 2] 결과 카드 (VIP Gold Ticket)
          <div className="bg-[#FFC107] text-black rounded-3xl p-0 overflow-hidden shadow-[0_0_50px_rgba(255,193,7,0.4)]">
            {/* 카드 헤더 */}
            <div className="bg-black/10 p-4 flex justify-between items-center border-b border-black/5">
              <span className="font-bold text-xs opacity-60 tracking-widest">ROYAL CHAUFFEUR</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-black/20"></div>
                <div className="w-2 h-2 rounded-full bg-black/20"></div>
              </div>
            </div>

            {/* 메인 내용 */}
            <div className="p-8 text-center">
              <p className="text-sm font-bold opacity-60 mb-2 uppercase tracking-wide">Destination</p>

              {/* 한글 목적지 (가장 크게) */}
              <h1 className="text-5xl font-black mb-3 leading-tight break-keep drop-shadow-sm">
                {result.destination_kr || input}
              </h1>

              {/* 영문 목적지 */}
              <div className="inline-block bg-black/10 px-3 py-1 rounded-lg mb-8">
                <p className="text-lg font-medium">{result.destination_en || input}</p>
              </div>

              {/* 주소 정보 */}
              <div className="bg-white/90 rounded-2xl p-5 text-left flex gap-4 shadow-sm">
                <FaMapMarkerAlt className="text-2xl text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Navigation Address</p>
                  <p className="text-lg font-bold text-slate-900 leading-snug">
                    {result.address_kr || "기사님 내비게이션 주소를 확인해주세요."}
                  </p>
                </div>
              </div>
            </div>

            {/* 하단 메시지 */}
            <div className="bg-black text-white p-6 text-center">
              <p className="text-lg font-medium">
                &quot;{result.driver_message || "기사님, 여기로 안전하게 모셔다 주세요."}&quot;
              </p>
              <button
                onClick={() => setResult(null)}
                className="mt-6 text-sm text-gray-500 hover:text-white underline decoration-gray-700 underline-offset-4"
              >
                Search Another Destination
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
