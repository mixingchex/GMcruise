'use client';

import { useEffect, useState, useRef } from 'react';
import {
  FiRefreshCw,
  FiSearch,
  FiCheckCircle,
  FiUser,
  FiPackage,
  FiDollarSign,
  FiUsers,
  FiCalendar,
  FiSave,
  FiX,
  FiPercent,
  FiTrendingUp,
  FiBarChart2,
  FiCopy,
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { showError, showSuccess } from '@/components/ui/Toast';

type AffiliateProfile = {
  id: number;
  affiliateCode: string | null;
  displayName: string | null;
  type: 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
  branchLabel: string | null;
};

type AffiliateLead = {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
};

type SimulationFormState = {
  // 고객 정보
  customerName: string;
  customerPhone: string;
  leadId: string; // 기존 Lead 선택 시

  // 상품 정보
  productCode: string;
  saleAmount: string;
  costAmount: string;
  headcount: string;
  cabinType: string;
  fareCategory: string;

  // 담당자 정보
  managerId: string;
  agentId: string;

  // 기타
  externalOrderCode: string;
  saleDate: string;
};

const EMPTY_FORM: SimulationFormState = {
  customerName: '',
  customerPhone: '',
  leadId: '',
  productCode: '',
  saleAmount: '',
  costAmount: '',
  headcount: '',
  cabinType: '',
  fareCategory: '',
  managerId: '',
  agentId: '',
  externalOrderCode: '',
  saleDate: new Date().toISOString().split('T')[0],
};

type CalculationResult = {
  saleAmount: number;
  costAmount: number;
  netRevenue: number;
  branchGross: number;
  branchWithholding: number;
  branchNet: number;
  overrideGross: number;
  overrideWithholding: number;
  overrideNet: number;
  managerNet: number;
  agentGross: number;
  agentWithholding: number;
  agentNet: number;
  hqNet: number;
  hqCardFees: number;
  hqCorporateTax: number;
  hqNetAfterFees: number;
};

type AdvancedCalculatorState = {
  // 기본 정보
  saleAmount: string;
  costAmount: string;
  hqCommission: string; // 본사 수수료 (새로 추가)
  
  // 할당 금액 (사용자 입력)
  agentAllocation: string; // 판매원 할당 금액
  manager1Allocation: string; // 대리점장 1 할당 금액
  manager2Allocation: string; // 대리점장 2 할당 금액 (대리점장 1의 하위)
  manager1OverrideFromManager2: string; // 대리점장 1이 대리점장 2의 순매출 이익에서 본사로부터 받는 게런티
  manager1OverrideFromAgent: string; // 대리점장 1이 판매원에서 본사로부터 받는 게런티/오버라이드
  manager2NetProfit: string; // 대리점장 2의 순매출 이익 (게런티 계산 기준)
  
  // 계산 결과
  netRevenueAfterTax: number; // 10% 세금 제외 후
  netRevenueAfterCardFee: number; // 카드 수수료 3.5% 제외 후
  hqNetProfit: number; // 본사 순이익 (모든 할당 및 게런티 제외 전)
  hqFinalNetProfit: number; // 본사 최종 순이익 (모든 할당 및 게런티 제외 후)
  
  agentPercentage: number; // 판매원 할당 %
  manager1Percentage: number; // 대리점장 1 할당 %
  manager2Percentage: number; // 대리점장 2 할당 %
  manager1OverridePercentage: number; // 대리점장 1이 대리점장 2에서 가져가는 %
  manager1OverrideFromAgentPercentage: number; // 대리점장 1이 판매원에서 가져가는 % (게런티)
};

export default function AdminTestSimulationPage() {
  const [formState, setFormState] = useState<SimulationFormState>(EMPTY_FORM);
  const [profiles, setProfiles] = useState<AffiliateProfile[]>([]);
  const [leads, setLeads] = useState<AffiliateLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [activeMode, setActiveMode] = useState<'form' | 'calculator'>('calculator');
  const [calculatorMode, setCalculatorMode] = useState<'amount' | 'percentage' | 'scenario'>('amount'); // amount: 금액 입력, percentage: 비율 입력, scenario: 시나리오 비교
  const [scenarios, setScenarios] = useState<Array<{ name: string; state: AdvancedCalculatorState }>>([]);
  const [currentScenarioName, setCurrentScenarioName] = useState('');
  const [showVisualization, setShowVisualization] = useState(true);
  const [calculatorState, setCalculatorState] = useState<AdvancedCalculatorState>({
    saleAmount: '',
    costAmount: '',
    hqCommission: '', // 본사 수수료 추가
    agentAllocation: '',
    manager1Allocation: '',
    manager2Allocation: '',
    manager1OverrideFromManager2: '',
    manager1OverrideFromAgent: '',
    manager2NetProfit: '',
    netRevenueAfterTax: 0,
    netRevenueAfterCardFee: 0,
    hqNetProfit: 0,
    hqFinalNetProfit: 0,
    agentPercentage: 0,
    manager1Percentage: 0,
    manager2Percentage: 0,
    manager1OverridePercentage: 0,
    manager1OverrideFromAgentPercentage: 0,
  });
  const leadDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfiles();
    loadLeads();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leadDropdownRef.current && !leadDropdownRef.current.contains(event.target as Node)) {
        setShowLeadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/affiliate/profiles?status=ACTIVE&limit=100');
      const json = await res.json();
      if (res.ok && json.ok) {
        setProfiles(json.profiles || []);
      }
    } catch (error: any) {
      console.error('[TestSimulation] load profiles error', error);
      showError('프로필 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const res = await fetch('/api/admin/affiliate/leads?limit=50');
      const json = await res.json();
      if (res.ok && json.ok) {
        setLeads(json.leads || []);
      }
    } catch (error: any) {
      console.error('[TestSimulation] load leads error', error);
    }
  };

  const filteredLeads = leads.filter(
    (lead) =>
      (lead.customerName && lead.customerName.includes(searchTerm)) ||
      (lead.customerPhone && lead.customerPhone.includes(searchTerm))
  );

  const managers = profiles.filter((p) => p.type === 'BRANCH_MANAGER');
  const agents = profiles.filter((p) => p.type === 'SALES_AGENT');

  // 계산 로직
  const calculateCommission = (): CalculationResult | null => {
    const saleAmount = parseInt(formState.saleAmount) || 0;
    const costAmount = parseInt(formState.costAmount) || 0;
    
    if (saleAmount <= 0) return null;

    // 순이익 계산 (원가가 있으면 판매금액 - 원가, 없으면 판매금액 * 0.9)
    const netRevenue = costAmount > 0 ? saleAmount - costAmount : saleAmount * 0.9;

    // 수수료 계산 (기본 비율)
    const branchGross = netRevenue * 0.05; // 5% 대리점 수수료
    const overrideGross = netRevenue * 0.02; // 2% 오버라이드 수수료
    const agentGross = netRevenue * 0.03; // 3% 판매원 수수료

    // 원천징수 (3.3%)
    const branchWithholding = branchGross * 0.033;
    const overrideWithholding = overrideGross * 0.033;
    const agentWithholding = agentGross * 0.033;

    // 세후 금액
    const branchNet = branchGross - branchWithholding;
    const overrideNet = overrideGross - overrideWithholding;
    const agentNet = agentGross - agentWithholding;
    const managerNet = branchNet + overrideNet; // 대리점장 총 수익

    // 본사 이익
    const hqNet = netRevenue - branchGross - overrideGross - agentGross;
    const hqCardFees = saleAmount * 0.035; // 카드 수수료 3.5%
    const hqCorporateTax = hqNet * 0.1; // 법인세 10%
    const hqNetAfterFees = hqNet - hqCardFees - hqCorporateTax;

    return {
      saleAmount,
      costAmount,
      netRevenue: Math.round(netRevenue),
      branchGross: Math.round(branchGross),
      branchWithholding: Math.round(branchWithholding),
      branchNet: Math.round(branchNet),
      overrideGross: Math.round(overrideGross),
      overrideWithholding: Math.round(overrideWithholding),
      overrideNet: Math.round(overrideNet),
      managerNet: Math.round(managerNet),
      agentGross: Math.round(agentGross),
      agentWithholding: Math.round(agentWithholding),
      agentNet: Math.round(agentNet),
      hqNet: Math.round(hqNet),
      hqCardFees: Math.round(hqCardFees),
      hqCorporateTax: Math.round(hqCorporateTax),
      hqNetAfterFees: Math.round(hqNetAfterFees),
    };
  };

  const calculation = calculateCommission();

  // 고급 계산기 로직
  const calculateAdvanced = (): AdvancedCalculatorState => {
    const saleAmount = parseFloat(calculatorState.saleAmount) || 0;
    let costAmount = parseFloat(calculatorState.costAmount) || 0;
    const hqCommission = parseFloat(calculatorState.hqCommission) || 0;
    const agentAllocation = parseFloat(calculatorState.agentAllocation) || 0;
    const manager1Allocation = parseFloat(calculatorState.manager1Allocation) || 0;
    const manager2Allocation = parseFloat(calculatorState.manager2Allocation) || 0;
    const manager1OverrideFromManager2 = parseFloat(calculatorState.manager1OverrideFromManager2) || 0;
    const manager1OverrideFromAgent = parseFloat(calculatorState.manager1OverrideFromAgent) || 0;
    const manager2NetProfit = parseFloat(calculatorState.manager2NetProfit) || manager2Allocation; // 대리점장 2의 순매출 이익

    if (saleAmount <= 0) {
      return {
        ...calculatorState,
        netRevenueAfterTax: 0,
        netRevenueAfterCardFee: 0,
        hqNetProfit: 0,
        hqFinalNetProfit: 0,
        agentPercentage: 0,
        manager1Percentage: 0,
        manager2Percentage: 0,
        manager1OverridePercentage: 0,
        manager1OverrideFromAgentPercentage: 0,
      };
    }

    // 본사 수수료가 입력되어 있고 원가가 없으면 원가 계산 (원가 = 판매금액 - 본사 수수료)
    if (hqCommission > 0 && costAmount === 0 && saleAmount > 0) {
      costAmount = Math.max(0, saleAmount - hqCommission);
    }

    // 순이익 계산 (원가가 있으면 판매금액 - 원가, 없으면 판매금액 * 0.9)
    const netRevenue = costAmount > 0 ? saleAmount - costAmount : saleAmount * 0.9;

    // 10% 세금 (판매금액 기준)
    const tax = saleAmount * 0.1;
    
    // 카드 수수료 3.5% (판매금액 기준)
    const cardFee = saleAmount * 0.035;
    
    // 본사 순이익 (할당 전) = 순이익 - 세금 - 카드 수수료
    const hqNetProfit = netRevenue - tax - cardFee;
    
    // 계산 결과용 (표시용)
    const netRevenueAfterTax = netRevenue - tax;
    const netRevenueAfterCardFee = hqNetProfit;

    // 할당 % 계산
    const agentPercentage = hqNetProfit > 0 ? (agentAllocation / hqNetProfit) * 100 : 0;
    const manager1Percentage = hqNetProfit > 0 ? (manager1Allocation / hqNetProfit) * 100 : 0;
    const manager2Percentage = manager2Allocation > 0 && manager1Allocation > 0 
      ? (manager2Allocation / manager1Allocation) * 100 
      : 0;

    // 대리점장 1이 대리점장 2의 순매출 이익에서 본사로부터 받는 게런티 비율
    const manager1OverridePercentage = manager2NetProfit > 0 
      ? (manager1OverrideFromManager2 / manager2NetProfit) * 100 
      : 0;

    // 대리점장 1이 판매원에서 본사로부터 받는 게런티/오버라이드 비율
    const manager1OverrideFromAgentPercentage = agentAllocation > 0 
      ? (manager1OverrideFromAgent / agentAllocation) * 100 
      : 0;

    // 본사 최종 순이익 계산 (모든 할당 및 게런티 제외)
    const hqFinalNetProfit = hqNetProfit 
      - agentAllocation  // 판매원 할당
      - manager1Allocation  // 대리점장 1 할당
      - manager2Allocation  // 대리점장 2 할당
      - manager1OverrideFromManager2  // 대리점장 1이 대리점장 2에서 받는 게런티
      - manager1OverrideFromAgent;  // 대리점장 1이 판매원에서 받는 게런티

    return {
      ...calculatorState,
      netRevenueAfterTax: Math.round(netRevenueAfterTax),
      netRevenueAfterCardFee: Math.round(netRevenueAfterCardFee),
      hqNetProfit: Math.round(hqNetProfit),
      hqFinalNetProfit: Math.round(hqFinalNetProfit),
      agentPercentage: Math.round(agentPercentage * 100) / 100,
      manager1Percentage: Math.round(manager1Percentage * 100) / 100,
      manager2Percentage: Math.round(manager2Percentage * 100) / 100,
      manager1OverridePercentage: Math.round(manager1OverridePercentage * 100) / 100,
      manager1OverrideFromAgentPercentage: Math.round(manager1OverrideFromAgentPercentage * 100) / 100,
    };
  };

  const advancedCalculation = calculateAdvanced();

  // 시나리오 비교용 계산 함수
  const calculateAdvancedForState = (state: AdvancedCalculatorState): AdvancedCalculatorState => {
    const saleAmount = parseFloat(state.saleAmount) || 0;
    const costAmount = parseFloat(state.costAmount) || 0;
    const agentAllocation = parseFloat(state.agentAllocation) || 0;
    const manager1Allocation = parseFloat(state.manager1Allocation) || 0;
    const manager2Allocation = parseFloat(state.manager2Allocation) || 0;
    const manager1OverrideFromManager2 = parseFloat(state.manager1OverrideFromManager2) || 0;
    const manager1OverrideFromAgent = parseFloat(state.manager1OverrideFromAgent) || 0;
    const manager2NetProfit = parseFloat(state.manager2NetProfit) || manager2Allocation;

    if (saleAmount <= 0) {
      return { ...state, hqNetProfit: 0, hqFinalNetProfit: 0, agentPercentage: 0, manager1Percentage: 0, manager2Percentage: 0, manager1OverridePercentage: 0, manager1OverrideFromAgentPercentage: 0, netRevenueAfterTax: 0, netRevenueAfterCardFee: 0 };
    }

    const netRevenue = costAmount > 0 ? saleAmount - costAmount : saleAmount * 0.9;
    const tax = saleAmount * 0.1;
    const cardFee = saleAmount * 0.035;
    const hqNetProfit = netRevenue - tax - cardFee;
    const netRevenueAfterTax = netRevenue - tax;
    const netRevenueAfterCardFee = hqNetProfit;

    const agentPercentage = hqNetProfit > 0 ? (agentAllocation / hqNetProfit) * 100 : 0;
    const manager1Percentage = hqNetProfit > 0 ? (manager1Allocation / hqNetProfit) * 100 : 0;
    const manager2Percentage = manager2Allocation > 0 && manager1Allocation > 0 
      ? (manager2Allocation / manager1Allocation) * 100 
      : 0;
    const manager1OverridePercentage = manager2NetProfit > 0 
      ? (manager1OverrideFromManager2 / manager2NetProfit) * 100 
      : 0;
    const manager1OverrideFromAgentPercentage = agentAllocation > 0 
      ? (manager1OverrideFromAgent / agentAllocation) * 100 
      : 0;
    const hqFinalNetProfit = hqNetProfit 
      - agentAllocation
      - manager1Allocation
      - manager2Allocation
      - manager1OverrideFromManager2
      - manager1OverrideFromAgent;

    return {
      ...state,
      netRevenueAfterTax: Math.round(netRevenueAfterTax),
      netRevenueAfterCardFee: Math.round(netRevenueAfterCardFee),
      hqNetProfit: Math.round(hqNetProfit),
      hqFinalNetProfit: Math.round(hqFinalNetProfit),
      agentPercentage: Math.round(agentPercentage * 100) / 100,
      manager1Percentage: Math.round(manager1Percentage * 100) / 100,
      manager2Percentage: Math.round(manager2Percentage * 100) / 100,
      manager1OverridePercentage: Math.round(manager1OverridePercentage * 100) / 100,
      manager1OverrideFromAgentPercentage: Math.round(manager1OverrideFromAgentPercentage * 100) / 100,
    };
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // 필수 필드 검증
      if (!formState.productCode || !formState.saleAmount) {
        showError('상품 코드와 판매 금액은 필수입니다.');
        setIsSubmitting(false);
        return;
      }

      // 기존 Lead 사용 (선택사항)
      let finalLeadId: number | null = null;
      if (formState.leadId) {
        finalLeadId = parseInt(formState.leadId, 10);
      }
      // Lead가 없어도 판매 생성 가능 (managerId 또는 agentId가 있으면 됨)

      // 판매 생성
      const payload: any = {
        productCode: formState.productCode,
        saleAmount: parseInt(formState.saleAmount, 10),
        status: 'CONFIRMED',
      };

      if (formState.externalOrderCode) payload.externalOrderCode = formState.externalOrderCode;
      if (finalLeadId) payload.leadId = finalLeadId;
      if (formState.managerId) payload.managerId = parseInt(formState.managerId, 10);
      if (formState.agentId) payload.agentId = parseInt(formState.agentId, 10);
      if (formState.costAmount) payload.costAmount = parseInt(formState.costAmount, 10);
      if (formState.headcount) payload.headcount = parseInt(formState.headcount, 10);
      if (formState.cabinType) payload.cabinType = formState.cabinType;
      if (formState.fareCategory) payload.fareCategory = formState.fareCategory;
      if (formState.saleDate) payload.saleDate = formState.saleDate;

      const res = await fetch('/api/admin/affiliate/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '판매 생성에 실패했습니다.');
      }

      showSuccess('구매 시뮬레이션이 완료되었습니다.');
      setFormState(EMPTY_FORM);
      loadLeads();
    } catch (error: any) {
      console.error('[TestSimulation] submit error', error);
      showError(error.message || '구매 시뮬레이션 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-24">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-10 md:px-6">
        {/* 헤더 */}
        <header className="rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold">구매 시뮬레이션</h1>
              <p className="text-sm text-white/80">
                테스트 목적으로 어필리에이트 판매를 시뮬레이션합니다. 실제 결제 없이 판매 데이터를 생성할 수 있습니다.
              </p>
            </div>
          </div>
          
          {/* 모드 전환 탭 */}
          <div className="mt-6 flex gap-2 border-b border-white/20">
            <button
              onClick={() => setActiveMode('calculator')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeMode === 'calculator'
                  ? 'border-white text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              💰 수수료 계산기
            </button>
            <button
              onClick={() => setActiveMode('form')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeMode === 'form'
                  ? 'border-white text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              📝 판매 데이터 생성
            </button>
          </div>
        </header>

        {/* 튜토리얼 모드 */}
        {showTutorial && (
          <section className="rounded-3xl bg-blue-50 border border-blue-200 p-6 relative">
            <button
              onClick={() => setShowTutorial(false)}
              className="absolute top-4 right-4 text-blue-600 hover:text-blue-800"
            >
              <FiX className="text-xl" />
            </button>
            <div className="flex items-start gap-3">
              <div className="text-2xl">📚</div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800 mb-2">구매 시뮬레이션 사용 방법</h3>
                <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                  <li>고객 정보를 입력하거나 기존 고객을 선택합니다.</li>
                  <li>상품 코드와 판매 금액을 입력합니다 (필수).</li>
                  <li>원가를 입력하면 순이익이 자동 계산됩니다 (없으면 판매금액의 90%로 계산).</li>
                  <li>대리점장과 판매원을 선택합니다.</li>
                  <li>아래 계산 결과를 확인하여 수수료와 이득을 확인합니다.</li>
                  <li>모든 정보를 확인한 후 &quot;구매 시뮬레이션 실행&quot; 버튼을 클릭합니다.</li>
                </ol>
              </div>
            </div>
          </section>
        )}

        {/* 안내 */}
        <section className="rounded-3xl bg-yellow-50 border border-yellow-200 p-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-2">테스트 전용 기능</h3>
              <p className="text-sm text-yellow-700 mb-2">
                이 페이지는 개발 및 테스트 목적으로만 사용됩니다. 생성된 판매 데이터는 실제 결제와 연결되지 않으며, 수당 계산에 영향을 줄 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* 고급 계산기 모드 */}
        {activeMode === 'calculator' && (
          <section className="rounded-3xl bg-white p-6 shadow-lg border border-gray-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">💰 수수료 계산기</h2>
                <p className="text-sm text-gray-600 mt-1">
                  판매 금액과 할당 금액을 입력하면 자동으로 비율과 이득을 계산합니다.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowVisualization(!showVisualization)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    showVisualization
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FiBarChart2 className="inline mr-1" />
                  {showVisualization ? '차트 숨기기' : '차트 보기'}
                </button>
              </div>
            </div>

            {/* 계산 모드 선택 */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setCalculatorMode('amount')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  calculatorMode === 'amount'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                💰 금액 입력 모드
              </button>
              <button
                onClick={() => setCalculatorMode('percentage')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  calculatorMode === 'percentage'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 비율 입력 모드
              </button>
              <button
                onClick={() => setCalculatorMode('scenario')}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  calculatorMode === 'scenario'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🔄 시나리오 비교
              </button>
            </div>

            {/* 금액 입력 모드 */}
            {calculatorMode === 'amount' && (
              <>
                {/* 기본 정보 입력 */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      판매 금액 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={calculatorState.saleAmount}
                      onChange={(e) => {
                        const saleAmount = e.target.value;
                        const saleAmountNum = parseFloat(saleAmount) || 0;
                        const costAmountNum = parseFloat(calculatorState.costAmount) || 0;
                        
                        // 판매금액이 입력되면 본사 수수료 자동 계산
                        if (saleAmountNum > 0) {
                          const netRevenue = costAmountNum > 0 ? saleAmountNum - costAmountNum : saleAmountNum * 0.9;
                          const tax = saleAmountNum * 0.1;
                          const cardFee = saleAmountNum * 0.035;
                          const hqNetProfit = netRevenue - tax - cardFee;
                          setCalculatorState((prev) => ({ 
                            ...prev, 
                            saleAmount,
                            hqCommission: hqNetProfit > 0 ? Math.round(hqNetProfit).toString() : ''
                          }));
                        } else {
                          setCalculatorState((prev) => ({ ...prev, saleAmount, hqCommission: '' }));
                        }
                      }}
                      placeholder="예: 5,000,000"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">원가 (선택사항)</label>
                    <input
                      type="number"
                      value={calculatorState.costAmount}
                      onChange={(e) => {
                        const costAmount = e.target.value;
                        const costAmountNum = parseFloat(costAmount) || 0;
                        const saleAmountNum = parseFloat(calculatorState.saleAmount) || 0;
                        
                        // 원가가 입력되면 본사 수수료 자동 계산
                        if (saleAmountNum > 0) {
                          const netRevenue = costAmountNum > 0 ? saleAmountNum - costAmountNum : saleAmountNum * 0.9;
                          const tax = saleAmountNum * 0.1;
                          const cardFee = saleAmountNum * 0.035;
                          const hqNetProfit = netRevenue - tax - cardFee;
                          setCalculatorState((prev) => ({ 
                            ...prev, 
                            costAmount,
                            hqCommission: hqNetProfit > 0 ? Math.round(hqNetProfit).toString() : ''
                          }));
                        } else {
                          setCalculatorState((prev) => ({ ...prev, costAmount }));
                        }
                      }}
                      placeholder="예: 4,000,000"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">본사 수수료</label>
                    <input
                      type="number"
                      value={calculatorState.hqCommission}
                      onChange={(e) => {
                        const hqCommission = e.target.value;
                        const hqCommissionNum = parseFloat(hqCommission) || 0;
                        const saleAmountNum = parseFloat(calculatorState.saleAmount) || 0;
                        
                        // 본사 수수료가 입력되면 원가 자동 계산
                        // 원가 = 판매금액 - 본사 수수료
                        if (hqCommissionNum > 0 && saleAmountNum > 0) {
                          const costAmount = Math.max(0, saleAmountNum - hqCommissionNum);
                          setCalculatorState((prev) => ({ 
                            ...prev, 
                            hqCommission,
                            costAmount: costAmount.toString()
                          }));
                        } else {
                          setCalculatorState((prev) => ({ ...prev, hqCommission }));
                        }
                      }}
                      placeholder="자동 계산됨"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-blue-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 본사 수수료를 입력하면 원가가 자동 계산됩니다 (원가 = 판매금액 - 본사 수수료)
                    </p>
                  </div>
                </div>

                {/* 할당 금액 입력 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">할당 금액 입력</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    판매원 할당 금액
                  </label>
                  <input
                    type="number"
                    value={calculatorState.agentAllocation}
                    onChange={(e) => setCalculatorState((prev) => ({ ...prev, agentAllocation: e.target.value }))}
                    placeholder="예: 150,000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    대리점장 1 할당 금액
                  </label>
                  <input
                    type="number"
                    value={calculatorState.manager1Allocation}
                    onChange={(e) => setCalculatorState((prev) => ({ ...prev, manager1Allocation: e.target.value }))}
                    placeholder="예: 250,000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    대리점장 2 할당 금액 (대리점장 1의 하위)
                  </label>
                  <input
                    type="number"
                    value={calculatorState.manager2Allocation}
                    onChange={(e) => setCalculatorState((prev) => ({ ...prev, manager2Allocation: e.target.value }))}
                    placeholder="예: 100,000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    대리점장 2의 순매출 이익
                  </label>
                  <input
                    type="number"
                    value={calculatorState.manager2NetProfit}
                    onChange={(e) => setCalculatorState((prev) => ({ ...prev, manager2NetProfit: e.target.value }))}
                    placeholder="예: 100,000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    대리점장 1이 대리점장 2의 순매출 이익에서 본사로부터 받는 게런티
                  </label>
                  <input
                    type="number"
                    value={calculatorState.manager1OverrideFromManager2}
                    onChange={(e) => setCalculatorState((prev) => ({ ...prev, manager1OverrideFromManager2: e.target.value }))}
                    placeholder="예: 20,000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    대리점장 1이 판매원에서 본사로부터 받는 게런티/오버라이드
                  </label>
                  <input
                    type="number"
                    value={calculatorState.manager1OverrideFromAgent}
                    onChange={(e) => setCalculatorState((prev) => ({ ...prev, manager1OverrideFromAgent: e.target.value }))}
                    placeholder="예: 30,000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
              </>
            )}

            {/* 비율 입력 모드 */}
            {calculatorMode === 'percentage' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>비율 입력 모드:</strong> 할당 비율(%)을 입력하면 자동으로 금액을 계산합니다.
                  </p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      판매 금액 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={calculatorState.saleAmount}
                      onChange={(e) => {
                        const saleAmount = e.target.value;
                        const saleAmountNum = parseFloat(saleAmount) || 0;
                        const costAmountNum = parseFloat(calculatorState.costAmount) || 0;
                        
                        if (saleAmountNum > 0) {
                          const netRevenue = costAmountNum > 0 ? saleAmountNum - costAmountNum : saleAmountNum * 0.9;
                          const tax = saleAmountNum * 0.1;
                          const cardFee = saleAmountNum * 0.035;
                          const hqNetProfit = netRevenue - tax - cardFee;
                          setCalculatorState((prev) => ({ 
                            ...prev, 
                            saleAmount,
                            hqCommission: hqNetProfit > 0 ? Math.round(hqNetProfit).toString() : ''
                          }));
                        } else {
                          setCalculatorState((prev) => ({ ...prev, saleAmount, hqCommission: '' }));
                        }
                      }}
                      placeholder="예: 5,000,000"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">원가 (선택사항)</label>
                    <input
                      type="number"
                      value={calculatorState.costAmount}
                      onChange={(e) => {
                        const costAmount = e.target.value;
                        const costAmountNum = parseFloat(costAmount) || 0;
                        const saleAmountNum = parseFloat(calculatorState.saleAmount) || 0;
                        
                        if (saleAmountNum > 0) {
                          const netRevenue = costAmountNum > 0 ? saleAmountNum - costAmountNum : saleAmountNum * 0.9;
                          const tax = saleAmountNum * 0.1;
                          const cardFee = saleAmountNum * 0.035;
                          const hqNetProfit = netRevenue - tax - cardFee;
                          setCalculatorState((prev) => ({ 
                            ...prev, 
                            costAmount,
                            hqCommission: hqNetProfit > 0 ? Math.round(hqNetProfit).toString() : ''
                          }));
                        } else {
                          setCalculatorState((prev) => ({ ...prev, costAmount }));
                        }
                      }}
                      placeholder="예: 4,000,000"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">본사 수수료</label>
                    <input
                      type="number"
                      value={calculatorState.hqCommission}
                      onChange={(e) => {
                        const hqCommission = e.target.value;
                        const hqCommissionNum = parseFloat(hqCommission) || 0;
                        const saleAmountNum = parseFloat(calculatorState.saleAmount) || 0;
                        
                        // 본사 수수료가 입력되면 원가 자동 계산
                        // 원가 = 판매금액 - 본사 수수료
                        if (hqCommissionNum > 0 && saleAmountNum > 0) {
                          const costAmount = Math.max(0, saleAmountNum - hqCommissionNum);
                          setCalculatorState((prev) => ({ 
                            ...prev, 
                            hqCommission,
                            costAmount: costAmount.toString()
                          }));
                        } else {
                          setCalculatorState((prev) => ({ ...prev, hqCommission }));
                        }
                      }}
                      placeholder="자동 계산됨"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-blue-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 본사 수수료를 입력하면 원가가 자동 계산됩니다 (원가 = 판매금액 - 본사 수수료)
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">할당 비율 입력 (%)</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        판매원 할당 비율 (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={advancedCalculation.hqNetProfit > 0 && advancedCalculation.agentPercentage > 0 
                          ? advancedCalculation.agentPercentage 
                          : ''}
                        onChange={(e) => {
                          const percentage = parseFloat(e.target.value) || 0;
                          const hqNetProfit = advancedCalculation.hqNetProfit;
                          if (hqNetProfit > 0) {
                            const amount = Math.round((hqNetProfit * percentage) / 100);
                            setCalculatorState((prev) => ({ ...prev, agentAllocation: amount.toString() }));
                          }
                        }}
                        placeholder="예: 3.0"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      {advancedCalculation.hqNetProfit > 0 && parseFloat(calculatorState.agentAllocation || '0') > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          = {parseFloat(calculatorState.agentAllocation || '0').toLocaleString()}원
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        대리점장 1 할당 비율 (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={advancedCalculation.hqNetProfit > 0 && advancedCalculation.manager1Percentage > 0 
                          ? advancedCalculation.manager1Percentage 
                          : ''}
                        onChange={(e) => {
                          const percentage = parseFloat(e.target.value) || 0;
                          const hqNetProfit = advancedCalculation.hqNetProfit;
                          if (hqNetProfit > 0) {
                            const amount = Math.round((hqNetProfit * percentage) / 100);
                            setCalculatorState((prev) => ({ ...prev, manager1Allocation: amount.toString() }));
                          }
                        }}
                        placeholder="예: 5.0"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      {advancedCalculation.hqNetProfit > 0 && parseFloat(calculatorState.manager1Allocation || '0') > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          = {parseFloat(calculatorState.manager1Allocation || '0').toLocaleString()}원
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        대리점장 2 할당 비율 (대리점장 1 대비 %)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={advancedCalculation.manager2Percentage > 0 ? advancedCalculation.manager2Percentage : ''}
                        onChange={(e) => {
                          const percentage = parseFloat(e.target.value) || 0;
                          const manager1Allocation = parseFloat(calculatorState.manager1Allocation) || 0;
                          if (manager1Allocation > 0) {
                            const amount = Math.round((manager1Allocation * percentage) / 100);
                            setCalculatorState((prev) => ({ ...prev, manager2Allocation: amount.toString() }));
                          }
                        }}
                        placeholder="예: 40.0"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      {parseFloat(calculatorState.manager2Allocation || '0') > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          = {parseFloat(calculatorState.manager2Allocation || '0').toLocaleString()}원
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        대리점장 1 게런티 비율 (판매원 대비 %)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={advancedCalculation.manager1OverrideFromAgentPercentage > 0 
                          ? advancedCalculation.manager1OverrideFromAgentPercentage 
                          : ''}
                        onChange={(e) => {
                          const percentage = parseFloat(e.target.value) || 0;
                          const agentAllocation = parseFloat(calculatorState.agentAllocation) || 0;
                          if (agentAllocation > 0) {
                            const amount = Math.round((agentAllocation * percentage) / 100);
                            setCalculatorState((prev) => ({ ...prev, manager1OverrideFromAgent: amount.toString() }));
                          }
                        }}
                        placeholder="예: 20.0"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      {parseFloat(calculatorState.manager1OverrideFromAgent || '0') > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          = {parseFloat(calculatorState.manager1OverrideFromAgent || '0').toLocaleString()}원
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 시나리오 비교 모드 */}
            {calculatorMode === 'scenario' && (
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-sm text-purple-800">
                    💡 <strong>시나리오 비교 모드:</strong> 여러 할당 시나리오를 저장하고 비교할 수 있습니다.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentScenarioName}
                    onChange={(e) => setCurrentScenarioName(e.target.value)}
                    placeholder="시나리오 이름 (예: 기본 할당)"
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    onClick={() => {
                      if (currentScenarioName.trim() && advancedCalculation.hqNetProfit > 0) {
                        setScenarios((prev) => [...prev, { name: currentScenarioName, state: { ...calculatorState } }]);
                        setCurrentScenarioName('');
                        showSuccess('시나리오가 저장되었습니다.');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                  >
                    <FiSave className="inline mr-1" />
                    저장
                  </button>
                </div>

                {scenarios.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">저장된 시나리오 비교</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {scenarios.map((scenario, idx) => {
                        const scenarioCalc = calculateAdvancedForState(scenario.state);
                        return (
                          <div key={idx} className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900">{scenario.name}</h4>
                              <button
                                onClick={() => {
                                  setScenarios((prev) => prev.filter((_, i) => i !== idx));
                                  showSuccess('시나리오가 삭제되었습니다.');
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <FiX />
                              </button>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">판매원:</span>
                                <span className="font-semibold">
                                  {parseFloat(scenario.state.agentAllocation || '0').toLocaleString()}원
                                  <span className="text-gray-500 ml-1">
                                    ({scenarioCalc.agentPercentage > 0 ? `${scenarioCalc.agentPercentage}%` : '0%'})
                                  </span>
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">대리점장 1:</span>
                                <span className="font-semibold">
                                  {parseFloat(scenario.state.manager1Allocation || '0').toLocaleString()}원
                                  <span className="text-gray-500 ml-1">
                                    ({scenarioCalc.manager1Percentage > 0 ? `${scenarioCalc.manager1Percentage}%` : '0%'})
                                  </span>
                                </span>
                              </div>
                              <div className="border-t border-gray-300 pt-2 mt-2">
                                <div className="flex justify-between">
                                  <span className="font-semibold text-gray-900">본사 최종 순이익:</span>
                                  <span className="font-bold text-green-600">
                                    {scenarioCalc.hqFinalNetProfit.toLocaleString()}원
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 계산 결과 */}
            {parseFloat(calculatorState.saleAmount) > 0 && calculatorMode !== 'scenario' && (
              <div className="border-t border-gray-200 pt-6 space-y-4">
                <h3 className="text-lg font-bold text-gray-900">📊 계산 결과</h3>
                
                {/* 기본 계산 */}
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">기본 계산</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">순이익 (원가 제외):</span>
                      <span className="font-semibold">
                        {(() => {
                          const saleAmount = parseFloat(calculatorState.saleAmount) || 0;
                          const costAmount = parseFloat(calculatorState.costAmount) || 0;
                          const netRevenue = costAmount > 0 ? saleAmount - costAmount : saleAmount * 0.9;
                          return netRevenue > 0 ? Math.round(netRevenue).toLocaleString() : '-';
                        })()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">세금 (10%, 판매금액 기준):</span>
                      <span className="text-red-600">
                        -{(parseFloat(calculatorState.saleAmount) * 0.1 || 0).toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">카드 수수료 (3.5%, 판매금액 기준):</span>
                      <span className="text-red-600">
                        -{(parseFloat(calculatorState.saleAmount) * 0.035 || 0).toLocaleString()}원
                      </span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">본사 순이익 (할당 전):</span>
                        <span className={`font-bold text-lg ${
                          advancedCalculation.hqNetProfit >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {advancedCalculation.hqNetProfit >= 0 ? '+' : ''}
                          {advancedCalculation.hqNetProfit.toLocaleString()}원
                          <span className="text-xs ml-2">
                            ({advancedCalculation.hqNetProfit >= 0 ? '플러스' : '마이너스'})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 할당 및 게런티 차감 내역 */}
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-3">할당 및 게런티 차감</h4>
                  <div className="grid gap-2 text-sm">
                    {parseFloat(calculatorState.agentAllocation) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">판매원 할당:</span>
                        <span className="text-red-600">
                          -{parseFloat(calculatorState.agentAllocation).toLocaleString()}원
                        </span>
                      </div>
                    )}
                    {parseFloat(calculatorState.manager1Allocation) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">대리점장 1 할당:</span>
                        <span className="text-red-600">
                          -{parseFloat(calculatorState.manager1Allocation).toLocaleString()}원
                        </span>
                      </div>
                    )}
                    {parseFloat(calculatorState.manager2Allocation) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">대리점장 2 할당:</span>
                        <span className="text-red-600">
                          -{parseFloat(calculatorState.manager2Allocation).toLocaleString()}원
                        </span>
                      </div>
                    )}
                    {parseFloat(calculatorState.manager1OverrideFromManager2) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">대리점장 1 게런티 (대리점장 2):</span>
                        <span className="text-red-600">
                          -{parseFloat(calculatorState.manager1OverrideFromManager2).toLocaleString()}원
                        </span>
                      </div>
                    )}
                    {parseFloat(calculatorState.manager1OverrideFromAgent) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">대리점장 1 게런티 (판매원):</span>
                        <span className="text-red-600">
                          -{parseFloat(calculatorState.manager1OverrideFromAgent).toLocaleString()}원
                        </span>
                      </div>
                    )}
                    <div className="border-t border-red-300 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-red-900">본사 최종 순이익:</span>
                        <span className={`font-bold text-lg ${
                          advancedCalculation.hqFinalNetProfit >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {advancedCalculation.hqFinalNetProfit >= 0 ? '+' : ''}
                          {advancedCalculation.hqFinalNetProfit.toLocaleString()}원
                          <span className="text-xs ml-2">
                            ({advancedCalculation.hqFinalNetProfit >= 0 ? '플러스' : '마이너스'})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 할당 비율 */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-3">판매원 할당</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">할당 금액:</span>
                        <span className="font-semibold">
                          {parseFloat(calculatorState.agentAllocation) > 0 
                            ? parseFloat(calculatorState.agentAllocation).toLocaleString() 
                            : '0'}원
                        </span>
                      </div>
                      <div className="border-t border-blue-200 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-blue-800">할당 비율:</span>
                          <span className="font-bold text-blue-900 text-lg">
                            {advancedCalculation.agentPercentage > 0 
                              ? `${advancedCalculation.agentPercentage}%` 
                              : '0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
                    <h4 className="text-sm font-semibold text-purple-800 mb-3">대리점장 1 할당</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">할당 금액:</span>
                        <span className="font-semibold">
                          {parseFloat(calculatorState.manager1Allocation) > 0 
                            ? parseFloat(calculatorState.manager1Allocation).toLocaleString() 
                            : '0'}원
                        </span>
                      </div>
                      {parseFloat(calculatorState.manager1OverrideFromAgent) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">판매원 게런티:</span>
                          <span className="font-semibold text-purple-700">
                            {parseFloat(calculatorState.manager1OverrideFromAgent).toLocaleString()}원
                            <span className="ml-2 text-xs">
                              ({advancedCalculation.manager1OverrideFromAgentPercentage > 0 
                                ? `${advancedCalculation.manager1OverrideFromAgentPercentage}%` 
                                : '0%'})
                            </span>
                          </span>
                        </div>
                      )}
                      <div className="border-t border-purple-200 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-purple-800">할당 비율:</span>
                          <span className="font-bold text-purple-900 text-lg">
                            {advancedCalculation.manager1Percentage > 0 
                              ? `${advancedCalculation.manager1Percentage}%` 
                              : '0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {parseFloat(calculatorState.manager2Allocation) > 0 && (
                    <>
                      <div className="rounded-xl bg-pink-50 border border-pink-200 p-4">
                        <h4 className="text-sm font-semibold text-pink-800 mb-3">대리점장 2 할당</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">할당 금액:</span>
                            <span className="font-semibold">
                              {parseFloat(calculatorState.manager2Allocation).toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">대리점장 1 대비 비율:</span>
                            <span className="font-semibold">
                              {advancedCalculation.manager2Percentage > 0 
                                ? `${advancedCalculation.manager2Percentage}%` 
                                : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-orange-50 border border-orange-200 p-4">
                        <h4 className="text-sm font-semibold text-orange-800 mb-3">대리점장 1 게런티 (대리점장 2)</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">대리점장 2 순매출 이익:</span>
                            <span className="font-semibold">
                              {parseFloat(calculatorState.manager2NetProfit) > 0 
                                ? parseFloat(calculatorState.manager2NetProfit).toLocaleString() 
                                : parseFloat(calculatorState.manager2Allocation).toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">본사로부터 받는 게런티:</span>
                            <span className="font-semibold">
                              {parseFloat(calculatorState.manager1OverrideFromManager2) > 0 
                                ? parseFloat(calculatorState.manager1OverrideFromManager2).toLocaleString() 
                                : '0'}원
                            </span>
                          </div>
                          <div className="border-t border-orange-200 pt-2 mt-2">
                            <div className="flex justify-between">
                              <span className="font-semibold text-orange-800">대리점장 2 순매출 이익 대비 비율:</span>
                              <span className="font-bold text-orange-900 text-lg">
                                {advancedCalculation.manager1OverridePercentage > 0 
                                  ? `${advancedCalculation.manager1OverridePercentage}%` 
                                  : '0%'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 수익 분배 시각화 */}
            {showVisualization && advancedCalculation.hqNetProfit > 0 && calculatorMode !== 'scenario' && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📊 수익 분배 시각화</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* 파이 차트 - 수익 분배 */}
                  <div className="rounded-xl bg-white border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">수익 분배 비율</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: '본사', value: Math.max(0, advancedCalculation.hqFinalNetProfit), color: '#10b981' },
                            { name: '판매원', value: parseFloat(calculatorState.agentAllocation || '0'), color: '#3b82f6' },
                            { name: '대리점장 1', value: parseFloat(calculatorState.manager1Allocation || '0'), color: '#a855f7' },
                            { name: '대리점장 2', value: parseFloat(calculatorState.manager2Allocation || '0'), color: '#ec4899' },
                            { name: '게런티', value: parseFloat(calculatorState.manager1OverrideFromManager2 || '0') + parseFloat(calculatorState.manager1OverrideFromAgent || '0'), color: '#f97316' },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => {
                            const pct = typeof percent === 'number' ? percent : 0;
                            return `${name} ${(pct * 100).toFixed(1)}%`;
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: '본사', value: Math.max(0, advancedCalculation.hqFinalNetProfit), color: '#10b981' },
                            { name: '판매원', value: parseFloat(calculatorState.agentAllocation || '0'), color: '#3b82f6' },
                            { name: '대리점장 1', value: parseFloat(calculatorState.manager1Allocation || '0'), color: '#a855f7' },
                            { name: '대리점장 2', value: parseFloat(calculatorState.manager2Allocation || '0'), color: '#ec4899' },
                            { name: '게런티', value: parseFloat(calculatorState.manager1OverrideFromManager2 || '0') + parseFloat(calculatorState.manager1OverrideFromAgent || '0'), color: '#f97316' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 막대 차트 - 금액 비교 */}
                  <div className="rounded-xl bg-white border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">수익 금액 비교</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { name: '본사', value: Math.max(0, advancedCalculation.hqFinalNetProfit) },
                          { name: '판매원', value: parseFloat(calculatorState.agentAllocation || '0') },
                          { name: '대리점장 1', value: parseFloat(calculatorState.manager1Allocation || '0') },
                          { name: '대리점장 2', value: parseFloat(calculatorState.manager2Allocation || '0') },
                          { name: '게런티', value: parseFloat(calculatorState.manager1OverrideFromManager2 || '0') + parseFloat(calculatorState.manager1OverrideFromAgent || '0') },
                        ].filter(item => item.value > 0)}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 계산 결과 미리보기 (폼 모드용) */}
        {activeMode === 'form' && calculation && (
          <section className="rounded-3xl bg-white p-6 shadow-lg border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💰 수수료 계산 결과</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {/* 대리점장 이득 */}
              <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
                <h3 className="text-sm font-semibold text-purple-800 mb-3">대리점장 이득</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">대리점 수수료:</span>
                    <span className="font-semibold">{calculation.branchGross.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">오버라이드 수수료:</span>
                    <span className="font-semibold">{calculation.overrideGross.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">원천징수 (3.3%):</span>
                    <span className="text-red-600">-{(calculation.branchWithholding + calculation.overrideWithholding).toLocaleString()}원</span>
                  </div>
                  <div className="border-t border-purple-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-purple-800">총 이득:</span>
                      <span className="font-bold text-purple-900 text-lg">{calculation.managerNet.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 판매원 이득 */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-3">판매원 이득</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">판매 수수료:</span>
                    <span className="font-semibold">{calculation.agentGross.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">원천징수 (3.3%):</span>
                    <span className="text-red-600">-{calculation.agentWithholding.toLocaleString()}원</span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-blue-800">총 이득:</span>
                      <span className="font-bold text-blue-900 text-lg">{calculation.agentNet.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 본사 이득 */}
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-3">본사 이득</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">순이익:</span>
                    <span className="font-semibold">{calculation.netRevenue.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">카드 수수료 (3.5%):</span>
                    <span className="text-red-600">-{calculation.hqCardFees.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">법인세 (10%):</span>
                    <span className="text-red-600">-{calculation.hqCorporateTax.toLocaleString()}원</span>
                  </div>
                  <div className="border-t border-green-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-green-800">총 이득:</span>
                      <span className="font-bold text-green-900 text-lg">{calculation.hqNetAfterFees.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">판매 금액:</span>
                  <span className="font-semibold ml-2">{calculation.saleAmount.toLocaleString()}원</span>
                </div>
                <div>
                  <span className="text-gray-600">원가:</span>
                  <span className="font-semibold ml-2">{calculation.costAmount.toLocaleString()}원</span>
                </div>
                <div>
                  <span className="text-gray-600">순이익:</span>
                  <span className="font-semibold ml-2">{calculation.netRevenue.toLocaleString()}원</span>
                </div>
                <div>
                  <span className="text-gray-600">본사 순익:</span>
                  <span className="font-semibold ml-2">{calculation.hqNet.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 폼 (판매 데이터 생성 모드) */}
        {activeMode === 'form' && (
        <section className="rounded-3xl bg-white p-6 shadow-lg space-y-6">
          <h2 className="text-xl font-bold text-gray-900">고객 정보</h2>

          {/* 기존 Lead 선택 또는 새 고객 입력 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                기존 고객 선택 (선택사항)
              </label>
              <div className="relative" ref={leadDropdownRef}>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowLeadDropdown(true);
                    }}
                    onFocus={() => setShowLeadDropdown(true)}
                    placeholder="고객명 또는 전화번호로 검색..."
                    className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {showLeadDropdown && filteredLeads.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setFormState((prev) => ({
                            ...prev,
                            leadId: lead.id.toString(),
                            customerName: lead.customerName || '',
                            customerPhone: lead.customerPhone || '',
                          }));
                          setSearchTerm('');
                          setShowLeadDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                      >
                        <div className="font-medium text-gray-900">{lead.customerName || '이름 없음'}</div>
                        <div className="text-xs text-gray-500">{lead.customerPhone || '-'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">고객명</label>
                <input
                  type="text"
                  value={formState.customerName}
                  onChange={(e) => setFormState((prev) => ({ ...prev, customerName: e.target.value }))}
                  placeholder="고객 이름"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">전화번호</label>
                <input
                  type="text"
                  value={formState.customerPhone}
                  onChange={(e) => setFormState((prev) => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="010-0000-0000"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">상품 정보</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  상품 코드 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.productCode}
                  onChange={(e) => setFormState((prev) => ({ ...prev, productCode: e.target.value }))}
                  placeholder="예: COSTA-SERENA-HK-TW-JEJU-20251112"
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  판매 금액 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formState.saleAmount}
                  onChange={(e) => setFormState((prev) => ({ ...prev, saleAmount: e.target.value }))}
                  placeholder="예: 1000000"
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">원가</label>
                <input
                  type="number"
                  value={formState.costAmount}
                  onChange={(e) => setFormState((prev) => ({ ...prev, costAmount: e.target.value }))}
                  placeholder="예: 800000"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">인원수</label>
                <input
                  type="number"
                  value={formState.headcount}
                  onChange={(e) => setFormState((prev) => ({ ...prev, headcount: e.target.value }))}
                  placeholder="예: 2"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">객실 타입</label>
                <input
                  type="text"
                  value={formState.cabinType}
                  onChange={(e) => setFormState((prev) => ({ ...prev, cabinType: e.target.value }))}
                  placeholder="예: OceanView"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">요금 카테고리</label>
                <input
                  type="text"
                  value={formState.fareCategory}
                  onChange={(e) => setFormState((prev) => ({ ...prev, fareCategory: e.target.value }))}
                  placeholder="예: Standard"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">담당자 정보</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">대리점장</label>
                <select
                  value={formState.managerId}
                  onChange={(e) => setFormState((prev) => ({ ...prev, managerId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">선택 안함</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.displayName || manager.affiliateCode} ({manager.branchLabel || '-'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">판매원</label>
                <select
                  value={formState.agentId}
                  onChange={(e) => setFormState((prev) => ({ ...prev, agentId: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">선택 안함</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.displayName || agent.affiliateCode}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">기타 정보</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">주문번호</label>
                <input
                  type="text"
                  value={formState.externalOrderCode}
                  onChange={(e) => setFormState((prev) => ({ ...prev, externalOrderCode: e.target.value }))}
                  placeholder="예: ORDER-2025-001"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">판매일</label>
                <input
                  type="date"
                  value={formState.saleDate}
                  onChange={(e) => setFormState((prev) => ({ ...prev, saleDate: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={() => setFormState(EMPTY_FORM)}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              disabled={isSubmitting}
            >
              초기화
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formState.productCode || !formState.saleAmount}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-purple-700 disabled:bg-purple-300"
            >
              <FiSave className="text-base" />
              {isSubmitting ? '생성 중...' : '구매 시뮬레이션 실행'}
            </button>
          </div>
        </section>
        )}
      </div>
    </div>
  );
}


