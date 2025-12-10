'use client';

import { useState, useRef } from 'react';

/**
 * PriceLens - Scan prices and check if they're fair
 *
 * Features:
 * - Camera capture for menus/receipts
 * - AI-powered price analysis
 * - USD conversion
 * - Fair price verdict
 */

interface PriceLensProps {
  onClose: () => void;
}

interface PriceItem {
  name: string;
  price_krw: number;
  price_usd: number;
  is_fair: boolean;
}

interface PriceAnalysis {
  items: PriceItem[];
  total_krw: number;
  total_usd: number;
  verdict: string;
  tip: string;
}

export default function PriceLens({ onClose }: PriceLensProps) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PriceAnalysis | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImage(base64);
      analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64Image: string) => {
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await fetch('/api/en/genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Analyze this image for prices. Identify all items and their prices in KRW. Convert to USD (1 USD = 1,350 KRW approx). Tell me if the prices are fair for tourists or if this might be overpriced.',
          image: base64Image,
          mode: 'price',
        }),
      });

      const data = await response.json();

      if (data.ok && data.data?.type === 'price_analysis') {
        setAnalysis(data.data.content);
      } else if (data.ok && data.data?.content) {
        // Fallback response
        setAnalysis({
          items: [],
          total_krw: 0,
          total_usd: 0,
          verdict: 'Analysis complete',
          tip: data.data.content.message || 'Unable to extract specific prices',
        });
      } else {
        throw new Error(data.error || 'Failed to analyze image');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    if (verdict.toLowerCase().includes('fair')) return 'text-green-400';
    if (verdict.toLowerCase().includes('overpriced')) return 'text-yellow-400';
    if (verdict.toLowerCase().includes('warning') || verdict.toLowerCase().includes('trap')) return 'text-red-400';
    return 'text-gray-400';
  };

  const resetAnalysis = () => {
    setImage(null);
    setAnalysis(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-3xl p-6 pb-safe-bottom max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📷</span>
            <div>
              <h2 className="text-xl font-bold text-white">Price Lens</h2>
              <p className="text-xs text-gray-400">Scan & check fair prices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Capture Section */}
        {!image && (
          <div className="space-y-4">
            <button
              onClick={handleCapture}
              className="w-full aspect-video bg-white/5 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-colors"
            >
              <span className="text-5xl">📸</span>
              <span className="text-lg font-medium text-white">Tap to Capture</span>
              <span className="text-sm text-gray-400">Photo of menu, receipt, or price tag</span>
            </button>

            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="font-medium text-white mb-2">💡 Tips for best results:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Make sure prices are clearly visible</li>
                <li>• Good lighting helps accuracy</li>
                <li>• Works with Korean & English text</li>
              </ul>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white font-medium">Analyzing prices...</p>
            <p className="text-sm text-gray-400">This may take a few seconds</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={resetAnalysis}
              className="px-6 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && !loading && (
          <div className="space-y-4">
            {/* Captured Image */}
            {image && (
              <div className="rounded-xl overflow-hidden">
                <img src={image} alt="Captured" className="w-full h-40 object-cover" />
              </div>
            )}

            {/* Verdict Banner */}
            <div className={`p-4 rounded-xl bg-white/10 border border-white/20 text-center`}>
              <p className={`text-xl font-bold ${getVerdictColor(analysis.verdict)}`}>
                {analysis.verdict}
              </p>
            </div>

            {/* Price Items */}
            {analysis.items.length > 0 && (
              <div className="space-y-2">
                {analysis.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <span>{item.is_fair ? '✅' : '⚠️'}</span>
                      <span className="text-white">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">₩{item.price_krw.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">${item.price_usd.toFixed(2)}</p>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex items-center justify-between p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <span className="text-white font-bold">Total</span>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold text-xl">₩{analysis.total_krw.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">${analysis.total_usd.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tip */}
            {analysis.tip && (
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-sm text-blue-300">💡 {analysis.tip}</p>
              </div>
            )}

            {/* Actions */}
            <button
              onClick={resetAnalysis}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold text-lg text-white"
            >
              Scan Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
