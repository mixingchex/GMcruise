'use client';

import { useState } from 'react';
import { FiRefreshCw, FiCheckCircle, FiAlertCircle, FiFolder } from 'react-icons/fi';

export default function TestDashboardPage() {
  const [backupResult, setBackupResult] = useState<any>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [payslipResult, setPayslipResult] = useState<any>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [payslipPeriod, setPayslipPeriod] = useState('2025-11');
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncProfileId, setSyncProfileId] = useState('');

  const handleBackupTest = async () => {
    setBackupLoading(true);
    setBackupResult(null);
    try {
      const res = await fetch('/api/admin/test/backup', {
        credentials: 'include',
      });
      const data = await res.json();
      setBackupResult(data);
    } catch (error: any) {
      setBackupResult({
        ok: false,
        error: error.message || '백업 테스트 중 오류가 발생했습니다.',
      });
    } finally {
      setBackupLoading(false);
    }
  };

  const handlePayslipTest = async () => {
    setPayslipLoading(true);
    setPayslipResult(null);
    try {
      const res = await fetch(`/api/admin/test/payslip?period=${payslipPeriod}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setPayslipResult(data);
    } catch (error: any) {
      setPayslipResult({
        ok: false,
        error: error.message || '지급명세서 테스트 중 오류가 발생했습니다.',
      });
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleDocumentSync = async (syncAll: boolean) => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const body = syncAll ? {} : { profileId: parseInt(syncProfileId) };
      const res = await fetch('/api/admin/affiliate/documents/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSyncResult(data);
    } catch (error: any) {
      setSyncResult({
        ok: false,
        message: error.message || '문서 동기화 중 오류가 발생했습니다.',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">테스트 대시보드</h1>
          <p className="mt-2 text-gray-600">구글 드라이브 연동 및 기능 테스트</p>
        </div>

        {/* 백업 테스트 */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold text-gray-900">📦 데이터베이스 백업 테스트</h2>
          <p className="mb-4 text-sm text-gray-600">
            구글 드라이브에 데이터베이스 백업을 실행합니다. (14개 테이블)
          </p>

          <button
            onClick={handleBackupTest}
            disabled={backupLoading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {backupLoading ? (
              <>
                <FiRefreshCw className="animate-spin" />
                백업 중...
              </>
            ) : (
              '백업 테스트 시작'
            )}
          </button>

          {backupResult && (
            <div
              className={`mt-4 rounded-lg border-2 p-4 ${
                backupResult.ok
                  ? 'border-green-300 bg-green-50'
                  : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex items-start gap-2">
                {backupResult.ok ? (
                  <FiCheckCircle className="mt-1 text-green-600" size={20} />
                ) : (
                  <FiAlertCircle className="mt-1 text-red-600" size={20} />
                )}
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      backupResult.ok ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {backupResult.message || (backupResult.ok ? '성공' : '실패')}
                  </p>
                  {backupResult.data && (
                    <div className="mt-2 space-y-1 text-sm">
                      <p>총 테이블: {backupResult.data.totalTables}</p>
                      <p>성공: {backupResult.data.successCount}</p>
                      <p>실패: {backupResult.data.failureCount}</p>
                      <p>소요 시간: {(backupResult.data.duration / 1000).toFixed(2)}초</p>
                      {backupResult.data.results && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-semibold">상세 결과 보기</summary>
                          <div className="mt-2 space-y-1">
                            {backupResult.data.results.map((result: any, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                {result.ok ? (
                                  <FiCheckCircle className="text-green-600" size={16} />
                                ) : (
                                  <FiAlertCircle className="text-red-600" size={16} />
                                )}
                                <span>
                                  {result.tableName}: {result.ok ? `${result.rowCount}행` : result.error}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                  {backupResult.error && (
                    <p className="mt-2 text-sm text-red-700">{backupResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 지급명세서 테스트 */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold text-gray-900">💼 지급명세서 생성 테스트</h2>
          <p className="mb-4 text-sm text-gray-600">
            특정 월의 지급명세서를 생성합니다.
          </p>

          <div className="mb-4 flex items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">기간:</span>
              <input
                type="month"
                value={payslipPeriod}
                onChange={(e) => setPayslipPeriod(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <button
            onClick={handlePayslipTest}
            disabled={payslipLoading}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-white font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {payslipLoading ? (
              <>
                <FiRefreshCw className="animate-spin" />
                생성 중...
              </>
            ) : (
              '지급명세서 생성'
            )}
          </button>

          {payslipResult && (
            <div
              className={`mt-4 rounded-lg border-2 p-4 ${
                payslipResult.ok
                  ? 'border-green-300 bg-green-50'
                  : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex items-start gap-2">
                {payslipResult.ok ? (
                  <FiCheckCircle className="mt-1 text-green-600" size={20} />
                ) : (
                  <FiAlertCircle className="mt-1 text-red-600" size={20} />
                )}
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      payslipResult.ok ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {payslipResult.message || (payslipResult.ok ? '성공' : '실패')}
                  </p>
                  {payslipResult.data && (
                    <div className="mt-2 space-y-1 text-sm">
                      <p>기간: {payslipResult.data.period}</p>
                      <p>생성된 명세서: {payslipResult.data.count}건</p>
                      {payslipResult.data.payslips && payslipResult.data.payslips.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-semibold">생성된 명세서 목록</summary>
                          <div className="mt-2 space-y-2">
                            {payslipResult.data.payslips.map((payslip: any) => (
                              <div key={payslip.id} className="rounded border border-gray-300 p-2">
                                <p className="font-semibold">{payslip.AffiliateProfile.displayName}</p>
                                <p className="text-xs">총 매출: {payslip.totalSales.toLocaleString()}원</p>
                                <p className="text-xs">실수령액: {payslip.netPayment.toLocaleString()}원</p>
                                <p className="text-xs">상태: {payslip.status}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                  {payslipResult.error && (
                    <p className="mt-2 text-sm text-red-700">{payslipResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 문서 동기화 테스트 */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold text-gray-900">📁 문서 구글 드라이브 동기화</h2>
          <p className="mb-4 text-sm text-gray-600">
            계약서 PDF, 신분증, 통장 사본을 구글 드라이브에 백업합니다.
          </p>

          <div className="space-y-4">
            {/* 특정 프로필 동기화 */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">특정 프로필 동기화</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="프로필 ID"
                  value={syncProfileId}
                  onChange={(e) => setSyncProfileId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  disabled={syncLoading}
                />
                <button
                  onClick={() => handleDocumentSync(false)}
                  disabled={syncLoading || !syncProfileId}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {syncLoading ? (
                    <>
                      <FiRefreshCw className="animate-spin" />
                      동기화 중...
                    </>
                  ) : (
                    <>
                      <FiFolder />
                      동기화
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 전체 프로필 동기화 */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">전체 프로필 동기화</h3>
              <button
                onClick={() => handleDocumentSync(true)}
                disabled={syncLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncLoading ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    전체 동기화 중...
                  </>
                ) : (
                  <>
                    <FiFolder />
                    전체 동기화
                  </>
                )}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                ⚠️ 모든 활성 프로필의 문서를 동기화합니다. (시간이 오래 걸릴 수 있습니다)
              </p>
            </div>

            {/* 결과 표시 */}
            {syncResult && (
              <div
                className={`rounded-lg border-2 p-4 ${
                  syncResult.ok
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {syncResult.ok ? (
                    <FiCheckCircle className="mt-1 text-green-600" size={20} />
                  ) : (
                    <FiAlertCircle className="mt-1 text-red-600" size={20} />
                  )}
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        syncResult.ok ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {syncResult.message}
                    </p>
                    {syncResult.results && (
                      <div className="mt-2 space-y-2 text-sm">
                        {syncResult.results.total !== undefined && (
                          <p>
                            총 {syncResult.results.total}개 중 성공: {syncResult.results.success}, 실패: {syncResult.results.failed}
                          </p>
                        )}
                        {syncResult.results.contracts && syncResult.results.contracts.length > 0 && (
                          <div>
                            <p className="font-semibold">계약서: {syncResult.results.contracts.length}개</p>
                          </div>
                        )}
                        {syncResult.results.documents && syncResult.results.documents.length > 0 && (
                          <div>
                            <p className="font-semibold">문서: {syncResult.results.documents.length}개</p>
                          </div>
                        )}
                        {syncResult.results.errors && syncResult.results.errors.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer font-semibold text-red-700">오류 목록</summary>
                            <ul className="mt-1 list-inside list-disc space-y-1">
                              {syncResult.results.errors.map((err: string, i: number) => (
                                <li key={i} className="text-xs text-red-700">{err}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 폴더 구조 설명 */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-semibold">📦 구글 드라이브 폴더 구조:</p>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">
{`Affiliate_Documents/
├── AFF-BOSS1-홍길동/
│   ├── Contracts/      (계약서 PDF)
│   ├── ID_Cards/       (신분증)
│   ├── Bankbooks/      (통장 사본)
│   └── Signatures/     (서명 이미지)
└── ...`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}





