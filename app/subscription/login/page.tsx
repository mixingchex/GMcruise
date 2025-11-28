'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiPhone, FiArrowRight, FiCheck, FiX } from 'react-icons/fi';
import Image from 'next/image';

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
  useEffect(() => {
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
            <span className="text-yellow-400">"비교불가 차원이 다른 압도적인 시스템"</span>
            <span className="block text-2xl md:text-3xl font-bold mt-4 text-gray-200">
              고객을 '인솔'하고 '관리'하는<br />
              크루즈 마케터 전문가 과정
            </span>
          </h1>

          {/* GIF 이미지 */}
          <div className="mt-8 mb-8">
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-09-12/77e030891f0e61cdcb9d7d749405b536_1757613270_0684.gif" 
              alt="크루즈 전문가 과정 소개" 
              className="w-full max-w-4xl mx-auto rounded-lg shadow-2xl"
              loading="lazy"
            />
          </div>

          <div className="py-10 md:py-16">
            <h2 className="text-3xl md:text-5xl font-black text-white">단순 여행이 아닙니다.</h2>
            <p className="text-xl md:text-2xl font-bold text-cyan-400 mt-3">
              '여행하며 수익을 창출하는' 전문 커리어입니다.
            </p>
          </div>

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

          {/* 7일 무료 체험 혜택 안내 */}
          <div className="bg-gray-900 max-w-2xl mx-auto p-6 md:p-8 rounded-2xl shadow-2xl border border-cyan-500/50 mt-12">
            <h3 className="text-2xl md:text-3xl font-black text-center text-white mb-3">
              <span className="text-yellow-400">7일 무료 마케터 체험</span>
            </h3>
            <p className="text-center text-lg text-cyan-400 font-bold mb-6">
              지금 바로 시작하고, 크루즈 마케터 시스템을 직접 경험하세요!
            </p>

            {/* 혜택 목록 */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                7일 동안 무료로 받는 혜택
              </h4>
              <ul className="space-y-3 text-gray-200">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">AI 세일즈 챗봇 '지니'</strong> - 24시간 고객 응대 지원
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">개인 판매몰 시스템</strong> - 즉시 판매 시작 가능
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">실시간 고객 관리</strong> - DB 관리 및 상담 기록
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">마케팅 자료 지원</strong> - 랜딩페이지 및 링크 생성
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">판매 수익 관리</strong> - 실시간 매출 및 정산 확인
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-orange-900/30 border border-orange-500/50 rounded-xl p-4 mb-6">
              <p className="text-center text-white font-bold text-base">
                ⏰ 이름과 연락처만 입력하면<br/>
                <span className="text-yellow-400 text-lg">입력한 시점부터 7일간 무료</span>로 모든 기능을 사용할 수 있습니다!
              </p>
            </div>
            
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
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-06-26/b941a75d82cb776b1c7905af131243fa_1750946396_3068.png" 
                alt="과거 연구원 시절" 
                className="w-full rounded-lg shadow-xl"
                loading="lazy"
              />
              <p className="font-bold text-lg mt-4">BEFORE</p>
              <p className="text-gray-400">반복되는 일상, 정해진 월급</p>
            </div>
            <div className="text-center">
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-06-26/b941a75d82cb776b1c7905af131243fa_1750946396_2474.png" 
                alt="크루즈 스탭 활동" 
                className="w-full rounded-lg shadow-xl border-2 border-yellow-400"
                loading="lazy"
              />
              <p className="font-bold text-lg mt-4 text-yellow-400">AFTER</p>
              <p className="text-gray-200">여행하며 수익을 창출하는 전문가</p>
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

          {/* AI 챗봇 영상 */}
          <h3 className="text-2xl font-bold text-white text-center mb-4">
            1. 고객이 엄지척 하는 <span className="text-yellow-400">AI 세일즈 챗봇</span> '지니'
          </h3>
          <div className="mb-12 rounded-lg overflow-hidden shadow-2xl max-w-4xl mx-auto" style={{ paddingBottom: '56.25%', position: 'relative', height: 0, background: '#000' }}>
            <iframe
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              src="https://www.youtube.com/embed/-p_6G69MgyQ?autoplay=1&mute=1&loop=1&playlist=-p_6G69MgyQ&modestbranding=1&iv_load_policy=3&controls=0"
              title="크루즈 AI 가이드 시스템"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-white text-center mb-4">
                2. <span className="text-yellow-400">대기업·중견기업</span> 협력
              </h3>
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763276384_7279.jpg" 
                alt="대기업 중견기업 협력" 
                className="w-full rounded-lg shadow-xl"
                loading="lazy"
              />
              <p className="text-center text-gray-300 mt-4">
                신뢰할 수 있는 국내 유수 기업들과의 제휴로 스탭 활동의 격을 높입니다.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white text-center mb-4">
                3. <span className="text-yellow-400">AI 세일즈 챗봇</span> 지원
              </h3>
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763271257_8093.png" 
                alt="크루즈 가이드 지니 세일즈 챗봇" 
                className="w-full rounded-lg shadow-xl"
                loading="lazy"
              />
              <p className="text-center text-gray-300 mt-4">
                24시간 고객을 응대하는 AI 챗봇이 당신의 영업사원이 되어 수익을 극대화합니다.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white text-center mb-4">
                4. <span className="text-yellow-400">라이브 방송</span> 지원
              </h3>
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275311_9215.png" 
                alt="크루즈 라이브 방송 카톡방 지원" 
                className="w-full rounded-lg shadow-xl"
                loading="lazy"
              />
              <p className="text-center text-gray-300 mt-4">
                고객과 실시간 소통하는 라이브 방송 및 카톡방 운영을 지원합니다.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white text-center mb-4">
                5. <span className="text-yellow-400">라이브 쇼핑</span> 지원
              </h3>
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275430_2282.gif" 
                alt="크루즈 라이브 쇼핑 방송 지원" 
                className="w-full rounded-lg shadow-xl"
                loading="lazy"
              />
              <p className="text-center text-gray-300 mt-4">
                높은 전환율을 만드는 라이브 쇼핑 방송 시스템을 지원합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 8가지 핵심 기능 */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-4">
            당신은 '교육'과 '고객'에만 집중하세요.<br />
            <span className="text-cyan-400">나머지는 본사가 모두 지원합니다.</span>
          </h2>
          <p className="text-lg text-center text-gray-300 mb-12">
            단순히 강의만 파는 곳과 비교를 거부합니다.<br />
            이것이 마비즈 수강생 95.7%가 수익을 내는 이유입니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
              <span className="text-3xl mr-4">🤖</span>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">판매원 챗봇 AI (지니) 지원</h3>
                <p className="text-sm text-gray-400">24시간 나를 대신해 고객을 응대하는 AI 비서</p>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
              <span className="text-3xl mr-4">🛍️</span>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">개인 판매원 몰 시스템 지원</h3>
                <p className="text-sm text-gray-400">즉시 판매가 가능한 나만의 크루즈 쇼핑몰</p>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
              <span className="text-3xl mr-4">💻</span>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">100% 온라인 원격 교육</h3>
                <p className="text-sm text-gray-400">언제 어디서든 학습 가능한 평생교육원 시스템</p>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
              <span className="text-3xl mr-4">🤝</span>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">1:1 멘토링 지원</h3>
                <p className="text-sm text-gray-400">성공한 선배가 직접 이끄는 전담 멘토 시스템</p>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
              <span className="text-3xl mr-4">🏢</span>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">대기업·중견기업 연합</h3>
                <p className="text-sm text-gray-400">신뢰할 수 있는 파트너사들과의 강력한 협력</p>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
              <span className="text-3xl mr-4">🛳️</span>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">100% 실무 교육 지원</h3>
                <p className="text-sm text-gray-400">크루즈 탑승, 기항지 투어, 고객 인솔 실무</p>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
              <span className="text-3xl mr-4">📈</span>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">상위 1% 마케팅 교육</h3>
                <p className="text-sm text-gray-400">고객을 끌어당기는 검증된 마케팅 비법</p>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
              <span className="text-3xl mr-4">💰</span>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">상위 1% 세일즈 전문 교육</h3>
                <p className="text-sm text-gray-400">팔지 않아도 팔리는 압도적인 세일즈 전략</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 성장 과정 */}
      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-8">
            <span className="text-cyan-400">체계적인 성장 과정</span>입니다.
          </h2>
          <div className="bg-gray-900 p-8 rounded-2xl border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="bg-cyan-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg border-4 border-gray-900">1단계</div>
                <p className="font-bold text-white mt-3">1주</p>
                <p className="text-sm text-gray-400 leading-tight mt-1">크루즈 전문 교육과정</p>
              </div>
              <div>
                <div className="bg-cyan-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg border-4 border-gray-900">2단계</div>
                <p className="font-bold text-white mt-3">2주</p>
                <p className="text-sm text-gray-400 leading-tight mt-1">크루즈 전문 인솔과정</p>
              </div>
              <div>
                <div className="bg-cyan-700 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg border-4 border-gray-900">3단계</div>
                <p className="font-bold text-white mt-3">3주</p>
                <p className="text-sm text-gray-400 leading-tight mt-1">퍼포먼스 마케팅 과정</p>
              </div>
              <div>
                <div className="bg-cyan-800 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg border-4 border-gray-900">4단계</div>
                <p className="font-bold text-white mt-3">4주</p>
                <p className="text-sm text-gray-400 leading-tight mt-1">95.7% 여행사 프리랜서 계약</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. 수강생 후기 */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-8 text-white">
            꾸며낸 후기가 아닌, <span className="text-cyan-400">진짜 수강생들의 목소리</span>입니다.
          </h3>
          <p className="text-center text-gray-400 mb-8">(수강생들의 동의 하에 공개합니다.)</p>

          <div className="grid grid-cols-2 gap-4">
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-06-26/b941a75d82cb776b1c7905af131243fa_1750943544_0562.png" 
              alt="수강생 후기 카톡 1" 
              className="w-full rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754193750_2256.png" 
              alt="고객 문자 후기" 
              className="w-full rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-06-26/b941a75d82cb776b1c7905af131243fa_1750943544_5234.png" 
              alt="수강생 후기 카톡 2" 
              className="w-full rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-06-26/b941a75d82cb776b1c7905af131243fa_1750943495_2443.png" 
              alt="특강 후기" 
              className="w-full rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754194677_3697.png" 
              alt="수강생 크루즈 결제 후기" 
              className="w-full rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754194677_4423.png" 
              alt="수강생 결제 후기" 
              className="w-full rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* 7. 실무 현장 사진 */}
      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12 text-white">
            이론이 아닙니다. <span className="text-cyan-400">100% 실무 현장</span>입니다.
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275229_9164.jpg" 
              alt="크루즈 터미널 인솔" 
              className="w-full rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275230_1588.jpg" 
              alt="기항지 투어 인솔" 
              className="w-full rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275230_6515.jpg" 
              alt="크루즈 쉽투어" 
              className="w-full rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275231_6474.jpg" 
              alt="크루즈 스탭 고객 안내" 
              className="w-full rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform"
              loading="lazy"
            />
          </div>

          {/* 중간 신청 폼 */}
          <div className="text-center mt-12">
            <div className="bg-gray-900 max-w-2xl mx-auto p-6 md:p-8 rounded-2xl shadow-2xl border border-cyan-500/50">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-4 text-white">
                지금 바로 시작하세요!
              </h2>
              <p className="text-center text-gray-300 mb-8">
                7일 무료 체험으로 크루즈 마케터의 모든 것을 경험해보세요.
              </p>

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
        </div>
      </section>

      {/* 8. 멘토 소개 */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-4">
            당신을 성공으로 이끌 <span className="text-yellow-400">1:1 전담 멘토</span>
          </h2>
          <p className="text-lg text-center text-gray-300 mb-12">
            이미 성공의 길을 걷고 있는 전문가 멘토 군단이<br />
            당신의 첫 수익이 날 때까지 멱살 잡고 끌고 갑니다.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="text-center">
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754199867_3063.png" 
                alt="모니카 대표" 
                className="w-40 h-40 object-cover rounded-full mx-auto border-4 border-cyan-500"
                loading="lazy"
              />
              <h3 className="font-bold text-white text-xl mt-4">모니카 대표</h3>
              <p className="text-sm text-cyan-400">총괄 디렉터</p>
            </div>
            <div className="text-center">
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754199901_6284.jpg" 
                alt="로즈 코치" 
                className="w-40 h-40 object-cover rounded-full mx-auto border-4 border-gray-600"
                loading="lazy"
              />
              <h3 className="font-bold text-white text-xl mt-4">로즈 코치</h3>
              <p className="text-sm text-gray-400">전문 멘토</p>
            </div>
            <div className="text-center">
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754199918_2226.jpg" 
                alt="페르 코치" 
                className="w-40 h-40 object-cover rounded-full mx-auto border-4 border-gray-600"
                loading="lazy"
              />
              <h3 className="font-bold text-white text-xl mt-4">페르 코치</h3>
              <p className="text-sm text-gray-400">전문 멘토</p>
            </div>
            <div className="text-center">
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754199981_5468.jpg" 
                alt="해리 점장" 
                className="w-40 h-40 object-cover rounded-full mx-auto border-4 border-gray-600"
                loading="lazy"
              />
              <h3 className="font-bold text-white text-xl mt-4">해리 점장</h3>
              <p className="text-sm text-gray-400">전문 멘토</p>
            </div>
            <div className="text-center">
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754199959_7439.jpg" 
                alt="맥스 코치" 
                className="w-40 h-40 object-cover rounded-full mx-auto border-4 border-gray-600"
                loading="lazy"
              />
              <h3 className="font-bold text-white text-xl mt-4">맥스 코치</h3>
              <p className="text-sm text-gray-400">전문 멘토</p>
            </div>
            <div className="text-center">
              <img 
                src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754199959_7938.jpg" 
                alt="저스틴 코치" 
                className="w-40 h-40 object-cover rounded-full mx-auto border-4 border-gray-600"
                loading="lazy"
              />
              <h3 className="font-bold text-white text-xl mt-4">저스틴 코치</h3>
              <p className="text-sm text-gray-400">전문 멘토</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. 수익 인증 */}
      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">
            우리는 그럴듯한 말로 포장하지 않습니다.<br />
            <span className="text-cyan-400">수강생들의 실제 수익 데이터로 증명합니다.</span>
          </h2>
          <div className="text-lg text-gray-200 my-12 max-w-3xl mx-auto leading-relaxed">
            <img 
              src="https://leadgeny.kr/data/file/smarteditor2/2025-08-27/35678ffef7bca30be7b0a09219c12215_1756225523_6478.gif" 
              alt="수강생 수익 인증" 
              className="w-full rounded-lg shadow-2xl"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* 10. 최종 CTA 섹션 */}
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
              <h3 className="text-xl md:text-2xl font-black text-center text-white mb-4">
                신청 즉시 <span className="text-yellow-400">100% 무료 제공</span> 혜택
              </h3>
              <ul className="space-y-3 text-gray-200 text-base md:text-lg">
                <li className="flex items-start">
                  <FiCheck className="text-cyan-400 mr-2 mt-1 flex-shrink-0 text-xl" />
                  <div>
                    <span className="font-bold text-white">7일 무료 체험</span> - 입력한 시점부터 7일간 모든 기능 사용
                  </div>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-cyan-400 mr-2 mt-1 flex-shrink-0 text-xl" />
                  <div>
                    <span className="font-bold text-white">AI 챗봇 '지니'</span> - 24시간 자동 고객 응대 지원
                  </div>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-cyan-400 mr-2 mt-1 flex-shrink-0 text-xl" />
                  <div>
                    <span className="font-bold text-white">개인 판매몰 시스템</span> - 나만의 크루즈 쇼핑몰로 즉시 판매
                  </div>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-cyan-400 mr-2 mt-1 flex-shrink-0 text-xl" />
                  <div>
                    <span className="font-bold text-white">실시간 DB 관리</span> - 고객 정보 및 상담 기록 자동 관리
                  </div>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-cyan-400 mr-2 mt-1 flex-shrink-0 text-xl" />
                  <div>
                    <span className="font-bold text-white">마케팅 자료</span> - 랜딩페이지, 링크 생성 무제한
                  </div>
                </li>
              </ul>
              <div className="mt-6 bg-orange-900/30 border border-orange-500/50 rounded-lg p-3">
                <p className="text-center text-white text-sm font-bold">
                  💡 신청 후 <span className="text-yellow-400">7일 카운트다운</span>이 시작되며,<br className="md:hidden"/>
                  대시보드에서 실시간으로 남은 시간을 확인할 수 있습니다!
                </p>
              </div>
            </div>

            <form id="final-form" onSubmit={(e) => handleSubmit(e, 'final')} className="space-y-4">
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
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-sm space-y-1">
          <p>(주)마비즈컴퍼니 마비즈스쿨 원격평생교육원</p>
          <p>대표: 전혜선</p>
          <p>사업자등록번호: 4-57-00419 | 교육청신고: 제2025-1호</p>
          <p>주소: 서울특별시 마포구 월드컵로 196</p>
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
