'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiDownload,
  FiUploadCloud,
  FiCalendar,
  FiTrendingUp,
  FiTrendingDown,
  FiTarget,
  FiAlertTriangle,
  FiCheckCircle,
  FiSave,
  FiRefreshCw,
} from 'react-icons/fi';
import {
  calculateMargin,
  formatAmount,
  formatDetailAmount,
  formatPercent,
  getStatusColor,
  getDefaultFixedCosts,
  getDefaultVariableCosts,
  MarginCalculationResult,
  SalesData,
  CommissionData,
  FixedCostData,
  VariableCostData,
} from '@/lib/margin-calculator';

// 월별 기록 타입
interface MonthlyRecord {
  id: string;
  year: number;
  month: number;
  sales: SalesData;
  commission: CommissionData;
  fixedCosts: FixedCostData;
  variableCosts: VariableCostData;
  result: MarginCalculationResult;
  budget?: {
    salesTarget: number;
    profitTarget: number;
  };
  createdAt: string;
  updatedAt: string;
  backedUpAt?: string;
}

// 숫자 입력 컴포넌트
function NumberInput({
  label,
  value,
  onChange,
  placeholder = '0',
  suffix = '원',
  size = 'md',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  suffix?: string;
  size?: 'sm' | 'md';
}) {
  const [displayValue, setDisplayValue] = useState(value > 0 ? value.toLocaleString() : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10) || 0;
    setDisplayValue(num > 0 ? num.toLocaleString() : '');
    onChange(num);
  };

  useEffect(() => {
    setDisplayValue(value > 0 ? value.toLocaleString() : '');
  }, [value]);

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1.5 text-sm'
    : 'px-3 py-2 text-sm';

  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full ${sizeClasses} pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          {suffix}
        </span>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // 현재 선택된 월
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // 월별 기록 목록
  const [records, setRecords] = useState<MonthlyRecord[]>([]);

  // 현재 편집 중인 데이터
  const [salesData, setSalesData] = useState<SalesData>({
    totalSales: 0,
    salesCount: 0,
    refundAmount: 0,
    refundCount: 0,
  });

  const [commissionData, setCommissionData] = useState<CommissionData>({
    salesAgentCommission: 0,
    mentorCommission: 0,
    branchManagerCommission: 0,
    otherCommission: 0,
  });

  const [fixedCosts, setFixedCosts] = useState<FixedCostData>(getDefaultFixedCosts());
  const [variableCosts, setVariableCosts] = useState<VariableCostData>(getDefaultVariableCosts());

  // 예산 목표
  const [budget, setBudget] = useState({
    salesTarget: 0,
    profitTarget: 0,
  });

  // 현재 결과 계산
  const result = useMemo<MarginCalculationResult | null>(() => {
    if (salesData.totalSales <= 0) return null;
    return calculateMargin({
      sales: salesData,
      commission: commissionData,
      fixedCosts,
      variableCosts,
    });
  }, [salesData, commissionData, fixedCosts, variableCosts]);

  // 월별 기록 불러오기
  useEffect(() => {
    loadRecords();
  }, []);

  // 선택된 월 변경 시 데이터 로드
  useEffect(() => {
    const record = records.find(
      (r) => r.year === selectedYear && r.month === selectedMonth
    );
    if (record) {
      setSalesData(record.sales);
      setCommissionData(record.commission);
      setFixedCosts(record.fixedCosts);
      setVariableCosts(record.variableCosts);
      if (record.budget) {
        setBudget(record.budget);
      }
    } else {
      // 새 월 - 이전 달 고정비 복사
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
      const prevRecord = records.find(
        (r) => r.year === prevYear && r.month === prevMonth
      );
      if (prevRecord) {
        setFixedCosts(prevRecord.fixedCosts);
      } else {
        setFixedCosts(getDefaultFixedCosts());
      }
      setSalesData({ totalSales: 0, salesCount: 0, refundAmount: 0, refundCount: 0 });
      setCommissionData({ salesAgentCommission: 0, mentorCommission: 0, branchManagerCommission: 0, otherCommission: 0 });
      setVariableCosts(getDefaultVariableCosts());
      setBudget({ salesTarget: 0, profitTarget: 0 });
    }
  }, [selectedYear, selectedMonth, records]);

  // 기록 불러오기
  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/finance/records');
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 현재 월 저장
  const saveCurrentMonth = async () => {
    if (!result) return;

    setIsSaving(true);
    try {
      const record: Omit<MonthlyRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        year: selectedYear,
        month: selectedMonth,
        sales: salesData,
        commission: commissionData,
        fixedCosts,
        variableCosts,
        result,
        budget: budget.salesTarget > 0 ? budget : undefined,
      };

      const res = await fetch('/api/admin/finance/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });

      if (res.ok) {
        await loadRecords();
        alert(`${selectedYear}년 ${selectedMonth}월 데이터가 저장되었습니다.`);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 구글 드라이브 백업
  const backupToGoogleDrive = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/admin/finance/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`구글 드라이브에 백업되었습니다.\n파일: ${data.fileName}`);
        await loadRecords();
      }
    } catch (error) {
      console.error('Backup failed:', error);
      alert('백업에 실패했습니다.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // 엑셀 다운로드
  const downloadExcel = async () => {
    try {
      const res = await fetch(`/api/admin/finance/export?year=${selectedYear}&month=${selectedMonth}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `손익계산서_${selectedYear}년${selectedMonth}월.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('엑셀 다운로드에 실패했습니다.');
    }
  };

  const statusColor = result ? getStatusColor(result.profitStatus) : null;

  // 예산 달성률 계산
  const budgetAchievement = useMemo(() => {
    if (!result || !budget.salesTarget) return null;
    return {
      salesRate: (result.netSales / budget.salesTarget) * 100,
      profitRate: budget.profitTarget > 0 ? (result.netProfit / budget.profitTarget) * 100 : 0,
    };
  }, [result, budget]);

  // 전월 대비 계산
  const prevMonthComparison = useMemo(() => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevRecord = records.find((r) => r.year === prevYear && r.month === prevMonth);

    if (!prevRecord || !result) return null;

    return {
      salesChange: result.netSales - prevRecord.result.netSales,
      salesChangeRate: prevRecord.result.netSales > 0
        ? ((result.netSales - prevRecord.result.netSales) / prevRecord.result.netSales) * 100
        : 0,
      profitChange: result.netProfit - prevRecord.result.netProfit,
      profitChangeRate: prevRecord.result.netProfit !== 0
        ? ((result.netProfit - prevRecord.result.netProfit) / Math.abs(prevRecord.result.netProfit)) * 100
        : 0,
    };
  }, [result, records, selectedYear, selectedMonth]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">재무 관리 센터</h1>
                <p className="text-emerald-100 text-sm">
                  손익 분석, 예산 관리, 월별 기록
                </p>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center gap-2">
              <button
                onClick={downloadExcel}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                <FiDownload className="w-4 h-4" />
                엑셀 다운로드
              </button>
              <button
                onClick={backupToGoogleDrive}
                disabled={isBackingUp}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <FiUploadCloud className="w-4 h-4" />
                {isBackingUp ? '백업 중...' : '구글 드라이브 백업'}
              </button>
              <button
                onClick={saveCurrentMonth}
                disabled={isSaving || !result}
                className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <FiSave className="w-4 h-4" />
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {/* 월 선택 */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent text-white px-3 py-2 rounded-lg focus:outline-none"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                  <option key={year} value={year} className="text-gray-900">
                    {year}년
                  </option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent text-white px-3 py-2 rounded-lg focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month} className="text-gray-900">
                    {month}월
                  </option>
                ))}
              </select>
            </div>
            <FiCalendar className="w-5 h-5 text-emerald-100" />
            <span className="text-emerald-100 text-sm">
              {records.find((r) => r.year === selectedYear && r.month === selectedMonth)
                ? '저장된 데이터 있음'
                : '새로운 기록'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 상단 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 순매출 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">순매출</span>
              {prevMonthComparison && (
                <span className={`text-xs flex items-center gap-1 ${prevMonthComparison.salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {prevMonthComparison.salesChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                  {formatPercent(Math.abs(prevMonthComparison.salesChangeRate))}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {result ? formatAmount(result.netSales) : '-'}
            </p>
            {result && result.refundRate > 0 && (
              <p className="text-xs text-red-500 mt-1">
                환불 {formatPercent(result.refundRate)}
              </p>
            )}
          </div>

          {/* 총 수당 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">총 수당 지출</span>
              <span className="text-xs text-orange-600">
                {result ? formatPercent(result.commissionRate) : '-'}
              </span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {result ? formatAmount(result.totalCommission) : '-'}
            </p>
          </div>

          {/* 총 비용 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">총 운영비용</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {result ? formatAmount(result.totalOperatingCosts) : '-'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              고정 {result ? formatAmount(result.totalFixedCosts) : '-'} + 변동 {result ? formatAmount(result.totalVariableCosts) : '-'}
            </p>
          </div>

          {/* 순이익 */}
          <div className={`rounded-xl shadow-sm border p-4 ${result?.isProfitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${result?.isProfitable ? 'text-green-600' : 'text-red-600'}`}>순이익</span>
              {prevMonthComparison && (
                <span className={`text-xs flex items-center gap-1 ${prevMonthComparison.profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {prevMonthComparison.profitChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                  {formatPercent(Math.abs(prevMonthComparison.profitChangeRate))}
                </span>
              )}
            </div>
            <p className={`text-2xl font-bold ${result?.isProfitable ? 'text-green-700' : 'text-red-700'}`}>
              {result ? formatAmount(result.netProfit, true) : '-'}
            </p>
            <p className={`text-xs mt-1 ${result?.isProfitable ? 'text-green-600' : 'text-red-600'}`}>
              마진율 {result ? formatPercent(result.netProfitMargin) : '-'}
            </p>
          </div>
        </div>

        {/* 상태 메시지 */}
        {result && statusColor && (
          <div className={`${statusColor.bg} ${statusColor.border} border rounded-xl p-4 mb-6`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{statusColor.icon}</span>
                <div>
                  <p className={`font-medium ${statusColor.text}`}>
                    {result.statusMessage}
                  </p>
                  <p className="text-sm text-gray-600">
                    손익분기점 매출: {formatAmount(result.breakEvenSales)} |
                    현재 달성률: {formatPercent(result.salesVsBreakEven)}
                  </p>
                </div>
              </div>
              {result.isProfitable ? (
                <FiCheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <FiAlertTriangle className="w-8 h-8 text-red-500" />
              )}
            </div>
          </div>
        )}

        {/* 예산 vs 실적 */}
        {budgetAchievement && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiTarget className="w-5 h-5 text-emerald-600" />
              예산 vs 실적
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">매출 목표</span>
                  <span className="font-medium">
                    {formatAmount(result?.netSales || 0)} / {formatAmount(budget.salesTarget)}
                  </span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${budgetAchievement.salesRate >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(budgetAchievement.salesRate, 100)}%` }}
                  />
                </div>
                <p className={`text-sm mt-1 ${budgetAchievement.salesRate >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                  {formatPercent(budgetAchievement.salesRate)} 달성
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">이익 목표</span>
                  <span className="font-medium">
                    {formatAmount(result?.netProfit || 0)} / {formatAmount(budget.profitTarget)}
                  </span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${budgetAchievement.profitRate >= 100 ? 'bg-green-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(Math.max(budgetAchievement.profitRate, 0), 100)}%` }}
                  />
                </div>
                <p className={`text-sm mt-1 ${budgetAchievement.profitRate >= 100 ? 'text-green-600' : 'text-emerald-600'}`}>
                  {formatPercent(budgetAchievement.profitRate)} 달성
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 입력 영역 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 매출 입력 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">매출 정보</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="총 매출"
                  value={salesData.totalSales}
                  onChange={(v) => setSalesData((p) => ({ ...p, totalSales: v }))}
                />
                <NumberInput
                  label="판매 건수"
                  value={salesData.salesCount}
                  onChange={(v) => setSalesData((p) => ({ ...p, salesCount: v }))}
                  suffix="건"
                />
                <NumberInput
                  label="환불 금액"
                  value={salesData.refundAmount}
                  onChange={(v) => setSalesData((p) => ({ ...p, refundAmount: v }))}
                />
                <NumberInput
                  label="환불 건수"
                  value={salesData.refundCount}
                  onChange={(v) => setSalesData((p) => ({ ...p, refundCount: v }))}
                  suffix="건"
                />
              </div>
            </div>

            {/* 수당 입력 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">수당 지출</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="판매원 수당"
                  value={commissionData.salesAgentCommission}
                  onChange={(v) => setCommissionData((p) => ({ ...p, salesAgentCommission: v }))}
                />
                <NumberInput
                  label="멘토 수당"
                  value={commissionData.mentorCommission}
                  onChange={(v) => setCommissionData((p) => ({ ...p, mentorCommission: v }))}
                />
                <NumberInput
                  label="대리점장 오버라이드"
                  value={commissionData.branchManagerCommission}
                  onChange={(v) => setCommissionData((p) => ({ ...p, branchManagerCommission: v }))}
                />
                <NumberInput
                  label="기타 수당"
                  value={commissionData.otherCommission}
                  onChange={(v) => setCommissionData((p) => ({ ...p, otherCommission: v }))}
                />
              </div>
            </div>

            {/* 고정비 입력 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">고정비 (매월 발생)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="사무실 월세"
                  value={fixedCosts.officeRent}
                  onChange={(v) => setFixedCosts((p) => ({ ...p, officeRent: v }))}
                />
                <NumberInput
                  label="전기세"
                  value={fixedCosts.electricity}
                  onChange={(v) => setFixedCosts((p) => ({ ...p, electricity: v }))}
                />
                <NumberInput
                  label="수도세"
                  value={fixedCosts.water}
                  onChange={(v) => setFixedCosts((p) => ({ ...p, water: v }))}
                />
                <NumberInput
                  label="인터넷/통신비"
                  value={fixedCosts.internet}
                  onChange={(v) => setFixedCosts((p) => ({ ...p, internet: v }))}
                />
                <NumberInput
                  label="AI 플랫폼 비용"
                  value={fixedCosts.aiPlatformFee}
                  onChange={(v) => setFixedCosts((p) => ({ ...p, aiPlatformFee: v }))}
                />
                <NumberInput
                  label="서버/호스팅"
                  value={fixedCosts.serverCost}
                  onChange={(v) => setFixedCosts((p) => ({ ...p, serverCost: v }))}
                />
                <NumberInput
                  label="보험료"
                  value={fixedCosts.insurance}
                  onChange={(v) => setFixedCosts((p) => ({ ...p, insurance: v }))}
                />
                <NumberInput
                  label="기타 고정비"
                  value={fixedCosts.otherFixed}
                  onChange={(v) => setFixedCosts((p) => ({ ...p, otherFixed: v }))}
                />
              </div>
            </div>

            {/* 변동비 입력 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">변동비</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <NumberInput
                  label="마케팅/광고비"
                  value={variableCosts.marketingCost}
                  onChange={(v) => setVariableCosts((p) => ({ ...p, marketingCost: v }))}
                />
                <NumberInput
                  label="영업비"
                  value={variableCosts.salesCost}
                  onChange={(v) => setVariableCosts((p) => ({ ...p, salesCost: v }))}
                />
                <NumberInput
                  label="출장비"
                  value={variableCosts.travelCost}
                  onChange={(v) => setVariableCosts((p) => ({ ...p, travelCost: v }))}
                />
                <NumberInput
                  label="접대비"
                  value={variableCosts.entertainmentCost}
                  onChange={(v) => setVariableCosts((p) => ({ ...p, entertainmentCost: v }))}
                />
                <NumberInput
                  label="소모품비"
                  value={variableCosts.suppliesCost}
                  onChange={(v) => setVariableCosts((p) => ({ ...p, suppliesCost: v }))}
                />
                <NumberInput
                  label="기타 변동비"
                  value={variableCosts.otherVariable}
                  onChange={(v) => setVariableCosts((p) => ({ ...p, otherVariable: v }))}
                />
              </div>
            </div>

            {/* 예산 목표 설정 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiTarget className="w-5 h-5 text-emerald-600" />
                예산 목표 설정
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput
                  label="매출 목표"
                  value={budget.salesTarget}
                  onChange={(v) => setBudget((p) => ({ ...p, salesTarget: v }))}
                />
                <NumberInput
                  label="이익 목표"
                  value={budget.profitTarget}
                  onChange={(v) => setBudget((p) => ({ ...p, profitTarget: v }))}
                />
              </div>
            </div>
          </div>

          {/* 오른쪽: 손익계산서 */}
          <div className="space-y-6">
            {/* 손익계산서 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="font-semibold text-gray-800 mb-4">손익계산서</h3>

              {result ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 매출</span>
                    <span className="font-medium">{formatDetailAmount(result.grossSales)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>(-) 환불</span>
                    <span>{formatDetailAmount(result.refundAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-medium">
                    <span>순매출</span>
                    <span>{formatDetailAmount(result.netSales)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>(-) 총 수당</span>
                    <span>{formatDetailAmount(result.totalCommission)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-medium text-blue-700">
                    <span>매출총이익</span>
                    <span>{formatDetailAmount(result.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between text-purple-600">
                    <span>(-) 고정비</span>
                    <span>{formatDetailAmount(result.totalFixedCosts)}</span>
                  </div>
                  <div className="flex justify-between text-pink-600">
                    <span>(-) 변동비</span>
                    <span>{formatDetailAmount(result.totalVariableCosts)}</span>
                  </div>
                  <div className={`flex justify-between border-t-2 pt-3 text-lg font-bold ${result.isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                    <span>순이익</span>
                    <span>{formatDetailAmount(result.netProfit)}</span>
                  </div>
                  <div className={`text-center py-2 rounded-lg ${result.isProfitable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    마진율 {formatPercent(result.netProfitMargin)}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400">
                  <p>매출을 입력하면</p>
                  <p>손익이 자동 계산됩니다</p>
                </div>
              )}

              {/* 비용 구조 차트 */}
              {result && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-xs font-medium text-gray-600 mb-2">비용 구조</p>
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-orange-400 h-full"
                      style={{ width: `${Math.min(result.costStructure.commissionPercent, 100)}%` }}
                    />
                    <div
                      className="bg-purple-400 h-full"
                      style={{ width: `${Math.min(result.costStructure.fixedPercent, 100)}%` }}
                    />
                    <div
                      className="bg-pink-400 h-full"
                      style={{ width: `${Math.min(result.costStructure.variablePercent, 100)}%` }}
                    />
                    {result.costStructure.profitPercent > 0 && (
                      <div
                        className="bg-green-400 h-full"
                        style={{ width: `${Math.min(result.costStructure.profitPercent, 100)}%` }}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-orange-400 rounded" />
                      수당 {formatPercent(result.costStructure.commissionPercent)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded" />
                      고정비 {formatPercent(result.costStructure.fixedPercent)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-pink-400 rounded" />
                      변동비 {formatPercent(result.costStructure.variablePercent)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded" />
                      이익 {formatPercent(result.costStructure.profitPercent)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 월별 기록 목록 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">월별 기록</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {records.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    저장된 기록이 없습니다
                  </p>
                ) : (
                  records
                    .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
                    .slice(0, 12)
                    .map((record) => (
                      <button
                        key={record.id}
                        onClick={() => {
                          setSelectedYear(record.year);
                          setSelectedMonth(record.month);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedYear === record.year && selectedMonth === record.month
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">
                            {record.year}년 {record.month}월
                          </span>
                          <span className={`text-sm font-medium ${record.result.isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                            {formatAmount(record.result.netProfit, true)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>매출 {formatAmount(record.result.netSales)}</span>
                          <span>마진 {formatPercent(record.result.netProfitMargin)}</span>
                        </div>
                        {record.backedUpAt && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                            <FiUploadCloud className="w-3 h-3" /> 백업됨
                          </span>
                        )}
                      </button>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
