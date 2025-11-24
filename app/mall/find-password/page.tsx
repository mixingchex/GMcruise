// app/mall/find-password/page.tsx
// 크루즈몰 비밀번호 찾기 페이지

'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function FindPasswordPageContent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [step, setStep] = useState<'find-id' | 'enter-email' | 'success'>('find-id');
  const [foundUserId, setFoundUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [foundPassword, setFoundPassword] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  // 이름과 연락처로 아이디 찾기
  const handleFindUserId = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('이름과 연락처를 모두 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/find-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          step: 'find-id'
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[FIND PASSWORD] JSON 파싱 오류:', parseError);
        setError('서버 응답을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        setLoading(false);
        return;
      }

      if (!response.ok || !data.ok) {
        const errorMessage = data.error || '입력하신 정보와 일치하는 회원을 찾을 수 없습니다.';
        console.error('[FIND PASSWORD] API 오류:', {
          status: response.status,
          error: errorMessage,
          data
        });
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // 아이디 찾기 성공
      setFoundUserId(data.userId || '');
      setStep('enter-email');
      setLoading(false);
    } catch (err) {
      console.error('[FIND PASSWORD] 예상치 못한 오류:', err);
      const errorMessage = err instanceof Error 
        ? `아이디 찾기 중 오류가 발생했습니다: ${err.message}`
        : '아이디 찾기 중 오류가 발생했습니다. 네트워크 연결을 확인하고 잠시 후 다시 시도해주세요.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  // 이메일로 비밀번호 전송
  const handleSendPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/find-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          step: 'send-password'
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[FIND PASSWORD] JSON 파싱 오류:', parseError);
        setError('서버 응답을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        setLoading(false);
        return;
      }

      if (!response.ok || !data.ok) {
        const errorMessage = data.error || '비밀번호 전송에 실패했습니다.';
        console.error('[FIND PASSWORD] API 오류:', {
          status: response.status,
          error: errorMessage,
          data
        });
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // 비밀번호 전송 성공
      setStep('success');
      setLoading(false);
    } catch (err) {
      console.error('[FIND PASSWORD] 예상치 못한 오류:', err);
      const errorMessage = err instanceof Error 
        ? `비밀번호 전송 중 오류가 발생했습니다: ${err.message}`
        : '비밀번호 전송 중 오류가 발생했습니다. 네트워크 연결을 확인하고 잠시 후 다시 시도해주세요.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 text-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8 space-y-5">
          <Link href="/">
            <img src="/images/ai-cruise-logo.png" alt="크루즈닷" className="mx-auto h-12 cursor-pointer" />
          </Link>
          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-gray-900">비밀번호 찾기</h1>
          <p className="text-base md:text-lg text-gray-700 flex items-center justify-center gap-2">
            <span>이름과 연락처로 비밀번호를 찾을 수 있습니다</span>
          </p>
        </div>

        {step === 'success' ? (
          <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-blue-100 p-8 md:p-10 space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">비밀번호가 전송되었습니다</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <p className="text-sm text-gray-600 mb-2">입력하신 이메일로</p>
                <p className="text-lg font-semibold text-blue-600 break-all">{formData.email}</p>
                <p className="text-sm text-gray-600 mt-2">비밀번호를 전송했습니다.</p>
                <p className="text-xs text-gray-500 mt-4">이메일을 확인해주세요.</p>
              </div>
              <div className="space-y-3">
                <Link
                  href="/mall/login"
                  className="block w-full rounded-xl bg-blue-600 text-white font-bold text-lg py-3.5 shadow-md hover:bg-blue-700 transition-colors"
                >
                  로그인하기
                </Link>
                <Link
                  href="/"
                  className="block w-full rounded-xl bg-gray-400 text-white font-semibold text-lg py-3.5 shadow-md hover:bg-gray-500 transition-colors"
                >
                  크루즈몰 메인으로 돌아가기
                </Link>
              </div>
            </div>
          </div>
        ) : step === 'enter-email' ? (
          <form onSubmit={handleSendPassword} className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-blue-100 p-8 md:p-10 space-y-6" autoComplete="off">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">회원님의 아이디</p>
              <p className="text-xl font-bold text-blue-600">{foundUserId}</p>
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="이메일을 입력해주세요"
                autoComplete="email"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
              <p className="text-xs text-gray-500 mt-2">입력하신 이메일로 비밀번호를 전송합니다.</p>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 text-white font-bold text-lg py-3.5 shadow-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? '전송 중...' : '비밀번호 전송하기'}
              </button>
              <button
                type="button"
                onClick={() => setStep('find-id')}
                className="w-full rounded-xl bg-gray-400 text-white font-semibold text-lg py-3.5 shadow-md hover:bg-gray-500 transition-colors"
              >
                이전으로
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
              <p className="text-sm text-gray-700">
                <strong>비밀번호 찾기가 어려우신가요?</strong>
              </p>
              <p className="text-xs text-gray-600 mt-2">
                본사로 문의해주시면 비밀번호를 확인하거나 변경해드립니다.
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleFindUserId} className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-blue-100 p-8 md:p-10 space-y-6" autoComplete="off">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 이름 */}
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="이름을 입력해주세요"
                autoComplete="name"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="010-1234-5678"
                autoComplete="tel"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 text-white font-bold text-lg py-3.5 shadow-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '찾는 중...' : '아이디 찾기'}
            </button>
          </form>
        )}

        <div className="text-center text-base mt-8 text-gray-700 space-y-3">
          <div>
            <Link
              href="/mall/login"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow"
            >
              로그인으로 돌아가기
            </Link>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors shadow"
            >
              크루즈몰 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FindPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩 중...</div>}>
      <FindPasswordPageContent />
    </Suspense>
  );
}

