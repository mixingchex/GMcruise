'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiPhone, FiArrowRight, FiCheck, FiX } from 'react-icons/fi';

export default function SubscriptionLoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExitIntent, setShowExitIntent] = useState(false);

  const handleSubmit = async (event: React.FormEvent, formLocation: string = 'main') => {
    event.preventDefault();
    if (loading) return;

    setError(null);
    
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim().replace(/[^0-9]/g, ''); // 숫자만 추출

    // 유효성 검사
    if (!trimmedName || trimmedName.length < 2) {
      setError('이름을 정확히 입력해주세요.');
      return;
    }

    if (!trimmedPhone || !/^01([0|1|6|7|8|9])([0-9]{3,4})([0-9]{4})$/.test(trimmedPhone)) {
      setError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/subscription/trial/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          name: trimmedName, 
          phone: trimmedPhone 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setError(data?.error || '무료 체험 시작에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 성공 시 대시보드로 이동
      if (data.mallUserId) {
        router.push(`/partner/${data.mallUserId}/dashboard`);
      } else {
        router.push('/partner/trial/dashboard');
      }
    } catch (err: any) {
      console.error('[Subscription Login] Error:', err);
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setLoading(false);
    }
  };

  // Exit Intent 감지
  React.useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !sessionStorage.getItem('exitIntentShown')) {
        setShowExitIntent(true);
        sessionStorage.setItem('exitIntentShown', 'true');
      }
    };

    document.body.addEventListener('mouseleave', handleMouseLeave);
    return () => document.body.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 1. 시선 집중 (Hook) */}
      <section className="text-center pt-12 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-black leading-tight my-8">
            <span className="text-yellow-400">"이건 돈 내고 배워야 해"</span>
            <span className="block text-2xl md:text-3xl font-bold mt-4 text-gray-200">
              고객을 '인솔'하고 '관리'하는<br />
              크루즈 마케터 전문가 과정
            </span>
          </h1>

          {/* 유튜브 영상 - 자동재생 음소거 */}
          <div className="mt-8 rounded-lg overflow-hidden shadow-2xl max-w-4xl mx-auto" style={{ paddingBottom: '56.25%', position: 'relative', height: 0, background: '#000' }}>
            <iframe
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              src="https://www.youtube.com/embed/OIGkqQHfLgw?autoplay=1&mute=1&loop=1&playlist=OIGkqQHfLgw&modestbranding=1&iv_load_policy=3&controls=0"
              title="크루즈 마케터 소개 영상"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          <div className="py-10 md:py-16">
            <h2 className="text-3xl md:text-5xl font-black text-white">단순 여행이 아닙니다.</h2>
            <p className="text-xl md:text-2xl font-bold text-cyan-400 mt-3">
              '여행하며 수익을 창출하는' 전문 커리어입니다.
            </p>
          </div>

          {/* 첫 번째 신청 폼 */}
          <div className="bg-gray-900 max-w-2xl mx-auto p-6 md:p-8 rounded-2xl shadow-2xl border border-cyan-500/50 mt-12">
            <h3 className="text-2xl font-bold text-center text-white mb-4">
              <span className="text-yellow-400">7일 무료 마케터 체험</span> 지금 바로 시작하세요!
            </h3>
            <p className="text-center text-gray-300 mb-6">
              이름과 연락처를 입력하시면 <strong className="text-cyan-400">7일 무료 마케터 체험</strong>을 할 수 있어요.
            </p>
            
            <form onSubmit={(e) => handleSubmit(e, 'top')} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                required
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-4 text-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                disabled={loading}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9-]/g, '');
                  setPhone(value);
                }}
                placeholder="휴대폰번호 입력 (010-1234-5678)"
                required
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-4 text-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                disabled={loading}
              />
              
              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xl py-5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <>
                    <span>7일 무료 체험 시작하기</span>
                    <FiArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              신청 즉시 서비스 이용이 가능합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Before vs After */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-white text-center mt-12">
            월급 227만원 연구원, 평범한 주부에서...
          </h2>
          <p className="text-xl md:text-2xl font-bold text-cyan-400 text-center mt-3">
            여행을 '일'로 만드는 프로 마케터가 되기까지
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center my-8">
            <div className="text-center">
              <div className="bg-gray-800 p-6 rounded-lg">
                <p className="font-bold text-lg mb-2">BEFORE</p>
                <p className="text-gray-400">반복되는 일상, 정해진 월급</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-gray-800 p-6 rounded-lg border-2 border-yellow-400">
                <p className="font-bold text-lg mb-2 text-yellow-400">AFTER</p>
                <p className="text-gray-200">여행하며 수익을 창출하는 전문가</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 핵심 가치 제안 */}
      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-4">
            <span className="text-cyan-400">경쟁사는 흉내조차 낼 수 없습니다.</span>
            <br />왜 '마비즈'여야 하는가?
          </h2>
          <p className="text-lg text-center text-gray-300 mb-12">
            우리는 당신이 '진짜 전문가'가 될 수 있도록<br />
            업계 유일의 독점적인 기술을 지원합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-white mb-2">AI 세일즈 챗봇 '지니'</h3>
              <p className="text-gray-400">24시간 고객을 응대하는 AI 챗봇이 당신의 영업사원이 되어 수익을 극대화합니다.</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <div className="text-4xl mb-4">🛍️</div>
              <h3 className="text-xl font-bold text-white mb-2">개인 판매몰 시스템</h3>
              <p className="text-gray-400">즉시 판매가 가능한 나만의 크루즈 쇼핑몰을 제공합니다.</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-white mb-2">상위 1% 마케팅 교육</h3>
              <p className="text-gray-400">고객을 끌어당기는 검증된 마케팅 비법을 전수합니다.</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-white mb-2">상위 1% 세일즈 전문 교육</h3>
              <p className="text-gray-400">팔지 않아도 팔리는 압도적인 세일즈 전략을 배웁니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 성장 과정 */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-8">
            <span className="text-cyan-400">체계적인 성장 과정</span>입니다.
          </h2>
          <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="bg-cyan-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg">1주</div>
                <p className="font-bold text-white mt-3">크루즈 전문 교육과정</p>
              </div>
              <div>
                <div className="bg-cyan-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg">2주</div>
                <p className="font-bold text-white mt-3">크루즈 전문 인솔과정</p>
              </div>
              <div>
                <div className="bg-cyan-700 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg">3주</div>
                <p className="font-bold text-white mt-3">퍼포먼스 마케팅 과정</p>
              </div>
              <div>
                <div className="bg-cyan-800 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg">4주</div>
                <p className="font-bold text-white mt-3">95.7% 수익 창출 성공</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 두 번째 신청 폼 (중간) */}
      <section className="py-20 bg-black">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-4 text-white">
            지금 바로 시작하세요!
          </h2>
          <p className="text-center text-gray-300 mb-8">
            7일 무료 체험으로 크루즈 마케터의 모든 것을 경험해보세요.
          </p>

          <div className="bg-gray-900 p-6 md:p-8 rounded-2xl shadow-2xl border border-cyan-500/50">
            <form onSubmit={(e) => handleSubmit(e, 'middle')} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                required
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-4 text-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                disabled={loading}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9-]/g, '');
                  setPhone(value);
                }}
                placeholder="휴대폰번호 입력"
                required
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-4 text-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                disabled={loading}
              />
              
              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xl py-5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <>
                    <span>7일 무료 체험 시작하기</span>
                    <FiArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 6. 최종 CTA 섹션 */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            크루즈 마케터 7일 무료 체험
          </h2>
          <p className="text-lg text-gray-200 mb-8 leading-relaxed">
            이름과 연락처를 입력하시면 <strong className="text-cyan-400">7일 무료 마케터 체험</strong>을 할 수 있어요.
            <br />신청 즉시 서비스 이용이 가능합니다.
          </p>

          <div className="bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl border border-cyan-500/50">
            <div className="text-left mb-6 border-b border-gray-700 pb-6">
              <h3 className="text-xl font-bold text-center text-white mb-4">
                신청 즉시 <span className="text-yellow-400">100% 무료 제공</span> 혜택
              </h3>
              <ul className="space-y-3 text-gray-300 text-lg">
                <li className="flex items-start">
                  <FiCheck className="text-cyan-400 mr-2 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-white">7일 무료 체험</span> - 모든 기능을 자유롭게 사용
                  </div>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-cyan-400 mr-2 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-white">AI 챗봇 '지니'</span> - 24시간 고객 응대 지원
                  </div>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-cyan-400 mr-2 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-white">개인 판매몰</span> - 즉시 판매 시작 가능
                  </div>
                </li>
              </ul>
            </div>

            <form onSubmit={(e) => handleSubmit(e, 'final')} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                required
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-4 text-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                disabled={loading}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9-]/g, '');
                  setPhone(value);
                }}
                placeholder="휴대폰번호 입력"
                required
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-4 text-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                disabled={loading}
              />
              
              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xl py-5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <>
                    <span>7일 무료 체험 시작하기</span>
                    <FiArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8">
              <h4 className="text-sm text-gray-400 mb-2 font-bold">신뢰할 수 있는 정식 교육기관</h4>
              <p className="text-xs text-gray-500">
                (주)마비즈컴퍼니 마비즈스쿨 원격평생교육원
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-8 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>(주)마비즈컴퍼니 마비즈스쿨 원격평생교육원</p>
          <p>대표: 전혜선</p>
          <p className="mt-4">© 2025 MABIZ COMPANY. All Rights Reserved.</p>
        </div>
      </footer>

      {/* Exit Intent Modal */}
      {showExitIntent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center z-50 p-4"
          onClick={() => setShowExitIntent(false)}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-md w-full text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowExitIntent(false)}
              className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-400"
            >
              <FiX />
            </button>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">
              잠깐! 크루즈 마케터의<br />기회를 놓치시겠습니까?
            </h2>
            <p className="text-white mb-6">
              페이지를 나가시면 <strong className="text-cyan-400">7일 무료 체험</strong> 기회가 영구히 사라집니다.
            </p>
            <button
              onClick={() => {
                setShowExitIntent(false);
                document.getElementById('final-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xl py-4 rounded-full shadow-lg hover:from-cyan-600 hover:to-blue-700 transition-all"
            >
              무료 체험 기회 잡기
            </button>
          </div>
        </div>
      )}

      {/* Sticky CTA Banner */}
      <div 
        className="fixed bottom-0 left-0 w-full bg-gradient-to-r from-blue-900 to-cyan-600 text-white py-4 px-4 z-40 cursor-pointer hover:from-blue-800 hover:to-cyan-700 transition-all shadow-lg"
        onClick={() => document.getElementById('final-form')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <div className="max-w-4xl mx-auto text-center">
          <span className="font-bold text-lg">
            ☞ 7일 무료 마케터 체험, 지금 바로 신청하세요!
          </span>
        </div>
      </div>
    </div>
  );
}
