'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiChevronLeft, FiPlus, FiX, FiBook, FiMapPin, FiCalendar, FiChevronDown } from 'react-icons/fi';
import { csrfFetch } from '@/lib/csrf-client';

interface TravelDiaryEntry {
  id: number;
  userId: string;
  tripId: number | null;
  countryCode: string;
  countryName: string;
  title: string;
  content: string;
  visitDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CurrentPortInfo {
  location: string;
  country: string;
  arrival: string | null;
  departure: string | null;
  language: { code: string; name: string; flag: string };
}

interface WriteFormState {
  title: string;
  content: string;
  visitDate: string;
  countryName: string;
  countryCode: string;
}

function formatVisitDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export default function DiaryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<TravelDiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPort, setCurrentPort] = useState<CurrentPortInfo | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('전체');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<WriteFormState>({
    title: '', content: '', visitDate: getTodayString(), countryName: '', countryCode: '',
  });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialize = async () => {
      const authCheck = await fetch('/api/diary', { credentials: 'include' });
      if (authCheck.status === 401) { router.replace('/login'); return; }
      await Promise.all([loadEntries(), loadCurrentPort()]);
    };
    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isModalOpen && currentPort) {
      // currentPort.country는 ISO 국가 코드 (예: "GR", "JP")
      setForm((prev) => ({
        ...prev,
        countryName: currentPort.location || currentPort.country,
        countryCode: currentPort.country,
      }));
    }
  }, [isModalOpen, currentPort]);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/diary', { credentials: 'include' });
      const data = await res.json();
      if (data.ok && Array.isArray(data.entries)) {
        setEntries(data.entries);
      } else {
        setError('다이어리 목록을 불러오지 못했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentPort = async () => {
    try {
      const res = await fetch('/api/itinerary/current', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && data.hasTrip && !data.isCruising && data.currentPort) {
        setCurrentPort(data.currentPort);
      }
    } catch { /* 선택적 기능, 실패 무시 */ }
  };

  const filteredEntries = selectedCountry === '전체'
    ? entries
    : entries.filter((e) => e.countryName === selectedCountry);

  const countryOptions = Array.from(new Set(entries.map((e) => e.countryName))).sort((a, b) => a.localeCompare(b, 'ko'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = form.title.trim();
    const trimmedContent = form.content.trim();
    const trimmedCountryName = form.countryName.trim();
    if (!trimmedTitle) { setSubmitError('제목을 입력해주세요.'); return; }
    if (!trimmedContent) { setSubmitError('내용을 입력해주세요.'); return; }
    if (!trimmedCountryName) { setSubmitError('국가명을 입력해주세요.'); return; }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const res = await csrfFetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: form.countryCode || 'UN',
          countryName: trimmedCountryName,
          title: trimmedTitle,
          content: trimmedContent,
          visitDate: form.visitDate || getTodayString(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setEntries((prev) => [data.entry, ...prev]);
        closeModal();
      } else {
        setSubmitError(data.message || '저장에 실패했습니다.');
      }
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = () => {
    setForm({ title: '', content: '', visitDate: getTodayString(), countryName: currentPort?.country ?? '', countryCode: '' });
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setSubmitError(null); };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="bg-white/95 backdrop-blur shadow-md border-b-2 border-[#051C2C]/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/chat" className="p-2 hover:bg-[#FDB931]/10 rounded-lg transition-colors border-2 border-[#FDB931]/30" aria-label="뒤로가기">
              <FiChevronLeft className="w-7 h-7 text-[#051C2C]" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FDB931] to-[#E1A21E] rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                  <FiBook className="w-6 h-6 text-[#051C2C]" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-[#051C2C] leading-tight">
                    <span className="text-[#FDB931]">여행</span> 다이어리
                  </h1>
                  <p className="text-sm md:text-base text-gray-500">
                    {currentPort ? `현재 기항지: ${currentPort.location} (${currentPort.country})` : '소중한 여행의 순간을 기록해보세요'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-24">
        <div className="sticky top-0 z-10 bg-[#F5F7FA]/95 backdrop-blur py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full appearance-none bg-white border-2 border-[#051C2C]/10 rounded-xl px-4 py-3 pr-10 text-base font-semibold text-[#051C2C] focus:outline-none focus:border-[#FDB931] transition-colors shadow-sm"
            >
              <option value="전체">전체 기항지</option>
              {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={openModal} className="flex items-center gap-2 bg-gradient-to-r from-[#FDB931] to-[#E1A21E] text-[#051C2C] font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all border-2 border-[#FDB931] active:scale-95 flex-shrink-0">
            <FiPlus className="w-5 h-5" />
            <span className="hidden sm:inline">기록 남기기</span>
          </button>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-[#FDB931] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-base">불러오는 중...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-5 text-center">
            <p className="text-red-600 font-semibold">{error}</p>
            <button onClick={loadEntries} className="mt-3 text-sm text-red-500 underline">다시 시도</button>
          </div>
        )}

        {!isLoading && !error && filteredEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-20 h-20 bg-[#FDB931]/10 rounded-full flex items-center justify-center">
              <FiBook className="w-10 h-10 text-[#FDB931]" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#051C2C]">
                {selectedCountry === '전체' ? '첫 번째 여행 기록을 남겨보세요' : `${selectedCountry} 기록이 없습니다`}
              </p>
              <p className="text-sm text-gray-400 mt-1">지금 이 순간의 감동을 다이어리에 담아보세요</p>
            </div>
            <button onClick={openModal} className="flex items-center gap-2 bg-gradient-to-r from-[#FDB931] to-[#E1A21E] text-[#051C2C] font-bold px-6 py-3 rounded-xl shadow-md border-2 border-[#FDB931] active:scale-95">
              <FiPlus className="w-5 h-5" />기록 남기기
            </button>
          </div>
        )}

        {!isLoading && !error && filteredEntries.length > 0 && (
          <ul className="mt-2 flex flex-col gap-4">
            {filteredEntries.map((entry) => (
              <li key={entry.id} className="bg-white rounded-2xl shadow-sm border-2 border-[#051C2C]/5 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  {entry.visitDate && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-400 font-medium">
                      <FiCalendar className="w-4 h-4" />{formatVisitDate(entry.visitDate)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-[#FDB931] bg-[#FDB931]/10 px-3 py-0.5 rounded-full border border-[#FDB931]/30">
                    <FiMapPin className="w-3.5 h-3.5" />{entry.countryName}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#051C2C] leading-snug mb-2">{entry.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 whitespace-pre-line">{entry.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div ref={modalRef} className="relative bg-white rounded-t-3xl shadow-2xl w-full max-h-[90dvh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-lg font-extrabold text-[#051C2C]">새 여행 기록</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="닫기">
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 flex flex-col gap-4 flex-1">
              {submitError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-semibold">{submitError}</div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="diary-visitDate" className="text-sm font-bold text-[#051C2C]">방문일</label>
                <input id="diary-visitDate" type="date" value={form.visitDate} max={getTodayString()}
                  onChange={(e) => setForm((prev) => ({ ...prev, visitDate: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base text-[#051C2C] focus:outline-none focus:border-[#FDB931] transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="diary-countryName" className="text-sm font-bold text-[#051C2C]">
                  기항지 / 국가명
                  {currentPort && <span className="ml-2 text-xs font-normal text-[#FDB931]">(현재 기항지 자동입력)</span>}
                </label>
                <input id="diary-countryName" type="text" value={form.countryName} maxLength={50}
                  onChange={(e) => setForm((prev) => ({ ...prev, countryName: e.target.value }))}
                  placeholder="예) 일본, 홍콩, 베트남"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base text-[#051C2C] placeholder-gray-300 focus:outline-none focus:border-[#FDB931] transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="diary-title" className="text-sm font-bold text-[#051C2C]">제목</label>
                <input id="diary-title" type="text" value={form.title} maxLength={100}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="오늘의 여행 제목을 입력하세요"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base text-[#051C2C] placeholder-gray-300 focus:outline-none focus:border-[#FDB931] transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="diary-content" className="text-sm font-bold text-[#051C2C]">내용</label>
                <textarea id="diary-content" value={form.content} rows={6} maxLength={2000}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="여행에서 느낀 것들을 자유롭게 기록해보세요..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base text-[#051C2C] placeholder-gray-300 focus:outline-none focus:border-[#FDB931] transition-colors resize-none" />
                <span className="text-xs text-gray-400 text-right">{form.content.length} / 2000</span>
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#FDB931] to-[#E1A21E] text-[#051C2C] font-extrabold py-4 rounded-xl shadow-md border-2 border-[#FDB931] active:scale-95 disabled:opacity-60 text-lg mt-2 mb-4">
                {isSubmitting ? '저장 중...' : '기록 저장하기'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
