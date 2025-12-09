'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiTrash2, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';

interface Payment {
  id: number;
  orderId: string;
  pgTransactionId: string | null;
  productCode: string | null;
  productName: string | null;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  status: string;
  statusLabel: string;
  pgProvider: string | null;
  affiliateCode: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  failedAt: string | null;
  createdAt: string;
  sale: {
    id: number;
    status: string;
    agentName: string | null;
    agentType: string | null; // BRANCH_MANAGER, SALES_AGENT
    managerName: string | null;
    managerType: string | null;
  } | null;
}

interface Stats {
  totalPaid: number;
  totalPaidCount: number;
  totalCancelled: number;
  totalCancelledCount: number;
  netSales: number;
}

interface MonthlyStats {
  year: number;
  month: number;
  label: string;
  totalPaid: number;
  paidCount: number;
  totalCancelled: number;
  cancelledCount: number;
  netSales: number;
}

export default function MallSalesPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 필터
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // 선택 삭제용
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // 환불 모달
  const [refundModal, setRefundModal] = useState<{
    open: boolean;
    payment: Payment | null;
    reason: string;
    loading: boolean;
    canRefund: boolean;
    refundInfo: any;
  }>({
    open: false,
    payment: null,
    reason: '',
    loading: false,
    canRefund: false,
    refundInfo: null,
  });

  // 데이터 조회
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter,
      });
      if (searchQuery) params.append('search', searchQuery);
      if (selectedMonth) params.append('month', selectedMonth);

      const res = await fetch(`/api/admin/mall-sales?${params}`);
      const data = await res.json();

      if (data.ok) {
        setPayments(data.payments);
        setStats(data.stats);
        setMonthlyStats(data.monthlyStats);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
      }
    } catch (error) {
      console.error('매출 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 환불 모달 열기 (환불 가능 여부 먼저 조회)
  const openRefundModal = async (payment: Payment) => {
    setRefundModal({
      open: true,
      payment,
      reason: '',
      loading: true,
      canRefund: false,
      refundInfo: null,
    });

    try {
      const res = await fetch(`/api/admin/refund?paymentId=${payment.id}`);
      const data = await res.json();

      setRefundModal((prev) => ({
        ...prev,
        loading: false,
        canRefund: data.canRefund || false,
        refundInfo: data,
      }));
    } catch (error) {
      setRefundModal((prev) => ({
        ...prev,
        loading: false,
        canRefund: false,
        refundInfo: { error: '환불 정보 조회 실패' },
      }));
    }
  };

  // 환불 처리
  const handleRefund = async () => {
    if (!refundModal.payment) return;

    if (!confirm('정말 환불 처리하시겠습니까?\n\n환불 시 어필리에이트 수수료도 함께 취소됩니다.')) {
      return;
    }

    setRefundModal((prev) => ({ ...prev, loading: true }));

    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: refundModal.payment.id,
          reason: refundModal.reason,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        alert(data.message || '환불이 완료되었습니다.');
        setRefundModal({ open: false, payment: null, reason: '', loading: false, canRefund: false, refundInfo: null });
        fetchData();
      } else {
        alert(data.error || '환불 처리에 실패했습니다.');
      }
    } catch (error) {
      alert('환불 처리 중 오류가 발생했습니다.');
    } finally {
      setRefundModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // 상태 배지 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // 어필리에이트 상태 한글화
  const getSaleStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '정산대기';
      case 'CONFIRMED':
        return '정산확정';
      case 'PAID':
        return '정산완료';
      case 'REFUNDED':
        return '환불처리';
      case 'CANCELLED':
        return '취소';
      default:
        return status;
    }
  };

  // 어필리에이트 타입 한글화
  const getAgentTypeLabel = (type: string | null) => {
    switch (type) {
      case 'BRANCH_MANAGER':
        return '대리점장';
      case 'SALES_AGENT':
        return '판매원';
      case 'HQ':
      case 'ADMIN':
        return '본사';
      default:
        return type || '본사';
    }
  };

  // 선택 전체 토글
  const toggleSelectAll = () => {
    if (selectedIds.length === payments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(payments.map((p) => p.id));
    }
  };

  // 개별 선택 토글
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 선택 삭제
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedIds.length}건을 삭제하시겠습니까?\n\n⚠️ 삭제된 데이터는 복구할 수 없습니다.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/mall-sales', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();

      if (data.ok) {
        alert(`${data.deletedCount}건이 삭제되었습니다.`);
        setSelectedIds([]);
        fetchData();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 전체 삭제 (현재 필터 기준)
  const handleDeleteAll = async () => {
    if (!confirm(`현재 조회된 전체 ${totalCount}건을 삭제하시겠습니까?\n\n⚠️ 주의: 현재 필터 조건에 해당하는 모든 데이터가 삭제됩니다.\n삭제된 데이터는 복구할 수 없습니다.`)) {
      return;
    }

    // 2차 확인
    const confirmText = prompt('삭제를 확인하려면 "전체삭제"를 입력하세요:');
    if (confirmText !== '전체삭제') {
      alert('삭제가 취소되었습니다.');
      return;
    }

    setIsDeleting(true);
    try {
      const params = new URLSearchParams({
        deleteAll: 'true',
        status: statusFilter,
      });
      if (searchQuery) params.append('search', searchQuery);
      if (selectedMonth) params.append('month', selectedMonth);

      const res = await fetch(`/api/admin/mall-sales?${params}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        alert(`${data.deletedCount}건이 삭제되었습니다.`);
        setSelectedIds([]);
        fetchData();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 월 선택 옵션 생성
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
      options.push({ value, label });
    }
    return options;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">크루즈몰 매출관리</h1>
          <p className="text-gray-600 mt-1">웰컴페이먼츠 결제 매출 현황 및 환불 관리</p>
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">총 결제액</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalPaid.toLocaleString()}원</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalPaidCount}건</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-500">총 환불액</p>
            <p className="text-2xl font-bold text-red-600">{stats.totalCancelled.toLocaleString()}원</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalCancelledCount}건</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">순매출</p>
            <p className="text-2xl font-bold text-green-600">{stats.netSales.toLocaleString()}원</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
            <p className="text-sm text-gray-500">전체 건수</p>
            <p className="text-2xl font-bold text-purple-600">{totalCount}건</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500">환불율</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.totalPaidCount > 0
                ? ((stats.totalCancelledCount / (stats.totalPaidCount + stats.totalCancelledCount)) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>
        </div>
      )}

      {/* 월별 차트 */}
      {monthlyStats.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">월별 매출 현황</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">월</th>
                  <th className="text-right py-2 px-3">결제액</th>
                  <th className="text-right py-2 px-3">건수</th>
                  <th className="text-right py-2 px-3">환불액</th>
                  <th className="text-right py-2 px-3">순매출</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.slice(-6).map((m) => (
                  <tr key={m.label} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{m.label}</td>
                    <td className="text-right py-2 px-3 text-blue-600">{m.totalPaid.toLocaleString()}원</td>
                    <td className="text-right py-2 px-3">{m.paidCount}건</td>
                    <td className="text-right py-2 px-3 text-red-600">{m.totalCancelled.toLocaleString()}원</td>
                    <td className="text-right py-2 px-3 text-green-600 font-semibold">
                      {m.netSales.toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-xs text-gray-500 mb-1">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
                setSelectedIds([]);
              }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">전체</option>
              <option value="paid">결제완료</option>
              <option value="cancelled">환불완료</option>
              <option value="pending">대기중</option>
              <option value="failed">결제실패</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">월별</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPage(1);
                setSelectedIds([]);
              }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">전체 기간</option>
              {getMonthOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">검색</label>
            <input
              type="text"
              placeholder="이름 또는 연락처로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="self-end">
            <button
              onClick={() => {
                setPage(1);
                setSelectedIds([]);
                fetchData();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              검색
            </button>
          </div>
        </div>

        {/* 선택/삭제 버튼 */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedIds.length > 0 ? (
                <span className="font-medium text-blue-600">{selectedIds.length}건 선택됨</span>
              ) : (
                `전체 ${totalCount}건`
              )}
            </span>
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || isDeleting}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiTrash2 size={14} />
              선택 삭제
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={totalCount === 0 || isDeleting}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiAlertCircle size={14} />
              전체 삭제
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">결제 내역이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === payments.length && payments.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left py-3 px-4">결제일시</th>
                  <th className="text-left py-3 px-4">고객정보</th>
                  <th className="text-left py-3 px-4">상품명</th>
                  <th className="text-right py-3 px-4">금액</th>
                  <th className="text-center py-3 px-4">어필리에이트</th>
                  <th className="text-center py-3 px-4">상태</th>
                  <th className="text-center py-3 px-4">액션</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t hover:bg-gray-50 ${selectedIds.includes(p.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">
                        {new Date(p.paidAt || p.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(p.paidAt || p.createdAt).toLocaleTimeString('ko-KR')}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{p.orderId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{p.customerName}</div>
                      <div className="text-xs text-gray-500">{p.customerPhone}</div>
                      {p.customerEmail && (
                        <div className="text-xs text-gray-400">{p.customerEmail}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-[200px] truncate" title={p.productName || '-'}>
                        {p.productName || '-'}
                      </div>
                      {p.productCode && (
                        <div className="text-xs text-gray-400">{p.productCode}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-semibold">{p.amount.toLocaleString()}원</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.sale ? (
                        <div className="space-y-1">
                          {/* 판매자 정보 */}
                          <div className="flex items-center justify-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              p.sale.agentType === 'BRANCH_MANAGER'
                                ? 'bg-purple-100 text-purple-700'
                                : p.sale.agentType === 'SALES_AGENT'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {getAgentTypeLabel(p.sale.agentType)}
                            </span>
                            <span className="text-xs font-medium">{p.sale.agentName || '-'}</span>
                          </div>
                          {/* 상위 매니저 정보 */}
                          {p.sale.managerName && (
                            <div className="flex items-center justify-center gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700">
                                {getAgentTypeLabel(p.sale.managerType)}
                              </span>
                              <span className="text-xs text-gray-600">{p.sale.managerName}</span>
                            </div>
                          )}
                          {/* 정산 상태 */}
                          <div className={`text-xs font-medium ${
                            p.sale.status === 'REFUNDED' || p.sale.status === 'CANCELLED'
                              ? 'text-red-500'
                              : p.sale.status === 'PAID'
                              ? 'text-green-600'
                              : 'text-yellow-600'
                          }`}>
                            {getSaleStatusLabel(p.sale.status)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 font-medium">
                            본사
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                        {p.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(p.status === 'paid' || p.status === 'completed') && (
                        <button
                          onClick={() => openRefundModal(p)}
                          className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium rounded border border-red-200"
                        >
                          환불
                        </button>
                      )}
                      {p.status === 'cancelled' && (
                        <span className="text-xs text-gray-400">환불완료</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 환불 모달 */}
      {refundModal.open && refundModal.payment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">환불 처리</h3>

            {refundModal.loading ? (
              <div className="text-center py-8 text-gray-500">환불 정보 확인 중...</div>
            ) : (
              <div className="space-y-4">
                {/* 결제 정보 */}
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p>
                    <span className="text-gray-500">고객:</span> {refundModal.payment.customerName}
                  </p>
                  <p>
                    <span className="text-gray-500">연락처:</span> {refundModal.payment.customerPhone}
                  </p>
                  <p>
                    <span className="text-gray-500">상품:</span> {refundModal.payment.productName || '-'}
                  </p>
                  <p className="font-semibold text-blue-600">
                    결제금액: {refundModal.payment.amount.toLocaleString()}원
                  </p>
                  {refundModal.payment.pgTransactionId && (
                    <p className="text-xs text-gray-400 mt-1">
                      TID: {refundModal.payment.pgTransactionId}
                    </p>
                  )}
                </div>

                {/* 어필리에이트 정보 (있는 경우) */}
                {refundModal.refundInfo?.sale && (
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-blue-800 mb-1">어필리에이트 정보</p>
                    <p>
                      <span className="text-gray-500">판매자:</span>{' '}
                      {refundModal.refundInfo.sale.agentName || '-'}
                    </p>
                    {refundModal.refundInfo.sale.managerName && (
                      <p>
                        <span className="text-gray-500">매니저:</span>{' '}
                        {refundModal.refundInfo.sale.managerName}
                      </p>
                    )}
                    <p className="text-xs text-blue-600 mt-1">
                      * 환불 시 어필리에이트 수수료도 함께 취소됩니다.
                    </p>
                  </div>
                )}

                {/* 환불 불가 사유 */}
                {!refundModal.canRefund && refundModal.refundInfo?.refundDisabledReason && (
                  <div className="bg-red-50 p-3 rounded-lg text-sm text-red-600">
                    {refundModal.refundInfo.refundDisabledReason}
                  </div>
                )}

                {/* 환불 사유 입력 */}
                {refundModal.canRefund && (
                  <div>
                    <label className="block text-sm font-medium mb-1">환불 사유</label>
                    <textarea
                      value={refundModal.reason}
                      onChange={(e) => setRefundModal((prev) => ({ ...prev, reason: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 h-20"
                      placeholder="환불 사유 입력 (선택)"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() =>
                  setRefundModal({
                    open: false,
                    payment: null,
                    reason: '',
                    loading: false,
                    canRefund: false,
                    refundInfo: null,
                  })
                }
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={refundModal.loading}
              >
                취소
              </button>
              {refundModal.canRefund && (
                <button
                  onClick={handleRefund}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={refundModal.loading}
                >
                  {refundModal.loading ? '처리중...' : '환불 실행'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
