// app/admin/affiliate/links/cleanup/page.tsx
// 어필리에이트 링크 정리 관리 페이지

'use client';

import { useState, useEffect } from 'react';
import { FiTrash2, FiRefreshCw, FiEye, FiCheckCircle } from 'react-icons/fi';

interface CleanupPreview {
  expired: number;
  inactive: number;
  old: number;
  test: number;
  total: number;
}

interface StatusCount {
  status: string;
  count: number;
}

export default function AffiliateLinkCleanupPage() {
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [currentStats, setCurrentStats] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 미리보기 로드
  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/affiliate/links/cleanup');
      const data = await res.json();
      if (data.ok) {
        setPreview(data.preview);
        setCurrentStats(data.currentStats);
      } else {
        setError(data.error || '미리보기 로드 실패');
      }
    } catch (err: any) {
      setError(err.message || '미리보기 로드 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  // 정리 실행
  const executeCleanup = async () => {
    if (!confirm('정리 작업을 실행하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setExecuting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/affiliate/links/cleanup', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data);
        setCurrentStats(data.afterStats);
        // 미리보기도 새로고침
        await loadPreview();
      } else {
        setError(data.error || '정리 실행 실패');
      }
    } catch (err: any) {
      setError(err.message || '정리 실행 중 오류 발생');
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🔗 어필리에이트 링크 정리
        </h1>
        <p className="text-gray-600">
          만료되거나 비활성화된 링크를 자동으로 정리하여 데이터베이스 용량을 최적화합니다.
        </p>
      </div>

      {/* 현재 통계 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">현재 링크 상태</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {currentStats.map((stat) => (
            <div key={stat.status} className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">{stat.status}</div>
              <div className="text-2xl font-bold text-gray-800">{stat.count.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 정리 미리보기 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">정리 대상 미리보기</h2>
          <button
            onClick={loadPreview}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm text-yellow-700 mb-1">만료된 링크</div>
                <div className="text-2xl font-bold text-yellow-800">
                  {preview.expired.toLocaleString()}
                </div>
                <div className="text-xs text-yellow-600 mt-1">상태 변경 예정</div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-sm text-orange-700 mb-1">비활성 링크</div>
                <div className="text-2xl font-bold text-orange-800">
                  {preview.inactive.toLocaleString()}
                </div>
                <div className="text-xs text-orange-600 mt-1">180일 미접근</div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-700 mb-1">오래된 링크</div>
                <div className="text-2xl font-bold text-red-800">
                  {preview.old.toLocaleString()}
                </div>
                <div className="text-xs text-red-600 mt-1">365일 이상</div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-700 mb-1">테스트 링크</div>
                <div className="text-2xl font-bold text-purple-800">
                  {preview.test.toLocaleString()}
                </div>
                <div className="text-xs text-purple-600 mt-1">삭제 예정</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">총 정리 대상</div>
                  <div className="text-3xl font-bold text-gray-800">
                    {preview.total.toLocaleString()}개
                  </div>
                </div>
                <button
                  onClick={executeCleanup}
                  disabled={executing || preview.total === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiTrash2 />
                  정리 실행
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            미리보기를 불러올 수 없습니다.
          </div>
        )}
      </div>

      {/* 정리 결과 */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiCheckCircle className="text-green-600 text-xl" />
            <h2 className="text-xl font-bold text-green-800">정리 완료</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">만료된 링크:</span>{' '}
              {result.stats.expired.toLocaleString()}개
            </div>
            <div>
              <span className="font-semibold">비활성 링크:</span>{' '}
              {result.stats.inactive.toLocaleString()}개
            </div>
            <div>
              <span className="font-semibold">오래된 링크:</span>{' '}
              {result.stats.archived.toLocaleString()}개
            </div>
            <div>
              <span className="font-semibold">테스트 링크:</span>{' '}
              {result.stats.testLinks.toLocaleString()}개
            </div>
            {result.stats.backedUp > 0 && (
              <div>
                <span className="font-semibold">백업된 링크:</span>{' '}
                {result.stats.backedUp.toLocaleString()}개
              </div>
            )}
            {result.stats.backupErrors > 0 && (
              <div className="text-red-600">
                <span className="font-semibold">백업 오류:</span>{' '}
                {result.stats.backupErrors}개
              </div>
            )}
            <div className="pt-2 border-t border-green-200">
              <span className="font-bold text-green-800">
                총 {result.stats.total.toLocaleString()}개 링크 처리됨
              </span>
            </div>
            <div className="mt-2 text-xs text-green-700">
              ⚠️ 판매원몰 아이디(AffiliateProfile)는 절대 삭제되지 않으며, 고객 DB, 여권 파일, 계약서는 백업되었고 본사 DB에도 그대로 보존됩니다.
            </div>
          </div>
        </div>
      )}

      {/* 오류 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-semibold">오류</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      )}

      {/* 정리 정책 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-3">📋 정리 정책</h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li>
            <strong>만료된 링크:</strong> 만료일이 지난 링크는 자동으로 EXPIRED 상태로 변경됩니다.
          </li>
          <li>
            <strong>비활성 링크:</strong> 180일 이상 접근되지 않고 리드/판매 기록이 없는 링크는
            REVOKED 상태로 변경됩니다.
          </li>
          <li>
            <strong>오래된 링크:</strong> 생성일이 365일 이상이고 180일 이상 미접근이며 리드/판매
            기록이 없는 링크는 REVOKED 상태로 변경됩니다.
          </li>
          <li>
            <strong>테스트 링크:</strong> 캠페인명에 &quot;test&quot;, &quot;임시&quot;, &quot;temp&quot;가 포함되고 30일 이상
            경과하며 리드/판매 기록이 없는 링크는 삭제됩니다.
          </li>
          <li className="pt-2 border-t border-blue-200">
            <strong>⚠️ 안전 장치:</strong> 판매 기록이 있거나 활성 리드가 있는 링크는 절대 정리되지
            않습니다.
          </li>
          <li className="pt-2 border-t border-blue-200">
            <strong>📦 본사 데이터 보존:</strong> 링크 삭제 전 고객 DB, 여권 파일, 계약서가 자동으로 백업되며, 판매원몰 아이디(AffiliateProfile)는 절대 삭제되지 않습니다.
          </li>
        </ul>
      </div>

      {/* 자동 정리 스케줄 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">⏰ 자동 정리 스케줄</h3>
        <p className="text-sm text-gray-600">
          매주 월요일 새벽 3시에 자동으로 정리 작업이 실행됩니다.
        </p>
      </div>
    </div>
  );
}

