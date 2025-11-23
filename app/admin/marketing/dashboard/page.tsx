'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiTrendingUp, FiUsers, FiFileText, FiRefreshCw, FiBarChart2, FiTarget, FiEye, FiCheckCircle, FiArrowRight } from 'react-icons/fi';

interface PageStat {
  id: number;
  title: string;
  slug: string;
  isActive: boolean;
  category: string | null;
  pageGroup: string | null;
  views: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  registrations: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  conversionRate: number;
  createdAt: string;
  updatedAt: string;
}

interface MarketingDashboardData {
  overview: {
    pages: {
      total: number;
      active: number;
    };
    views: {
      total: number;
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
    registrations: {
      total: number;
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
    conversionRate: number;
  };
  customers: {
    total: number;
    new: number;
    converted: number;
  };
  pageStats: PageStat[];
}

export default function MarketingDashboard() {
  const router = useRouter();
  const [data, setData] = useState<MarketingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/marketing/dashboard', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.');
      }
      const result = await response.json();
      if (result.ok) {
        setData(result.data);
      } else {
        throw new Error(result.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const selectedPage = selectedPageId 
    ? data.pageStats.find(p => p.id === selectedPageId)
    : null;

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color?: string;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      indigo: 'bg-indigo-500',
    };

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">{title}</p>
            <p className="text-2xl font-bold mt-2">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`${colorClasses[color as keyof typeof colorClasses]} p-3 rounded-lg`}>
            <Icon className="text-white text-2xl" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">마케팅 대시보드</h1>
          <p className="text-gray-600 mt-1">랜딩페이지 유입 및 전환 분석</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* 전체 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="전체 유입"
          value={data.overview.views.total}
          subtitle={`이번 달: ${data.overview.views.thisMonth.toLocaleString()}`}
          icon={FiEye}
          color="blue"
        />
        <StatCard
          title="전체 전환"
          value={data.overview.registrations.total}
          subtitle={`이번 달: ${data.overview.registrations.thisMonth.toLocaleString()}`}
          icon={FiCheckCircle}
          color="green"
        />
        <StatCard
          title="전환율"
          value={`${data.overview.conversionRate.toFixed(2)}%`}
          subtitle={`${data.overview.views.total > 0 ? ((data.overview.registrations.total / data.overview.views.total) * 100).toFixed(2) : 0}%`}
          icon={FiTrendingUp}
          color="purple"
        />
        <StatCard
          title="활성 페이지"
          value={data.overview.pages.active}
          subtitle={`전체: ${data.overview.pages.total}개`}
          icon={FiFileText}
          color="orange"
        />
      </div>

      {/* 기간별 통계 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">기간별 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm text-gray-600">오늘</p>
            <p className="text-lg font-semibold mt-1">
              유입: {data.overview.views.today.toLocaleString()} | 전환: {data.overview.registrations.today.toLocaleString()}
            </p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <p className="text-sm text-gray-600">이번 주</p>
            <p className="text-lg font-semibold mt-1">
              유입: {data.overview.views.thisWeek.toLocaleString()} | 전환: {data.overview.registrations.thisWeek.toLocaleString()}
            </p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-sm text-gray-600">이번 달</p>
            <p className="text-lg font-semibold mt-1">
              유입: {data.overview.views.thisMonth.toLocaleString()} | 전환: {data.overview.registrations.thisMonth.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 랜딩페이지별 통계 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">랜딩페이지별 분석</h2>
          <button
            onClick={() => router.push('/admin/landing-pages')}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            페이지 관리
            <FiArrowRight />
          </button>
        </div>
        
        {data.pageStats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 마케팅 랜딩페이지가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">페이지명</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">카테고리</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">전체 유입</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">이번 달 유입</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">전체 전환</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">이번 달 전환</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">전환율</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.pageStats.map((page) => (
                  <tr 
                    key={page.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedPageId(page.id === selectedPageId ? null : page.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{page.title}</div>
                      {page.pageGroup && (
                        <div className="text-xs text-gray-500">{page.pageGroup}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {page.category || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {page.views.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {page.views.thisMonth.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      {page.registrations.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600">
                      {page.registrations.thisMonth.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        page.conversionRate >= 5 ? 'bg-green-100 text-green-800' :
                        page.conversionRate >= 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {page.conversionRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        page.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {page.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push('/admin/landing-pages');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 선택된 페이지 상세 정보 */}
      {selectedPage && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{selectedPage.title} 상세 분석</h2>
            <button
              onClick={() => setSelectedPageId(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">오늘 유입</p>
              <p className="text-2xl font-bold text-blue-600">{selectedPage.views.today}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">오늘 전환</p>
              <p className="text-2xl font-bold text-green-600">{selectedPage.registrations.today}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">이번 주 유입</p>
              <p className="text-2xl font-bold text-purple-600">{selectedPage.views.thisWeek}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">이번 주 전환</p>
              <p className="text-2xl font-bold text-orange-600">{selectedPage.registrations.thisWeek}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 전환율</p>
                <p className="text-3xl font-bold text-purple-600">{selectedPage.conversionRate.toFixed(2)}%</p>
              </div>
              <button
                onClick={() => router.push('/admin/landing-pages')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                페이지 편집
                <FiArrowRight />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 빠른 액션 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">빠른 액션</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/admin/landing-pages')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
          >
            <p className="font-semibold">랜딩 페이지</p>
            <p className="text-sm text-gray-600 mt-1">페이지 생성 및 관리</p>
          </button>
          <button
            onClick={() => router.push('/admin/marketing/customers')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
          >
            <p className="font-semibold">고객 관리</p>
            <p className="text-sm text-gray-600 mt-1">고객 {data.customers.total.toLocaleString()}명</p>
          </button>
          <button
            onClick={() => router.push('/admin/landing-pages')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <p className="font-semibold">일반 랜딩페이지</p>
            <p className="text-sm text-gray-600 mt-1">기존 랜딩페이지 관리</p>
          </button>
        </div>
      </div>
    </div>
  );
}
