// components/admin/SimpleItineraryBuilder.tsx
// 간단한 일정표 빌더 (CruiseProduct.itineraryPattern 용)
// 데이터 구조: Array<{ day: number, port: string, arrival: string, departure: string }>

'use client';

import { useState } from 'react';
import { FiPlus, FiTrash2, FiChevronUp, FiChevronDown, FiClock, FiMapPin } from 'react-icons/fi';

export interface SimpleItineraryDay {
  day: number;
  port: string;
  arrival: string;
  departure: string;
}

interface SimpleItineraryBuilderProps {
  days: SimpleItineraryDay[];
  onChange: (days: SimpleItineraryDay[]) => void;
  nights?: number;
}

// 자주 사용하는 기항지 목록
const COMMON_PORTS = [
  '인천',
  '부산',
  '해상(종일항해)',
  '오키나와',
  '나하',
  '이시가키',
  '미야코지마',
  '가고시마',
  '후쿠오카',
  '나가사키',
  '사세보',
  '고베',
  '오사카',
  '도쿄',
  '요코하마',
  '홍콩',
  '싱가포르',
  '상하이',
  '다낭',
  '하롱베이',
  '방콕',
  '푸켓',
];

export default function SimpleItineraryBuilder({
  days,
  onChange,
  nights = 0
}: SimpleItineraryBuilderProps) {
  const [showPortSuggestions, setShowPortSuggestions] = useState<number | null>(null);

  // 일정 추가
  const addDay = () => {
    const nextDay = days.length > 0 ? Math.max(...days.map(d => d.day)) + 1 : 1;
    const newDay: SimpleItineraryDay = {
      day: nextDay,
      port: '',
      arrival: '-',
      departure: '-'
    };
    onChange([...days, newDay]);
  };

  // 일정 삭제
  const removeDay = (index: number) => {
    if (!confirm(`Day ${days[index].day} 일정을 삭제하시겠습니까?`)) return;
    const updated = days.filter((_, i) => i !== index);
    // day 번호 재정렬
    const renumbered = updated.map((d, i) => ({ ...d, day: i + 1 }));
    onChange(renumbered);
  };

  // 일정 업데이트
  const updateDay = (index: number, updates: Partial<SimpleItineraryDay>) => {
    const updated = days.map((d, i) => i === index ? { ...d, ...updates } : d);
    onChange(updated);
  };

  // 일정 순서 이동
  const moveDay = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const updated = [...days];
      [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
      // day 번호 재정렬
      const renumbered = updated.map((d, i) => ({ ...d, day: i + 1 }));
      onChange(renumbered);
    } else if (direction === 'down' && index < days.length - 1) {
      const updated = [...days];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      // day 번호 재정렬
      const renumbered = updated.map((d, i) => ({ ...d, day: i + 1 }));
      onChange(renumbered);
    }
  };

  // 자동 생성 (박 수 기준)
  const autoGenerate = () => {
    if (nights <= 0) {
      alert('박 수를 먼저 설정해주세요.');
      return;
    }
    const totalDays = nights + 1;
    const newDays: SimpleItineraryDay[] = [];

    for (let i = 1; i <= totalDays; i++) {
      newDays.push({
        day: i,
        port: i === 1 ? '인천' : i === totalDays ? '인천' : '',
        arrival: i === 1 ? '-' : '',
        departure: i === totalDays ? '-' : ''
      });
    }

    onChange(newDays);
  };

  // 기항지 필터링
  const getFilteredPorts = (searchText: string) => {
    if (!searchText) return COMMON_PORTS;
    const lower = searchText.toLowerCase();
    return COMMON_PORTS.filter(port => port.toLowerCase().includes(lower));
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">일정표 (간단 모드)</h3>
          <p className="text-sm text-gray-500 mt-1">
            기항지와 입/출항 시간을 입력하세요.
          </p>
        </div>
        <div className="flex gap-2">
          {nights > 0 && (
            <button
              type="button"
              onClick={autoGenerate}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              🔄 {nights}박{nights + 1}일 자동 생성
            </button>
          )}
          <button
            type="button"
            onClick={addDay}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus size={18} />
            일정 추가
          </button>
        </div>
      </div>

      {/* 일정 목록 */}
      {days.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FiMapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">일정을 추가하세요</p>
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
          {days.map((day, index) => (
            <div
              key={`day-${day.day}-${index}`}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Day 번호 */}
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <div className="text-center">
                    <div className="text-xs opacity-80">DAY</div>
                    <div className="text-2xl font-bold">{day.day}</div>
                  </div>
                </div>

                {/* 내용 */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 기항지 */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      <FiMapPin className="inline w-3 h-3 mr-1" />
                      기항지
                    </label>
                    <input
                      type="text"
                      value={day.port}
                      onChange={(e) => updateDay(index, { port: e.target.value })}
                      onFocus={() => setShowPortSuggestions(index)}
                      onBlur={() => setTimeout(() => setShowPortSuggestions(null), 200)}
                      placeholder="예: 오키나와, 해상(종일항해)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {/* 기항지 자동완성 */}
                    {showPortSuggestions === index && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getFilteredPorts(day.port).map((port) => (
                          <button
                            key={port}
                            type="button"
                            onMouseDown={() => {
                              updateDay(index, { port });
                              setShowPortSuggestions(null);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                          >
                            {port}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 입항 시간 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      <FiClock className="inline w-3 h-3 mr-1" />
                      입항 시간
                    </label>
                    <input
                      type="text"
                      value={day.arrival}
                      onChange={(e) => updateDay(index, { arrival: e.target.value })}
                      placeholder="예: 08:00 또는 -"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* 출항 시간 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      <FiClock className="inline w-3 h-3 mr-1" />
                      출항 시간
                    </label>
                    <input
                      type="text"
                      value={day.departure}
                      onChange={(e) => updateDay(index, { departure: e.target.value })}
                      placeholder="예: 18:00 또는 -"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveDay(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="위로"
                  >
                    <FiChevronUp size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDay(index, 'down')}
                    disabled={index === days.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="아래로"
                  >
                    <FiChevronDown size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDay(index)}
                    className="p-1.5 text-red-400 hover:text-red-600"
                    title="삭제"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>사용 방법:</strong> 일정 추가 버튼을 클릭하여 각 Day의 기항지와 입/출항 시간을 입력하세요.
          해상(종일항해) 등 항구 없는 날은 입/출항 시간에 "-"를 입력하면 됩니다.
        </p>
      </div>

      {/* 저장되는 데이터 구조 안내 (개발용) */}
      {process.env.NODE_ENV === 'development' && days.length > 0 && (
        <div className="bg-gray-800 text-green-400 rounded-lg p-4 text-xs font-mono">
          <div className="text-gray-400 mb-2">// 저장되는 itineraryPattern JSON</div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(days, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
