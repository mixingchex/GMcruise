'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiSearch, FiFilter, FiArrowUp, FiArrowDown, FiChevronLeft, FiChevronRight, FiUser, FiPlus, FiX, FiInfo } from 'react-icons/fi';
import CustomerTable from '@/components/admin/CustomerTable';

type AffiliateOwnershipSource = 'self-profile' | 'lead-agent' | 'lead-manager' | 'fallback';

type AffiliateOwnership = {
  ownerType: 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
  ownerProfileId: number | null;
  ownerName: string | null;
  ownerNickname: string | null;
  ownerAffiliateCode: string | null;
  ownerBranchLabel: string | null;
  ownerStatus: string | null;
  ownerPhone: string | null; // 담당자 연락처
  source: AffiliateOwnershipSource;
  managerProfile: {
    id: number;
    displayName: string | null;
    nickname: string | null;
    affiliateCode: string | null;
    branchLabel: string | null;
    status: string | null;
    contactPhone: string | null; // 대리점장 연락처
  } | null;
  leadId?: number | null;
  leadStatus?: string | null;
  leadCreatedAt?: string | null;
  normalizedPhone?: string | null;
};

interface Customer {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  tripCount: number;
  totalTripCount: number;
  isHibernated: boolean;
  isLocked: boolean;
  customerStatus: string | null;
  status?: 'active' | 'package' | 'dormant' | 'locked' | 'test' | 'test-locked' | null; // 지니 상태
  customerType?: 'cruise-guide' | 'mall' | 'test' | 'prospect' | 'admin' | 'mall-admin' | 'partner'; // 고객 분류
  isMallUser?: boolean; // 크루즈몰 고객 여부
  mallUserId?: string | null; // 크루즈몰 사용자 ID
  mallNickname?: string | null; // 크루즈몰 닉네임
  kakaoChannelAdded?: boolean; // 카카오 채널 추가 여부
  kakaoChannelAddedAt?: string | null; // 카카오 채널 추가 일시
  pwaGenieInstalledAt?: string | null; // 크루즈가이드 지니 바탕화면 추가 일시
  pwaMallInstalledAt?: string | null; // 크루즈몰 바탕화면 추가 일시
  currentTripEndDate: string | null;
  role?: string | null; // 사용자 역할
  AffiliateProfile?: {
    id: number;
    type: 'BRANCH_MANAGER' | 'SALES_AGENT' | 'HQ';
    status: string;
    displayName: string | null;
    nickname: string | null;
    affiliateCode: string | null;
    branchLabel: string | null;
  } | null;
  trips: Array<{
    id: number;
    cruiseName: string | null;
    companionType: string | null;
    destination: any;
    startDate: string | null;
    endDate: string | null;
  }>;
  affiliateOwnership?: AffiliateOwnership | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL 파라미터에서 customerGroup 읽기 (리다이렉트 지원)
  // 기본값: 'all' (전체 고객 표시) - 사용자가 원하는 그룹을 선택할 수 있도록
  const initialGroup = searchParams?.get('customerGroup') || 'all';
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    phone: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showStatusGuide, setShowStatusGuide] = useState(true);

  // 필터 및 검색 상태
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'hibernated' | 'locked'>('all');
  const [certificateType, setCertificateType] = useState<'all' | 'purchase_confirmed' | 'refunded'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'tripCount' | 'lastActiveAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [managers, setManagers] = useState<Array<{ id: number; displayName: string | null; branchLabel: string | null; affiliateCode: string | null }>>([]);
  const [customerGroup, setCustomerGroup] = useState<string>(initialGroup); // 고객 그룹 필터 (기본값: trial)
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({}); // 그룹별 고객 수
  const [totalCustomers, setTotalCustomers] = useState<number>(0); // 전체 고객 수

  // 검색어 debounce
  const [searchInput, setSearchInput] = useState('');

  // URL 파라미터 변경 시 customerGroup 업데이트
  useEffect(() => {
    const urlGroup = searchParams?.get('customerGroup') || 'all'; // 기본값: all
    if (urlGroup !== customerGroup) {
      setCustomerGroup(urlGroup);
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [searchParams, customerGroup]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadCustomers();
  }, [search, status, certificateType, monthFilter, sortBy, sortOrder, pagination.page, selectedManagerId, customerGroup]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        search,
        status,
        sortBy,
        sortOrder,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(selectedManagerId && { managerProfileId: selectedManagerId }),
        ...(certificateType !== 'all' && { certificateType }),
        ...(monthFilter && { monthFilter }),
        ...(customerGroup && customerGroup !== 'all' && { customerGroup }), // 'all'일 때는 파라미터 전달 안 함
      });

      const response = await fetch(`/api/admin/customers?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store', // 캐시 방지로 최신 데이터 가져오기
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('인증이 필요합니다. 다시 로그인해 주세요.');
        }
        throw new Error('고객 목록을 불러올 수 없습니다.');
      }

      const data = await response.json();
      console.log('[Customers Page] API Response:', {
        ok: data.ok,
        customersCount: data.customers?.length || 0,
        total: data.pagination?.total || 0,
        error: data.error,
      });
      
      if (!data.ok) {
        console.error('[Customers Page] API Error:', data.error);
        throw new Error(data.error || '고객 목록을 불러오는 중 오류가 발생했습니다.');
      }

      console.log('[Customers Page] Setting customers:', data.customers?.length || 0);
      setCustomers(data.customers || []);
      setPagination(data.pagination || pagination);
      if (data.managers) {
        setManagers(data.managers);
      }
      if (data.groupCounts) {
        setGroupCounts(data.groupCounts);
        // 전체 고객 수 계산 (모든 그룹의 합)
        // 주의: 일부 고객이 여러 그룹에 중복 카운트될 수 있음 (예: 대리점장 고객이면서 구매 고객)
        const total = Object.values(data.groupCounts).reduce((sum, count) => sum + count, 0);
        setTotalCustomers(total);
      }
      
      if (!data.customers || data.customers.length === 0) {
        console.warn('[Customers Page] No customers found. Query params:', params.toString());
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      setError(error instanceof Error ? error.message : '고객 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />;
  };

  const handleCreateGenieCustomer = async () => {
    if (!createFormData.name || !createFormData.phone) {
      alert('이름과 연락처를 모두 입력해주세요.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/customers/create-genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(createFormData),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || '고객 추가에 실패했습니다.');
      }

      alert('지니가이드 고객이 추가되었습니다.');
      setIsCreateModalOpen(false);
      setCreateFormData({ name: '', phone: '' });
      await loadCustomers();
    } catch (error) {
      console.error('Failed to create genie customer:', error);
      alert(error instanceof Error ? error.message : '고객 추가 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">전체 고객 관리</h1>
          <p className="text-gray-600">모든 고객을 조회하고 관리하세요</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          고객 추가
        </button>
      </div>

      {/* 전체 고객 관리 - 카테고리 섹션 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">전체 고객 관리</h2>
          <p className="text-sm text-gray-600">고객 유입 경로와 상태에 따라 그룹을 선택하여 관리하세요</p>
        </div>
        
        {/* 카테고리 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { 
              value: 'all', 
              label: '전체 고객', 
              description: '모든 고객 조회',
              icon: '👥',
              countKey: 'all',
              color: 'gray'
            },
            { 
              value: 'trial', 
              label: '크루즈가이드 3일 체험', 
              description: '3일 무료 체험을 시작한 잠재고객 (테스트 고객관리 통합)',
              icon: '🧪',
              countKey: 'trial',
              color: 'orange'
            },
            { 
              value: 'mall', 
              label: '크루즈몰 고객', 
              description: '크루즈몰에서 가입한 잠재고객 (메인몰 고객관리 통합)',
              icon: '🛍️',
              countKey: 'mall',
              color: 'green'
            },
            { 
              value: 'purchase', 
              label: '구매 고객', 
              description: '크루즈가이드 지니를 구매한 고객 (동행인 포함, 크루즈가이드 고객 통합)',
              icon: '✅',
              countKey: 'purchase',
              color: 'blue'
            },
            { 
              value: 'refund', 
              label: '환불 고객', 
              description: '환불 처리가 완료된 고객',
              icon: '↩️',
              countKey: 'refund',
              color: 'red'
            },
            { 
              value: 'passport', 
              label: '여권 관리', 
              description: '구매 고객 중 여권 정보 관리 대상',
              icon: '🛂',
              countKey: 'passport',
              color: 'purple'
            },
            { 
              value: 'manager-customers', 
              label: '대리점장 고객', 
              description: '대리점장 소유 고객 (충돌 없이 별도 관리)',
              icon: '🏢',
              countKey: 'manager-customers',
              color: 'indigo'
            },
            { 
              value: 'agent-customers', 
              label: '판매원 고객', 
              description: '판매원 소유 고객 (충돌 없이 별도 관리)',
              icon: '👤',
              countKey: 'agent-customers',
              color: 'teal'
            },
            { 
              value: 'prospects', 
              label: '잠재고객', 
              description: '마케팅 랜딩페이지로 유입된 잠재고객',
              icon: '📄',
              countKey: 'prospects',
              color: 'yellow'
            },
          ].map((category) => {
            const count = groupCounts[category.countKey] ?? 0;
            const isActive = customerGroup === category.value;
            const colorClasses = {
              gray: isActive ? 'bg-gray-50 border-gray-500' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              orange: isActive ? 'bg-orange-50 border-orange-500' : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50',
              green: isActive ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50',
              blue: isActive ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50',
              red: isActive ? 'bg-red-50 border-red-500' : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50',
              purple: isActive ? 'bg-purple-50 border-purple-500' : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50',
              indigo: isActive ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50',
              teal: isActive ? 'bg-teal-50 border-teal-500' : 'bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50',
              yellow: isActive ? 'bg-yellow-50 border-yellow-500' : 'bg-white border-gray-200 hover:border-yellow-300 hover:bg-yellow-50',
            };
            
            return (
              <button
                key={category.value}
                onClick={() => {
                  setCustomerGroup(category.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className={`relative p-4 rounded-lg border-2 transition-all text-left ${colorClasses[category.color as keyof typeof colorClasses]}`}
                title={category.description}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.icon}</span>
                    <h3 className="font-semibold text-gray-800 text-sm">{category.label}</h3>
                  </div>
                  {count !== null && count !== undefined && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-white text-gray-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 빠른 가이드 */}
      {showStatusGuide && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6 relative">
          <button
            onClick={() => setShowStatusGuide(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-base font-bold text-blue-900 mb-2">빠른 가이드</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 rounded text-xs font-semibold">활성</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded text-xs font-semibold">가이드잠금</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 border border-green-300 rounded text-xs font-semibold">크루즈몰</span>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded text-xs font-semibold">동면</span>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-800 border border-orange-300 rounded text-xs font-semibold">테스트</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-800 border border-gray-300 rounded text-xs font-semibold">테스트잠금</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div><span className="font-semibold">구매 정보:</span> 예약이 있는 고객 표시</div>
                  <div><span className="font-semibold">여권 상태:</span> ✅ 완료 / ⚠️ 부족</div>
                  <div><span className="font-semibold">소속:</span> 대리점장/판매원/본사</div>
                </div>
                <p className="text-xs text-blue-700">고객 이름 클릭 → 상세 정보 확인 및 관리</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* 검색 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="이름, 전화번호, 이메일로 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 점장 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">대리점장별 필터</label>
            <select
              value={selectedManagerId}
              onChange={(e) => {
                setSelectedManagerId(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체 대리점장</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id.toString()}>
                  {manager.displayName || manager.branchLabel || `대리점장 #${manager.id}`}
                  {manager.branchLabel && ` (${manager.branchLabel})`}
                </option>
              ))}
            </select>
          </div>

          {/* 상태 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="locked">가이드잠금</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 인증서 타입 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">인증서 타입</label>
            <select
              value={certificateType}
              onChange={(e) => {
                setCertificateType(e.target.value as typeof certificateType);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">전체</option>
              <option value="purchase_confirmed">구매확인인증 고객</option>
              <option value="refunded">환불인증완료 고객</option>
            </select>
          </div>

          {/* 월별 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">월별 필터</label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 정렬 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">정렬</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(field);
                setSortOrder(order);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="createdAt-desc">최신 가입순</option>
              <option value="createdAt-asc">오래된 가입순</option>
              <option value="name-asc">이름순 (가나다)</option>
              <option value="name-desc">이름순 (역순)</option>
              <option value="tripCount-desc">여행 횟수 많은순</option>
              <option value="tripCount-asc">여행 횟수 적은순</option>
              <option value="lastActiveAt-desc">최근 접속순</option>
              <option value="lastActiveAt-asc">오래된 접속순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 고객 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
        </div>
      ) : (
        <>
          <CustomerTable customers={customers} onRefresh={loadCustomers} />
          
          {/* 페이지네이션 */}
          {pagination.totalPages > 1 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  총 {pagination.total}명 중 {((pagination.page - 1) * pagination.limit) + 1}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)}명 표시
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            pagination.page === pageNum
                              ? 'bg-brand-red text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 지니가이드 고객 추가 모달 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">지니가이드 고객 추가</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreateFormData({ name: '', phone: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="이름을 입력하세요"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                  placeholder="연락처를 입력하세요"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">비밀번호는 자동으로 3800으로 설정됩니다.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateGenieCustomer}
                  disabled={isCreating || !createFormData.name || !createFormData.phone}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? '추가 중...' : '추가'}
                </button>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setCreateFormData({ name: '', phone: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}