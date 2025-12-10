'use client';

import { useState } from 'react';

/**
 * VocalGenie - Instant translation for tourists
 *
 * Features:
 * - Text translation (EN ↔ KR)
 * - Phonetic pronunciation guide
 * - Common phrases quick access
 * - Copy & Speak functionality
 */

interface VocalGenieProps {
  onClose: () => void;
}

interface TranslationResult {
  original: string;
  translated: string;
  pronunciation: string;
  context: string;
}

const commonPhrases = [
  { en: 'Hello', kr: '안녕하세요', pronunciation: 'An-nyeong-ha-se-yo' },
  { en: 'Thank you', kr: '감사합니다', pronunciation: 'Gam-sa-ham-ni-da' },
  { en: 'How much?', kr: '얼마예요?', pronunciation: 'Eol-ma-ye-yo?' },
  { en: 'Where is...?', kr: '어디예요?', pronunciation: 'Eo-di-ye-yo?' },
  { en: 'Excuse me', kr: '실례합니다', pronunciation: 'Sil-lye-ham-ni-da' },
  { en: 'Help!', kr: '도와주세요!', pronunciation: 'Do-wa-ju-se-yo!' },
  { en: 'I don\'t understand', kr: '이해 못해요', pronunciation: 'I-hae mot-hae-yo' },
  { en: 'Bathroom', kr: '화장실', pronunciation: 'Hwa-jang-sil' },
];

export default function VocalGenie({ onClose }: VocalGenieProps) {
  const [text, setText] = useState('');
  const [direction, setDirection] = useState<'en-kr' | 'kr-en'>('en-kr');
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [error, setError] = useState('');

  const handleTranslate = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setError('');
    setTranslation(null);

    try {
      const fromLang = direction === 'en-kr' ? 'English' : 'Korean';
      const toLang = direction === 'en-kr' ? 'Korean' : 'English';

      const response = await fetch('/api/en/genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Translate this from ${fromLang} to ${toLang}: "${text}". Include the pronunciation (romanization) if translating to Korean, and provide context on when to use this phrase.`,
          mode: 'translation',
        }),
      });

      const data = await response.json();

      if (data.ok && data.data?.type === 'translation') {
        setTranslation(data.data.content);
      } else if (data.ok && data.data?.content?.message) {
        setTranslation({
          original: text,
          translated: data.data.content.message,
          pronunciation: '',
          context: '',
        });
      } else {
        throw new Error(data.error || 'Translation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (textToCopy: string) => {
    await navigator.clipboard.writeText(textToCopy);
    alert('Copied to clipboard!');
  };

  const handleSpeak = (textToSpeak: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = lang;
      speechSynthesis.speak(utterance);
    }
  };

  const handleQuickPhrase = (phrase: typeof commonPhrases[0]) => {
    setTranslation({
      original: phrase.en,
      translated: phrase.kr,
      pronunciation: phrase.pronunciation,
      context: 'Common phrase',
    });
  };

  const resetTranslation = () => {
    setTranslation(null);
    setText('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-3xl p-6 pb-safe-bottom max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗣️</span>
            <div>
              <h2 className="text-xl font-bold text-white">VocalGenie</h2>
              <p className="text-xs text-gray-400">Instant translation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Translation Input */}
        {!translation && (
          <div className="space-y-4">
            {/* Direction Toggle */}
            <div className="flex items-center justify-center gap-3 p-3 bg-white/5 rounded-xl">
              <span className={`text-lg ${direction === 'en-kr' ? 'text-white' : 'text-gray-500'}`}>
                🇺🇸 English
              </span>
              <button
                onClick={() => setDirection(direction === 'en-kr' ? 'kr-en' : 'en-kr')}
                className="px-4 py-2 bg-purple-500/20 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
              >
                ⇄
              </button>
              <span className={`text-lg ${direction === 'kr-en' ? 'text-white' : 'text-gray-500'}`}>
                🇰🇷 Korean
              </span>
            </div>

            {/* Text Input */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Enter {direction === 'en-kr' ? 'English' : 'Korean'} text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={direction === 'en-kr' ? 'Type in English...' : '한국어로 입력하세요...'}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px] resize-none"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Translate Button */}
            <button
              onClick={handleTranslate}
              disabled={loading || !text.trim()}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-lg text-white disabled:opacity-50 transition-all hover:shadow-lg"
            >
              {loading ? 'Translating...' : 'Translate'}
            </button>

            {/* Quick Phrases */}
            <div>
              <h3 className="text-sm text-gray-400 mb-3">Quick Phrases</h3>
              <div className="grid grid-cols-2 gap-2">
                {commonPhrases.slice(0, 6).map((phrase, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickPhrase(phrase)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-left hover:bg-white/10 transition-colors"
                  >
                    <p className="text-sm font-medium text-white">{phrase.en}</p>
                    <p className="text-xs text-gray-400">{phrase.kr}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Translation Result */}
        {translation && !loading && (
          <div className="space-y-4">
            {/* Original */}
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">Original</p>
              <p className="text-lg text-white">{translation.original}</p>
            </div>

            {/* Translated - Large Display */}
            <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
              <p className="text-xs text-gray-400 mb-2">Translation</p>
              <p className="text-3xl font-bold text-white mb-2">{translation.translated}</p>
              {translation.pronunciation && (
                <p className="text-lg text-purple-300 italic">"{translation.pronunciation}"</p>
              )}
            </div>

            {/* Context */}
            {translation.context && (
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-sm text-blue-300">💡 {translation.context}</p>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleCopy(translation.translated)}
                className="py-3 bg-white/10 rounded-xl font-medium text-white hover:bg-white/20 transition-colors"
              >
                📋 Copy
              </button>
              <button
                onClick={() => handleSpeak(translation.translated, direction === 'en-kr' ? 'ko-KR' : 'en-US')}
                className="py-3 bg-white/10 rounded-xl font-medium text-white hover:bg-white/20 transition-colors"
              >
                🔊 Speak
              </button>
              <button
                onClick={resetTranslation}
                className="py-3 bg-purple-500/20 rounded-xl font-medium text-purple-400 hover:bg-purple-500/30 transition-colors"
              >
                🔄 New
              </button>
            </div>

            {/* Tip */}
            <p className="text-center text-xs text-gray-500">
              💡 Tip: Turn up volume and tap "Speak" to hear pronunciation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
