'use client';

import { useState } from 'react';

/**
 * PathFinder - Simple navigation for tourists
 *
 * Features:
 * - Input destination
 * - Get step-by-step directions
 * - Multiple transport options
 * - Estimated time & cost
 */

interface PathFinderProps {
  onClose: () => void;
}

interface DirectionsResult {
  from: string;
  to: string;
  method: 'subway' | 'bus' | 'taxi' | 'walk';
  steps: string[];
  estimated_time: string;
  estimated_cost: string;
}

const transportMethods = [
  { id: 'subway', icon: '🚇', label: 'Subway', color: 'from-blue-500 to-blue-600' },
  { id: 'bus', icon: '🚌', label: 'Bus', color: 'from-green-500 to-green-600' },
  { id: 'taxi', icon: '🚕', label: 'Taxi', color: 'from-yellow-500 to-orange-500' },
  { id: 'walk', icon: '🚶', label: 'Walk', color: 'from-purple-500 to-pink-500' },
];

export default function PathFinder({ onClose }: PathFinderProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [method, setMethod] = useState<string>('subway');
  const [loading, setLoading] = useState(false);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!to.trim()) return;

    setLoading(true);
    setError('');
    setDirections(null);

    try {
      const fromLocation = from.trim() || 'my current location';
      const response = await fetch('/api/en/genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I need directions from "${fromLocation}" to "${to}" using ${method}. Please provide step-by-step directions, estimated time, and cost in Korean Won.`,
          mode: 'directions',
        }),
      });

      const data = await response.json();

      if (data.ok && data.data?.type === 'directions') {
        setDirections(data.data.content);
      } else if (data.ok && data.data?.content?.message) {
        // Parse from text response
        setDirections({
          from: fromLocation,
          to: to,
          method: method as any,
          steps: [data.data.content.message],
          estimated_time: 'Varies',
          estimated_cost: 'Varies',
        });
      } else {
        throw new Error(data.error || 'Failed to get directions');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = () => {
    const destination = encodeURIComponent(to);
    const origin = from ? encodeURIComponent(from) : '';
    const url = origin
      ? `https://www.google.com/maps/dir/${origin}/${destination}`
      : `https://www.google.com/maps/search/${destination}`;
    window.open(url, '_blank');
  };

  const resetSearch = () => {
    setDirections(null);
    setTo('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-3xl p-6 pb-safe-bottom max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧭</span>
            <div>
              <h2 className="text-xl font-bold text-white">PathFinder</h2>
              <p className="text-xs text-gray-400">Get simple directions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Search Form */}
        {!directions && (
          <div className="space-y-4">
            {/* From Input */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">From (optional)</label>
              <input
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Current location (or enter address)"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* To Input */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">To *</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Where do you want to go?"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Transport Method */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">How?</label>
              <div className="grid grid-cols-4 gap-2">
                {transportMethods.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setMethod(t.id)}
                    className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      method === t.id
                        ? `bg-gradient-to-r ${t.color} shadow-lg`
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={loading || !to.trim()}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl font-bold text-lg text-white disabled:opacity-50 transition-all hover:shadow-lg"
            >
              {loading ? 'Finding path...' : 'Get Directions'}
            </button>

            {/* Quick Destinations */}
            <div className="grid grid-cols-2 gap-2">
              {['Myeongdong', 'Gangnam', 'Hongdae', 'Itaewon'].map((place) => (
                <button
                  key={place}
                  onClick={() => setTo(place)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
                >
                  📍 {place}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Directions Result */}
        {directions && !loading && (
          <div className="space-y-4">
            {/* Route Summary */}
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-400">From</p>
                  <p className="text-white font-medium">{directions.from}</p>
                </div>
                <span className="text-2xl">→</span>
                <div className="flex-1 text-right">
                  <p className="text-xs text-gray-400">To</p>
                  <p className="text-white font-medium">{directions.to}</p>
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-white/10">
                <div>
                  <p className="text-xs text-gray-400">Time</p>
                  <p className="text-lg font-bold text-blue-400">{directions.estimated_time}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Cost</p>
                  <p className="text-lg font-bold text-green-400">{directions.estimated_cost}</p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Directions</h3>
              {directions.steps.map((step, index) => (
                <div key={index} className="flex gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-white text-sm">{step}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={openInMaps}
                className="py-3 bg-white/10 rounded-xl font-medium text-white hover:bg-white/20 transition-colors"
              >
                🗺️ Open in Maps
              </button>
              <button
                onClick={resetSearch}
                className="py-3 bg-blue-500/20 rounded-xl font-medium text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                🔄 New Search
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
