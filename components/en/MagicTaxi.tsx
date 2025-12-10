'use client';

import { useState } from 'react';

/**
 * MagicTaxi - Show destination to taxi driver in Korean
 *
 * Features:
 * - Input destination in English
 * - AI generates Korean destination card
 * - Large, clear display for showing to driver
 * - Copy & Share functionality
 */

interface MagicTaxiProps {
  onClose: () => void;
}

interface TaxiCard {
  destination_kr: string;
  destination_en: string;
  address_kr: string;
  pronunciation: string;
  driver_note: string;
}

export default function MagicTaxi({ onClose }: MagicTaxiProps) {
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [taxiCard, setTaxiCard] = useState<TaxiCard | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!destination.trim()) return;

    setLoading(true);
    setError('');
    setTaxiCard(null);

    try {
      const response = await fetch('/api/en/genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I need a taxi card to show the driver. My destination is: ${destination}. Please create a taxi_card with the Korean address and helpful instructions for the driver.`,
          mode: 'taxi',
        }),
      });

      const data = await response.json();

      if (data.ok && data.data?.type === 'taxi_card') {
        setTaxiCard(data.data.content);
      } else if (data.ok && data.data?.content?.message) {
        // Fallback text response
        setTaxiCard({
          destination_kr: destination,
          destination_en: destination,
          address_kr: data.data.content.message,
          pronunciation: '',
          driver_note: '',
        });
      } else {
        throw new Error(data.error || 'Failed to generate taxi card');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!taxiCard) return;
    const text = `${taxiCard.destination_kr}\n${taxiCard.address_kr}`;

    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-3xl p-6 pb-safe-bottom animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚕</span>
            <div>
              <h2 className="text-xl font-bold text-white">Magic Taxi</h2>
              <p className="text-xs text-gray-400">Show this to your taxi driver</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Input Section */}
        {!taxiCard && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Where do you want to go?</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g., Myeongdong Station, Gangnam Hotel..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !destination.trim()}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-lg text-white disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-yellow-500/25"
            >
              {loading ? 'Generating...' : 'Generate Taxi Card'}
            </button>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-2">
              {['Seoul Station', 'Incheon Airport', 'Myeongdong', 'Hongdae'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDestination(preset)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Taxi Card Display */}
        {taxiCard && (
          <div className="space-y-4">
            {/* The Card - Large & Clear */}
            <div className="bg-white rounded-2xl p-6 text-center">
              <p className="text-4xl font-bold text-gray-900 mb-2">
                {taxiCard.destination_kr}
              </p>
              {taxiCard.address_kr && (
                <p className="text-lg text-gray-600 mb-2">{taxiCard.address_kr}</p>
              )}
              <p className="text-sm text-gray-500">{taxiCard.destination_en}</p>
              {taxiCard.pronunciation && (
                <p className="text-xs text-blue-600 mt-2">Say: "{taxiCard.pronunciation}"</p>
              )}
              {taxiCard.driver_note && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-700">{taxiCard.driver_note}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShare}
                className="py-3 bg-white/10 rounded-xl font-medium text-white hover:bg-white/20 transition-colors"
              >
                📋 Copy / Share
              </button>
              <button
                onClick={() => setTaxiCard(null)}
                className="py-3 bg-yellow-500/20 rounded-xl font-medium text-yellow-400 hover:bg-yellow-500/30 transition-colors"
              >
                🔄 New Search
              </button>
            </div>

            {/* Tip */}
            <p className="text-center text-xs text-gray-500">
              💡 Tip: Turn up brightness and show this screen to your driver
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
