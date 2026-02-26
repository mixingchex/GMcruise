'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiEdit2, FiSave, FiX, FiAnchor, FiCalendar, FiClock, FiMapPin, FiLogOut, FiUser, FiPhone } from 'react-icons/fi';
import { csrfFetch } from '@/lib/csrf-client';

interface UserInfo {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface ActiveTrip {
  id: number;
  cruiseName: string | null;
  startDate: string | null;
  endDate: string | null;
  nights: number | null;
  days: number | null;
  status: string;
  CruiseProduct: { cruiseLine: string; shipName: string } | null;
}

interface CurrentPort {
  location: string | null;
  country: string | null;
  arrival: string | null;
  departure: string | null;
  language: { code: string; name: string; flag: string };
}

interface ItineraryStatus {
  hasTrip: boolean;
  isCruising?: boolean;
  currentPort?: CurrentPort;
}

function calcDday(startDateISO: string): string {
  const start = new Date(startDateISO);
  if (isNaN(start.getTime())) return '';
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((start.getTime() - today.getTime()) / 86_400_000);
  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return 'D-Day';
  return `D+${Math.abs(diffDays)}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function GuideProfilePage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [itineraryStatus, setItineraryStatus] = useState<ItineraryStatus | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchUser = useCallback(async () => {
    setLoadingUser(true);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.ok) { router.push('/login?next=/guide-profile'); return; }
      setUser(data.user);
      setEditName(data.user.name ?? '');
    } catch {
      setFetchError('사용자 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingUser(false);
    }
  }, [router]);

  const fetchActiveTrip = useCallback(async () => {
    setLoadingTrip(true);
    try {
      const [tripRes, itinRes] = await Promise.all([
        fetch('/api/trips/active', { credentials: 'include' }),
        fetch('/api/itinerary/current', { credentials: 'include' }),
      ]);
      if (tripRes.ok) {
        const tripData = await tripRes.json();
        setActiveTrip(tripData.data ?? null);
      }
      if (itinRes.ok) {
        const itinData = await itinRes.json();
        if (itinData.ok) setItineraryStatus({ hasTrip: itinData.hasTrip, isCruising: itinData.isCruising, currentPort: itinData.currentPort });
      }
    } catch { /* 여행 정보 실패는 무시 */ } finally {
      setLoadingTrip(false);
    }
  }, []);

  useEffect(() => { fetchUser(); fetchActiveTrip(); }, [fetchUser, fetchActiveTrip]);

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) { setSaveError('이름을 입력해주세요.'); return; }
    if (trimmed === (user?.name ?? '').trim()) { setIsEditing(false); setSaveError(''); return; }
    setSaving(true); setSaveError('');
    try {
      const res = await csrfFetch('/api/community/my-info/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setSaveError(data.error ?? '저장에 실패했습니다.'); return; }
      setUser((prev) => prev ? { ...prev, name: trimmed } : prev);
      setIsEditing(false);
    } catch {
      setSaveError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    setLoggingOut(true);
    try { await csrfFetch('/api/auth/logout', { method: 'POST' }); } finally { router.push('/login'); }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (fetchError && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{fetchError}</p>
          <button onClick={() => router.push('/login')} className="text-blue-600 underline text-sm">로그인 페이지로 이동</button>
        </div>
      </div>
    );
  }

  const ddayLabel = activeTrip?.startDate ? calcDday(activeTrip.startDate) : null;
  const tripStatusMap: Record<string, { label: string; className: string }> = {
    Upcoming: { label: '예정', className: 'bg-blue-100 text-blue-700' },
    InProgress: { label: '진행 중', className: 'bg-green-100 text-green-700' },
    Completed: { label: '완료', className: 'bg-gray-100 text-gray-600' },
  };
  const tripStatusBadge = activeTrip ? (tripStatusMap[activeTrip.status] ?? { label: activeTrip.status, className: 'bg-gray-100 text-gray-600' }) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md mx-auto px-4 py-8 space-y-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">나의 정보</h1>

        {/* 계정 정보 카드 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">계정 정보</h2>
            {!isEditing && (
              <button onClick={() => { setIsEditing(true); setSaveError(''); }} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <FiEdit2 size={14} />편집
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 bg-blue-50 rounded-lg flex-shrink-0"><FiUser size={16} className="text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">이름</p>
                {isEditing ? (
                  <div className="space-y-2">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setIsEditing(false); setEditName(user?.name ?? ''); setSaveError(''); } }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="이름을 입력하세요" maxLength={30} autoFocus />
                    {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                    <div className="flex gap-2">
                      <button onClick={handleSaveName} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        <FiSave size={13} />{saving ? '저장 중...' : '저장'}
                      </button>
                      <button onClick={() => { setIsEditing(false); setEditName(user?.name ?? ''); setSaveError(''); }} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50">
                        <FiX size={13} />취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name ?? '미입력'}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 bg-blue-50 rounded-lg flex-shrink-0"><FiPhone size={16} className="text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">전화번호</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.phone ?? '미입력'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 내 여행 카드 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">내 여행</h2>
          {loadingTrip ? (
            <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>
          ) : !activeTrip ? (
            <div className="text-center py-8">
              <FiAnchor size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">배정된 여행이 없습니다.</p>
              <p className="text-xs text-gray-300 mt-1">관리자가 여행을 등록하면 이곳에 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">크루즈</p>
                  <p className="text-base font-bold text-gray-900 leading-tight">
                    {activeTrip.CruiseProduct
                      ? `${activeTrip.CruiseProduct.cruiseLine} - ${activeTrip.CruiseProduct.shipName}`
                      : (activeTrip.cruiseName ?? '크루즈 정보 없음')}
                  </p>
                </div>
                {tripStatusBadge && (
                  <span className={`flex-shrink-0 mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${tripStatusBadge.className}`}>{tripStatusBadge.label}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0 mt-0.5"><FiCalendar size={14} className="text-blue-600" /></div>
                  <div>
                    <p className="text-xs text-gray-400">출발일</p>
                    <p className="text-sm font-semibold text-gray-900">{activeTrip.startDate ? formatDate(activeTrip.startDate) : '-'}</p>
                    {ddayLabel && (
                      <span className={`inline-block mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        ddayLabel === 'D-Day' ? 'bg-orange-100 text-orange-600' : ddayLabel.startsWith('D-') ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>{ddayLabel}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-purple-50 rounded-lg flex-shrink-0 mt-0.5"><FiClock size={14} className="text-purple-600" /></div>
                  <div>
                    <p className="text-xs text-gray-400">여행 기간</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {activeTrip.nights != null && activeTrip.days != null ? `${activeTrip.nights}박 ${activeTrip.days}일`
                        : (() => {
                          if (!activeTrip.startDate || !activeTrip.endDate) return '-';
                          const nights = Math.round((new Date(activeTrip.endDate).getTime() - new Date(activeTrip.startDate).getTime()) / 86_400_000);
                          return nights > 0 ? `${nights}박 ${nights + 1}일` : '-';
                        })()}
                    </p>
                  </div>
                </div>
              </div>
              {itineraryStatus?.hasTrip && (
                <div className="mt-1 pt-3 border-t border-gray-100">
                  {itineraryStatus.isCruising ? (
                    <div className="flex items-center gap-2 text-sm text-blue-500">
                      <FiAnchor size={14} className="flex-shrink-0" />
                      <span className="font-medium">현재 항해 중입니다</span>
                    </div>
                  ) : itineraryStatus.currentPort ? (
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-orange-50 rounded-lg flex-shrink-0 mt-0.5"><FiMapPin size={14} className="text-orange-600" /></div>
                      <div>
                        <p className="text-xs text-gray-400">오늘 기항지</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {itineraryStatus.currentPort.location ?? '-'}
                          {itineraryStatus.currentPort.language?.flag && <span className="ml-1.5">{itineraryStatus.currentPort.language.flag}</span>}
                        </p>
                        {itineraryStatus.currentPort.country && <p className="text-xs text-gray-400">{itineraryStatus.currentPort.country}</p>}
                        {(itineraryStatus.currentPort.arrival || itineraryStatus.currentPort.departure) && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {itineraryStatus.currentPort.arrival && `입항 ${itineraryStatus.currentPort.arrival}`}
                            {itineraryStatus.currentPort.arrival && itineraryStatus.currentPort.departure && ' / '}
                            {itineraryStatus.currentPort.departure && `출항 ${itineraryStatus.currentPort.departure}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 앱 설정 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="text-base font-semibold text-gray-700 px-5 pt-5 pb-3">앱 설정</h2>
          <button onClick={handleLogout} disabled={loggingOut}
            className="w-full flex items-center gap-3 px-5 py-4 text-left text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100 disabled:opacity-50">
            <FiLogOut size={18} />
            <span className="text-sm font-medium">{loggingOut ? '로그아웃 중...' : '로그아웃'}</span>
          </button>
        </section>
      </div>
    </div>
  );
}
