'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiAlertCircle, FiClock, FiRefreshCw, FiArrowRight } from 'react-icons/fi';

// 성능 최적화: 차트 컴포넌트를 별도 파일로 분리하여 동적 임포트
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(
  () => import('@/components/admin/DashboardCharts'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6">
        <div className="h-[300px] bg-slate-100 animate-pulse rounded-xl" />
      </div>
    ),
  }
);

interface DashboardData {
  users: {
    total: number;
    active: number;
    hibernated: number;
    genieUsers?: number;
    mallUsers?: number;
  };
  trips: {
    total: number;
    upcoming: number;
    inProgress: number;
    completed: number;
  };
  currentTrips: Array<{
    id: number;
    cruiseName: string;
    userName: string;
    userPhone: string;
    startDate: string;
    endDate: string;
    destination: string[];
  }>;
  satisfaction: {
    average: number;
    count: number;
    recentFeedback: Array<{
      id: number;
      tripId: number;
      cruiseName: string;
      score: number;
      comments: string | null;
      createdAt: string;
    }>;
  };
  notifications: {
    total: number;
    byType: Array<{ type: string; count: number }>;
  };
  pushSubscriptions: number;
  products: number;
  trends: Array<{
    date: string;
    users: number;
    trips: number;
  }>;
  productViews?: {
    topCruises: Array<{ name: string; count: number }>;
    topCountries: Array<{ name: string; count: number }>;
  };
  pwaInstalls?: {
    genie: number;
    mall: number;
    both: number;
  };
  trialLeads?: number;
  b2bLeads?: number;
  purchasedCustomers?: number;
  recentTrialLeads?: Array<{
    id: number;
    name: string | null;
    phone: string | null;
    source: string | null;
    status: string;
    createdAt: string;
    metadata: any;
  }>;
  affiliate?: {
    sales?: {
      count: number;
      amount: number;
    };
    recentSales?: Array<{
      id: number;
      productCode: string | null;
      saleAmount: number;
      saleDate: string | null;
      agentName: string;
      managerName: string;
      status: string;
    }>;
  };
}

interface RecentTrip {
  id: number;
  cruiseName: string;
  destination: string[];
  startDate: string;
  userName: string;
}

interface MonitoringData {
  contractStats: {
    total: number;
    active: number;
    pending: number;
    terminated: number;
    renewalPending: number;
  };
  dbRecoveryIssues: {
    total: number;
    needsAttention: number;
    list: Array<{
      contractId: number;
      contractType: string;
      profileName: string;
      userName: string;
      userPhone: string | null;
      terminatedAt: string | null;
      daysSinceTermination: number | null;
      retryCount: number;
      lastRetryAt: string | null;
      lastError: string | null;
      needsAttention: boolean;
    }>;
  };
  recentTerminations: Array<{
    contractId: number;
    contractType: string;
    profileName: string;
    userName: string;
    terminatedAt: string;
    reason: string;
  }>;
  commissionErrors: {
    total: number;
    list: Array<{
      saleId: number;
      productCode: string | null;
      saleAmount: number;
      managerName: string;
      agentName: string | null;
      createdAt: string;
    }>;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // 5분마다 자동 갱신
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      
      // 성능 최적화: 모든 API를 병렬로 호출하여 로딩 시간 단축
      const [
        dashboardResponse,
        monitoringResponse,
        tripsResponse,
      ] = await Promise.all([
        fetch('/api/admin/dashboard', { credentials: 'include' }),
        fetch('/api/admin/affiliate/monitoring', { credentials: 'include' }).catch(() => null),
        fetch('/api/admin/trips/recent', { credentials: 'include' }).catch(() => null),
      ]);

      // 대시보드 데이터 처리
      if (!dashboardResponse.ok) {
        if (dashboardResponse.status === 401 || dashboardResponse.status === 403) {
          const errorData = await dashboardResponse.json().catch(() => ({}));
          const errorMsg = errorData?.error || '세션이 만료되었습니다. 다시 로그인해 주세요.';
          alert(errorMsg);
          window.location.href = '/admin/login';
          throw new Error(errorMsg);
        }
        const errorData = await dashboardResponse.json().catch(() => ({}));
        throw new Error(errorData?.error || '대시보드 데이터를 불러올 수 없습니다.');
      }

      const dashboardResult = await dashboardResponse.json();
      if (!dashboardResult.ok) {
        throw new Error(dashboardResult.error || '데이터를 불러오는 중 오류가 발생했습니다.');
      }

      setDashboardData(dashboardResult.dashboard);

      // 모니터링 데이터 처리
      if (monitoringResponse?.ok) {
        try {
          const monitoringResult = await monitoringResponse.json();
          if (monitoringResult.ok) {
            setMonitoringData(monitoringResult.data);
          }
        } catch (monitoringError) {
          console.error('[Dashboard] Failed to parse monitoring data:', monitoringError);
        }
      }

      // 최근 여행 처리
      if (tripsResponse?.ok) {
        try {
          const tripsData = await tripsResponse.json();
          if (tripsData.ok && tripsData.trips) {
            setRecentTrips(tripsData.trips);
          }
        } catch (err) {
          console.warn('최근 여행 로드 실패:', err);
        }
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError(error instanceof Error ? error.message : '대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 통계 카드 데이터 (8개 항목: 총고객수, 전체여행수, 구매고객수, 지니3일체험 유입수, B2B유입수, 만족도평균, 크루즈몰가입인원, PWA바탕화면추가)
  const statCards = dashboardData ? [
    {
      title: '총 고객 수',
      value: dashboardData.users.total,
      icon: '👥',
      color: 'bg-blue-500',
      subtitle: `지니AI: ${dashboardData.users.genieUsers || 0} | 크루즈몰: ${dashboardData.users.mallUsers || 0}`,
      source: 'all',
      sourceLabel: '전체',
    },
    {
      title: '전체 여행 수',
      value: dashboardData.trips.total,
      icon: '🚢',
      color: 'bg-green-500',
      subtitle: `진행중: ${dashboardData.trips.inProgress} | 예정: ${dashboardData.trips.upcoming}`,
      source: 'genie',
      sourceLabel: '지니AI 가이드',
    },
    {
      title: '구매 고객 수',
      value: dashboardData.purchasedCustomers || 0,
      icon: '💰',
      color: 'bg-emerald-500',
      subtitle: `총 구매 건수`,
      source: 'affiliate',
      sourceLabel: '어필리에이트',
    },
    {
      title: '지니3일체험 유입',
      value: dashboardData.trialLeads || 0,
      icon: '🎯',
      color: 'bg-orange-500',
      subtitle: `3일 무료체험 신청자`,
      source: 'trial',
      sourceLabel: '체험',
    },
    {
      title: 'B2B 유입 수',
      value: dashboardData.b2bLeads || 0,
      icon: '🏢',
      color: 'bg-cyan-500',
      subtitle: `B2B 랜딩페이지 유입`,
      source: 'b2b',
      sourceLabel: 'B2B',
    },
    {
      title: '만족도 평균',
      value: dashboardData.satisfaction.average > 0
        ? `${dashboardData.satisfaction.average.toFixed(1)}점`
        : 'N/A',
      icon: '⭐',
      color: 'bg-yellow-500',
      subtitle: `크루즈몰 후기 ${dashboardData.satisfaction.count}개`,
      source: 'mall',
      sourceLabel: '크루즈몰',
    },
    {
      title: '크루즈몰 가입 인원',
      value: dashboardData.pushSubscriptions,
      icon: '🔔',
      color: 'bg-purple-500',
      subtitle: `크루즈몰 회원 수`,
      source: 'mall',
      sourceLabel: '크루즈몰',
    },
    ...(dashboardData.pwaInstalls ? [
      {
        title: 'PWA 바탕화면 추가',
        value: dashboardData.pwaInstalls.genie + dashboardData.pwaInstalls.mall - dashboardData.pwaInstalls.both,
        icon: '📲',
        color: 'bg-indigo-500',
        subtitle: `지니: ${dashboardData.pwaInstalls.genie} | 몰: ${dashboardData.pwaInstalls.mall}`,
        source: 'all',
        sourceLabel: '전체',
      },
    ] : []),
  ] : [];

  // 알림/경고 항목 계산
  const alerts = dashboardData ? [
    ...(dashboardData.trips.inProgress > 0 
      ? [{
          type: 'info' as const,
          message: `현재 ${dashboardData.trips.inProgress}개의 여행이 진행 중입니다.`,
          icon: '🚢',
          action: () => router.push('/admin/customers'),
        }]
      : []),
    ...(dashboardData.satisfaction.count > 0 && dashboardData.satisfaction.average < 3.5
      ? [{
          type: 'warning' as const,
          message: `크루즈몰 평균 만족도가 낮습니다 (${dashboardData.satisfaction.average.toFixed(1)}점)`,
          icon: '⚠️',
          action: () => router.push('/admin/feedback'),
        }]
      : []),
    ...(dashboardData.users.hibernated > 0
      ? [{
          type: 'info' as const,
          message: `${dashboardData.users.hibernated}명의 동면 사용자가 있습니다.`,
          icon: '😴',
          action: () => router.push('/admin/customers'),
        }]
      : []),
  ] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600">대시보드 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <div className="flex items-start">
          <FiAlertCircle className="text-slate-600 text-xl mt-1 mr-3" />
          <div className="flex-1">
            <h3 className="text-slate-900 font-semibold mb-2">오류 발생</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={() => loadDashboardData()}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    // 데이터가 없어도 화상 회의는 표시
    return (
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-1">Dashboard</p>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              대시보드
            </h1>
            <p className="text-sm text-slate-500 mt-1">크루즈 가이드 관리 현황을 확인하세요</p>
          </div>
        </div>


        <div className="text-center py-8 text-slate-500 text-sm">
          대시보드 데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-1">Dashboard</p>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            대시보드
          </h1>
          <p className="text-sm text-slate-500 mt-1">크루즈 가이드 관리 현황을 확인하세요</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-medium text-slate-600 bg-slate-100 px-4 py-2.5 rounded-xl flex items-center gap-2">
            <FiClock className="w-4 h-4" />
            마지막 갱신: {lastUpdated.toLocaleTimeString('ko-KR')}
          </div>
          <button
            onClick={() => loadDashboardData()}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '갱신 중...' : '갱신'}
          </button>
        </div>
      </div>


      {/* 최근 유입 고객 & 최근 판매 상품 */}
      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 최근 유입 고객 (지니3일 무료체험/B2B 유입) */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">최근 유입 고객</h2>
                  <span className="text-xs font-medium text-slate-500">체험/B2B</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/admin/affiliate/customers')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                전체 보기 <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {dashboardData.recentTrialLeads && dashboardData.recentTrialLeads.length > 0 ? (
                dashboardData.recentTrialLeads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push(`/admin/affiliate/customers?leadId=${lead.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        <span className="text-xl">{lead.source?.includes('B2B') ? '🏢' : '🎯'}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{lead.name || '이름 미입력'}</p>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            lead.source?.includes('B2B')
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {lead.source?.includes('B2B') ? 'B2B' : '체험'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            lead.status === 'NEW' ? 'bg-slate-900 text-white' :
                            lead.status === 'CONTACTED' ? 'bg-slate-600 text-white' :
                            lead.status === 'PURCHASED' ? 'bg-slate-400 text-white' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {lead.status === 'NEW' ? '신규' :
                             lead.status === 'CONTACTED' ? '연락완료' :
                             lead.status === 'PURCHASED' ? '구매완료' :
                             lead.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{lead.phone || '연락처 미입력'}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                      {new Date(lead.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl">
                  <p className="text-slate-500">최근 유입 고객이 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* 최근 판매 상품 */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">최근 판매 상품</h2>
                  <span className="text-xs font-medium text-slate-500">어필리에이트</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/admin/affiliate/sales')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                전체 보기 <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {dashboardData.affiliate?.recentSales && dashboardData.affiliate.recentSales.length > 0 ? (
                dashboardData.affiliate.recentSales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push(`/admin/affiliate/sales?saleId=${sale.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        <span className="text-xl">🚢</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{sale.productCode || '상품코드 없음'}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                          <span className="font-semibold text-slate-700">{sale.saleAmount?.toLocaleString()}원</span>
                          <span>•</span>
                          <span>{sale.managerName}</span>
                          {sale.agentName && sale.agentName !== '판매원' && (
                            <>
                              <span>•</span>
                              <span>{sale.agentName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        sale.status === 'CONFIRMED' ? 'bg-slate-900 text-white' :
                        sale.status === 'PENDING' ? 'bg-slate-400 text-white' :
                        sale.status === 'REFUNDED' ? 'bg-slate-200 text-slate-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {sale.status === 'CONFIRMED' ? '확정' :
                         sale.status === 'PENDING' ? '대기' :
                         sale.status === 'REFUNDED' ? '환불' :
                         sale.status}
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                        {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('ko-KR') : '-'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl">
                  <p className="text-slate-500">최근 판매 상품이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-slate-600">{card.title}</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {card.sourceLabel}
                  </span>
                </div>
                <p className="text-4xl font-extrabold text-slate-900 mb-2">{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">{card.subtitle}</p>
                )}
              </div>
              <div className="bg-slate-900 rounded-xl p-4 shadow-lg">
                <span className="text-3xl">{card.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 알림/경고 (진행 중인 여행 알림 제외) */}
      {alerts.filter(alert => !alert.message.includes('여행이 진행 중')).length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <FiAlertCircle className="text-slate-600 text-xl" />
            </div>
            알림 및 경고
          </h2>
          <div className="space-y-4">
            {alerts.filter(alert => !alert.message.includes('여행이 진행 중')).map((alert, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-5 rounded-xl border shadow-sm hover:shadow-md transition-all ${
                  alert.type === 'warning'
                    ? 'bg-slate-50 border-slate-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{alert.icon}</span>
                  <p className="font-bold text-lg text-slate-800">
                    {alert.message}
                  </p>
                </div>
                <button
                  onClick={alert.action}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg bg-slate-900 hover:bg-slate-800 text-white"
                >
                  확인
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 진행 중인 여행 (알림 메시지 포함) */}
      {dashboardData.currentTrips.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">🚢</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">진행 중인 여행</h2>
                <span className="text-xs font-medium text-slate-500">지니AI 가이드</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/customers')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              전체 보기 <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
          {/* 진행 중인 여행 알림 메시지 */}
          {dashboardData.trips.inProgress > 0 && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚢</span>
                <p className="font-bold text-lg text-slate-800">
                  현재 {dashboardData.trips.inProgress}개의 여행이 진행 중입니다.
                </p>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {dashboardData.currentTrips.slice(0, 5).map((trip) => (
              <div
                key={trip.id}
                className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/admin/customers/${trip.userName}`)}
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{trip.cruiseName}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    <span>{trip.userName} ({trip.userPhone})</span>
                    <span>•</span>
                    <span>{Array.isArray(trip.destination) ? trip.destination.join(', ') : trip.destination}</span>
                    <span>•</span>
                    <span>
                      {new Date(trip.startDate).toLocaleDateString('ko-KR')} - {new Date(trip.endDate).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 차트 섹션 (동적 임포트) */}
      <DashboardCharts 
        trends={dashboardData.trends || []} 
        productViews={dashboardData.productViews}
      />


      {/* 최근 피드백 */}
      {dashboardData.satisfaction.recentFeedback.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">⭐</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">최근 피드백</h2>
                <span className="text-xs font-medium text-slate-500">크루즈몰</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/feedback')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              전체 보기 <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {dashboardData.satisfaction.recentFeedback.map((feedback) => (
              <div
                key={feedback.id}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-slate-700">{'⭐'.repeat(Math.round(feedback.score))}</span>
                    <span className="text-sm text-slate-600">{feedback.cruiseName}</span>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                    {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {feedback.comments && (
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{feedback.comments}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 계약 모니터링 */}
      {monitoringData && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">계약 모니터링</h2>
                <span className="text-xs font-medium text-slate-500">어필리에이트</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/affiliate/contracts')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              전체 보기 <FiArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 계약 상태 요약 - 더 명확한 카운터 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center">
              <p className="text-sm font-semibold text-slate-600 mb-2">전체 계약</p>
              <p className="text-4xl font-extrabold text-slate-900">{monitoringData.contractStats.total}</p>
              <p className="text-xs text-slate-500 mt-1">건</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-xl text-center">
              <p className="text-sm font-semibold text-slate-300 mb-2">활성</p>
              <p className="text-4xl font-extrabold text-white">{monitoringData.contractStats.active}</p>
              <p className="text-xs text-slate-400 mt-1">건</p>
            </div>
            <div className="bg-slate-100 p-5 rounded-xl border border-slate-200 text-center">
              <p className="text-sm font-semibold text-slate-600 mb-2">승인 대기</p>
              <p className="text-4xl font-extrabold text-slate-700">{monitoringData.contractStats.pending}</p>
              <p className="text-xs text-slate-500 mt-1">건</p>
            </div>
            <div className="bg-slate-200 p-5 rounded-xl text-center">
              <p className="text-sm font-semibold text-slate-600 mb-2">해지</p>
              <p className="text-4xl font-extrabold text-slate-700">{monitoringData.contractStats.terminated}</p>
              <p className="text-xs text-slate-500 mt-1">건</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center">
              <p className="text-sm font-semibold text-slate-600 mb-2">갱신 대기</p>
              <p className="text-4xl font-extrabold text-slate-800">{monitoringData.contractStats.renewalPending}</p>
              <p className="text-xs text-slate-500 mt-1">건</p>
            </div>
          </div>

          {/* DB 회수 이슈 */}
          {monitoringData.dbRecoveryIssues.total > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  DB 회수 이슈
                  {monitoringData.dbRecoveryIssues.needsAttention > 0 && (
                    <span className="ml-2 px-2 py-1 bg-slate-900 text-white text-xs font-bold rounded-full">
                      {monitoringData.dbRecoveryIssues.needsAttention}건 주의 필요
                    </span>
                  )}
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {monitoringData.dbRecoveryIssues.list.slice(0, 5).map((issue) => (
                  <div
                    key={issue.contractId}
                    className={`p-3 rounded-xl border ${
                      issue.needsAttention
                        ? 'border-slate-400 bg-slate-100'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {issue.profileName} ({issue.contractType})
                        </p>
                        <p className="text-sm text-slate-500">
                          {issue.userName} • 해지 후 {issue.daysSinceTermination}일 경과
                        </p>
                        {issue.lastError && (
                          <p className="text-xs text-slate-600 mt-1">오류: {issue.lastError.substring(0, 50)}...</p>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/admin/affiliate/contracts?highlight=${issue.contractId}`)}
                        className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        확인
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 수당 계산 오류 */}
          {monitoringData.commissionErrors.total > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                수당 계산 오류 ({monitoringData.commissionErrors.total}건)
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {monitoringData.commissionErrors.list.slice(0, 5).map((error) => (
                  <div
                    key={error.saleId}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          판매 ID: {error.saleId} ({error.productCode || 'N/A'})
                        </p>
                        <p className="text-sm text-slate-500">
                          {error.managerName}
                          {error.agentName && ` • ${error.agentName}`}
                          {' • '}
                          {error.saleAmount.toLocaleString()}원
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/admin/affiliate/sales?highlight=${error.saleId}`)}
                        className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        확인
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}