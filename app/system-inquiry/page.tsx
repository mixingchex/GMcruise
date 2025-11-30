// app/system-inquiry/page.tsx
// 크루즈 비즈니스 시스템 상담 안내 페이지

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiCheck, FiArrowLeft, FiPhone, FiUser, FiMessageSquare, FiSend } from 'react-icons/fi';

export default function SystemInquiryPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/system-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, message }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || '문의 접수에 실패했습니다.');
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 접수 완료 화면
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheck className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            상담 문의 접수 완료
          </h1>
          <p className="text-gray-600 mb-6 text-lg">
            1:1 시스템 상담 안내를 위해<br />
            <span className="font-bold text-blue-600">담당자가 곧 연락드리겠습니다.</span>
          </p>
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800">
              📞 평일 09:00 ~ 18:00 내 연락드립니다.<br />
              빠른 상담을 원하시면 카카오톡 채널로 문의해주세요.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
          >
            <FiArrowLeft />
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* 상단 네비게이션 */}
      <div className="bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <FiArrowLeft />
            <span>메인으로</span>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* 왼쪽: 안내 내용 */}
          <div className="text-white">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              크루즈 비즈니스<br />
              <span className="text-cyan-400">시스템 상담 안내</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8">
              크루즈닷 AI 지니 시스템을 활용한<br />
              크루즈 마케팅 비즈니스에 관심이 있으신가요?
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🤖</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">AI 지니 판매 시스템</h3>
                  <p className="text-white/70 text-sm">나만의 판매몰과 AI 챗봇으로 고객 응대 자동화</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">고객 관리 시스템</h3>
                  <p className="text-white/70 text-sm">체계적인 고객 DB 관리와 마케팅 도구 제공</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">💰</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">수익 창출 기회</h3>
                  <p className="text-white/70 text-sm">크루즈 상품 판매를 통한 안정적인 수익 구조</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🎓</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">전문 교육 지원</h3>
                  <p className="text-white/70 text-sm">1:1 멘토링과 체계적인 마케팅 교육 제공</p>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 문의 폼 */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FiMessageSquare className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                1:1 시스템 상담 신청
              </h2>
              <p className="text-gray-600">
                아래 정보를 입력하시면<br />담당자가 연락드립니다
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 이름 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FiUser className="text-blue-600" />
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg"
                  placeholder="홍길동"
                />
              </div>

              {/* 연락처 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FiPhone className="text-blue-600" />
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg"
                  placeholder="010-1234-5678"
                />
              </div>

              {/* 문의 내용 (선택) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FiMessageSquare className="text-blue-600" />
                  문의 내용 <span className="text-gray-400 font-normal">(선택)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  placeholder="궁금하신 내용이 있으시면 적어주세요"
                />
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    접수 중...
                  </>
                ) : (
                  <>
                    <FiSend />
                    상담 신청하기
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>제출하신 정보는 상담 목적으로만 사용됩니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


