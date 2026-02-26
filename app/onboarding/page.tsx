'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiAnchor, FiCalendar, FiMapPin, FiMessageCircle } from 'react-icons/fi';

interface TripInfo {
  cruiseLine: string;
  shipName: string;
  startDate: string | null;
}

interface PortInfo {
  location: string | null;
  country: string | null;
  language: { code: string; name: string; flag: string } | null;
}

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
  const [userName, setUserName] = useState<string | null>(null);
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [portInfo, setPortInfo] = useState<PortInfo | null>(null);
  const [hasTrip, setHasTrip] = useState(false);
  const [isCruising, setIsCruising] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    initOnboarding();
  }, []);

  const initOnboarding = async () => {
    try {
      const [meRes, tripRes, portRes] = await Promise.all([
        fetch('/api/auth/me', { credentials: 'include' }),
        fetch('/api/trips/active', { credentials: 'include' }),
        fetch('/api/itinerary/current', { credentials: 'include' }),
      ]);

      if (meRes.status === 401) { router.replace('/login'); return; }

      const meData = await meRes.json();
      if (!meData.ok || !meData.user) { router.replace('/login'); return; }

      // 이미 온보딩 완료된 유저는 채팅으로
      if (meData.user.onboarded) { router.replace('/chat'); return; }

      // 온보딩 상태 자동 저장 (구매자는 자동으로 온보딩 완료 처리)
      fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      }).catch(() => { /* 무시 */ });

      setUserName(meData.user.name);

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

      if (portRes.ok) {
        const portData = await portRes.json();
        if (portData.ok && portData.hasTrip && !portData.isCruising && portData.currentPort) {
          setPortInfo({
            location: portData.currentPort.location,
            country: portData.currentPort.country,
            language: portData.currentPort.language,
          });
        }
        if (portData.isCruising) setIsCruising(true);
      }
    } catch {
      router.replace('/login');
      return;
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    // onboard API가 fire-and-forget으로 실패했을 경우를 대비해 재시도
    try {
      await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
    } catch {
      // 실패해도 채팅으로 이동 (다음 방문 시 재시도)
    }
    router.replace('/chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#051C2C] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FDB931]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#051C2C] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">

        {/* 환영 카드 */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-[#FDB931]/20 rounded-full mx-auto mb-4">
            <FiAnchor size={32} className="text-[#FDB931]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#051C2C] mb-1 leading-tight">
            크루즈가이드AI에<br />오신 것을 환영합니다!
          </h1>
          {userName && (
            <p className="text-[#FDB931] font-bold text-lg mt-2">{userName}님</p>
          )}
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            크루즈 여행의 모든 것을<br />크루즈닷AI 가이드가 함께합니다.
          </p>
        </div>

        {/* 여행 정보 카드 */}
        {hasTrip && tripInfo && (
          <div className="bg-white rounded-2xl shadow-xl p-5">
            <h2 className="font-bold text-[#051C2C] text-base mb-3">📋 등록된 여행 일정</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#051C2C]/10 rounded-lg flex-shrink-0">
                  <FiAnchor size={16} className="text-[#051C2C]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">크루즈</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {tripInfo.cruiseLine}{tripInfo.shipName ? ` ${tripInfo.shipName}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FDB931]/20 rounded-lg flex-shrink-0">
                  <FiCalendar size={16} className="text-[#FDB931]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">출발 예정일</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {tripInfo.startDate ? formatDate(tripInfo.startDate) : '일정 확인 중'}
                  </p>
                </div>
              </div>
            </div>
            {tripInfo.startDate && (
              <div className="mt-4 text-center">
                <span className="inline-block bg-[#051C2C] text-[#FDB931] font-extrabold text-xl px-6 py-2 rounded-full">
                  {calcDday(tripInfo.startDate)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 오늘의 브리핑 */}
        {portInfo?.location && (
          <div className="bg-white rounded-2xl shadow-xl p-5">
            <h2 className="font-bold text-[#051C2C] text-base mb-3">🗺️ 오늘의 브리핑</h2>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <FiMapPin size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">오늘 기항지</p>
                <p className="font-semibold text-gray-900 text-sm">
                  {portInfo.location}{portInfo.country ? ` (${portInfo.country})` : ''}
                </p>
              </div>
            </div>
            {portInfo.language && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
                💬 현지 언어: <span className="font-semibold">{portInfo.language.flag} {portInfo.language.name}</span>
              </p>
            )}
          </div>
        )}

        {isCruising && !portInfo?.location && (
          <div className="bg-white rounded-2xl shadow-xl p-5">
            <h2 className="font-bold text-[#051C2C] text-base mb-2">🌊 오늘의 브리핑</h2>
            <p className="text-sm text-gray-600">오늘은 항해 중입니다. 크루즈닷AI 가이드에게 궁금한 것을 물어보세요!</p>
          </div>
        )}

        <button
          onClick={handleComplete}
          className="w-full bg-[#FDB931] hover:bg-[#FDB931]/90 active:bg-[#FDB931]/80
                     text-[#051C2C] font-extrabold py-4 px-6 rounded-2xl shadow-xl
                     transition-all duration-200 text-lg flex items-center justify-center gap-2"
        >
          <FiMessageCircle size={22} />
          <span>크루즈닷AI 가이드 시작하기</span>
        </button>
      </div>
    </div>
  );
}
