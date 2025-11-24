'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FiSearch, FiX, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

// 타입 정의
interface AnalyticsStats {
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    hibernated: number;
  };
  features: Array<{
    feature: string;
    usageCount: number;
    activeUsers: number;
  }>;
  trips: {
    total: number;
    thisWeek: number;
    avgDuration: number;
    topDestinations: Array<{ name: string; count: number }>;
  };
  expenses: {
    totalKRW: number;
    avgDaily: number;
    byCategory: Record<string, number>;
  };
  rePurchase: {
    conversionRate: number;
    pending: number;
    converted: number;
    total: number;
    byTripCount?: {
      first: number;
      second: number;
      third: number;
      fourth: number;
      fifthPlus: number;
    };
    conversionRates?: {
      firstToSecond: number;
      secondToThird: number;
      thirdToFourth: number;
      fourthToFifth: number;
    };
  };
  averages?: {
    avgTripCountPerUser: number;
    avgChatMessagesPerUser: number;
    avgChecklistItemsPerUser: number;
    avgChecklistCompletionRate: number;
    avgExpensesPerUser: number;
    avgExpenseAmountPerUser: number;
    avgTranslationUsageRate: number;
    avgFeatureUsagePerUser: number;
  };
}

interface TrendData {
  date: string;
  newUsers: number;
  activeUsers: number;
  newTrips: number;
}

interface MarketingInsight {
  id: number;
  userId: number;
  insightType: string;
  data: any;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string | null;
    phone: string | null;
    mallUserId?: string | null;
    mallNickname?: string | null;
    genieStatus?: string | null;
    genieLinkedAt?: string | null;
    mallUser?: {
      id: number;
      name: string | null;
      phone: string | null;
    } | null;
  };
}

import { Customer } from '@/types/customer';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const INSIGHT_TYPE_NAMES: Record<string, string> = {
  destination_preference: '목적지 선호도',
  spending_pattern: '지출 패턴',
  feature_usage: '기능 사용 패턴',
  re_purchase_score: '재구매 점수',
  engagement_score: '고객 참여도',
  satisfaction_score: '고객 만족도',
  lifecycle_stage: '고객 라이프사이클',
  cruise_preference: '선호 크루즈 분석',
  communication_preference: '소통 선호도',
};

const FEATURE_NAMES: Record<string, string> = {
  ai_chat: 'AI 채팅',
  checklist: '체크리스트',
  wallet: '가계부',
  map: '지도',
  translator: '번역기',
};

// 통계 카드 컴포넌트
const StatCard = memo(function StatCard({
  title,
  value,
  icon,
  color = 'blue',
}: {
  title: string;
  value: number | string;
  icon: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    yellow: 'from-yellow-500 to-amber-600',
    red: 'from-red-500 to-pink-600',
    purple: 'from-purple-500 to-pink-600',
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6 hover:shadow-xl hover:scale-105 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2">{title}</p>
          <p className="text-4xl font-extrabold text-gray-900 mb-2">{value}</p>
        </div>
        <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 shadow-md`}>
          <span className="text-3xl text-white">{icon}</span>
        </div>
      </div>
    </div>
  );
});

// 시간 범위 선택 컴포넌트
const TimeRangeSelector = memo(function TimeRangeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const timeRangeOptions = useMemo(
    () => [
      { label: '7일', value: '7d' },
      { label: '30일', value: '30d' },
      { label: '90일', value: '90d' },
    ],
    []
  );

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-semibold text-gray-700">기간 선택:</span>
      {timeRangeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-5 py-2.5 rounded-xl font-bold transition-all shadow-md ${
            value === option.value
              ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});

export default function DataAnalysisPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [insights, setInsights] = useState<MarketingInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [generating, setGenerating] = useState(false);
  
  // 고객 검색 관련 상태
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');

  // Analytics 데이터 로드
  const loadAnalytics = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const analyticsUrl = `/api/admin/analytics?range=${timeRange}`;
      
      const analyticsResponse = await fetch(analyticsUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!analyticsResponse.ok) {
        let errorMessage = '데이터를 불러올 수 없습니다.';
        
        if (analyticsResponse.status === 401) {
          errorMessage = '인증이 필요합니다. 다시 로그인해 주세요.';
        } else if (analyticsResponse.status === 403) {
          errorMessage = '접근 권한이 없습니다.';
        } else if (analyticsResponse.status >= 500) {
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        }
        
        throw new Error(errorMessage);
      }
      
      const analyticsData = await analyticsResponse.json().catch((err) => {
        console.error('[Data Analysis] JSON parse error:', err);
        throw new Error('응답 데이터를 파싱할 수 없습니다.');
      });
      
      if (!analyticsData.ok) {
        throw new Error(analyticsData.error || '데이터를 불러올 수 없습니다.');
      }
      
      if (!analyticsData.stats) {
        throw new Error('데이터 형식이 올바르지 않습니다.');
      }
      
      setStats(analyticsData.stats);
      setTrends(analyticsData.trends || []);
      setError(null);
    } catch (error) {
      console.error('[Data Analysis] Error loading analytics:', error);
      
      let errorMessage = '데이터를 불러오는 중 오류가 발생했습니다.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = '네트워크 연결을 확인하고 다시 시도해 주세요.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setStats(null);
      setTrends([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [timeRange]);

  // Insights 데이터 로드 (필터만 변경될 때)
  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUserId !== null && selectedUserId !== undefined) {
        params.append('userId', selectedUserId.toString());
      }
      if (selectedType) {
        params.append('type', selectedType);
      }
      
      const insightsUrl = `/api/admin/insights?${params.toString()}`;
      
      const insightsResponse = await fetch(insightsUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        if (insightsData.ok) {
          setInsights(insightsData.insights || []);
        }
      } else {
        setInsights([]);
      }
    } catch (insightsError) {
      console.warn('[Data Analysis] Insights loading error:', insightsError);
      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  }, [selectedUserId, selectedType]);

  // 전체 데이터 로드 (새로고침 버튼 클릭 시) - 병렬 처리
  const loadData = useCallback(async () => {
    setLoading(true);
    setInsightsLoading(true);
    setError(null);
    
    const params = new URLSearchParams();
    if (selectedUserId !== null && selectedUserId !== undefined) {
      params.append('userId', selectedUserId.toString());
    }
    if (selectedType) {
      params.append('type', selectedType);
    }
    
    try {
      const [analyticsResponse, insightsResponse] = await Promise.all([
        fetch(`/api/admin/analytics?range=${timeRange}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch(`/api/admin/insights?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);

      // Analytics 처리
      if (!analyticsResponse.ok) {
        let errorMessage = '데이터를 불러올 수 없습니다.';
        if (analyticsResponse.status === 401) {
          errorMessage = '인증이 필요합니다. 다시 로그인해 주세요.';
        } else if (analyticsResponse.status === 403) {
          errorMessage = '접근 권한이 없습니다.';
        } else if (analyticsResponse.status >= 500) {
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        }
        throw new Error(errorMessage);
      }

      const analyticsData = await analyticsResponse.json();
      if (analyticsData.ok && analyticsData.stats) {
        setStats(analyticsData.stats);
        setTrends(analyticsData.trends || []);
      } else {
        throw new Error(analyticsData.error || '데이터를 불러올 수 없습니다.');
      }

      // Insights 처리
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        if (insightsData.ok) {
          setInsights(insightsData.insights || []);
        }
      }

      setError(null);
    } catch (error) {
      console.error('[Data Analysis] Error loading data:', error);
      let errorMessage = '데이터를 불러오는 중 오류가 발생했습니다.';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = '네트워크 연결을 확인하고 다시 시도해 주세요.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      if (!stats) {
        setStats(null);
        setTrends([]);
      }
    } finally {
      setLoading(false);
      setInsightsLoading(false);
    }
  }, [timeRange, selectedUserId, selectedType]);

  // 초기 로드: Analytics와 Insights를 병렬로 로드
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setInsightsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedUserId !== null && selectedUserId !== undefined) {
        params.append('userId', selectedUserId.toString());
      }
      if (selectedType) {
        params.append('type', selectedType);
      }
      
      try {
        const [analyticsResponse, insightsResponse] = await Promise.all([
          fetch(`/api/admin/analytics?range=${timeRange}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`/api/admin/insights?${params.toString()}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);

        // Analytics 처리
        if (!analyticsResponse.ok) {
          let errorMessage = '데이터를 불러올 수 없습니다.';
          if (analyticsResponse.status === 401) {
            errorMessage = '인증이 필요합니다. 다시 로그인해 주세요.';
          } else if (analyticsResponse.status === 403) {
            errorMessage = '접근 권한이 없습니다.';
          } else if (analyticsResponse.status >= 500) {
            errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
          }
          throw new Error(errorMessage);
        }

        const analyticsData = await analyticsResponse.json();
        if (analyticsData.ok && analyticsData.stats) {
          setStats(analyticsData.stats);
          setTrends(analyticsData.trends || []);
        } else {
          throw new Error(analyticsData.error || '데이터를 불러올 수 없습니다.');
        }

        // Insights 처리
        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          if (insightsData.ok) {
            setInsights(insightsData.insights || []);
          }
        }

        setError(null);
      } catch (error) {
        console.error('[Data Analysis] Error loading data:', error);
        let errorMessage = '데이터를 불러오는 중 오류가 발생했습니다.';
        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorMessage = '네트워크 연결을 확인하고 다시 시도해 주세요.';
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        setError(errorMessage);
        setStats(null);
        setTrends([]);
      } finally {
        setLoading(false);
        setInsightsLoading(false);
      }
    };

    loadInitialData();
  }, [timeRange]); // timeRange 변경 시에만 전체 재로드

  // Insights 필터 변경 시 Insights만 다시 로드
  useEffect(() => {
    // 초기 로드가 아닐 때만 Insights 로드 (Analytics가 이미 로드된 후)
    if (stats !== null) {
      loadInsights();
    }
  }, [selectedUserId, selectedType]); // 필터만 변경될 때

  // 고객 검색
  useEffect(() => {
    if (!customerSearchTerm.trim()) {
      setCustomerSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const response = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(customerSearchTerm)}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            setCustomerSearchResults(data.customers || []);
          }
        }
      } catch (error) {
        console.error('Customer search error:', error);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedUserId(customer.id);
    setCustomerSearchTerm(`${customer.name || ''} (${customer.phone || ''})`);
    setCustomerSearchResults([]);
  };

  const handleClearCustomer = () => {
    setSelectedUserId(null);
    setCustomerSearchTerm('');
    setCustomerSearchResults([]);
  };

  const handleGenerate = useCallback(async (userId?: number) => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId || null,
          all: !userId,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          alert(data.message || '인사이트 생성 완료');
          setTimeout(() => loadInsights(), 500);
        } else {
          alert('인사이트 생성 실패: ' + (data.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('[Data Analysis] Error generating insights:', error);
      alert('인사이트 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  }, [loadInsights]);

  // 차트 데이터 준비
  const featureData = useMemo(() => {
    if (!stats) return [];
    return stats.features.map((f) => ({
      name: FEATURE_NAMES[f.feature] || f.feature,
      value: f.usageCount,
      activeUsers: f.activeUsers,
    }));
  }, [stats?.features]);

  const expenseCategoryData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.expenses.byCategory).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  }, [stats?.expenses.byCategory]);

  const topDestinationsData = useMemo(() => {
    if (!stats) return [];
    return stats.trips.topDestinations
      .slice(0, 10)
      .map((d, index) => ({
        name: d.name,
        count: d.count,
        fill: COLORS[index % COLORS.length],
      }));
  }, [stats?.trips.topDestinations]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">데이터분석</h1>
          <p className="text-gray-600">고객의 모든 여정을 한눈에 확인하세요</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-brand-red border-t-transparent mb-4"></div>
          <p className="text-lg font-medium text-gray-700">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2 flex items-center gap-3">
            <span className="text-5xl">📊</span>
            데이터분석
          </h1>
          <p className="text-lg text-gray-600 font-medium">고객의 모든 여정을 한눈에 확인하세요</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:scale-105"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-500 text-xl">⚠️</span>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={() => loadAnalytics(true)}
              className="text-red-600 hover:text-red-800 text-sm font-medium underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 시간 범위 선택 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <TimeRangeSelector value={timeRange} onChange={(v) => setTimeRange(v as '7d' | '30d' | '90d')} />
      </div>

      {/* 1. 주요 지표 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="총 사용자"
            value={stats.users.total || 0}
            icon="👥"
            color="blue"
          />
          <StatCard
            title="활성 사용자"
            value={stats.users.active || 0}
            icon="✅"
            color="green"
          />
          <StatCard
            title="이번 주 신규"
            value={stats.users.newThisWeek || 0}
            icon="🆕"
            color="yellow"
          />
          <StatCard
            title="재구매 전환율"
            value={`${stats.rePurchase.conversionRate || 0}%`}
            icon="🔄"
            color="red"
          />
        </div>
      )}

      {/* 2. 재구매 전환 추적 */}
      {stats && stats.rePurchase && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>🔄</span>
            재구매 전환 추적
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">전체 잠재 고객</p>
              <p className="text-2xl font-bold text-blue-600">{stats.rePurchase.total}</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600">전환 대기</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.rePurchase.pending}</p>
              <p className="text-xs text-gray-500 mt-1">(첫 번째 여행)</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">전환 완료</p>
              <p className="text-2xl font-bold text-green-600">{stats.rePurchase.converted}</p>
              <p className="text-xs text-gray-500 mt-1">(2회 이상)</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">전체 전환율</p>
              <p className="text-2xl font-bold text-red-600">{stats.rePurchase.conversionRate}%</p>
            </div>
          </div>

          {/* 여행 횟수별 분포 */}
          {stats.rePurchase.byTripCount && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-700 mb-3">여행 횟수별 고객 분포</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">1회</p>
                  <p className="text-xl font-bold text-gray-800">{stats.rePurchase.byTripCount.first || 0}명</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">2회</p>
                  <p className="text-xl font-bold text-green-700">{stats.rePurchase.byTripCount.second || 0}명</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">3회</p>
                  <p className="text-xl font-bold text-blue-700">{stats.rePurchase.byTripCount.third || 0}명</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">4회</p>
                  <p className="text-xl font-bold text-purple-700">{stats.rePurchase.byTripCount.fourth || 0}명</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">5회 이상</p>
                  <p className="text-xl font-bold text-indigo-700">{stats.rePurchase.byTripCount.fifthPlus || 0}명</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: '1회', value: stats.rePurchase.byTripCount.first },
                  { name: '2회', value: stats.rePurchase.byTripCount.second },
                  { name: '3회', value: stats.rePurchase.byTripCount.third },
                  { name: '4회', value: stats.rePurchase.byTripCount.fourth },
                  { name: '5회+', value: stats.rePurchase.byTripCount.fifthPlus },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="고객 수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 단계별 전환율 차트 */}
          {stats.rePurchase.conversionRates && (
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-3">단계별 전환율</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">1회 → 2회</p>
                  <p className="text-xl font-bold text-yellow-700">{stats.rePurchase.conversionRates.firstToSecond || 0}%</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">2회 → 3회</p>
                  <p className="text-xl font-bold text-green-700">{stats.rePurchase.conversionRates.secondToThird || 0}%</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">3회 → 4회</p>
                  <p className="text-xl font-bold text-blue-700">{stats.rePurchase.conversionRates.thirdToFourth || 0}%</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">4회 → 5회+</p>
                  <p className="text-xl font-bold text-purple-700">{stats.rePurchase.conversionRates.fourthToFifth || 0}%</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { step: '1회→2회', rate: stats.rePurchase.conversionRates.firstToSecond },
                  { step: '2회→3회', rate: stats.rePurchase.conversionRates.secondToThird },
                  { step: '3회→4회', rate: stats.rePurchase.conversionRates.thirdToFourth },
                  { step: '4회→5회+', rate: stats.rePurchase.conversionRates.fourthToFifth },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="step" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="rate" fill="#ff8042" name="전환율 (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* 3. 사용자 증가 추이 (라인 차트) */}
      {stats && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-4">사용자 증가 추이</h3>
          {trends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-lg font-medium">추이 데이터가 없습니다</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('ko-KR');
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#8884d8"
                  name="신규 가입자"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#82ca9d"
                  name="활성 사용자"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* 4. 기능 사용 분포 (파이 차트 및 바 차트) */}
      {stats && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-4">기능 사용 분포</h3>
          {featureData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📱</div>
              <p className="text-lg font-medium">기능 사용 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={featureData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {featureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={featureData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="사용 횟수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* 5. 인기 여행지 Top 10 (수평 바 차트) */}
      {stats && topDestinationsData.length > 0 && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
          <h3 className="text-2xl font-extrabold text-gray-900 mb-4">인기 여행지 Top 10</h3>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={topDestinationsData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                type="number" 
                tick={{ fill: '#374151', fontSize: 12 }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={150}
                tick={{ fill: '#374151', fontSize: 12 }}
                interval={0}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString()}회`, '여행 수']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="count" name="여행 수" radius={[0, 8, 8, 0]}>
                {topDestinationsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 6. 카테고리별 지출 분포 (바 차트) */}
      {stats && expenseCategoryData.length > 0 && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-4">카테고리별 지출 분포</h3>
          <div className="mb-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              총 지출: {stats.expenses.totalKRW.toLocaleString()}원
            </p>
            <p className="text-sm text-gray-600 mt-1">
              평균 일일 지출: {stats.expenses.avgDaily.toLocaleString()}원
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expenseCategoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toLocaleString()}원`} />
              <Legend />
              <Bar dataKey="value" fill="#FF8042" name="지출 금액 (원)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 7. 전체 평균 데이터 (8개 평균 지표) */}
      {stats && stats.averages && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-4">📊 전체 평균 데이터</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">평균 여행 횟수</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averages.avgTripCountPerUser}회</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">평균 채팅 메시지</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averages.avgChatMessagesPerUser}개</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">평균 체크리스트 항목</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averages.avgChecklistItemsPerUser}개</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">체크리스트 완료율</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averages.avgChecklistCompletionRate}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">평균 지출 항목</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averages.avgExpensesPerUser}개</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">평균 지출 금액</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averages.avgExpenseAmountPerUser.toLocaleString()}원</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">번역기 사용률</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averages.avgTranslationUsageRate}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">평균 기능 사용</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averages.avgFeatureUsagePerUser}회</p>
            </div>
          </div>
        </div>
      )}

      {/* 8. 마케팅 인사이트 (고객 검색, 필터링, 인사이트 생성 및 표시) */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <span>💡</span>
            마케팅 인사이트
          </h3>
          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 disabled:hover:scale-100"
          >
            {generating ? '생성 중...' : '전체 사용자 인사이트 생성'}
          </button>
        </div>

        {/* 필터 */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 고객 검색 */}
            <div className="flex-1 relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                고객 검색
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    if (!e.target.value) {
                      handleClearCustomer();
                    }
                  }}
                  placeholder="고객 이름 또는 연락처로 검색"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base pr-12"
                />
                {customerSearchTerm && (
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                )}
              </div>
              {customerSearchResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border-2 border-gray-300 rounded-lg shadow-xl mt-2 max-h-60 overflow-y-auto">
                  {customerSearchResults.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{customer.name || '이름 없음'}</p>
                        <p className="text-sm text-gray-500">{customer.phone || '연락처 없음'}</p>
                      </div>
                      {selectedUserId === customer.id && (
                        <FiCheckCircle className="text-blue-500" size={20} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 인사이트 타입 필터 */}
            <div className="w-full md:w-auto">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                인사이트 타입
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full md:w-auto px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="">전체</option>
                {Object.entries(INSIGHT_TYPE_NAMES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedUserId && (
            <button
              onClick={() => handleGenerate(selectedUserId)}
              disabled={generating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {generating ? '생성 중...' : '선택한 고객 인사이트 생성'}
            </button>
          )}
        </div>

        {/* 인사이트 목록 */}
        {insightsLoading ? (
          <div className="bg-white rounded-lg shadow-sm border p-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">인사이트를 불러오는 중...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-16 text-center">
            <div className="text-6xl mb-6">💡</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">인사이트가 없습니다</h3>
            <p className="text-gray-600 mb-6">마케팅 인사이트를 생성하여 사용자 패턴을 분석하세요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => {
              const user = insight.user || { id: insight.userId, name: null, phone: null };
              const isLinked = !!user.mallUser || !!user.mallUserId;
              
              return (
                <div key={insight.id} className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6 hover:shadow-xl transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold text-gray-800">
                          {user.name || '이름 없음'} ({user.phone || '전화번호 없음'})
                        </h4>
                        {isLinked && (
                          <span className="px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700 border border-green-300">
                            연동됨
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {INSIGHT_TYPE_NAMES[insight.insightType] || insight.insightType}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>업데이트: {new Date(insight.updatedAt).toLocaleString('ko-KR')}</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm max-h-96">
                      {JSON.stringify(insight.data, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
