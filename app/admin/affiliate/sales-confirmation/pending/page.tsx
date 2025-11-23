'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiExternalLink,
  FiPhone,
  FiRefreshCw,
  FiUser,
  FiXCircle,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

type PendingSale = {
  id: number;
  productCode: string | null;
  productTitle?: string | null;
  saleAmount: number;
  saleDate: string | null;
  audioFileGoogleDriveUrl: string | null;
  audioFileName: string | null;
  audioFileType: string | null;
  submittedAt: string | null;
  agent: {
    name: string | null;
    code: string;
    phone: string | null;
  } | null;
  manager: {
    name: string | null;
    code: string;
    phone: string | null;
  } | null;
  customer?: {
    id: number;
    customerName: string | null;
    customerPhone: string | null;
  } | null;
};

export default function SalesConfirmationPendingPage() {
  const router = useRouter();
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);

  useEffect(() => {
    loadPendingSales();
  }, []);

  const loadPendingSales = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/affiliate/sales-confirmation/pending', {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '승인 대기 목록을 불러오지 못했습니다');
      }
      setPendingSales(json.sales || []);
    } catch (error: any) {
      console.error('[SalesConfirmationPending] Load error:', error);
      showError(error.message || '승인 대기 목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (saleId: number) => {
    if (!confirm('이 판매 확정을 승인하고 수당을 계산하시겠습니까?')) return;

    setProcessingId(saleId);
    try {
      const res = await fetch(`/api/admin/affiliate/sales/${saleId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '승인에 실패했습니다');
      }
      showSuccess('판매가 승인되었고 수당이 자동으로 계산되었습니다');
      loadPendingSales();
    } catch (error: any) {
      console.error('[SalesConfirmationPending] Approve error:', error);
      showError(error.message || '승인 중 오류가 발생했습니다');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedSaleId) return;
    if (!rejectReason.trim()) {
      showError('거부 사유를 입력해주세요');
      return;
    }

    setProcessingId(selectedSaleId);
    try {
      const res = await fetch(`/api/admin/affiliate/sales/${selectedSaleId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '거부에 실패했습니다');
      }
      showSuccess('판매 확정 요청이 거부되었습니다');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedSaleId(null);
      loadPendingSales();
    } catch (error: any) {
      console.error('[SalesConfirmationPending] Reject error:', error);
      showError(error.message || '거부 중 오류가 발생했습니다');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (saleId: number) => {
    setSelectedSaleId(saleId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <FiRefreshCw className="mx-auto mb-4 animate-spin text-4xl text-blue-600" />
          <p className="text-gray-600">승인 대기 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">판매 확정 승인 대기</h1>
            <p className="mt-1 text-sm text-gray-600">
              판매원/대리점장이 올린 판매 확정 요청을 승인하거나 거부할 수 있습니다.
            </p>
          </div>
          <button
            onClick={loadPendingSales}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <FiRefreshCw className="text-base" />
            새로고침
          </button>
        </div>

        {pendingSales.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow">
            <FiCheckCircle className="mx-auto mb-4 text-5xl text-emerald-400" />
            <p className="text-lg font-semibold text-gray-700">승인 대기 중인 판매가 없습니다</p>
            <p className="mt-1 text-sm text-gray-500">모든 판매 확정 요청이 처리되었습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingSales.map((sale) => (
              <div key={sale.id} className="rounded-2xl bg-white p-6 shadow">
                <div className="grid gap-6 md:grid-cols-3">
                  <section className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900">판매 정보</h3>
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">상품 코드</span>
                        <span className="font-semibold text-gray-900">{sale.productCode || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiDollarSign className="text-gray-400" />
                        <span>{sale.saleAmount.toLocaleString()}원</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-gray-400" />
                        <span>
                          {sale.saleDate ? new Date(sale.saleDate).toLocaleString('ko-KR') : '-'}
                        </span>
                      </div>
                      {sale.customer ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">고객</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/affiliate/customers/${sale.customer!.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1"
                          >
                            {sale.customer.customerName || '-'} / {sale.customer.customerPhone || '-'}
                            <FiExternalLink className="text-xs" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">고객</span>
                          <span className="text-gray-400">-</span>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">판매원</h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FiUser />
                          <span>{sale.agent?.name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiPhone />
                          <span>{sale.agent?.phone || '-'}</span>
                        </div>
                        <div className="text-xs font-mono text-gray-500">{sale.agent?.code}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">대리점장</h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FiUser />
                          <span>{sale.manager?.name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiPhone />
                          <span>{sale.manager?.phone || '-'}</span>
                        </div>
                        <div className="text-xs font-mono text-gray-500">{sale.manager?.code}</div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900">음성 인증</h3>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>녹취 파일</span>
                        {sale.audioFileGoogleDriveUrl ? (
                          <a
                            href={sale.audioFileGoogleDriveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <FiExternalLink />
                            듣기
                          </a>
                        ) : (
                          <span className="text-gray-400">없음</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>제출일</span>
                        <span>
                          {sale.submittedAt
                            ? new Date(sale.submittedAt).toLocaleString('ko-KR')
                            : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openRejectModal(sale.id)}
                        className="flex-1 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        거부
                      </button>
                      <button
                        onClick={() => handleApprove(sale.id)}
                        disabled={processingId === sale.id}
                        className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {processingId === sale.id ? '처리 중...' : '승인'}
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2 text-red-600">
              <FiXCircle />
              <h2 className="text-lg font-bold text-gray-900">판매 확정 거부</h2>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거부 사유를 입력해주세요"
              className="h-32 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processingId !== null}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {processingId ? '처리 중...' : '거부'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
