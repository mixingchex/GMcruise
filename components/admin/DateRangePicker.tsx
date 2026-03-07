'use client';

import { useState, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { ko } from 'react-day-picker/locale';
import { FiCalendar, FiX } from 'react-icons/fi';
import 'react-day-picker/dist/style.css';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onDaysChange?: (days: number) => void;
  className?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onDaysChange,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openKey, setOpenKey] = useState(0); // DayPicker 강제 재마운트용 (타이밍 race condition 방지)
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(() => {
    if (startDate && endDate) {
      // 타임존 문제 방지를 위해 로컬 날짜로 파싱
      const [fromYear, fromMonth, fromDay] = startDate.split('-').map(Number);
      const [toYear, toMonth, toDay] = endDate.split('-').map(Number);
      
      const fromDate = new Date(fromYear, fromMonth - 1, fromDay);
      const toDate = new Date(toYear, toMonth - 1, toDay);
      
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        return {
          from: fromDate,
          to: toDate,
        };
      }
    } else if (startDate) {
      const [fromYear, fromMonth, fromDay] = startDate.split('-').map(Number);
      const fromDate = new Date(fromYear, fromMonth - 1, fromDay);
      
      if (!isNaN(fromDate.getTime())) {
        return {
          from: fromDate,
          to: undefined,
        };
      }
    }
    return undefined;
  });

  // props가 변경될 때 selectedRange 업데이트 (달력 열린 중에는 보호)
  useEffect(() => {
    if (isOpen) return; // 달력 열린 상태에서 외부 props 변경으로 내부 선택 중 상태 덮어쓰기 방지
    if (startDate && endDate) {
      // 타임존 문제 방지를 위해 로컬 날짜로 파싱
      const [fromYear, fromMonth, fromDay] = startDate.split('-').map(Number);
      const [toYear, toMonth, toDay] = endDate.split('-').map(Number);
      
      const fromDate = new Date(fromYear, fromMonth - 1, fromDay);
      const toDate = new Date(toYear, toMonth - 1, toDay);
      
      // 유효한 날짜인지 확인
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        setSelectedRange({
          from: fromDate,
          to: toDate,
        });
      }
    } else if (startDate) {
      // 타임존 문제 방지를 위해 로컬 날짜로 파싱
      const [fromYear, fromMonth, fromDay] = startDate.split('-').map(Number);
      const fromDate = new Date(fromYear, fromMonth - 1, fromDay);
      
      if (!isNaN(fromDate.getTime())) {
        setSelectedRange({
          from: fromDate,
          to: undefined,
        });
      }
    } else {
      setSelectedRange(undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, isOpen]);

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) {
      setSelectedRange(undefined);
      onStartDateChange('');
      onEndDateChange('');
      return;
    }

    const { from, to } = range;

    if (from && !to) {
      // 출발일만 선택된 상태 — 부모 콜백 호출 없이 로컬 selectedRange만 업데이트
      // onStartDateChange를 호출하면 endDate가 자동계산되어 selectedRange가 즉시 complete range로 복원되는 버그 방지
      setSelectedRange({ from, to: undefined });
      return;
    }

    if (from && to) {
      // react-day-picker v9: 첫 클릭 시 { from: date, to: date } 반환하는 경우 처리
      // {from, to} (full range)로 유지하면 v9가 두 번째 클릭을 "새 범위 재시작"으로 보고
      // {from: newDate, to: newDate}를 반환 → 루프 발생
      // {from, to: undefined}로 설정해야 v9가 "partial range" 경로로 진입해 정상 완성됨
      if (from.getTime() === to.getTime()) {
        setSelectedRange({ from, to: undefined });
        return;
      }

      // 스왑 체크: from이 to보다 늦으면 swap
      const rangeStart = from <= to ? from : to;
      const rangeEnd = from <= to ? to : from;

      const toISODate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      setSelectedRange({ from: rangeStart, to: rangeEnd });
      onStartDateChange(toISODate(rangeStart));
      onEndDateChange(toISODate(rangeEnd));

      if (onDaysChange) {
        const days = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        onDaysChange(days);
      }

      setIsOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      // YYYY-MM-DD 형식의 문자열을 Date 객체로 변환할 때 타임존 문제 방지
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      if (isNaN(date.getTime())) {
        return dateString; // 파싱 실패 시 원본 반환
      }
      
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* 날짜 입력 필드 - 하나로 통합 */}
      <div>
        <label className="block text-base md:text-lg font-semibold text-gray-800 mb-3">
          여행 기간 선택 *
        </label>
        <div className="relative">
          <input
            type="text"
            readOnly
            value={
              startDate && endDate
                ? `${formatDate(startDate)} ~ ${formatDate(endDate)}`
                : startDate
                ? `${formatDate(startDate)} ~ 종료일 선택`
                : '출발일과 종료일을 선택하세요'
            }
            onClick={() => {
              if (!isOpen) {
                // 달력 열기 시 selectedRange 초기화 + DayPicker 강제 재마운트
                // setSelectedRange(undefined)만으로는 React 렌더 타이밍상 DayPicker가
                // 이전 complete {from,to}로 초기화된 상태로 렌더될 수 있어 첫 클릭이
                // 종료일 변경으로 처리되는 race condition 발생 → key 변경으로 완전 재마운트
                setSelectedRange(undefined);
                setOpenKey(prev => prev + 1);
              }
              setIsOpen(!isOpen);
            }}
            placeholder="출발일과 종료일을 선택하세요"
            className={`w-full px-4 py-3 md:px-5 md:py-4 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base md:text-lg cursor-pointer ${
              !startDate || !endDate ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            style={{ fontSize: '18px', minHeight: '56px' }}
          />
          <FiCalendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={22} />
        </div>
      </div>

      {/* 캘린더 드롭다운 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              // from만 선택된 상태에서 닫으면 기존 날짜 유지 (부모 콜백 없이 로컬 상태만 복원)
              if (selectedRange?.from && !selectedRange?.to) {
                setSelectedRange(undefined); // 로컬 선택 초기화 (기존 startDate/endDate는 유지)
              }
              setIsOpen(false);
            }}
          />
          
          {/* 캘린더 팝업 */}
          <div className="absolute z-50 mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-6 w-full max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">날짜 범위 선택</h3>
                <p className="text-sm text-gray-600 mt-1">
                  출발일을 먼저 클릭한 후, 종료일을 클릭하세요
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiX size={24} />
              </button>
            </div>
            
            {/* 선택된 날짜 표시 */}
            {(selectedRange?.from || startDate) && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">출발일:</span>{' '}
                    <span className="text-blue-700 font-bold">
                      {selectedRange?.from
                        ? selectedRange.from.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                        : formatDate(startDate)}
                    </span>
                  </div>
                  {selectedRange?.to && (
                    <>
                      <span className="text-gray-400">→</span>
                      <div>
                        <span className="font-semibold text-gray-700">종료일:</span>{' '}
                        <span className="text-orange-600 font-bold">
                          {selectedRange.to.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedRange?.from && !selectedRange?.to && (
                    <div className="text-gray-500 text-sm">
                      (종료일을 선택하세요)
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <DayPicker
              key={openKey}
              mode="range"
              selected={selectedRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={ko}
              className="date-picker-custom"
            />
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-semibold">
                💡 사용 방법: 출발일을 먼저 클릭한 후, 종료일을 클릭하면 자동으로 저장됩니다.
              </p>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        .date-picker-custom {
          --rdp-accent-color: #2563eb;
          --rdp-accent-background-color: #eff6ff;
        }
        .date-picker-custom .rdp-day_button {
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 16px;
          transition: all 0.2s;
        }
        .date-picker-custom .rdp-day_button:hover:not([disabled]) {
          background-color: #dbeafe;
          transform: scale(1.1);
        }
        .date-picker-custom .rdp-selected .rdp-day_button {
          background-color: #2563eb;
          color: white;
          font-weight: 700;
        }
        .date-picker-custom .rdp-range_start .rdp-day_button {
          border-top-left-radius: 9999px;
          border-bottom-left-radius: 9999px;
          background-color: #2563eb;
          color: white;
          font-weight: 700;
        }
        .date-picker-custom .rdp-range_end .rdp-day_button {
          border-top-right-radius: 9999px;
          border-bottom-right-radius: 9999px;
          background-color: #ea580c;
          color: white;
          font-weight: 700;
        }
        .date-picker-custom .rdp-range_middle .rdp-day_button {
          background-color: #dbeafe;
          color: #1e40af;
          font-weight: 600;
          border-radius: 0;
        }
        .date-picker-custom .rdp-weekday {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }
        .date-picker-custom .rdp-month_caption {
          font-weight: 700;
          font-size: 1.2rem;
          color: #111827;
        }
        .date-picker-custom .rdp-nav button,
        .date-picker-custom .rdp-day_button {
          transition: all 0.2s;
        }
        .date-picker-custom .rdp-nav button:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}

