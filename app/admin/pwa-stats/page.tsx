'use client';

import { useState, useEffect } from 'react';
import { FiRefreshCw, FiSmartphone, FiTrendingUp, FiUsers } from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface PWAStatsData {
  summary: {
    genie: number;
    mall: number;
    both: number;
    total: number;
  };
  recentInstalls: Array<{
    id: number;
    name: string | null;
    phone: string | null;
    pwaGenieInstalledAt: string | null;
    pwaMallInstalledAt: string | null;
    createdAt: string;
  }>;
  dailyStats: Array<{
    date: string;
    genie: number;
    mall: number;
  }>;
}

const COLORS = ['#8B5CF6', '#3B82F6', '#EC4899'];

export default function PWAStatsPage() {
  const [statsData, setStatsData] = useState<PWAStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/pwa-stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData?.error || '세션이 만료되었습니다. 다시 로그인해 주세요.';
          setError(errorMsg);
          console.error('[PWA Stats] Auth error:', errorData);
          // 인증 오류인 경우 로그인 페이지로 리다이렉트하지 않고 에러만 표시
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || '통계 데이터를 불러올 수 없습니다');
      }

      const data = await response.json();
      if (data.ok) {
        setStatsData(data.stats);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || '통계 데이터를 불러올 수 없습니다');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      console.error('[PWA Stats] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">통계 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <span className="text-red-600 text-xl mr-3">⚠️</span>
          <div className="flex-1">
            <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={loadStats}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!statsData) {
    return null;
  }

  const pieData = [
    { name: '크루즈가이드 지니', value: statsData.summary.genie - statsData.summary.both },
    { name: '크루즈몰', value: statsData.summary.mall - statsData.summary.both },
    { name: '둘 다 설치', value: statsData.summary.both },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2 flex items-center gap-3">
            <FiSmartphone className="text-indigo-600" />
            PWA 바탕화면 추가 통계
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            크루즈가이드 지니와 크루즈몰 바탕화면 추가 현황을 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-semibold text-gray-600 bg-gray-100 px-4 py-2 rounded-lg flex items-center gap-2">
            <span>마지막 갱신: {lastUpdated.toLocaleTimeString('ko-KR')}</span>
          </div>
          <button
            onClick={loadStats}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            갱신
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">크루즈가이드 지니</h3>
            <FiSmartphone className="w-6 h-6" />
          </div>
          <p className="text-4xl font-bold mb-1">{statsData.summary.genie}</p>
          <p className="text-sm opacity-90">명 설치</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">크루즈몰</h3>
            <FiSmartphone className="w-6 h-6" />
          </div>
          <p className="text-4xl font-bold mb-1">{statsData.summary.mall}</p>
          <p className="text-sm opacity-90">명 설치</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">둘 다 설치</h3>
            <FiUsers className="w-6 h-6" />
          </div>
          <p className="text-4xl font-bold mb-1">{statsData.summary.both}</p>
          <p className="text-sm opacity-90">명</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">전체 설치</h3>
            <FiTrendingUp className="w-6 h-6" />
          </div>
          <p className="text-4xl font-bold mb-1">{statsData.summary.total}</p>
          <p className="text-sm opacity-90">명 (중복 제외)</p>
        </div>
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 일별 설치 추이 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">최근 7일 설치 추이</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statsData.dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="genie" fill="#EC4899" name="크루즈가이드 지니" />
              <Bar dataKey="mall" fill="#3B82F6" name="크루즈몰" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 설치 유형 분포 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">설치 유형 분포</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              설치 데이터가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 최근 설치 목록 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">최근 설치 고객 (최근 20명)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">이름</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">전화번호</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">크루즈가이드 지니</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">크루즈몰</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">가입일</th>
              </tr>
            </thead>
            <tbody>
              {statsData.recentInstalls.length > 0 ? (
                statsData.recentInstalls.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{customer.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.phone || '-'}</td>
                    <td className="px-4 py-3">
                      {customer.pwaGenieInstalledAt ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 border border-pink-300">
                          ✓ {new Date(customer.pwaGenieInstalledAt).toLocaleDateString('ko-KR')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {customer.pwaMallInstalledAt ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                          ✓ {new Date(customer.pwaMallInstalledAt).toLocaleDateString('ko-KR')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {new Date(customer.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    설치 기록이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


