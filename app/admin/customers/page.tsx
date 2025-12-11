'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiSearch, FiFilter, FiArrowUp, FiArrowDown, FiChevronLeft, FiChevronRight, FiUser, FiPlus, FiX, FiInfo, FiDownload, FiExternalLink } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import { Customer } from '@/types/customer';

// 성능 최적화: 큰 컴포넌트를 동적 임포트로 분리하여 초기 번들 크기 감소
const CustomerTable = dynamic(
  () => import('@/components/admin/CustomerTable'),
  {
    loading: () => (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    ),
    ssr: false, // 클라이언트 전용 컴포넌트
  }
);

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

// Admin 페이지에서 사용하는 확장 Customer 타입
interface AdminCustomer extends Customer {
  email?: string | null;
  createdAt?: string;
  lastActiveAt?: string | null;
  tripCount?: number;
  totalTripCount?: number;
  isHibernated?: boolean;
  isLocked?: boolean;
  customerStatus?: string | null;
  isMallUser?: boolean;
  mallUserId?: string | null;
  mallNickname?: string | null;
  kakaoChannelAdded?: boolean;
  kakaoChannelAddedAt?: string | null;
  pwaGenieInstalledAt?: string | null;
  pwaMallInstalledAt?: string | null;
  currentTripEndDate?: string | null;
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
    companionType?: string | null;
    destination?: any;
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
  
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50, // 기본값을 50으로 증가 (성능 최적화)
    totalPages: 1,
  });
  const [pageSize, setPageSize] = useState<number>(50); // 페이지 크기 선택
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
  const [ownerSearch, setOwnerSearch] = useState<string>(''); // 담당자 이름 검색
  const [managers, setManagers] = useState<Array<{ id: number; displayName: string | null; branchLabel: string | null; affiliateCode: string | null }>>([]);
  const [customerGroup, setCustomerGroup] = useState<string>(initialGroup); // 고객 그룹 필터 (기본값: trial)
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({}); // 그룹별 고객 수
  const [totalCustomers, setTotalCustomers] = useState<number>(0); // 전체 고객 수

  // 검색어 debounce
  const [searchInput, setSearchInput] = useState('');
  
  // 로딩 중복 방지를 위한 ref
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // loadCustomers를 useCallback으로 메모이제이션하여 불필요한 재생성 방지
  const loadCustomers = useCallback(async () => {
    // 중복 요청 방지
    if (isLoadingRef.current) {
      return;
    }
    
    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 새로운 AbortController 생성
    abortControllerRef.current = new AbortController();
    
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        search,
        status,
        sortBy,
        sortOrder,
        page: pagination.page.toString(),
        limit: pageSize.toString(), // 동적 페이지 크기 사용
        ...(selectedManagerId && { managerProfileId: selectedManagerId }),
        ...(ownerSearch && { ownerSearch }), // 담당자 이름 검색
        ...(certificateType !== 'all' && { certificateType }),
        ...(monthFilter && { monthFilter }),
        ...(customerGroup && { customerGroup }), // customerGroup 파라미터 전달 (all 포함)
      });

      // 성능 최적화: 클라이언트 측 캐싱 (30초)
      // 캐시 키 생성: undefined 값 처리로 정확성 향상
      const cacheKey = `customers_${customerGroup || 'all'}_${search || ''}_${status || 'all'}_${certificateType || 'all'}_${monthFilter || ''}_${sortBy || 'createdAt'}_${sortOrder || 'desc'}_${pagination.page || 1}_${pageSize || 50}_${selectedManagerId || ''}_${ownerSearch || ''}`;
      const CACHE_DURATION = 30 * 1000; // 30초
      
      // 캐시 확인
      try {
        const cached = sessionStorage.getItem(cacheKey);
        const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
        const now = Date.now();
        
        if (cached && cacheTime) {
          const cacheAge = now - parseInt(cacheTime, 10);
          if (cacheAge < CACHE_DURATION) {
            // 캐시된 데이터 사용
            const data = JSON.parse(cached);
            console.log('[Customers Page] Using cached data:', {
              customersCount: data.customers?.length || 0,
              cacheAge: Math.round(cacheAge / 1000) + '초',
            });
            
            setCustomers(data.customers || []);
            setPagination({
              ...(data.pagination || pagination),
              limit: pageSize,
            });
            if (data.managers) {
              setManagers(data.managers);
            }
            if (data.groupCounts) {
              setGroupCounts(data.groupCounts);
              const total = Object.values(data.groupCounts as Record<string, number>).reduce((sum: number, count: number) => sum + count, 0);
              setTotalCustomers(total);
            }
            setIsLoading(false);
            isLoadingRef.current = false;
            return; // 캐시된 데이터 사용, API 호출 스킵
          } else {
            // 캐시 만료, 삭제
            sessionStorage.removeItem(cacheKey);
            sessionStorage.removeItem(`${cacheKey}_time`);
          }
        }
      } catch (cacheError) {
        // 캐시 읽기 실패 시 무시하고 API 호출 진행
        console.warn('[Customers Page] Cache read error:', cacheError);
      }

      const response = await fetch(`/api/admin/customers?${params.toString()}`, {
        credentials: 'include',
        signal: abortControllerRef.current.signal, // 요청 취소 지원
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
      setPagination({
        ...(data.pagination || pagination),
        limit: pageSize, // 페이지 크기 동기화
      });
      if (data.managers) {
        setManagers(data.managers);
      }
      if (data.groupCounts) {
        setGroupCounts(data.groupCounts);
        // 전체 고객 수 계산 (모든 그룹의 합)
        // 주의: 일부 고객이 여러 그룹에 중복 카운트될 수 있음 (예: 대리점장 고객이면서 구매 고객)
        const total = Object.values(data.groupCounts as Record<string, number>).reduce((sum: number, count: number) => sum + count, 0);
        setTotalCustomers(total);
      }
      
      // 성능 최적화: 응답 데이터를 캐시에 저장
      try {
        const now = Date.now();
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        sessionStorage.setItem(`${cacheKey}_time`, now.toString());
        console.log('[Customers Page] Data cached:', cacheKey);
      } catch (cacheError) {
        // 캐시 저장 실패 시 무시 (용량 제한 등)
        console.warn('[Customers Page] Cache write error:', cacheError);
      }
      
      if (!data.customers || data.customers.length === 0) {
        console.warn('[Customers Page] No customers found. Query params:', params.toString());
      }
    } catch (error: any) {
      // AbortError는 무시 (요청 취소)
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('Failed to load customers:', error);
      setError(error instanceof Error ? error.message : '고객 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [search, status, certificateType, monthFilter, sortBy, sortOrder, pagination.page, selectedManagerId, ownerSearch, customerGroup, pageSize]);

  useEffect(() => {
    loadCustomers();
    
    // cleanup: 컴포넌트 언마운트 시 요청 취소
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadCustomers]);

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

  // 캐시 무효화 함수
  const invalidateCache = useCallback(() => {
    try {
      // 'customers_'로 시작하는 모든 캐시 키 삭제
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('customers_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      console.log('[Customers Page] Cache invalidated:', keysToRemove.length, 'keys');
    } catch (error) {
      console.warn('[Customers Page] Cache invalidation error:', error);
    }
  }, []);

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

      // 고객 추가 후 캐시 무효화
      invalidateCache();
      
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
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                const url = `/api/admin/customers/export?customerGroup=${customerGroup}`;
                const response = await fetch(url, {
                  credentials: 'include',
                });
                
                if (!response.ok) {
                  throw new Error('다운로드 실패');
                }
                
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `고객목록_${customerGroup}_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
              } catch (error) {
                console.error('엑셀 다운로드 실패:', error);
                alert('엑셀 다운로드 중 오류가 발생했습니다.');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <FiDownload className="w-5 h-5" />
            엑셀 다운로드
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            고객 추가
          </button>
        </div>
      </div>

      {/* 고객 관리 카테고리 - 핵심 7개 */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">고객 분류</h2>
              <p className="text-slate-300 text-sm mt-1">카테고리를 선택하여 고객을 관리하세요</p>
            </div>
            <button
              onClick={() => {
                window.open('https://docs.google.com/spreadsheets/d/11_cfi841QGIDaBmYdjdk3aHYp2UYpCnx1QVVrgV7QJY/edit', '_blank');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors backdrop-blur-sm"
            >
              <FiExternalLink className="w-4 h-4" />
              엑셀로 보기
            </button>
          </div>
        </div>

        {/* 카테고리 그리드 - 7개 핵심 카테고리 */}
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {[
              {
                value: 'all',
                label: '전체 고객',
                icon: '👥',
                countKey: 'all',
                bgColor: 'bg-slate-100',
                activeColor: 'bg-slate-600',
                textColor: 'text-slate-700',
              },
              {
                value: 'purchase',
                label: '구매 고객',
                icon: '✅',
                countKey: 'purchase',
                bgColor: 'bg-blue-100',
                activeColor: 'bg-blue-600',
                textColor: 'text-blue-700',
              },
              {
                value: 'trial',
                label: '3일 체험',
                icon: '🧪',
                countKey: 'trial',
                bgColor: 'bg-orange-100',
                activeColor: 'bg-orange-600',
                textColor: 'text-orange-700',
              },
              {
                value: 'refund',
                label: '환불 고객',
                icon: '↩️',
                countKey: 'refund',
                bgColor: 'bg-red-100',
                activeColor: 'bg-red-600',
                textColor: 'text-red-700',
              },
              {
                value: 'mall',
                label: '크루즈몰',
                icon: '🛍️',
                countKey: 'mall',
                bgColor: 'bg-green-100',
                activeColor: 'bg-green-600',
                textColor: 'text-green-700',
              },
              {
                value: 'passport',
                label: '여권 관리',
                icon: '🛂',
                countKey: 'passport',
                bgColor: 'bg-purple-100',
                activeColor: 'bg-purple-600',
                textColor: 'text-purple-700',
              },
              {
                value: 'inquiry',
                label: '문의 고객',
                icon: '💬',
                countKey: 'inquiry',
                bgColor: 'bg-pink-100',
                activeColor: 'bg-pink-600',
                textColor: 'text-pink-700',
              },
            ].map((category) => {
              const count = groupCounts[category.countKey] ?? 0;
              const isActive = customerGroup === category.value;

              return (
                <button
                  key={category.value}
                  onClick={() => {
                    setCustomerGroup(category.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                    router.push(`/admin/customers?customerGroup=${category.value}`, { scroll: false });
                  }}
                  disabled={isLoading}
                  className={`relative p-4 rounded-xl border-2 transition-all text-center ${
                    isActive
                      ? `${category.activeColor} border-transparent text-white shadow-lg scale-105`
                      : `${category.bgColor} border-transparent hover:border-gray-300 hover:shadow-md ${category.textColor}`
                  } disabled:opacity-50`}
                >
                  <div className="text-2xl mb-2">{category.icon}</div>
                  <div className="font-bold text-sm">{category.label}</div>
                  <div className={`text-lg font-bold mt-1 ${isActive ? 'text-white' : ''}`}>
                    {count.toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 추가 필터 (대리점장/판매원/잠재고객) - 접힌 상태로 */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 py-2">
              + 더 많은 필터 보기 (대리점장 고객, 판매원 고객, 잠재고객)
            </summary>
            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-200">
              {[
                {
                  value: 'manager-customers',
                  label: '대리점장 고객',
                  icon: '🏢',
                  countKey: 'manager-customers',
                },
                {
                  value: 'agent-customers',
                  label: '판매원 고객',
                  icon: '👤',
                  countKey: 'agent-customers',
                },
                {
                  value: 'prospects',
                  label: '잠재고객',
                  icon: '📄',
                  countKey: 'prospects',
                },
              ].map((category) => {
                const count = groupCounts[category.countKey] ?? 0;
                const isActive = customerGroup === category.value;

                return (
                  <button
                    key={category.value}
                    onClick={() => {
                      setCustomerGroup(category.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                      router.push(`/admin/customers?customerGroup=${category.value}`, { scroll: false });
                    }}
                    disabled={isLoading}
                    className={`p-3 rounded-lg border transition-all text-center ${
                      isActive
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-700'
                    } disabled:opacity-50`}
                  >
                    <span className="text-xl">{category.icon}</span>
                    <div className="font-medium text-sm mt-1">{category.label}</div>
                    <div className="font-bold">{count.toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          </details>
        </div>
      </div>

      {/* 빠른 가이드 - 간소화 */}
      {showStatusGuide && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 relative">
          <button
            onClick={() => setShowStatusGuide(false)}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"
          >
            <FiX className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4 text-sm">
            <FiInfo className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-blue-800">
              <span><strong>상세보기</strong> 클릭 → 고객 정보 및 상담기록</span>
              <span>|</span>
              <span><strong>여권</strong>: ✅완료 / ⚠️미완료</span>
              <span>|</span>
              <span><strong>소속</strong>: 대리점장/판매원/본사</span>
            </div>
          </div>
        </div>
      )}

      {/* 검색 및 필터 - 개선된 디자인 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-6">
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

          {/* 담당자 이름 검색 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">담당자 검색</label>
            <input
              type="text"
              value={ownerSearch}
              onChange={(e) => {
                setOwnerSearch(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              placeholder="판매원/대리점장 이름 검색"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">가입 월별 필터</label>
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">전체 기간</option>
              {(() => {
                const months = [];
                const now = new Date();
                for (let i = 0; i < 12; i++) {
                  const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const value = `${year}-${month}`;
                  const label = `${year}년 ${month}월`;
                  months.push({ value, label });
                }
                return months;
              })().map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
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

        {/* 활성 필터 표시 (필터 칩) */}
        {(search || status !== 'all' || certificateType !== 'all' || monthFilter || selectedManagerId || ownerSearch) && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">활성 필터:</span>
            {search && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-2">
                검색: {search}
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                  }}
                  className="hover:text-blue-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </span>
            )}
            {status !== 'all' && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-2">
                상태: {status === 'active' ? '활성' : status === 'hibernated' ? '동면' : '잠금'}
                <button
                  onClick={() => setStatus('all')}
                  className="hover:text-green-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </span>
            )}
            {certificateType !== 'all' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium flex items-center gap-2">
                인증서: {certificateType === 'purchase_confirmed' ? '구매확인' : '환불'}
                <button
                  onClick={() => setCertificateType('all')}
                  className="hover:text-purple-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </span>
            )}
            {monthFilter && (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium flex items-center gap-2">
                가입월: {monthFilter}
                <button
                  onClick={() => setMonthFilter('')}
                  className="hover:text-orange-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </span>
            )}
            {selectedManagerId && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium flex items-center gap-2">
                대리점장: {managers.find(m => m.id.toString() === selectedManagerId)?.displayName || selectedManagerId}
                <button
                  onClick={() => setSelectedManagerId('')}
                  className="hover:text-indigo-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </span>
            )}
            {ownerSearch && (
              <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium flex items-center gap-2">
                담당자: {ownerSearch}
                <button
                  onClick={() => setOwnerSearch('')}
                  className="hover:text-teal-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setStatus('all');
                setCertificateType('all');
                setMonthFilter('');
                setSelectedManagerId('');
                setOwnerSearch('');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-sm font-medium transition-colors"
            >
              모든 필터 초기화
            </button>
          </div>
        )}

        {/* 페이지 크기 선택 및 엑셀 다운로드 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">페이지당 표시:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value);
                setPageSize(newSize);
                setPagination(prev => ({ ...prev, page: 1, limit: newSize }));
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="20">20개</option>
              <option value="50">50개</option>
              <option value="100">100개</option>
              <option value="200">200개</option>
            </select>
            <button
              onClick={async () => {
                try {
                  const url = `/api/admin/customers/export?customerGroup=${customerGroup}`;
                  const response = await fetch(url, {
                    credentials: 'include',
                  });
                  
                  if (!response.ok) {
                    throw new Error('다운로드 실패');
                  }
                  
                  const blob = await response.blob();
                  const downloadUrl = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = downloadUrl;
                  link.download = `고객목록_${customerGroup}_${new Date().toISOString().split('T')[0]}.xlsx`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(downloadUrl);
                } catch (error) {
                  console.error('엑셀 다운로드 실패:', error);
                  alert('엑셀 다운로드 중 오류가 발생했습니다.');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <FiDownload className="w-4 h-4" />
              엑셀 다운로드
            </button>
          </div>
          {pagination.total > 0 && (
            <div className="text-sm text-gray-600">
              전체 <span className="font-semibold text-gray-800">{pagination.total.toLocaleString()}</span>명 중{' '}
              <span className="font-semibold text-gray-800">
                {((pagination.page - 1) * pageSize + 1).toLocaleString()}
              </span>
              {' - '}
              <span className="font-semibold text-gray-800">
                {Math.min(pagination.page * pageSize, pagination.total).toLocaleString()}
              </span>
              명 표시
            </div>
          )}
        </div>
      </div>

      {/* 고객 목록 - 개선된 로딩 및 에러 처리 */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="mt-6 text-gray-600 font-medium">고객 목록을 불러오는 중...</p>
            <p className="mt-2 text-sm text-gray-500">잠시만 기다려주세요</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <FiX className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-1">오류 발생</h3>
              <p className="text-red-800">{error}</p>
              <button
                onClick={loadCustomers}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <FiUser className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">고객이 없습니다</h3>
            <p className="text-gray-600 mb-6">검색 조건이나 필터를 변경해보세요</p>
            <button
              onClick={() => {
                setSearch('');
                setStatus('all');
                setCertificateType('all');
                setMonthFilter('');
                setCustomerGroup('all');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              필터 초기화
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <CustomerTable 
            customers={customers} 
            onRefresh={() => {
              invalidateCache();
              loadCustomers();
            }} 
          />
        </div>
      )}

      {/* 페이지네이션 - 개선된 디자인 */}
      {!isLoading && !error && customers.length > 0 && pagination.totalPages > 1 && (
        <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-gray-600">
              {pagination.total > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">총</span>
                  <span className="font-bold text-blue-600 text-lg">{pagination.total.toLocaleString()}</span>
                  <span className="font-medium text-gray-700">명</span>
                  <span className="mx-2 text-gray-400">|</span>
                  <span className="text-gray-600">
                    {((pagination.page - 1) * pageSize + 1).toLocaleString()}
                    {' - '}
                    {Math.min(pagination.page * pageSize, pagination.total).toLocaleString()}
                    {' '}명 표시
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium text-gray-700"
              >
                <FiChevronLeft className="w-5 h-5" />
                이전
              </button>
              <div className="flex items-center gap-2 px-4">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
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
                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white shadow-lg scale-110'
                          : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
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
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium text-gray-700"
              >
                다음
                <FiChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
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