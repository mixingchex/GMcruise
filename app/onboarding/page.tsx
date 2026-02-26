'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiAnchor, FiCalendar, FiCheckCircle } from 'react-icons/fi';

interface UserInfo {
  name: string | null;
}

interface TripInfo {
  cruiseLine: string;
  shipName: string;
  startDate: string;
}

type OnboardingStep = 'loading' | 'step1' | 'step2' | 'done';

function calcDday(startDateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const diffDays = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'D-Day';
  if (diffDays > 0) return `D-${diffDays}`;
  return `D+${Math.abs(diffDays)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('loading');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [hasTrip, setHasTrip] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('onboardingDone') === 'true') {
        router.replace('/my-trips');
        return;
      }
    } catch { /* localStorage 접근 불가 무시 */ }
    initOnboarding();
  }, [router]);

  const initOnboarding = async () => {
    try {
      const [meRes, tripRes] = await Promise.all([
        fetch('/api/auth/me', { credentials: 'include' }),
        fetch('/api/trips/active', { credentials: 'include' }),
      ]);

      if (meRes.status === 401) { router.replace('/login'); return; }

      const meData = await meRes.json();
      if (!meData.ok || !meData.user) { router.replace('/login'); return; }

      setUserInfo({ name: meData.user.name });

      if (tripRes.ok) {
        const tripData = await tripRes.json();
        if (tripData.data) {
          setHasTrip(true);
          setTripInfo({
            cruiseLine: tripData.data.CruiseProduct?.cruiseLine ?? '',
            shipName: tripData.data.CruiseProduct?.shipName ?? '',
            startDate: tripData.data.startDate,
          });
        }
      }

      setStep('step1');
    } catch {
      router.replace('/login');
    }
  };

  const handleDone = () => {
    try { localStorage.setItem('onboardingDone', 'true'); } catch { /* 무시 */ }
    router.replace('/my-trips');
  };

  if (step === 'loading' || step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-base">잠시만 기다려주세요...</p>
        </div>
      </div>
    );
  }

  if (step === 'step1') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-6">
            <FiAnchor size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
            크루즈가이드AI에<br />오신 것을 환영합니다!
          </h1>
          {userInfo?.name && (
            <p className="text-blue-600 font-semibold text-lg mt-3 mb-2">{userInfo.name}님</p>
          )}
          <p className="text-gray-500 text-sm mt-2 mb-8 leading-relaxed">
            크루즈 여행을 더 스마트하게 즐길 수 있도록<br />도와드리겠습니다.
          </p>
          <button
            onClick={() => setStep('step2')}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-base"
          >
            시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-6">
          <FiCheckCircle size={32} className="text-green-600" />
        </div>

        {hasTrip && tripInfo ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">여행 일정이 등록되었습니다</h2>
            <div className="mt-5 mb-4 bg-blue-50 rounded-xl p-4 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiAnchor size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">크루즈</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {tripInfo.cruiseLine}{tripInfo.shipName ? ` ${tripInfo.shipName}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiCalendar size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">출발 예정일</p>
                  <p className="font-semibold text-gray-900 text-sm">{formatDate(tripInfo.startDate)}</p>
                </div>
              </div>
            </div>
            <div className="inline-block bg-blue-600 text-white font-bold text-2xl px-6 py-2 rounded-full mb-6">
              {calcDday(tripInfo.startDate)}
            </div>
            <p className="text-gray-500 text-sm mb-6">출발일이 가까워지면 더 많은 기능을 사용하실 수 있습니다.</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">여행을 준비 중입니다</h2>
            <p className="text-gray-500 text-sm mt-3 mb-6 leading-relaxed">
              아직 등록된 여행 일정이 없습니다.<br />관리자가 여행을 배정하면 자동으로 표시됩니다.
            </p>
          </>
        )}

        <button
          onClick={handleDone}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-base"
        >
          확인
        </button>
      </div>
    </div>
  );
}
