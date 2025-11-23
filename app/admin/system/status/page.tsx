'use client';

import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiRefreshCw, FiDatabase, FiCloud, FiSettings, FiClock } from 'react-icons/fi';

interface SystemStatus {
  ok: boolean;
  timestamp: string;
  overall: 'ok' | 'error' | 'warning';
  checks: {
    database: { status: 'ok' | 'error'; message: string };
    googleDrive: { status: 'ok' | 'error' | 'warning'; message: string };
    environment: { status: 'ok' | 'error' | 'warning'; message: string; missing: string[] };
    cronJobs: { status: 'ok' | 'error' | 'warning'; message: string };
  };
}

export default function SystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/system/status', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setStatus(data);
      } else {
        setError(data.error || '시스템 상태를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '시스템 상태를 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // 30초마다 자동 새로고침
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: 'ok' | 'error' | 'warning') => {
    switch (status) {
      case 'ok':
        return <FiCheckCircle className="text-green-500" size={24} />;
      case 'error':
        return <FiXCircle className="text-red-500" size={24} />;
      case 'warning':
        return <FiAlertTriangle className="text-yellow-500" size={24} />;
    }
  };

  const getStatusColor = (status: 'ok' | 'error' | 'warning') => {
    switch (status) {
      case 'ok':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  if (loading && !status) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <FiRefreshCw className="animate-spin text-gray-400" size={32} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">시스템 상태</h1>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <p className="font-semibold">오류 발생</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {status && (
          <>
            {/* 전체 상태 */}
            <div className={`mb-6 p-6 rounded-lg border-2 ${getStatusColor(status.overall)}`}>
              <div className="flex items-center gap-4">
                {getStatusIcon(status.overall)}
                <div>
                  <h2 className="text-xl font-bold">전체 상태</h2>
                  <p className="text-sm mt-1">
                    {status.overall === 'ok' ? '모든 시스템이 정상 작동 중입니다.' : '일부 시스템에 문제가 있습니다.'}
                  </p>
                </div>
              </div>
              <p className="text-xs mt-4 opacity-75">
                마지막 확인: {new Date(status.timestamp).toLocaleString('ko-KR')}
              </p>
            </div>

            {/* 개별 체크 항목 */}
            <div className="space-y-4">
              {/* 데이터베이스 */}
              <div className={`p-4 rounded-lg border ${getStatusColor(status.checks.database.status)}`}>
                <div className="flex items-center gap-3">
                  <FiDatabase size={20} />
                  <div className="flex-1">
                    <h3 className="font-semibold">데이터베이스</h3>
                    <p className="text-sm mt-1">{status.checks.database.message}</p>
                  </div>
                  {getStatusIcon(status.checks.database.status)}
                </div>
              </div>

              {/* 구글 드라이브 */}
              <div className={`p-4 rounded-lg border ${getStatusColor(status.checks.googleDrive.status)}`}>
                <div className="flex items-center gap-3">
                  <FiCloud size={20} />
                  <div className="flex-1">
                    <h3 className="font-semibold">구글 드라이브</h3>
                    <p className="text-sm mt-1">{status.checks.googleDrive.message}</p>
                  </div>
                  {getStatusIcon(status.checks.googleDrive.status)}
                </div>
              </div>

              {/* 환경 변수 */}
              <div className={`p-4 rounded-lg border ${getStatusColor(status.checks.environment.status)}`}>
                <div className="flex items-center gap-3">
                  <FiSettings size={20} />
                  <div className="flex-1">
                    <h3 className="font-semibold">환경 변수</h3>
                    <p className="text-sm mt-1">{status.checks.environment.message}</p>
                    {status.checks.environment.missing.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold mb-1">누락된 환경 변수:</p>
                        <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                          {status.checks.environment.missing.map((varName) => (
                            <li key={varName}>{varName}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {getStatusIcon(status.checks.environment.status)}
                </div>
              </div>

              {/* Cron Jobs */}
              <div className={`p-4 rounded-lg border ${getStatusColor(status.checks.cronJobs.status)}`}>
                <div className="flex items-center gap-3">
                  <FiClock size={20} />
                  <div className="flex-1">
                    <h3 className="font-semibold">Cron Jobs</h3>
                    <p className="text-sm mt-1">{status.checks.cronJobs.message}</p>
                  </div>
                  {getStatusIcon(status.checks.cronJobs.status)}
                </div>
              </div>
            </div>

            {/* 빠른 액션 */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">빠른 액션</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a
                  href="/api/health"
                  target="_blank"
                  className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Health Check API 확인
                </a>
                <a
                  href="/admin/test-dashboard"
                  className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  테스트 대시보드
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

