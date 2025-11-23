'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiUsers,
  FiUpload,
  FiFileText,
  FiX,
  FiCheck,
  FiSearch,
  FiDownload,
  FiTrash2,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';
// 엑셀 처리는 서버 사이드에서만 사용 (클라이언트에서는 FileReader 사용)

type PartnerInfo = {
  profileId: number;
  type: 'BRANCH_MANAGER' | 'SALES_AGENT' | 'HQ';
  displayName: string | null;
  branchLabel: string | null;
  mallUserId: string;
  teamAgents: Array<{
    id: number;
    displayName: string | null;
    affiliateCode: string | null;
    mallUserId: string | null;
  }>;
};

type SendDbClientProps = {
  partner: PartnerInfo;
};

const STATUS_LABELS: Record<string, string> = {
  NEW: '신규',
  CONTACTED: '소통중',
  IN_PROGRESS: '진행 중',
  QUALIFIED: '자격확인',
  CONVERTED: '전환 완료',
  PURCHASED: '구매 완료',
  REFUNDED: '환불',
  CLOSED: '종료',
  TEST_GUIDE: '3일 부재',
};

type Customer = {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  createdAt: string;
  agentId: number | null;
};

export default function SendDbClient({ partner }: SendDbClientProps) {
  const router = useRouter();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [newCustomers, setNewCustomers] = useState<Array<{ name: string; phone: string; email: string; notes: string }>>([]);
  const [selectedNewCustomerIndices, setSelectedNewCustomerIndices] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 50;

  // 고객 목록 로드
  const loadCustomers = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', itemsPerPage.toString());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchTerm) params.set('q', searchTerm);

      const res = await fetch(`/api/partner/customers?${params}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || '고객 목록을 불러오지 못했습니다.');
      }

      // 대리점장 소유이고 아직 할당되지 않은 고객만 필터링
      const availableCustomers = (json.customers || []).filter(
        (c: any) => c.ownership === 'MANAGER' && !c.agentId
      );

      setCustomers(availableCustomers);
      setFilteredCustomers(availableCustomers);
      setTotalPages(Math.ceil((json.pagination?.total || 0) / itemsPerPage));
    } catch (error) {
      console.error('loadCustomers error', error);
      showError(error instanceof Error ? error.message : '고객 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadCustomers(currentPage);
  }, [loadCustomers, currentPage]);

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedCustomerIds.size === filteredCustomers.length) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  // 개별 선택/해제
  const toggleSelect = (customerId: number) => {
    const newSet = new Set(selectedCustomerIds);
    if (newSet.has(customerId)) {
      newSet.delete(customerId);
    } else {
      newSet.add(customerId);
    }
    setSelectedCustomerIds(newSet);
  };

  // 엑셀 샘플 다운로드
  const handleDownloadSample = async () => {
    try {
      const res = await fetch('/api/partner/customer-groups/excel-upload', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('엑셀 샘플 다운로드에 실패했습니다.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '고객_일괄등록_양식.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showSuccess('엑셀 샘플 파일이 다운로드되었습니다.');
    } catch (error) {
      showError(error instanceof Error ? error.message : '엑셀 샘플 다운로드에 실패했습니다.');
    }
  };

  // 엑셀 파일 읽기 (서버에서 처리)
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/partner/customers/parse-excel', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || '엑셀 파일을 읽는 중 오류가 발생했습니다.');
      }

      const parsedCustomers = json.customers || [];
      setNewCustomers(parsedCustomers);
      // 엑셀에서 불러온 고객들은 자동으로 모두 선택
      setSelectedNewCustomerIndices(new Set(parsedCustomers.map((_: any, idx: number) => idx)));
      showSuccess(`${parsedCustomers.length}건의 고객 정보를 불러왔습니다.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : '엑셀 파일을 읽는 중 오류가 발생했습니다.');
    }
  };

  // DB 보내기
  const handleSendDb = async () => {
    if (!selectedAgentId) {
      showError('판매원을 선택해주세요.');
      return;
    }

    // 선택된 엑셀 고객들만 필터링
    const selectedNewCustomers = newCustomers.filter((_, idx) => selectedNewCustomerIndices.has(idx));
    
    if (selectedCustomerIds.size === 0 && selectedNewCustomers.length === 0) {
      showError('고객을 선택하거나 추가해주세요.');
      return;
    }

    // 새 고객 유효성 검사
    for (const customer of selectedNewCustomers) {
      if (!customer.name || !customer.phone) {
        showError('새 고객의 이름과 연락처는 필수입니다.');
        return;
      }
    }

    setSending(true);
    try {
      const res = await fetch('/api/partner/customers/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leadIds: Array.from(selectedCustomerIds),
          agentId: selectedAgentId,
          customerData: selectedNewCustomers,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'DB 보내기에 실패했습니다.');
      }

      const totalProcessed = json.results.assigned.length + json.results.created.length;
      showSuccess(`DB 보내기 완료: ${totalProcessed}건 처리됨`);
      router.push(`/partner/${partner.mallUserId}/customers`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'DB 보내기에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            >
              <FiArrowLeft className="text-xl" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">DB 보내기</h1>
              <p className="text-sm text-gray-500">판매원에게 고객 DB를 할당합니다</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 좌측: 판매원 선택 및 설정 */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-bold text-gray-900">1. 판매원 선택</h2>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
              >
                <option value="">판매원을 선택하세요</option>
                {partner.teamAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.displayName ?? '판매원'} ({agent.affiliateCode ?? '코드 없음'})
                  </option>
                ))}
              </select>

              <div className="mb-6 border-t border-gray-200 pt-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">엑셀 파일로 추가</h3>
                <button
                  onClick={handleDownloadSample}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FiDownload /> 샘플 다운로드
                </button>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="w-full text-sm"
                />
                {excelFile && (
                  <p className="mt-2 text-xs text-gray-600">{excelFile.name}</p>
                )}
                {newCustomers.length > 0 && (
                  <div className="mt-3 rounded-lg bg-green-50 p-3">
                    <p className="text-sm font-semibold text-green-700">
                      {newCustomers.length}건의 고객 정보가 준비되었습니다.
                    </p>
                    <button
                      onClick={() => {
                        // 엑셀 고객 목록 초기화
                        setNewCustomers([]);
                        setSelectedNewCustomerIndices(new Set());
                        setExcelFile(null);
                      }}
                      className="mt-2 text-xs text-red-600 hover:text-red-700"
                    >
                      제거
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="mb-4">
                  <p className="mb-2 text-sm font-semibold text-gray-700">선택된 고객</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedCustomerIds.size + selectedNewCustomerIndices.size}명
                  </p>
                </div>
                <button
                  onClick={handleSendDb}
                  disabled={sending || !selectedAgentId || (selectedCustomerIds.size === 0 && selectedNewCustomerIndices.size === 0)}
                  className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? '보내는 중...' : 'DB 보내기'}
                </button>
              </div>
            </div>
          </div>

          {/* 우측: 고객 목록 */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">2. 고객 선택</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {selectedCustomerIds.size === filteredCustomers.length ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
              </div>

              {/* 검색 및 필터 */}
              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="고객 이름 또는 연락처 검색"
                    className="w-full rounded-lg border border-gray-300 px-10 py-2 text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="ALL">전체 상태</option>
                  <option value="NEW">신규</option>
                  <option value="CONTACTED">연락함</option>
                  <option value="QUALIFIED">자격 있음</option>
                  <option value="CONVERTED">전환됨</option>
                </select>
              </div>

              {/* 엑셀에서 불러온 고객 목록 */}
              {newCustomers.length > 0 && (
                <div className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-green-800">
                      📋 엑셀에서 불러온 고객 ({newCustomers.length}건)
                    </h3>
                    <button
                      onClick={() => {
                        if (selectedNewCustomerIndices.size === newCustomers.length) {
                          setSelectedNewCustomerIndices(new Set());
                        } else {
                          setSelectedNewCustomerIndices(new Set(newCustomers.map((_, idx) => idx)));
                        }
                      }}
                      className="text-xs text-green-700 hover:text-green-800"
                    >
                      {selectedNewCustomerIndices.size === newCustomers.length ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-green-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-green-800">
                            <input
                              type="checkbox"
                              checked={selectedNewCustomerIndices.size === newCustomers.length && newCustomers.length > 0}
                              onChange={() => {
                                if (selectedNewCustomerIndices.size === newCustomers.length) {
                                  setSelectedNewCustomerIndices(new Set());
                                } else {
                                  setSelectedNewCustomerIndices(new Set(newCustomers.map((_, idx) => idx)));
                                }
                              }}
                              className="rounded"
                            />
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-green-800">고객명</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-green-800">연락처</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-green-800">이메일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-100">
                        {newCustomers.map((customer, idx) => (
                          <tr
                            key={`excel-${idx}`}
                            className={`hover:bg-green-100 ${
                              selectedNewCustomerIndices.has(idx) ? 'bg-green-200' : ''
                            }`}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedNewCustomerIndices.has(idx)}
                                onChange={() => {
                                  const newSet = new Set(selectedNewCustomerIndices);
                                  if (newSet.has(idx)) {
                                    newSet.delete(idx);
                                  } else {
                                    newSet.add(idx);
                                  }
                                  setSelectedNewCustomerIndices(newSet);
                                }}
                                className="rounded"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                              {customer.name || '이름 없음'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">
                              {customer.phone || '-'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">
                              {customer.email || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 기존 고객 목록 */}
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-bold text-gray-700">기존 고객 목록</h3>
              </div>
              {loading ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  고객 목록을 불러오는 중입니다...
                </div>
              ) : filteredCustomers.length === 0 && newCustomers.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  선택 가능한 고객이 없습니다.
                </div>
              ) : filteredCustomers.length === 0 ? null : (
                <>
                  <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                            <input
                              type="checkbox"
                              checked={selectedCustomerIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                              onChange={toggleSelectAll}
                              className="rounded"
                            />
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">고객명</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">연락처</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">상태</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">유입일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredCustomers.map((customer) => (
                          <tr
                            key={customer.id}
                            className={`hover:bg-gray-50 ${
                              selectedCustomerIds.has(customer.id) ? 'bg-purple-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedCustomerIds.has(customer.id)}
                                onChange={() => toggleSelect(customer.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {customer.customerName || '이름 없음'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {customer.customerPhone || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                                {STATUS_LABELS[customer.status] ?? customer.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {new Date(customer.createdAt).toLocaleDateString('ko-KR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        이전
                      </button>
                      <span className="text-sm text-gray-600">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

