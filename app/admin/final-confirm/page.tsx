'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FiCheck,
  FiX,
  FiRefreshCw,
  FiUser,
  FiPhone,
  FiFileText,
  FiCalendar,
  FiMic,
  FiExternalLink,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiAlertCircle,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';
import { csrfFetch } from '@/lib/csrf-client';

type FinalConfirmItem = {
  id: number;
  customer: {
    id?: number;
    name: string;
    phone: string;
    email?: string;
  };
  trip: {
    id: number;
    productCode: string;
    shipName: string;
    departureDate: string;
  } | null;
  travelers: Array<{
    id: number;
    korName: string;
    engName: string;
    passportNo: string;
    hasPassportImage: boolean;
    expiryDate: string | null;
  }>;
  agent: {
    id: number;
    displayName: string;
    legalName: string | null;
    type: string;
  } | null;
  pnrStatus: string | null;
  passportStatus: string | null;
  cabinType: string | null;
  finalConfirm: {
    status: string;
    requestedAt: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
    audioUrl: string | null;
  };
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const STATUS_TABS = [
  { value: 'REQUESTED', label: '요청대기', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'APPROVED', label: '승인완료', color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'REJECTED', label: '거절됨', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'ALL', label: '전체', color: 'text-gray-600 bg-gray-50 border-gray-200' },
];

export default function AdminFinalConfirmPage() {
  const [items, setItems] = useState<FinalConfirmItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('REQUESTED');
  const [selectedItem, setSelectedItem] = useState<FinalConfirmItem | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/final-confirm?status=${activeTab}&page=${pagination.page}&limit=${pagination.limit}`);
      const data = await res.json();

      if (data.ok) {
        setItems(data.items);
        setPagination(data.pagination);
      } else {
        showError(data.error || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      showError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleApprove = async (item: FinalConfirmItem) => {
    if (!confirm(`${item.customer.name} 고객의 최종확인을 승인하시겠습니까?`)) {
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/final-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: item.id,
          action: 'approve',
        }),
      });
      const data = await res.json();

      if (data.ok) {
        showSuccess('최종확인이 승인되었습니다.');
        fetchItems();
        setSelectedItem(null);
      } else {
        showError(data.error || '승인 처리에 실패했습니다.');
      }
    } catch (error) {
      showError('서버 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    if (!rejectionReason.trim()) {
      showError('거절 사유를 입력해주세요.');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/final-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedItem.id,
          action: 'reject',
          rejectionReason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();

      if (data.ok) {
        showSuccess('최종확인이 거절되었습니다.');
        fetchItems();
        setShowRejectModal(false);
        setSelectedItem(null);
        setRejectionReason('');
      } else {
        showError(data.error || '거절 처리에 실패했습니다.');
      }
    } catch (error) {
      showError('서버 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700">요청대기</span>;
      case 'APPROVED':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">승인완료</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">거절됨</span>;
      default:
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700">대기중</span>;
    }
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">최종확인 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            파트너가 요청한 최종확인을 검토하고 승인/거절할 수 있습니다.
          </p>
        </div>
        <button
          onClick={fetchItems}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              activeTab === tab.value
                ? tab.color + ' border-current'
                : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <FiRefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <FiFileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">최종확인 요청이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">고객정보</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">상품정보</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">담당자</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">PNR/여권</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">요청일시</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">상태</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FiUser className="text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">{item.customer.name}</div>
                        <div className="text-xs text-gray-500">{item.customer.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.trip ? (
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{item.trip.shipName}</div>
                        <div className="text-xs text-gray-500">{item.trip.productCode}</div>
                        <div className="text-xs text-gray-500">출발: {formatDate(item.trip.departureDate).split(' ')[0]}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.agent ? (
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{item.agent.displayName}</div>
                        {item.agent.legalName && (
                          <div className="text-xs text-gray-500">(계약: {item.agent.legalName})</div>
                        )}
                        <div className="text-xs text-blue-500">{item.agent.type === 'BRANCH_MANAGER' ? '대리점장' : '판매원'}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className={`text-xs px-2 py-0.5 rounded inline-block ${
                        item.pnrStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        PNR: {item.pnrStatus || '미등록'}
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded inline-block ${
                        item.passportStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        여권: {item.passportStatus || '미등록'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(item.finalConfirm.requestedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(item.finalConfirm.status)}
                    {item.finalConfirm.status === 'REJECTED' && item.finalConfirm.rejectionReason && (
                      <div className="mt-1 text-xs text-red-600 truncate max-w-[150px]" title={item.finalConfirm.rejectionReason}>
                        사유: {item.finalConfirm.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {/* 콜녹음 듣기 */}
                      {item.finalConfirm.audioUrl && (
                        <a
                          href={item.finalConfirm.audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="콜녹음 듣기"
                        >
                          <FiMic />
                        </a>
                      )}
                      {/* 상세보기 */}
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="상세보기"
                      >
                        <FiEye />
                      </button>
                      {/* 승인/거절 버튼 (요청대기 상태일 때만) */}
                      {item.finalConfirm.status === 'REQUESTED' && (
                        <>
                          <button
                            onClick={() => handleApprove(item)}
                            disabled={processing}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="승인"
                          >
                            <FiCheck />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowRejectModal(true);
                            }}
                            disabled={processing}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="거절"
                          >
                            <FiX />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                총 {pagination.total}건 중 {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}건
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft />
                </button>
                <span className="px-3 py-2 text-sm font-medium">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 상세보기 모달 */}
      {selectedItem && !showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">최종확인 상세정보</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <FiX />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 고객 정보 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">고객 정보</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">이름</span>
                    <span className="font-medium">{selectedItem.customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">연락처</span>
                    <span className="font-medium">{selectedItem.customer.phone}</span>
                  </div>
                  {selectedItem.customer.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">이메일</span>
                      <span className="font-medium">{selectedItem.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 상품 정보 */}
              {selectedItem.trip && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">상품 정보</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">상품명</span>
                      <span className="font-medium">{selectedItem.trip.shipName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">상품코드</span>
                      <span className="font-medium">{selectedItem.trip.productCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">출발일</span>
                      <span className="font-medium">{formatDate(selectedItem.trip.departureDate).split(' ')[0]}</span>
                    </div>
                    {selectedItem.cabinType && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">객실</span>
                        <span className="font-medium">{selectedItem.cabinType}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 여행자 정보 (여권) */}
              {selectedItem.travelers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">여행자 정보</h3>
                  <div className="space-y-3">
                    {selectedItem.travelers.map((traveler, index) => (
                      <div key={traveler.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">여행자 {index + 1}</span>
                          {traveler.hasPassportImage && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await csrfFetch(`/api/admin/traveler/${traveler.id}/passport-link`);
                                  const data = await res.json();
                                  if (data.ok && data.url) {
                                    window.open(data.url, '_blank', 'noopener,noreferrer');
                                  } else {
                                    showError(data.message || '여권 이미지를 불러올 수 없습니다.');
                                  }
                                } catch {
                                  showError('여권 이미지 불러오기 실패');
                                }
                              }}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <FiEye className="text-xs" /> 여권 이미지
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">한글명: </span>
                            <span className="font-medium">{traveler.korName || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">영문명: </span>
                            <span className="font-medium">{traveler.engName || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">여권번호: </span>
                            <span className="font-medium">{traveler.passportNo || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">만료일: </span>
                            <span className="font-medium">{traveler.expiryDate || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 담당자 정보 */}
              {selectedItem.agent && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">담당자 정보</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">이름</span>
                      <span className="font-medium">{selectedItem.agent.displayName}</span>
                    </div>
                    {selectedItem.agent.legalName && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">계약서상 이름</span>
                        <span className="font-medium text-blue-600">{selectedItem.agent.legalName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">직급</span>
                      <span className="font-medium">{selectedItem.agent.type === 'BRANCH_MANAGER' ? '대리점장' : '판매원'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 콜녹음 */}
              {selectedItem.finalConfirm.audioUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">콜녹음</h3>
                  <a
                    href={selectedItem.finalConfirm.audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    <FiMic />
                    <span className="font-medium">콜녹음 파일 듣기</span>
                    <FiExternalLink className="ml-auto" />
                  </a>
                </div>
              )}

              {/* 상태 정보 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">확인 상태</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">상태</span>
                    {getStatusBadge(selectedItem.finalConfirm.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">요청일시</span>
                    <span className="font-medium">{formatDate(selectedItem.finalConfirm.requestedAt)}</span>
                  </div>
                  {selectedItem.finalConfirm.approvedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">승인일시</span>
                      <span className="font-medium text-green-600">{formatDate(selectedItem.finalConfirm.approvedAt)}</span>
                    </div>
                  )}
                  {selectedItem.finalConfirm.rejectedAt && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">거절일시</span>
                        <span className="font-medium text-red-600">{formatDate(selectedItem.finalConfirm.rejectedAt)}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-gray-500 text-sm">거절 사유:</span>
                        <p className="mt-1 text-red-600">{selectedItem.finalConfirm.rejectionReason}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            {selectedItem.finalConfirm.status === 'REQUESTED' && (
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(true);
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-3 text-red-600 bg-red-50 font-semibold rounded-xl hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiX /> 거절
                </button>
                <button
                  onClick={() => handleApprove(selectedItem)}
                  disabled={processing}
                  className="flex-1 px-4 py-3 text-white bg-green-600 font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiCheck /> 승인
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 거절 모달 */}
      {showRejectModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
              <FiAlertCircle className="text-red-500 text-xl" />
              <h2 className="text-lg font-bold">최종확인 거절</h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                <strong>{selectedItem.customer.name}</strong> 고객의 최종확인 요청을 거절합니다.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">거절 사유</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="거절 사유를 입력해주세요."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-3 text-gray-600 bg-gray-100 font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 px-4 py-3 text-white bg-red-600 font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? '처리 중...' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
