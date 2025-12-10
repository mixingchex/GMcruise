'use client';

import { useState } from 'react';

/**
 * /en - Global Travel Survival Tool
 * Mobile-First 4-Grid UI for one-handed operation
 */

type ActiveTool = 'taxi' | 'price' | 'path' | 'voice' | null;

const tools = [
  {
    id: 'taxi' as const,
    icon: '🚕',
    label: 'Magic Taxi',
    desc: 'Show destination to driver',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'price' as const,
    icon: '📷',
    label: 'Price Lens',
    desc: 'Scan & check fair prices',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'path' as const,
    icon: '🧭',
    label: 'PathFinder',
    desc: 'Get simple directions',
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'voice' as const,
    icon: '🗣️',
    label: 'VocalGenie',
    desc: 'Instant translation',
    gradient: 'from-purple-500 to-pink-500',
  },
];

// Simple Modal Component (inline to avoid import issues)
function ToolModal({ tool, onClose }: { tool: ActiveTool; onClose: () => void }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);

    try {
      const response = await fetch('/api/en/genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, mode: tool }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (tool) {
      case 'taxi': return { icon: '🚕', title: 'Magic Taxi', placeholder: 'Where do you want to go? (e.g., Myeongdong Station)' };
      case 'price': return { icon: '📷', title: 'Price Lens', placeholder: 'Describe what you want to check price for...' };
      case 'path': return { icon: '🧭', title: 'PathFinder', placeholder: 'Where do you want to go?' };
      case 'voice': return { icon: '🗣️', title: 'VocalGenie', placeholder: 'Enter text to translate...' };
      default: return { icon: '🤖', title: 'AI Tool', placeholder: 'Enter your request...' };
    }
  };

  const info = getTitle();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{info.icon}</span>
            <h2 className="text-xl font-bold text-white">{info.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Input */}
        <div className="space-y-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={info.placeholder}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />

          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-bold text-lg disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Submit'}
          </button>

          {/* Result Display */}
          {result && (
            <div className="mt-4 p-4 bg-white/10 rounded-xl">
              {result.error ? (
                <p className="text-red-400">{result.error}</p>
              ) : result.ok && result.data ? (
                <div className="space-y-2">
                  {result.data.type === 'taxi_card' && result.data.content && (
                    <div className="bg-white rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-gray-900">{result.data.content.destination_kr}</p>
                      <p className="text-gray-600 mt-2">{result.data.content.address_kr}</p>
                      {result.data.content.pronunciation && (
                        <p className="text-blue-600 text-sm mt-1">Say: "{result.data.content.pronunciation}"</p>
                      )}
                    </div>
                  )}
                  {result.data.type === 'translation' && result.data.content && (
                    <div className="space-y-2">
                      <p className="text-gray-400">Original: {result.data.content.original}</p>
                      <p className="text-2xl font-bold text-white">{result.data.content.translated}</p>
                      {result.data.content.pronunciation && (
                        <p className="text-purple-400">"{result.data.content.pronunciation}"</p>
                      )}
                    </div>
                  )}
                  {result.data.type === 'text' && result.data.content && (
                    <p className="text-white">{result.data.content.message}</p>
                  )}
                  {!['taxi_card', 'translation', 'text'].includes(result.data.type) && (
                    <pre className="text-xs text-gray-300 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <pre className="text-xs text-gray-300 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EnglishHomePage() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              CruiseDot AI
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Travel Survival Tool for Korea</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            Online
          </span>
        </div>
      </header>

      {/* Main Grid - 2x2 Layout */}
      <div className="flex-1 px-4 pb-4 pt-2">
        <div className="grid grid-cols-2 gap-3 h-full" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`
                relative overflow-hidden rounded-2xl
                bg-gradient-to-br ${tool.gradient}
                p-4 flex flex-col justify-between
                transition-all duration-200
                hover:scale-[1.02] hover:shadow-xl
                active:scale-[0.98]
                focus:outline-none focus:ring-2 focus:ring-white/50
              `}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-4 -top-4 text-8xl">{tool.icon}</div>
              </div>

              {/* Content */}
              <div className="relative z-10">
                <span className="text-4xl">{tool.icon}</span>
              </div>
              <div className="relative z-10 text-left mt-auto">
                <h2 className="font-bold text-lg text-white drop-shadow-sm">{tool.label}</h2>
                <p className="text-xs text-white/80 mt-0.5">{tool.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Help */}
      <div className="flex-shrink-0 px-4 pb-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
          <p className="text-center text-xs text-gray-400">
            Tap any tool above to get started
          </p>
        </div>
      </div>

      {/* Tool Modal */}
      {activeTool && <ToolModal tool={activeTool} onClose={() => setActiveTool(null)} />}
    </div>
  );
}
