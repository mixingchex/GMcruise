'use client';

import { useState, useEffect, useCallback } from 'react';

interface Payment {
  id: number;
  orderId: string;
  mulNo: string | null;
  landingPageId: number;
  landingPageTitle: string;
  landingPageSlug: string | null;
  productName: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  status: string;
  statusLabel: string;
  payType: string | null;
  payTypeName: string | null;
  cardName: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  createdAt: string;
}

interface Stats {
  totalPaid: number;
  totalPaidCount: number;
  totalRefunded: number;
  totalRefundedCount: number;
  netSales: number;
}

interface MonthlyStats {
  year: number;
  month: number;
  label: string;
  totalPaid: number;
  paidCount: number;
  totalRefunded: number;
  refundedCount: number;
  netSales: number;
}

export default function PayAppSalesPage() {
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

  // 환불 모달
  const [refundModal, setRefundModal] = useState<{
    open: boolean;
    payment: Payment | null;
    isPartial: boolean;
    amount: string;
    reason: string;
    loading: boolean;
  }>({
    open: false,
    payment: null,
    isPartial: false,
    amount: '',
    reason: '',
    loading: false,
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

      const res = await fetch(`/api/admin/payapp-sales?${params}`);
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

  // 환불 처리
  const handleRefund = async () => {
    if (!refundModal.payment) return;

    setRefundModal((prev) => ({ ...prev, loading: true }));

    try {
      const res = await fetch(`/api/admin/payapp-sales/${refundModal.payment.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partcancel: refundModal.isPartial ? '1' : '0',
          cancelprice: refundModal.isPartial ? parseInt(refundModal.amount) : undefined,
          reason: refundModal.reason,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        alert(data.message);
        setRefundModal({ open: false, payment: null, isPartial: false, amount: '', reason: '', loading: false });
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
      case 'refunded':
        return 'bg-red-100 text-red-800';
      case 'partial_refunded':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'requested':
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-600';
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
          <h1 className="text-2xl font-bold text-gray-900">랜딩페이지 매출관리</h1>
          <p className="text-gray-600 mt-1">PayApp 결제 매출 현황 및 환불 관리</p>
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
            <p className="text-2xl font-bold text-red-600">{stats.totalRefunded.toLocaleString()}원</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalRefundedCount}건</p>
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
                ? ((stats.totalRefundedCount / stats.totalPaidCount) * 100).toFixed(1)
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
                    <td className="text-right py-2 px-3 text-red-600">{m.totalRefunded.toLocaleString()}원</td>
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
              }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">전체</option>
              <option value="paid">결제완료</option>
              <option value="refunded">환불완료</option>
              <option value="partial_refunded">부분환불</option>
              <option value="cancelled">취소</option>
              <option value="requested">결제요청</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">월별</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPage(1);
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
                fetchData();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              검색
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
                  <th className="text-left py-3 px-4">결제일시</th>
                  <th className="text-left py-3 px-4">고객정보</th>
                  <th className="text-left py-3 px-4">상품명</th>
                  <th className="text-left py-3 px-4">랜딩페이지</th>
                  <th className="text-right py-3 px-4">금액</th>
                  <th className="text-center py-3 px-4">결제수단</th>
                  <th className="text-center py-3 px-4">상태</th>
                  <th className="text-center py-3 px-4">액션</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="text-gray-900">
                        {new Date(p.paidAt || p.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(p.paidAt || p.createdAt).toLocaleTimeString('ko-KR')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{p.customerName}</div>
                      <div className="text-xs text-gray-500">{p.customerPhone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-[150px] truncate" title={p.productName}>
                        {p.productName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-[120px] truncate text-blue-600" title={p.landingPageTitle}>
                        {p.landingPageTitle}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-semibold">{p.amount.toLocaleString()}원</div>
                      {p.refundAmount && p.refundAmount > 0 && (
                        <div className="text-xs text-red-500">-{p.refundAmount.toLocaleString()}원</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-xs">{p.payTypeName || '-'}</div>
                      {p.cardName && <div className="text-xs text-gray-500">{p.cardName}</div>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                        {p.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(p.status === 'paid' || p.status === 'partial_refunded') && (
                        <button
                          onClick={() =>
                            setRefundModal({
                              open: true,
                              payment: p,
                              isPartial: false,
                              amount: '',
                              reason: '',
                              loading: false,
                            })
                          }
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          환불
                        </button>
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

            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p>
                  <span className="text-gray-500">고객:</span> {refundModal.payment.customerName}
                </p>
                <p>
                  <span className="text-gray-500">상품:</span> {refundModal.payment.productName}
                </p>
                <p>
                  <span className="text-gray-500">결제금액:</span>{' '}
                  {refundModal.payment.amount.toLocaleString()}원
                </p>
                {refundModal.payment.refundAmount && refundModal.payment.refundAmount > 0 && (
                  <p>
                    <span className="text-gray-500">기환불액:</span>{' '}
                    {refundModal.payment.refundAmount.toLocaleString()}원
                  </p>
                )}
                <p className="font-semibold text-green-600">
                  환불가능액:{' '}
                  {(
                    refundModal.payment.amount - (refundModal.payment.refundAmount || 0)
                  ).toLocaleString()}
                  원
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={refundModal.isPartial}
                    onChange={(e) => setRefundModal((prev) => ({ ...prev, isPartial: e.target.checked }))}
                  />
                  <span className="text-sm">부분 환불</span>
                </label>
              </div>

              {refundModal.isPartial && (
                <div>
                  <label className="block text-sm font-medium mb-1">환불 금액</label>
                  <input
                    type="number"
                    value={refundModal.amount}
                    onChange={(e) => setRefundModal((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="환불할 금액 입력"
                    max={refundModal.payment.amount - (refundModal.payment.refundAmount || 0)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">환불 사유</label>
                <textarea
                  value={refundModal.reason}
                  onChange={(e) => setRefundModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 h-20"
                  placeholder="환불 사유 입력 (선택)"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() =>
                  setRefundModal({
                    open: false,
                    payment: null,
                    isPartial: false,
                    amount: '',
                    reason: '',
                    loading: false,
                  })
                }
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={refundModal.loading}
              >
                취소
              </button>
              <button
                onClick={handleRefund}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={refundModal.loading || (refundModal.isPartial && !refundModal.amount)}
              >
                {refundModal.loading ? '처리중...' : '환불 실행'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
