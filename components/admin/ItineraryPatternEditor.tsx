'use client';

import { useState } from 'react';
import { FiPlus, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';

/**
 * 일정 패턴 편집기
 * 작업자 C (UX/기능 전문가) - CMS UI
 * 비개발자도 쉽게 사용 가능한 직관적인 인터페이스
 */

export interface ItineraryDay {
  day: number;
  type: 'Embarkation' | 'PortVisit' | 'Cruising' | 'Disembarkation';
  location: string;
  country: string;
  currency: string;
  language: string;
  arrival?: string;
  departure?: string;
  time?: string;
  notes?: string;
  hasCruiseInfo?: boolean; // 크루즈 탑승 정보 포함 여부 (선택제)
}

interface Props {
  value: ItineraryDay[];
  onChange: (pattern: ItineraryDay[]) => void;
}

const ITINERARY_TYPES = [
  { value: 'Embarkation', label: '승선', icon: '🚢' },
  { value: 'PortVisit', label: '기항지 방문', icon: '🏝️' },
  { value: 'Cruising', label: '항해', icon: '⛵' },
  { value: 'Disembarkation', label: '하선', icon: '🏁' },
];

const CURRENCIES = ['KRW', 'USD', 'JPY', 'EUR', 'CNY', 'TWD', 'HKD', 'SGD', 'THB'];
const LANGUAGES = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'th', 'vi', 'id', 'ms'];

// 검색 기능과 일치하도록 국가 목록 (영어 이름, 한국어 이름, 국가 코드 모두 포함)
const COUNTRIES = [
  { value: 'JP', label: '일본 (Japan)', codes: ['JP', 'Japan', '일본'] },
  { value: 'KR', label: '한국 (Korea)', codes: ['KR', 'Korea', '한국'] },
  { value: 'TH', label: '태국 (Thailand)', codes: ['TH', 'Thailand', '태국'] },
  { value: 'VN', label: '베트남 (Vietnam)', codes: ['VN', 'Vietnam', '베트남'] },
  { value: 'MY', label: '말레이시아 (Malaysia)', codes: ['MY', 'Malaysia', '말레이시아'] },
  { value: 'SG', label: '싱가포르 (Singapore)', codes: ['SG', 'Singapore', '싱가포르'] },
  { value: 'ES', label: '스페인 (Spain)', codes: ['ES', 'Spain', '스페인'] },
  { value: 'FR', label: '프랑스 (France)', codes: ['FR', 'France', '프랑스'] },
  { value: 'IT', label: '이탈리아 (Italy)', codes: ['IT', 'Italy', '이탈리아'] },
  { value: 'GR', label: '그리스 (Greece)', codes: ['GR', 'Greece', '그리스'] },
  { value: 'TR', label: '터키 (Turkey)', codes: ['TR', 'Turkey', '터키'] },
  { value: 'US', label: '미국 (USA)', codes: ['US', 'USA', '미국', 'Alaska', '알래스카'] },
  { value: 'CN', label: '중국 (China)', codes: ['CN', 'China', '중국'] },
  { value: 'TW', label: '대만 (Taiwan)', codes: ['TW', 'Taiwan', '대만'] },
  { value: 'HK', label: '홍콩 (Hong Kong)', codes: ['HK', 'Hong Kong', '홍콩'] },
  { value: 'PH', label: '필리핀 (Philippines)', codes: ['PH', 'Philippines', '필리핀'] },
  { value: 'ID', label: '인도네시아 (Indonesia)', codes: ['ID', 'Indonesia', '인도네시아'] },
];

export default function ItineraryPatternEditor({ value, onChange }: Props) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const addDay = () => {
    const newDay: ItineraryDay = {
      day: value.length + 1,
      type: 'PortVisit',
      location: '',
      country: '',
      currency: 'USD',
      language: 'en',
    };
    onChange([...value, newDay]);
    setExpandedDay(newDay.day);
  };

  const removeDay = (day: number) => {
    const filtered = value.filter(d => d.day !== day);
    // day 번호 재정렬
    const reordered = filtered.map((d, idx) => ({ ...d, day: idx + 1 }));
    onChange(reordered);
  };

  const updateDay = (day: number, updates: Partial<ItineraryDay>) => {
    const updated = value.map(d => d.day === day ? { ...d, ...updates } : d);
    onChange(updated);
  };

  const moveDay = (day: number, direction: 'up' | 'down') => {
    const index = value.findIndex(d => d.day === day);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      const newValue = [...value];
      [newValue[index], newValue[index - 1]] = [newValue[index - 1], newValue[index]];
      // day 번호 재정렬
      const reordered = newValue.map((d, idx) => ({ ...d, day: idx + 1 }));
      onChange(reordered);
    } else if (direction === 'down' && index < value.length - 1) {
      const newValue = [...value];
      [newValue[index], newValue[index + 1]] = [newValue[index + 1], newValue[index]];
      const reordered = newValue.map((d, idx) => ({ ...d, day: idx + 1 }));
      onChange(reordered);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">여행 일정 패턴</h3>
        <button
          type="button"
          onClick={addDay}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus />
          일정 추가
        </button>
      </div>

      {value.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">아직 일정이 없습니다</p>
          <button
            type="button"
            onClick={addDay}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            첫 일정 추가하기 →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((day, index) => {
            const isExpanded = expandedDay === day.day;
            const typeInfo = ITINERARY_TYPES.find(t => t.value === day.type);

            return (
              <div
                key={day.day}
                className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors"
              >
                {/* 헤더 */}
                <div className="flex items-center gap-3 p-4 bg-gray-50">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveDay(day.day, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                      title="위로"
                    >
                      <FiChevronUp size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDay(day.day, 'down')}
                      disabled={index === value.length - 1}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                      title="아래로"
                    >
                      <FiChevronDown size={18} />
                    </button>
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-2xl">{typeInfo?.icon}</span>
                    <div>
                      <p className="font-bold text-gray-900">
                        Day {day.day}: {typeInfo?.label}
                      </p>
                      <p className="text-sm text-gray-600">
                        {day.location || '위치 미설정'} {day.country && `(${day.country})`}
                        {day.hasCruiseInfo && day.arrival && (
                          <span className="ml-2 text-blue-600 font-semibold">
                            🚢 입항: {day.arrival}
                            {day.departure && ` / 출항: ${day.departure}`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                    >
                      {isExpanded ? '접기' : '편집'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDay(day.day)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="삭제"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* 편집 폼 (Accordion) */}
                {isExpanded && (
                  <div className="p-6 bg-white space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* 유형 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          유형 *
                        </label>
                        <select
                          value={day.type}
                          onChange={(e) => updateDay(day.day, { type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {ITINERARY_TYPES.map(t => (
                            <option key={t.value} value={t.value}>
                              {t.icon} {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 위치 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          위치 *
                        </label>
                        <input
                          type="text"
                          value={day.location}
                          onChange={(e) => updateDay(day.day, { location: e.target.value })}
                          placeholder="예: 후쿠오카"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {/* 국가 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          국가 * <span className="text-red-500 text-xs font-bold">(온보딩 연결 필수 - 반드시 선택!)</span>
                        </label>
                        <select
                          required
                          value={day.country}
                          onChange={(e) => updateDay(day.day, { country: e.target.value })}
                          className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            !day.country && (day.type === 'PortVisit' || day.type === 'Embarkation' || day.type === 'Disembarkation')
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">⚠️ 국가를 선택하세요 (필수)</option>
                          {COUNTRIES.map(country => (
                            <option key={country.value} value={country.value}>
                              {country.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-red-600 mt-1 font-semibold">
                          💡 온보딩 시 크루즈닷AI 날씨 정보에 자동 반영됩니다. 반드시 선택해주세요!
                        </p>
                      </div>

                      {/* 통화 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          통화 *
                        </label>
                        <select
                          value={day.currency}
                          onChange={(e) => updateDay(day.day, { currency: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {CURRENCIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* 언어 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          언어 *
                        </label>
                        <select
                          value={day.language}
                          onChange={(e) => updateDay(day.day, { language: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {LANGUAGES.map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 크루즈 탑승 정보 섹션 (선택제) */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={day.hasCruiseInfo || false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              updateDay(day.day, { 
                                hasCruiseInfo: checked,
                                // 체크박스 해제 시 입항/출항 시간도 초기화
                                ...(checked ? {} : { arrival: undefined, departure: undefined })
                              });
                            }}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm font-semibold text-gray-700">
                            🚢 크루즈 정보 포함 (입항/출항 시간 설정)
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-7">
                          체크하면 아래 필드가 표시되며, 브리핑의 "내일 예정" 정보에 자동 반영됩니다.
                        </p>
                      </div>

                      {day.hasCruiseInfo && (
                        <div className="grid sm:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                          {/* 크루즈 국가 (기존 국가와 별도로 설정 가능) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              크루즈 입항 국가
                            </label>
                            <select
                              value={day.country || ''}
                              onChange={(e) => updateDay(day.day, { country: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">국가를 선택하세요</option>
                              {COUNTRIES.map(country => (
                                <option key={country.value} value={country.value}>
                                  {country.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 입항 시간 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              입항 시간
                            </label>
                            <input
                              type="time"
                              value={day.arrival || ''}
                              onChange={(e) => updateDay(day.day, { arrival: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="예: 08:00"
                            />
                          </div>

                          {/* 출항 시간 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              출항 시간
                            </label>
                            <input
                              type="time"
                              value={day.departure || ''}
                              onChange={(e) => updateDay(day.day, { departure: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="예: 18:00"
                            />
                          </div>

                          {/* 기존 승선/하선 시간 필드 (Embarkation/Disembarkation 타입일 때만 표시) */}
                          {(day.type === 'Embarkation' || day.type === 'Disembarkation') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {day.type === 'Embarkation' ? '승선' : '하선'} 시간
                              </label>
                              <input
                                type="time"
                                value={day.time || ''}
                                onChange={(e) => updateDay(day.day, { time: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 기존 입항/출항 시간 필드 (PortVisit 타입이고 크루즈 정보가 체크되지 않은 경우에만 표시 - 하위 호환성) */}
                    {day.type === 'PortVisit' && !day.hasCruiseInfo && (
                      <div className="grid sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            입항 시간
                          </label>
                          <input
                            type="time"
                            value={day.arrival || ''}
                            onChange={(e) => updateDay(day.day, { arrival: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            출항 시간
                          </label>
                          <input
                            type="time"
                            value={day.departure || ''}
                            onChange={(e) => updateDay(day.day, { departure: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* 메모 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        메모 (선택사항)
                      </label>
                      <textarea
                        value={day.notes || ''}
                        onChange={(e) => updateDay(day.day, { notes: e.target.value })}
                        placeholder="이 일정에 대한 메모를 입력하세요..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 미리보기 */}
      {value.length > 0 && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">JSON 미리보기</h4>
          <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-60">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

