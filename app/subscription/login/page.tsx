'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiPhone, FiArrowRight } from 'react-icons/fi';

export default function SubscriptionLoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setError(null);
    
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim().replace(/[^0-9]/g, ''); // 숫자만 추출

    // 유효성 검사
    if (!trimmedName) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (!trimmedPhone || trimmedPhone.length < 10) {
      setError('올바른 연락처를 입력해주세요.');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            정액제 무료 체험
          </h1>
          <p className="text-gray-600">
            7일간 무료로 정액제 기능을 체험해보세요
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이름 입력 */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                이름 *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-900 placeholder-gray-400"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* 연락처 입력 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                연락처 (휴대폰 번호) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiPhone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9-]/g, '');
                    setPhone(value);
                  }}
                  placeholder="010-1234-5678"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-900 placeholder-gray-400"
                  required
                  disabled={loading}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                무료 체험 시작을 위해 이름과 연락처가 필요합니다
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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

          {/* 안내 문구 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              무료 체험 기간 동안 30% 기능을 사용할 수 있습니다.
              <br />
              정액제 구독 시 50% 기능을 사용할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 추가 안내 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <button
              onClick={() => router.push('/partner/login')}
              className="text-yellow-600 hover:text-yellow-700 font-semibold underline"
            >
              파트너 로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

