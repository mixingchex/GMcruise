'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductList from '@/components/mall/ProductList';
import ContractInviteModal from '@/components/admin/ContractInviteModal';
import {
  FiSend,
  FiLock,
  FiEye,
  FiEyeOff,
  FiTrendingUp,
  FiUsers,
  FiLink,
  FiShoppingCart,
  FiRefreshCw,
  FiArrowRight,
  FiUser,
  FiBriefcase,
  FiMessageSquare,
  FiClock,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiTrash2,
  FiSearch,
  FiX,
  FiExternalLink,
  FiDollarSign,
  FiLayers,
  FiPlus,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';
import SalesConfirmationModal from '@/components/affiliate/SalesConfirmationModal';
import { leadStatusOptions } from '@/app/api/partner/constants';
import { getAffiliateTerm } from '@/lib/utils';
import NotificationBell from '@/components/admin/NotificationBell';

type PartnerDashboardProps = {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    mallUserId: string;
    mallNickname: string | null;
  };
  profile: any;
};

interface DashboardStats {
  totalLinks: number;
  totalLeads: number;
  totalSales: number;
  teamMembers: number;
  recentLeads: Array<{
    id: number;
    customerName: string | null;
    customerPhone: string | null;
    status: string;
    createdAt: string;
  }>;
  recentSales: Array<{
    id: number;
    saleAmount: number;
    status: string;
    saleDate: string | null;
    createdAt: string;
  }>;
  monthlySales: Array<{
    date: string | null;
    count: number;
    totalAmount: number;
  }>;
  currentMonth?: string;
  selectedMonth?: string;
}

export default function PartnerDashboard({ user, profile }: PartnerDashboardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const affiliateTerm = getAffiliateTerm(pathname || undefined);
  const [showContractInviteModal, setShowContractInviteModal] = useState(false);
  const [showContractTypeModal, setShowContractTypeModal] = useState(false);
  const [selectedContractType, setSelectedContractType] = useState<'SALES_AGENT' | 'BRANCH_MANAGER' | 'CRUISE_STAFF' | 'PRIMARKETER'>('SALES_AGENT');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [mallFullUrl, setMallFullUrl] = useState<string>('');
  // 월별 필터링 상태 (YYYY-MM 형식)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showCustomerRegisterModal, setShowCustomerRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    customerName: '',
    customerPhone: '',
    productCode: '',
    isCompanion: false,
    mainCustomerPhone: '',
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoadingProductCode, setIsLoadingProductCode] = useState(false);
  const [contracts, setContracts] = useState<Array<{
    id: number;
    name: string;
    phone: string;
    email: string | null;
    status: string;
    submittedAt: string | null;
    completedAt: string | null;
    mentor?: {
      id: number;
      displayName: string | null;
      affiliateCode: string;
      branchLabel: string | null;
      contactPhone: string | null;
      contactEmail: string | null;
    } | null;
  }>>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [completingContractId, setCompletingContractId] = useState<number | null>(null);
  const [sendingPdfContractId, setSendingPdfContractId] = useState<number | null>(null);
  const [contractSearch, setContractSearch] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState<'all' | 'submitted' | 'completed' | 'rejected'>('all');
  
  // 판매원별 DB 현황
  const [agentDbStats, setAgentDbStats] = useState<Array<{
    agentId: number;
    agentName: string;
    affiliateCode: string | null;
    mallUserId: string | null;
    stats: {
      totalCustomers: number;
      activeCustomers7d: number;
      activeCustomers30d: number;
      recentAssigned: number;
      statusCounts: Record<string, number>;
    };
  }>>([]);
  const [loadingAgentDbStats, setLoadingAgentDbStats] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [showContractDetail, setShowContractDetail] = useState(false);
  const [loadingContractDetail, setLoadingContractDetail] = useState(false);
  const [deletingContractId, setDeletingContractId] = useState<number | null>(null);
  const [showSendContractModal, setShowSendContractModal] = useState(false);
  const [contractType, setContractType] = useState<'SALES_AGENT' | 'BRANCH_MANAGER' | 'CRUISE_STAFF' | 'PRIMARKETER'>('SALES_AGENT');
  const [myContract, setMyContract] = useState<any | null>(null);
  const [loadingMyContract, setLoadingMyContract] = useState(false);
  const [completedAgentContracts, setCompletedAgentContracts] = useState<Array<{
    id: number;
    name: string;
    phone: string;
    email: string | null;
    status: string;
    submittedAt: string | null;
    completedAt: string | null;
    accountInfo?: any;
    user?: any;
  }>>([]);
  // 계약서 열람 확인 추적 (계약서 ID Set)
  const [viewedContractIds, setViewedContractIds] = useState<Set<number>>(new Set());
  const [showEducationContractModal, setShowEducationContractModal] = useState(false);
  const [educationContractType, setEducationContractType] = useState<'SALES_AGENT' | 'BRANCH_MANAGER' | 'CRUISE_STAFF' | 'PRIMARKETER'>('SALES_AGENT');
  const [mySales, setMySales] = useState<Array<{
    id: number;
    productCode: string | null;
    saleAmount: number;
    status: string;
    audioFileGoogleDriveUrl: string | null;
    saleDate: string | null;
    submittedAt: string | null;
    approvedAt: string | null;
  }>>([]);
  const [loadingMySales, setLoadingMySales] = useState(false);
  const [showSalesConfirmationModal, setShowSalesConfirmationModal] = useState(false);
  const [selectedSaleForConfirmation, setSelectedSaleForConfirmation] = useState<{
    id: number;
    productCode: string | null;
    saleAmount: number;
    status: string;
    audioFileGoogleDriveUrl: string | null;
    saleDate: string | null;
    submittedAt: string | null;
    approvedAt: string | null;
  } | null>(null);
  
  // 관리자가 생성한 공통 상품 링크
  const [commonProductLinks, setCommonProductLinks] = useState<Array<{
    id: number;
    code: string;
    title: string | null;
    productCode: string | null;
    url: string;
    product: {
      id: number;
      productCode: string;
      title: string;
    } | null;
  }>>([]);
  const [loadingCommonLinks, setLoadingCommonLinks] = useState(false);
  
  // 랜딩페이지 목록
  const [recentLandingPages, setRecentLandingPages] = useState<Array<{
    id: number;
    title: string;
    category: string | null;
    viewCount: number;
    slug: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [loadingLandingPages, setLoadingLandingPages] = useState(false);

  // 프로필 타입 확인 (useEffect보다 먼저 선언)
  const isBranchManager = profile?.type === 'BRANCH_MANAGER';
  const isSalesAgent = profile?.type === 'SALES_AGENT';

  useEffect(() => {
    if (user.mallUserId && typeof window !== 'undefined') {
      setMallFullUrl(`${window.location.protocol}//${window.location.host}/${user.mallUserId}/shop`);
    }
  }, [user.mallUserId]);
  
  const loadLandingPages = useCallback(async () => {
    try {
      setLoadingLandingPages(true);
      const res = await fetch('/api/partner/landing-pages', {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          // 최근 5개만 표시
          const allPages = [...(json.ownedPages || []), ...(json.sharedPages || [])];
          setRecentLandingPages(allPages.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('[Partner Dashboard] Failed to load landing pages:', error);
    } finally {
      setLoadingLandingPages(false);
    }
  }, []);
  
  // 랜딩페이지 목록 로드 (대리점장만)
  useEffect(() => {
    if (isBranchManager) {
      loadLandingPages();
    }
  }, [isBranchManager, loadLandingPages]);

  // 관리자가 생성한 공통 상품 링크 로드
  useEffect(() => {
    const loadCommonLinks = async () => {
      try {
        setLoadingCommonLinks(true);
        const res = await fetch('/api/partner/links?status=ACTIVE');
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.links) {
            // 공통 링크만 필터링 (isCommonLink가 true인 링크)
            const commonLinks = json.links
              .filter((link: any) => link.isCommonLink && link.productCode && link.status === 'ACTIVE')
              .map((link: any) => ({
                id: link.id,
                code: link.code,
                title: link.title,
                productCode: link.productCode,
                url: typeof window !== 'undefined' 
                  ? `${window.location.origin}${link.url}` 
                  : link.url,
                product: link.product,
              }));
            setCommonProductLinks(commonLinks);
          }
        }
      } catch (error) {
        console.error('[Partner Dashboard] Failed to load common links:', error);
      } finally {
        setLoadingCommonLinks(false);
      }
    };
    
    loadCommonLinks();
  }, []);
  const roleLabel = isBranchManager ? '대리점장' : isSalesAgent ? '판매원' : '파트너';
  const roleColor = isBranchManager ? 'from-purple-600 via-indigo-600 to-blue-600' : 'from-blue-600 via-cyan-600 to-teal-600';
  const roleIcon = isBranchManager ? <FiBriefcase className="text-2xl" /> : <FiUser className="text-2xl" />;

  const partnerId = user.phone || user.mallUserId;
  const isBossId = partnerId?.startsWith('boss');

  // 이미지 URL 추출 헬퍼 함수
  const extractImageUrl = (image: any): string | null => {
    if (!image) return null;
    if (typeof image === 'string') return image;
    if (typeof image === 'object') {
      // 객체인 경우 url 필드나 id 필드 확인
      if (image.url) return String(image.url);
      if (image.id) {
        // Google Drive ID인 경우 URL 생성
        return `https://drive.google.com/uc?export=view&id=${String(image.id)}`;
      }
      // 다른 형태의 객체는 null 반환
      return null;
    }
    return null;
  };

  // 완전히 직렬화 가능한 객체로 변환
  const partnerContext = {
    mallUserId: String(user.mallUserId || ''),
    profileTitle: profile?.profileTitle 
      ? String(profile.profileTitle) 
      : user.mallNickname 
      ? String(user.mallNickname) 
      : profile?.displayName 
      ? String(profile.displayName) 
      : `파트너 ${user.mallUserId}`,
    landingAnnouncement: profile?.landingAnnouncement 
      ? String(profile.landingAnnouncement) 
      : null,
    welcomeMessage: profile?.welcomeMessage 
      ? String(profile.welcomeMessage) 
      : null,
    profileImage: extractImageUrl(profile?.profileImage),
    coverImage: extractImageUrl(profile?.coverImage),
  };

  // partnerBase는 user.mallUserId를 사용하되, 없으면 phone을 사용
  const partnerBase = `/partner/${user.mallUserId || user.phone || partnerId}`;

  const loadMyContract = useCallback(async () => {
    try {
      setLoadingMyContract(true);
      console.log('[PartnerDashboard] Loading my contract...');
      const res = await fetch('/api/affiliate/my-contract', { credentials: 'include' });
      const json = await res.json();
      console.log('[PartnerDashboard] My contract response:', { ok: json.ok, hasContract: !!json.contract, contract: json.contract, completedAgentContracts: json.completedAgentContracts?.length || 0 });
      if (res.ok && json.ok) {
        setMyContract(json.contract);
        // 대리점장인 경우 완료된 판매원 계약서 목록도 저장
        if (json.completedAgentContracts && Array.isArray(json.completedAgentContracts)) {
          setCompletedAgentContracts(json.completedAgentContracts);
        }
        console.log('[PartnerDashboard] My contract set:', json.contract ? { id: json.contract.id, status: json.contract.status, name: json.contract.name } : 'null');
      } else {
        console.warn('[PartnerDashboard] Failed to load contract:', json.message);
        setMyContract(null);
        setCompletedAgentContracts([]);
      }
    } catch (error: any) {
      console.error('[PartnerDashboard] Failed to load my contract:', error);
      setMyContract(null);
    } finally {
      setLoadingMyContract(false);
    }
  }, []);

  const loadMySales = async (month?: string) => {
    try {
      setLoadingMySales(true);
      const monthParam = month || selectedMonth;
      const res = await fetch(`/api/affiliate/sales/my-sales?month=${monthParam}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '판매 목록을 불러오지 못했습니다');
      }
      setMySales(json.sales || []);
    } catch (error: any) {
      console.error('[PartnerDashboard] Load my sales error:', error);
      showError(error.message || '판매 목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoadingMySales(false);
    }
  };

  // 판매원별 DB 현황 로드
  const loadAgentDbStats = useCallback(async () => {
    if (!isBranchManager) return;
    
    try {
      setLoadingAgentDbStats(true);
      const res = await fetch('/api/partner/agents/db-stats', {
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setAgentDbStats(json.agents || []);
      }
    } catch (error) {
      console.error('[PartnerDashboard] Failed to load agent DB stats:', error);
    } finally {
      setLoadingAgentDbStats(false);
    }
  }, [isBranchManager]);

  // 월 변경 핸들러
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    loadStats(month);
    loadMySales(month);
  };

  // 월 목록 생성 (현재 달부터 최근 12개월)
  const getAvailableMonths = (): string[] => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthStr);
    }
    return months;
  };

  // 통계 데이터 로드
  useEffect(() => {
    console.log('[PartnerDashboard] useEffect triggered, isBranchManager:', isBranchManager);
    loadStats();
    loadMyContract(); // 나의 계약서 로드
    loadMySales(); // 내 판매 목록 로드
    if (isBranchManager) {
      loadContracts();
      loadAgentDbStats();
    }
  }, [isBranchManager, loadMyContract, loadAgentDbStats]);

  // 선택된 달이 변경되면 데이터 다시 로드
  useEffect(() => {
    loadStats(selectedMonth);
    loadMySales(selectedMonth);
  }, [selectedMonth]);

  const loadStats = async (month?: string) => {
    try {
      setLoadingStats(true);
      const monthParam = month || selectedMonth;
      const res = await fetch(`/api/partner/dashboard/stats?month=${monthParam}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setStats(json.stats);
        // API에서 반환된 currentMonth로 업데이트 (다음 달로 넘어간 경우)
        if (json.stats.currentMonth && !month) {
          setSelectedMonth(json.stats.currentMonth);
        }
      }
    } catch (error) {
      console.error('[PartnerDashboard] Failed to load stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadContracts = async () => {
    if (!isBranchManager) {
      console.log('[PartnerDashboard] Not a branch manager, skipping loadContracts');
      return;
    }
    try {
      setLoadingContracts(true);
      console.log('[PartnerDashboard] Loading contracts...');
      const res = await fetch('/api/partner/contracts', {
        credentials: 'include',
      });
      const json = await res.json();
      console.log('[PartnerDashboard] Contracts response:', { ok: res.ok, jsonOk: json.ok, contractsCount: json.contracts?.length || 0 });
      if (res.ok && json.ok) {
        setContracts(json.contracts || []);
        console.log('[PartnerDashboard] Contracts loaded:', json.contracts?.length || 0);
      } else {
        console.error('[PartnerDashboard] Failed to load contracts:', json.message || 'Unknown error');
        showError(json.message || '계약서 목록을 불러오는 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('[PartnerDashboard] Failed to load contracts:', error);
      showError('계약서 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingContracts(false);
    }
  };

  const handleCompleteContract = async (contractId: number) => {
    // 계약서 열람 확인 체크
    if (!viewedContractIds.has(contractId)) {
      showError('계약서를 완료하기 전에 반드시 계약서를 열어서 확인해주세요. 계약서 상세 보기 또는 PDF 보기를 통해 계약서를 확인할 수 있습니다.');
      return;
    }

    if (!confirm('이 계약서를 완료하여 PDF를 이메일로 전송하시겠습니까?')) return;

    try {
      setCompletingContractId(contractId);
      const res = await fetch(`/api/partner/contracts/${contractId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '계약서 완료 처리에 실패했습니다.');
      }

      showSuccess(json.message || '계약서가 완료되었고 이메일로 전송되었습니다.');
      
      // 모달 닫기
      setShowContractDetail(false);
      setSelectedContract(null);
      
      // 목록 새로고침
      loadContracts(); // 목록 새로고침
      loadMyContract(); // 나의 계약서도 새로고침 (대리점장 자신의 계약서가 완료된 경우)
      
      // 완료 페이지로 리다이렉트 (새 창에서 열기)
      if (json.redirectUrl) {
        window.open(json.redirectUrl, '_blank');
      }
    } catch (error: any) {
      console.error('[PartnerDashboard] Complete contract error:', error);
      showError(error.message || '계약서 완료 처리 중 오류가 발생했습니다.');
    } finally {
      setCompletingContractId(null);
    }
  };

  const handleSendPdf = async (contractId: number) => {
    if (!confirm('계약서 PDF를 계약자 이메일 주소로 전송하시겠습니까? (본사 이메일은 참조로 추가됩니다)')) return;
    try {
      setSendingPdfContractId(contractId);
      console.log('[PartnerDashboard] Starting PDF send for contract:', contractId);
      
      // 타임아웃 설정 (60초)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      try {
        const res = await fetch(`/api/partner/contracts/${contractId}/send-pdf`, {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          const errorText = await res.text();
          let errorJson;
          try {
            errorJson = JSON.parse(errorText);
          } catch {
            errorJson = { message: errorText || '서버 오류가 발생했습니다.' };
          }
          throw new Error(errorJson.message || `서버 오류 (${res.status})`);
        }
        
        const json = await res.json();
        console.log('[PartnerDashboard] PDF send response:', json);
        
        if (!json.ok) {
          throw new Error(json.message || 'PDF 전송에 실패했습니다.');
        }

        showSuccess(json.message || 'PDF가 성공적으로 전송되었습니다.');
        loadContracts();
        // PDF 보기를 통한 계약서 열람 확인 추가
        setViewedContractIds(prev => new Set(prev).add(contractId));
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('PDF 전송 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error('[PartnerDashboard] Send PDF error:', error);
      showError(error.message || 'PDF 전송 중 오류가 발생했습니다.');
    } finally {
      setSendingPdfContractId(null);
    }
  };

  const handleReject = async (contractId: number) => {
    const reason = prompt('거부 사유를 입력하세요:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/partner/contracts/${contractId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '계약 거부에 실패했습니다.');
      }
      showSuccess('계약이 거부되었습니다.');
      loadContracts();
    } catch (error: any) {
      console.error('[PartnerDashboard] reject error', error);
      showError(error.message || '계약 거부 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (contractId: number) => {
    if (!confirm('정말로 이 계약서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      setDeletingContractId(contractId);
      const res = await fetch(`/api/partner/contracts/${contractId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '삭제에 실패했습니다.');
      }
      showSuccess('계약서가 삭제되었습니다.');
      loadContracts();
    } catch (error: any) {
      console.error('[PartnerDashboard] delete error', error);
      showError(error.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingContractId(null);
    }
  };

  const handleViewDetail = async (contractId: number) => {
    try {
      setLoadingContractDetail(true);
      const res = await fetch(`/api/partner/contracts/${contractId}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '계약서 정보를 불러오지 못했습니다.');
      }
      setSelectedContract(json.contract);
      setShowContractDetail(true);
      // 계약서 열람 확인 추가
      setViewedContractIds(prev => new Set(prev).add(contractId));
    } catch (error: any) {
      console.error('[PartnerDashboard] view detail error', error);
      showError(error.message || '계약서 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingContractDetail(false);
    }
  };

  // 메인 고객 전화번호로 상품 코드 자동 조회
  const handleMainCustomerPhoneChange = async (phone: string) => {
    setRegisterForm({ ...registerForm, mainCustomerPhone: phone });

    // 전화번호 정규화 (숫자만 추출)
    const normalizedPhone = phone.replace(/\D/g, '');

    // 전화번호가 10자 이상일 때만 API 호출
    if (normalizedPhone.length >= 10) {
      setIsLoadingProductCode(true);
      try {
        const response = await fetch(
          `/api/affiliate/customers/product-code?phone=${encodeURIComponent(normalizedPhone)}`,
          {
            credentials: 'include',
          }
        );

        const data = await response.json();

        if (response.ok && data.ok && data.productCode) {
          setRegisterForm((prev) => ({
            ...prev,
            productCode: data.productCode,
          }));
          showSuccess(`상품 코드가 자동으로 입력되었습니다: ${data.productCode}`);
        } else if (data.message) {
          // 상품 코드를 찾을 수 없는 경우는 조용히 처리 (에러 표시 안 함)
          // showError(data.message);
        }
      } catch (error: any) {
        console.error('[Load Product Code] Error:', error);
        // 에러 발생 시 조용히 처리 (사용자 경험 개선)
      } finally {
        setIsLoadingProductCode(false);
      }
    } else {
      // 전화번호가 너무 짧으면 상품 코드 초기화
      if (normalizedPhone.length < 10) {
        setRegisterForm((prev) => ({
          ...prev,
          productCode: '',
        }));
      }
    }
  };

  const handleRegisterCustomer = async () => {
    if (!registerForm.customerName || !registerForm.customerPhone) {
      showError('고객 이름과 전화번호는 필수입니다.');
      return;
    }
    if (registerForm.isCompanion && !registerForm.mainCustomerPhone) {
      showError('동행인 등록 시 메인 고객 전화번호는 필수입니다.');
      return;
    }

    setIsRegistering(true);
    try {
      const response = await fetch('/api/affiliate/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        showError(data.error || '동행인 등록에 실패했습니다.');
        return;
      }

      showSuccess('동행인이 등록되었습니다.');
      setShowCustomerRegisterModal(false);
      setRegisterForm({
        customerName: '',
        customerPhone: '',
        productCode: '',
        isCompanion: false,
        mainCustomerPhone: '',
      });
      loadStats(); // 통계 새로고침
    } catch (error: any) {
      showError('동행인 등록 중 오류가 발생했습니다.');
      console.error('[Register Customer] Error:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.trim().length === 0) {
      showError('새 비밀번호를 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 4) {
      showError('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/partner/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: currentPassword && currentPassword.trim() ? currentPassword.trim() : undefined,
          newPassword: newPassword.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || '비밀번호 변경에 실패했습니다.');
      }

      showSuccess('비밀번호가 변경되었습니다.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('[Partner Dashboard] Password change error:', error);
      showError(error.message || '비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 리드 상태를 한글로 변환 (모든 가능한 상태값 처리)
  const formatLeadStatus = (status: string) => {
    // leadStatusOptions에서 먼저 찾기
    const statusOption = leadStatusOptions.find(option => option.value === status);
    if (statusOption) {
      return statusOption.label;
    }
    
    // leadStatusOptions에 없는 상태값들 처리
    const statusMap: Record<string, string> = {
      'NEW': '신규',
      'CONTACTED': '소통중',
      'QUALIFIED': '자격확인',
      'CONVERTED': '전환 완료',
      'LOST': '손실',
      'IN_PROGRESS': '진행 중',
      'PURCHASED': '구매 완료',
      'REFUNDED': '환불',
      'CLOSED': '종료',
      'TEST_GUIDE': '3일부재',
    };
    
    return statusMap[status] || status;
  };

  // 리드 상태에 따른 스타일 반환 (모든 가능한 상태값 처리)
  const getLeadStatusStyle = (status: string) => {
    // leadStatusOptions에서 먼저 찾기
    const statusOption = leadStatusOptions.find(option => option.value === status);
    if (statusOption) {
      return statusOption.theme;
    }
    
    // leadStatusOptions에 없는 상태값들 처리
    const styleMap: Record<string, string> = {
      'NEW': 'bg-blue-100 text-blue-700',
      'CONTACTED': 'bg-amber-100 text-amber-700',
      'QUALIFIED': 'bg-indigo-100 text-indigo-700',
      'CONVERTED': 'bg-emerald-100 text-emerald-700',
      'LOST': 'bg-red-100 text-red-700',
      'IN_PROGRESS': 'bg-indigo-100 text-indigo-700',
      'PURCHASED': 'bg-emerald-100 text-emerald-700',
      'REFUNDED': 'bg-rose-100 text-rose-700',
      'CLOSED': 'bg-slate-100 text-slate-600',
      'TEST_GUIDE': 'bg-yellow-100 text-yellow-700',
    };
    
    return styleMap[status] || 'bg-gray-100 text-gray-700';
  };

  // 판매 상태를 한국어로 변환
  const formatSaleStatus = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '대기 중';
      case 'PENDING_APPROVAL':
        return '승인 대기';
      case 'APPROVED':
        return '승인됨';
      case 'REJECTED':
        return '거부됨';
      case 'CONFIRMED':
        return '확정됨';
      default:
        return '알 수 없음';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 md:gap-8 md:px-6 md:pt-10">
        {/* 헤더 - 역할 명확하게 표시 */}
        <header className={`relative overflow-hidden bg-gradient-to-r ${roleColor} text-white rounded-2xl md:rounded-3xl shadow-xl`}>
          <div className="relative z-10 flex flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6 md:py-12">
            {/* 알림 종 (오른쪽 상단) */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <NotificationBell />
              </div>
            </div>
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-3">
                {roleIcon}
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/80 md:text-sm">Partner Dashboard</p>
                  <h1 className="text-2xl font-black leading-snug md:text-4xl">
                    {roleLabel} 대시보드
                  </h1>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-white/90 md:text-base">
                {isBranchManager 
                  ? '팀 관리, 판매 실적, 고객 관리 등 모든 업무를 한 곳에서 관리하세요.'
                  : '나의 판매 실적, 고객 관리, 링크 관리를 한 곳에서 확인하세요.'}
              </p>
              <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 font-bold text-white backdrop-blur-sm">
                  {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 font-semibold text-white/90 backdrop-blur-sm">
                  ID: {partnerId}
                  {isBranchManager && <span className="ml-1 text-xs">(대리점장)</span>}
                  {isSalesAgent && <span className="ml-1 text-xs">(판매원)</span>}
                  {!isBranchManager && !isSalesAgent && <span className="ml-1 text-xs">(파트너)</span>}
                </span>
                {profile.branchLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 font-semibold text-white/90 backdrop-blur-sm">
                    {profile.branchLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 월별 필터링 UI */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FiClock className="text-xl text-blue-600" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">월별 조회</h2>
                <p className="text-xs text-gray-500 mt-1">하단의 최근 리드, 최근 판매, 내 판매 목록만 월별로 조회됩니다</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="month-select" className="text-sm font-medium text-gray-700">
                선택 월:
              </label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {getAvailableMonths().map((month) => {
                  const [year, monthNum] = month.split('-');
                  const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                  });
                  const isCurrentMonth = month === stats?.currentMonth;
                  return (
                    <option key={month} value={month}>
                      {monthName} {isCurrentMonth ? '(현재)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          {stats?.selectedMonth && (
            <p className="mt-2 text-xs text-gray-500">
              선택된 월: {new Date(stats.selectedMonth + '-01').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}의 최근 리드, 최근 판매, 내 판매 목록을 표시하고 있습니다. (상단 통계는 전체 누적 데이터입니다)
            </p>
          )}
        </div>

        {/* 통계 카드 - 모바일 최적화 */}
        {loadingStats ? (
          <div className="flex items-center justify-center py-12">
            <FiRefreshCw className="animate-spin text-3xl text-gray-400" />
          </div>
        ) : stats && (
          <section className={`grid grid-cols-2 gap-3 ${isBranchManager ? 'md:grid-cols-4' : 'md:grid-cols-3'} md:gap-6`}>
            {isBranchManager && (
              <div className="rounded-xl bg-white p-4 shadow-md md:rounded-2xl md:p-6">
                <div className="flex items-center justify-between mb-2">
                  <FiLink className="text-xl text-blue-600 md:text-2xl" />
                  <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">대리점장</span>
                </div>
                <p className="text-xs text-gray-500 mb-1 md:text-sm">총 링크</p>
                <p className="text-2xl font-bold text-gray-900 md:text-3xl">{stats.totalLinks.toLocaleString()}</p>
              </div>
            )}

            <div className="rounded-xl bg-white p-4 shadow-md md:rounded-2xl md:p-6">
              <div className="flex items-center justify-between mb-2">
                <FiUsers className="text-xl text-green-600 md:text-2xl" />
              </div>
              <p className="text-xs text-gray-500 mb-1 md:text-sm">총 잠재고객 (누적)</p>
              <p className="text-2xl font-bold text-gray-900 md:text-3xl">{stats.totalLeads.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">전체 기간 합계</p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-md md:rounded-2xl md:p-6">
              <div className="flex items-center justify-between mb-2">
                <FiShoppingCart className="text-xl text-orange-600 md:text-2xl" />
              </div>
              <p className="text-xs text-gray-500 mb-1 md:text-sm">총 판매 (누적)</p>
              <p className="text-2xl font-bold text-gray-900 md:text-3xl">{stats.totalSales.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">전체 기간 합계</p>
            </div>

            {isBranchManager && (
              <div className="rounded-xl bg-white p-4 shadow-md md:rounded-2xl md:p-6">
                <div className="flex items-center justify-between mb-2">
                  <FiTrendingUp className="text-xl text-purple-600 md:text-2xl" />
                </div>
                <p className="text-xs text-gray-500 mb-1 md:text-sm">팀원 수</p>
                <p className="text-2xl font-bold text-gray-900 md:text-3xl">{stats.teamMembers.toLocaleString()}</p>
              </div>
            )}
          </section>
        )}

        {/* 개인 링크 - 모바일 최적화 (대리점장/판매원은 빠른메뉴의 링크 관리에서 확인 가능하므로 숨김) */}
        {!isBranchManager && !isSalesAgent && (
        <section className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4 shadow-lg md:rounded-3xl md:p-6 border-2 border-indigo-100">
          <h2 className="mb-4 text-lg font-bold text-slate-900 md:text-xl flex items-center gap-2">
            <FiLink className="text-indigo-600" />
            나의 개인 링크
          </h2>
          <p className="mb-4 text-sm text-slate-600">모든 링크는 파트너 아이디에 맞춰 자동 생성됩니다.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-4 border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-700">대시보드</span>
              </div>
              <Link
                href={`${partnerBase}/dashboard`}
                className="text-xs text-gray-600 break-all hover:text-indigo-600 cursor-pointer"
              >
                {partnerBase}/dashboard
              </Link>
            </div>
            {user.mallUserId && (
              <div className="rounded-xl bg-white p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-700">판매몰</span>
                  <button
                    onClick={() => {
                      if (mallFullUrl) {
                        navigator.clipboard.writeText(mallFullUrl);
                        showSuccess('판매몰 링크가 복사되었습니다!');
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    복사
                  </button>
                </div>
                <div className="text-xs text-gray-600 break-all">
                  <a
                    href={`/${user.mallUserId}/shop`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600"
                  >
                    {mallFullUrl || `/${user.mallUserId}/shop`}
                  </a>
                </div>
              </div>
            )}
            <div className="rounded-xl bg-white p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-orange-700">결제 페이지</span>
              </div>
              <Link
                href={`${partnerBase}/payment`}
                className="text-xs text-gray-600 break-all hover:text-orange-600 cursor-pointer"
              >
                {partnerBase}/payment
              </Link>
            </div>
            <div className="rounded-xl bg-white p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-purple-700">
                  {isBranchManager ? '나의 고객' : isSalesAgent ? '나의 고객관리' : '고객 관리'}
                </span>
              </div>
              <Link
                href={`${partnerBase}/customers`}
                className="text-xs text-gray-600 break-all hover:text-purple-600 cursor-pointer"
              >
                {partnerBase}/customers
              </Link>
            </div>
            <div className="rounded-xl bg-white p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">프로필</span>
              </div>
              <Link
                href={`${partnerBase}/profile`}
                className="text-xs text-gray-600 break-all hover:text-gray-600 cursor-pointer"
              >
                {partnerBase}/profile
              </Link>
            </div>
            <div className="rounded-xl bg-white p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-green-700">SNS 프로필</span>
              </div>
              <Link
                href={`${partnerBase}/sns-profile`}
                className="text-xs text-gray-600 break-all hover:text-green-600 cursor-pointer"
              >
                {partnerBase}/sns-profile
              </Link>
            </div>
            
            {/* 관리자가 생성한 공통 상품 링크 자동 표시 */}
            {commonProductLinks.map((link) => (
              <div key={link.id} className="rounded-xl bg-white p-4 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-700">
                    {link.product?.title || link.title || `상품 ${link.productCode}`}
                  </span>
                  <button
                    onClick={() => {
                      if (link.url) {
                        navigator.clipboard.writeText(link.url);
                        showSuccess('상품 링크가 복사되었습니다!');
                      }
                    }}
                    className="text-xs text-amber-600 hover:text-amber-700"
                  >
                    복사
                  </button>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 break-all hover:text-amber-600 cursor-pointer"
                >
                  {link.url}
                </a>
              </div>
            ))}
          </div>
        </section>
        )}


        {/* 빠른 메뉴 - 모바일 최적화 */}
        <section className="rounded-2xl bg-white p-4 shadow-lg md:rounded-3xl md:p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900 md:text-xl">빠른 메뉴</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {(user.mallUserId || user.phone) && (
              <Link 
                href={`/${user.mallUserId || user.phone || partnerId}/shop`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-center transition-all hover:from-blue-100 hover:to-blue-200 hover:shadow-md md:p-6"
              >
                <span className="text-2xl md:text-3xl">🛍️</span>
                <span className="text-xs font-semibold text-blue-700 md:text-sm">나의 판매몰</span>
              </Link>
            )}
            <Link 
              href={`${partnerBase}/links`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 text-center transition-all hover:from-green-100 hover:to-green-200 hover:shadow-md md:p-6"
            >
              <FiLink className="text-2xl text-green-600 md:text-3xl" />
              <span className="text-xs font-semibold text-green-700 md:text-sm">링크 관리</span>
            </Link>
            <Link 
              href={`${partnerBase}/customers`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 text-center transition-all hover:from-purple-100 hover:to-purple-200 hover:shadow-md md:p-6"
            >
              <FiUsers className="text-2xl text-purple-600 md:text-3xl" />
              <span className="text-xs font-semibold text-purple-700 md:text-sm">
                {isBranchManager ? '나의 고객' : isSalesAgent ? '나의 고객관리' : '고객 관리'}
              </span>
            </Link>
            {isBranchManager && (
              <Link 
                href={`${partnerBase}/purchased-customers`} 
                className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-4 text-center transition-all hover:from-orange-100 hover:to-orange-200 hover:shadow-md md:p-6"
              >
                <FiUsers className="text-2xl text-orange-600 md:text-3xl" />
                <span className="text-xs font-semibold text-orange-700 md:text-sm">구매고객<br />관리</span>
              </Link>
            )}
            <button
              onClick={() => setShowCustomerRegisterModal(true)}
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 text-center transition-all hover:from-green-100 hover:to-green-200 hover:shadow-md md:p-6"
            >
              <FiUser className="text-2xl text-green-600 md:text-3xl" />
              <span className="text-xs font-semibold text-green-700 md:text-sm">크루즈가이드<br />동행인 등록</span>
            </button>
            <Link 
              href={`${partnerBase}/customer-groups`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 text-center transition-all hover:from-indigo-100 hover:to-indigo-200 hover:shadow-md md:p-6"
            >
              <FiUsers className="text-2xl text-indigo-600 md:text-3xl" />
              <span className="text-xs font-semibold text-indigo-700 md:text-sm">고객 그룹<br />관리</span>
            </Link>
            <Link 
              href={`${partnerBase}/scheduled-messages`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 text-center transition-all hover:from-purple-100 hover:to-purple-200 hover:shadow-md md:p-6"
            >
              <FiClock className="text-2xl text-purple-600 md:text-3xl" />
              <span className="text-xs font-semibold text-purple-700 md:text-sm">예약 메시지<br />관리</span>
            </Link>
            <Link 
              href={`${partnerBase}/customers?action=sms`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 text-center transition-all hover:from-emerald-100 hover:to-emerald-200 hover:shadow-md md:p-6"
            >
              <FiMessageSquare className="text-2xl text-emerald-600 md:text-3xl" />
              <span className="text-xs font-semibold text-emerald-700 md:text-sm">문자 보내기</span>
            </Link>
            <Link 
              href={`${partnerBase}/payment`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-4 text-center transition-all hover:from-orange-100 hover:to-orange-200 hover:shadow-md md:p-6"
            >
              <FiShoppingCart className="text-2xl text-orange-600 md:text-3xl" />
              <span className="text-xs font-semibold text-orange-700 md:text-sm">결제/정산</span>
            </Link>
            <Link 
              href={`${partnerBase}/reservation/new`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 p-4 text-center transition-all hover:from-teal-100 hover:to-teal-200 hover:shadow-md md:p-6"
            >
              <FiFileText className="text-2xl text-teal-600 md:text-3xl" />
              <span className="text-xs font-semibold text-teal-700 md:text-sm">수동여권<br />등록</span>
            </Link>
            <Link 
              href={`${partnerBase}/documents`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 p-4 text-center transition-all hover:from-pink-100 hover:to-pink-200 hover:shadow-md md:p-6"
            >
              <FiFileText className="text-2xl text-pink-600 md:text-3xl" />
              <span className="text-xs font-semibold text-pink-700 md:text-sm">서류 관리</span>
            </Link>
            {isBranchManager && (
              <>
                <Link 
                  href={`${partnerBase}/landing-pages`} 
                  className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-4 text-center transition-all hover:from-amber-100 hover:to-amber-200 hover:shadow-md md:p-6"
                >
                  <FiLayers className="text-2xl text-amber-600 md:text-3xl" />
                  <span className="text-xs font-semibold text-amber-700 md:text-sm">랜딩페이지<br />관리</span>
                </Link>
                <Link 
                  href={`${partnerBase}/customers`} 
                  className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 text-center transition-all hover:from-purple-100 hover:to-purple-200 hover:shadow-md md:p-6"
                >
                  <FiUsers className="text-2xl text-purple-600 md:text-3xl" />
                  <span className="text-xs font-semibold text-purple-700 md:text-sm">판매원별<br />DB 관리</span>
                </Link>
                <Link 
                  href={`${partnerBase}/team`} 
                  className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 text-center transition-all hover:from-indigo-100 hover:to-indigo-200 hover:shadow-md md:p-6"
                >
                  <FiTrendingUp className="text-2xl text-indigo-600 md:text-3xl" />
                  <span className="text-xs font-semibold text-indigo-700 md:text-sm">팀 관리</span>
                </Link>
                <button
                  onClick={() => setShowContractTypeModal(true)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 p-4 text-center transition-all hover:from-pink-100 hover:to-pink-200 hover:shadow-md md:p-6"
                >
                  <FiSend className="text-2xl text-pink-600 md:text-3xl" />
                  <span className="text-xs font-semibold text-pink-700 md:text-sm">계약서 보내기</span>
                </button>
              </>
            )}
            <Link 
              href={`${partnerBase}/profile`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-4 text-center transition-all hover:from-gray-100 hover:to-gray-200 hover:shadow-md md:p-6"
            >
              <FiUser className="text-2xl text-gray-600 md:text-3xl" />
              <span className="text-xs font-semibold text-gray-700 md:text-sm">프로필 수정</span>
            </Link>
            <Link 
              href={`${partnerBase}/sns-profile`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 p-4 text-center transition-all hover:from-pink-100 hover:to-pink-200 hover:shadow-md md:p-6"
            >
              <FiLink className="text-2xl text-pink-600 md:text-3xl" />
              <span className="text-xs font-semibold text-pink-700 md:text-sm">나의 SNS<br />프로필</span>
            </Link>
            <Link 
              href={`${partnerBase}/contract`} 
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-center transition-all hover:from-blue-100 hover:to-blue-200 hover:shadow-md md:p-6"
            >
              <FiFileText className="text-2xl text-blue-600 md:text-3xl" />
              <span className="text-xs font-semibold text-blue-700 md:text-sm">나의 계약서</span>
            </Link>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 p-4 text-center transition-all hover:from-teal-100 hover:to-teal-200 hover:shadow-md md:p-6"
            >
              <FiLock className="text-2xl text-teal-600 md:text-3xl" />
              <span className="text-xs font-semibold text-teal-700 md:text-sm">비밀번호 변경</span>
            </button>
          </div>
        </section>

        {/* 최근 활동 - 모바일 최적화 */}
        {stats && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* 최근 리드 */}
            <div className="block rounded-2xl bg-white p-4 shadow-lg transition-all hover:shadow-xl md:rounded-3xl md:p-6">
              <div 
                onClick={() => router.push(`${partnerBase}/customers`)}
                className="block mb-4 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 md:text-xl">최근 리드</h2>
                  <span className="text-xs text-blue-600 hover:text-blue-700 md:text-sm">
                    전체보기 <FiArrowRight className="inline ml-1" />
                  </span>
                </div>
              </div>
              {stats.recentLeads.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`${partnerBase}/customers?leadId=${lead.id}`}
                      className="block rounded-lg border border-gray-200 p-3 md:p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm md:text-base">
                            {lead.customerName || '이름 없음'}
                          </p>
                          <p className="text-xs text-gray-500 md:text-sm">{lead.customerPhone || '-'}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getLeadStatusStyle(lead.status)}`}>
                          {formatLeadStatus(lead.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">{formatDate(lead.createdAt)}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-gray-500">리드가 없습니다.</p>
              )}
            </div>

            {/* 판매원별 DB 관리 현황 (대리점장만) */}
            {isBranchManager && (
              <section className="rounded-2xl bg-white p-4 shadow-lg md:rounded-3xl md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 md:text-xl flex items-center gap-2">
                    <FiUsers className="text-purple-600" />
                    판매원별 DB 관리 현황
                  </h2>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`${partnerBase}/customers`}
                      className="text-xs text-purple-600 hover:text-purple-700 md:text-sm font-semibold"
                    >
                      전체보기 <FiArrowRight className="inline ml-1" />
                    </Link>
                    <Link
                      href={`${partnerBase}/customers/send-db`}
                      className="text-xs text-purple-600 hover:text-purple-700 md:text-sm font-semibold"
                    >
                      DB 보내기 <FiArrowRight className="inline ml-1" />
                    </Link>
                  </div>
                </div>
                {loadingAgentDbStats ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    판매원 DB 현황을 불러오는 중입니다...
                  </div>
                ) : agentDbStats.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">판매원이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {agentDbStats.map((agent) => {
                      const activityRate = agent.stats.totalCustomers > 0 
                        ? (agent.stats.activeCustomers30d / agent.stats.totalCustomers * 100).toFixed(1)
                        : '0';
                      const isActive = parseFloat(activityRate) >= 30; // 30% 이상 활동률
                      
                      return (
                        <Link
                          key={agent.agentId}
                          href={`${partnerBase}/customers?agentId=${agent.agentId}`}
                          className="block rounded-lg border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-gray-900 text-base md:text-lg">
                                  {agent.agentName}
                                </p>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  isActive 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {isActive ? '활발' : '비활발'}
                                </span>
                              </div>
                              {agent.affiliateCode && (
                                <p className="text-xs text-gray-500">{agent.affiliateCode}</p>
                              )}
                            </div>
                            <FiArrowRight className="text-gray-400" />
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">총 고객 수</p>
                              <p className="text-lg font-bold text-gray-900">{agent.stats.totalCustomers.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">활동률 (30일)</p>
                              <p className="text-lg font-bold text-gray-900">{activityRate}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">최근 활동 (7일)</p>
                              <p className="text-sm font-semibold text-gray-700">{agent.stats.activeCustomers7d.toLocaleString()}명</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">최근 할당</p>
                              <p className="text-sm font-semibold text-gray-700">{agent.stats.recentAssigned.toLocaleString()}명</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* 랜딩페이지 목록 (대리점장만) */}
            {isBranchManager && (
              <div className="block rounded-2xl bg-white p-4 shadow-lg transition-all hover:shadow-xl md:rounded-3xl md:p-6">
                <Link 
                  href={`${partnerBase}/landing-pages`}
                  className="block"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 md:text-xl flex items-center gap-2">
                      <FiLayers className="text-amber-600" />
                      최근 랜딩페이지
                    </h2>
                    <span className="text-xs text-amber-600 hover:text-amber-700 md:text-sm">
                      전체보기 <FiArrowRight className="inline ml-1" />
                    </span>
                  </div>
                </Link>
                {loadingLandingPages ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    랜딩페이지를 불러오는 중입니다...
                  </div>
                ) : recentLandingPages.length > 0 ? (
                  <div className="space-y-3">
                    {recentLandingPages.map((page) => (
                      <Link
                        key={page.id}
                        href={`${partnerBase}/landing-pages/${page.id}/edit`}
                        className="block rounded-lg border border-gray-200 p-3 md:p-4 hover:border-amber-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900 text-sm md:text-base">
                                {page.title}
                              </p>
                              {!page.isActive && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">비활성</span>
                              )}
                            </div>
                            {page.category && (
                              <p className="text-xs text-gray-500 md:text-sm">{page.category}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-xs text-gray-400">조회수: {page.viewCount.toLocaleString()}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(page.updatedAt).toLocaleDateString('ko-KR', { 
                                  year: 'numeric', 
                                  month: '2-digit', 
                                  day: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                          <FiArrowRight className="text-gray-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-500 mb-3">랜딩페이지가 없습니다.</p>
                    <Link
                      href={`${partnerBase}/landing-pages/new`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-semibold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FiPlus />
                      새 랜딩페이지 만들기
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* 담당 멘토 정보 (판매원만) */}
            {isSalesAgent && profile.AffiliateRelation_AffiliateRelation_agentIdToAffiliateProfile?.[0]?.AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile && (
              <section className="rounded-2xl bg-white p-4 shadow-lg md:rounded-3xl md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 md:text-xl flex items-center gap-2">
                    <FiUser className="text-purple-600" />
                    담당 멘토
                  </h2>
                </div>
                {(() => {
                  const mentor = profile.AffiliateRelation_AffiliateRelation_agentIdToAffiliateProfile[0].AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile;
                  return (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="rounded-full bg-purple-600 p-2">
                            <FiUser className="text-white text-lg" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-purple-900 text-base md:text-lg">
                              {mentor.displayName || '정보 없음'}
                            </p>
                            {mentor.branchLabel && (
                              <p className="text-sm text-purple-700">{mentor.branchLabel}</p>
                            )}
                          </div>
                        </div>
                        {mentor.affiliateCode && (
                          <div className="mt-3 pt-3 border-t border-purple-200">
                            <p className="text-xs text-purple-600 mb-1">{affiliateTerm} 코드</p>
                            <p className="text-sm font-semibold text-purple-900">{mentor.affiliateCode}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* 내 판매 목록 */}
            <section className="rounded-2xl bg-white p-4 shadow-lg md:rounded-3xl md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 md:text-xl flex items-center gap-2">
                  <FiShoppingCart className="text-green-600" />
                  내 판매 목록
                </h2>
                <button
                  onClick={() => loadMySales(selectedMonth)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  <FiRefreshCw className="text-base" />
                  새로고침
                </button>
              </div>
              {loadingMySales ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  판매 목록을 불러오는 중입니다...
                </div>
              ) : mySales.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  판매 내역이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {mySales.map((sale) => {
                    const getStatusInfo = () => {
                      switch (sale.status) {
                        case 'PENDING':
                          return {
                            label: '대기 중',
                            color: 'text-gray-600',
                            bgColor: 'bg-gray-50',
                            icon: <FiClock className="text-base" />,
                          };
                        case 'PENDING_APPROVAL':
                          return {
                            label: '승인 대기',
                            color: 'text-yellow-600',
                            bgColor: 'bg-yellow-50',
                            icon: <FiClock className="text-base" />,
                          };
                        case 'APPROVED':
                          return {
                            label: '승인됨',
                            color: 'text-green-600',
                            bgColor: 'bg-green-50',
                            icon: <FiCheckCircle className="text-base" />,
                          };
                        case 'REJECTED':
                          return {
                            label: '거부됨',
                            color: 'text-red-600',
                            bgColor: 'bg-red-50',
                            icon: <FiXCircle className="text-base" />,
                          };
                        default:
                          return {
                            label: '알 수 없음',
                            color: 'text-gray-600',
                            bgColor: 'bg-gray-50',
                            icon: <FiClock className="text-base" />,
                          };
                      }
                    };
                    const statusInfo = getStatusInfo();
                    return (
                      <div
                        key={sale.id}
                        className="rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-semibold text-gray-900">
                                {sale.productCode || '상품 코드 없음'}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${statusInfo.color} ${statusInfo.bgColor}`}
                              >
                                {statusInfo.icon}
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>
                                {formatCurrency(sale.saleAmount)}
                              </span>
                              {sale.saleDate && (
                                <span>
                                  <FiClock className="inline mr-1" />
                                  {new Date(sale.saleDate).toLocaleDateString('ko-KR')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(sale.status === 'PENDING' || sale.status === 'REJECTED' || sale.status === 'PENDING_APPROVAL') && (
                              <button
                                onClick={() => {
                                  setSelectedSaleForConfirmation(sale);
                                  setShowSalesConfirmationModal(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                {sale.status === 'PENDING_APPROVAL' ? '상세 보기' : sale.status === 'REJECTED' ? '다시 확정 요청' : '확정 요청'}
                              </button>
                            )}
                            {sale.status === 'APPROVED' && (
                              <button
                                onClick={() => {
                                  setSelectedSaleForConfirmation(sale);
                                  setShowSalesConfirmationModal(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                              >
                                상세 보기
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 계약서 관리 (대리점장만) */}
            {isBranchManager && (
              <section className="rounded-2xl bg-white p-4 shadow-lg md:rounded-3xl md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 md:text-xl flex items-center gap-2">
                    <FiFileText className="text-indigo-600" />
                    계약서 관리
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadContracts}
                      className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                    >
                      <FiRefreshCw className="text-base" />
                      새로고침
                    </button>
                  </div>
                </div>
                
                {/* 검색 및 필터 */}
                <div className="mb-4 space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1 max-w-md">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="이름, 전화번호, 이메일 검색..."
                        value={contractSearch}
                        onChange={(e) => setContractSearch(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <select
                      value={contractStatusFilter}
                      onChange={(e) => setContractStatusFilter(e.target.value as 'all' | 'submitted' | 'completed' | 'rejected')}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="all">전체</option>
                      <option value="submitted">제출됨</option>
                      <option value="completed">완료됨</option>
                      <option value="rejected">거부됨</option>
                    </select>
                  </div>
                </div>

                {/* 계약 목록 테이블 */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">신청자 정보</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">상태</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">제출일</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loadingContracts ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                            계약 목록을 불러오는 중입니다...
                          </td>
                        </tr>
                      ) : (() => {
                        // 필터링된 계약서 목록
                        const filteredContracts = contracts.filter((contract) => {
                          const matchesSearch = !contractSearch || 
                            contract.name.toLowerCase().includes(contractSearch.toLowerCase()) ||
                            contract.phone.includes(contractSearch) ||
                            (contract.email && contract.email.toLowerCase().includes(contractSearch.toLowerCase()));
                          const matchesStatus = contractStatusFilter === 'all' || contract.status === contractStatusFilter;
                          return matchesSearch && matchesStatus;
                        });

                        if (filteredContracts.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">
                                {contractSearch || contractStatusFilter !== 'all' 
                                  ? '검색 조건에 맞는 계약서가 없습니다.' 
                                  : '계약서가 없습니다.'}
                              </td>
                            </tr>
                          );
                        }

                        return filteredContracts.map((contract) => (
                          <tr key={contract.id} className="hover:bg-blue-50/40">
                            <td className="px-4 py-4">
                              <div className="text-sm font-semibold text-gray-900">{contract.name}</div>
                              <div className="text-xs text-gray-500">{contract.phone}</div>
                              {contract.email && <div className="text-xs text-gray-500">{contract.email}</div>}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                contract.status === 'completed' ? 'bg-purple-50 text-purple-700' :
                                contract.status === 'submitted' ? 'bg-blue-50 text-blue-700' :
                                contract.status === 'rejected' ? 'bg-red-50 text-red-700' :
                                'bg-gray-50 text-gray-700'
                              }`}>
                                {contract.status === 'completed' ? <FiCheckCircle className="text-base" /> :
                                 contract.status === 'submitted' ? <FiClock className="text-base" /> :
                                 contract.status === 'rejected' ? <FiXCircle className="text-base" /> :
                                 <FiFileText className="text-base" />}
                                {contract.status === 'completed' ? '완료됨' :
                                 contract.status === 'submitted' ? '제출됨' :
                                 contract.status === 'rejected' ? '거부됨' :
                                 contract.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {contract.submittedAt
                                ? new Date(contract.submittedAt).toLocaleDateString('ko-KR')
                                : '-'}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewDetail(contract.id)}
                                  disabled={loadingContractDetail}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  <FiEye className="text-xs" />
                                  상세
                                </button>
                                {contract.status === 'submitted' && (
                                  <>
                                    <button
                                      onClick={() => handleCompleteContract(contract.id)}
                                      disabled={completingContractId === contract.id}
                                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                      title="계약서 완료 승인 (PDF 전송)"
                                    >
                                      <FiFileText className="text-xs" />
                                      완료 승인
                                    </button>
                                    <button
                                      onClick={() => handleReject(contract.id)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                    >
                                      <FiXCircle className="text-xs" />
                                      거부
                                    </button>
                                  </>
                                )}
                                {contract.status === 'completed' && (
                                  <button
                                    onClick={() => handleSendPdf(contract.id)}
                                    disabled={sendingPdfContractId === contract.id}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    <FiFileText className="text-xs" />
                                    PDF 보내기
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(contract.id)}
                                  disabled={deletingContractId === contract.id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                >
                                  <FiTrash2 className="text-xs" />
                                  {deletingContractId === contract.id ? '삭제 중...' : '삭제'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 계약서 보내기 모달 */}
            {isBranchManager && (
              <ContractInviteModal
                isOpen={showSendContractModal}
                onClose={() => setShowSendContractModal(false)}
                contractType={contractType}
                onSuccess={() => {
                  setShowSendContractModal(false);
                  loadContracts();
                }}
              />
            )}

            {/* 계약서 상세보기 모달 */}
            {isBranchManager && showContractDetail && selectedContract && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-gray-900">계약서 상세</h2>
                    <button
                      onClick={() => {
                        setShowContractDetail(false);
                        setSelectedContract(null);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FiEyeOff className="text-xl text-gray-600" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">이름</p>
                        <p className="text-base text-gray-900">{selectedContract.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">전화번호</p>
                        <p className="text-base text-gray-900">{selectedContract.phone}</p>
                      </div>
                      {selectedContract.email && (
                        <div className="col-span-2">
                          <p className="text-sm font-semibold text-gray-500 mb-1">이메일</p>
                          <p className="text-base text-gray-900">{selectedContract.email}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">상태</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedContract.status === 'completed' ? 'bg-green-100 text-green-700' :
                          selectedContract.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {selectedContract.status === 'completed' ? '완료됨' : '제출됨'}
                        </span>
                      </div>
                      {selectedContract.submittedAt && (
                        <div>
                          <p className="text-sm font-semibold text-gray-500 mb-1">제출일</p>
                          <p className="text-base text-gray-900">{formatDate(selectedContract.submittedAt)}</p>
                        </div>
                      )}
                      {selectedContract.completedAt && (
                        <div>
                          <p className="text-sm font-semibold text-gray-500 mb-1">완료일</p>
                          <p className="text-base text-gray-900">{formatDate(selectedContract.completedAt)}</p>
                        </div>
                      )}
                    </div>
                    {selectedContract.mentor && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-semibold text-blue-700 mb-2">담당 멘토</p>
                        <p className="text-base text-blue-900 mb-1">{selectedContract.mentor.displayName || '정보 없음'}</p>
                        {selectedContract.mentor.branchLabel && (
                          <p className="text-sm text-blue-600">{selectedContract.mentor.branchLabel}</p>
                        )}
                        {selectedContract.mentor.contactPhone && (
                          <p className="text-sm text-blue-600">{selectedContract.mentor.contactPhone}</p>
                        )}
                      </div>
                    )}
                    {/* 계약서 싸인 섹션 */}
                    {(selectedContract.metadata?.signatures || selectedContract.metadata?.signature) && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">계약서 싸인</h3>
                        <div className="space-y-4">
                          {selectedContract.metadata?.signatures && (
                            <>
                              {/* 교육 계약서 싸인 */}
                              {selectedContract.metadata.signatures.education?.url && (
                                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-blue-700">교육 계약서 싸인</h4>
                                    <button
                                      onClick={() => {
                                        const contractType = selectedContract.metadata?.contractType || 'SALES_AGENT';
                                        setEducationContractType(contractType as any);
                                        setShowEducationContractModal(true);
                                        // 계약서 열람 확인 추가
                                        if (selectedContract) {
                                          setViewedContractIds(prev => new Set(prev).add(selectedContract.id));
                                        }
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                                    >
                                      교육계약서 전문보기
                                    </button>
                                  </div>
                                  {selectedContract.metadata.signatures.education.originalName && (
                                    <p className="text-xs text-blue-600 mb-2">
                                      파일명: {selectedContract.metadata.signatures.education.originalName}
                                    </p>
                                  )}
                                  <img
                                    src={selectedContract.metadata.signatures.education.url}
                                    alt="교육 계약서 서명"
                                    className="max-w-full h-auto"
                                  />
                                </div>
                              )}
                              {/* B2B 계약서 싸인 (대리점장 전용) */}
                              {selectedContract.metadata.signatures.b2b?.url && (
                                <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
                                  <h4 className="text-sm font-semibold text-purple-700 mb-2">B2B 계약서 싸인</h4>
                                  {selectedContract.metadata.signatures.b2b.originalName && (
                                    <p className="text-xs text-purple-600 mb-2">
                                      파일명: {selectedContract.metadata.signatures.b2b.originalName}
                                    </p>
                                  )}
                                  <img
                                    src={selectedContract.metadata.signatures.b2b.url}
                                    alt="B2B 계약서 서명"
                                    className="max-w-full h-auto"
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-4 border-t">
                      {selectedContract.status === 'submitted' && (
                        <button
                          onClick={() => {
                            setShowContractDetail(false);
                            handleCompleteContract(selectedContract.id);
                          }}
                          disabled={completingContractId === selectedContract.id}
                          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {completingContractId === selectedContract.id ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              처리 중...
                            </>
                          ) : (
                            <>
                              <FiCheckCircle />
                              완료 승인 (PDF 전송)
                            </>
                          )}
                        </button>
                      )}
                      {selectedContract.status === 'completed' && (
                        <button
                          onClick={() => {
                            setShowContractDetail(false);
                            handleSendPdf(selectedContract.id);
                          }}
                          disabled={sendingPdfContractId === selectedContract.id}
                          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {sendingPdfContractId === selectedContract.id ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              전송 중...
                            </>
                          ) : (
                            <>
                              <FiFileText />
                              PDF 보내기
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowContractDetail(false);
                          setSelectedContract(null);
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 최근 판매 */}
            <div
              onClick={() => router.push(`${partnerBase}/payment`)}
              className="block rounded-2xl bg-white p-4 shadow-lg transition-all hover:shadow-xl md:rounded-3xl md:p-6 cursor-pointer"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 md:text-xl">최근 판매</h2>
                <span className="text-xs text-blue-600 hover:text-blue-700 md:text-sm">
                  전체보기 <FiArrowRight className="inline ml-1" />
                </span>
              </div>
              {stats.recentSales.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentSales.map((sale) => (
                    <div key={sale.id} className="rounded-lg border border-gray-200 p-3 md:p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-base md:text-lg">
                            {formatCurrency(sale.saleAmount)}
                          </p>
                          <p className="text-xs text-gray-500 md:text-sm">
                            {formatDate(sale.saleDate || sale.createdAt)}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          sale.status === 'CONFIRMED' || sale.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          sale.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          sale.status === 'PENDING_APPROVAL' ? 'bg-blue-100 text-blue-700' :
                          sale.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {formatSaleStatus(sale.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-gray-500">판매 기록이 없습니다.</p>
              )}
            </div>
          </div>
        )}

        {/* 파트너몰 미리보기 */}
        <section className="rounded-2xl bg-white p-4 shadow-lg md:rounded-3xl md:p-6">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 md:text-xl">고객에게 보여지는 파트너몰</h2>
              <p className="text-xs text-slate-500 md:text-sm">실시간으로 연동되는 상품 목록입니다.</p>
            </div>
            <Link
              href={`/${user.mallUserId || user.phone || partnerId}/shop`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 md:text-sm"
            >
              고객용 파트너몰 바로가기 <FiArrowRight />
            </Link>
          </div>
          <ProductList partnerContext={partnerContext} />
        </section>
      </div>

      {/* 계약서 타입 선택 모달 */}
      {isBranchManager && showContractTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">계약서 타입 선택</h2>
              <p className="text-sm text-gray-600 mt-1">
                보낼 계약서 타입을 선택해주세요.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => {
                  setSelectedContractType('SALES_AGENT');
                  setShowContractTypeModal(false);
                  setShowContractInviteModal(true);
                }}
                className="flex flex-col items-start gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-left transition-all hover:border-blue-400 hover:bg-blue-100 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                    판매원
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">판매원 계약서</h3>
                  <p className="text-xs text-gray-600 mt-1">교육 계약서 (330만원)</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedContractType('BRANCH_MANAGER');
                  setShowContractTypeModal(false);
                  setShowContractInviteModal(true);
                }}
                className="flex flex-col items-start gap-3 rounded-xl border-2 border-purple-200 bg-purple-50 p-4 text-left transition-all hover:border-purple-400 hover:bg-purple-100 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                    대리점장
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">대리점장 계약서</h3>
                  <p className="text-xs text-gray-600 mt-1">B2B 계약서 + 교육 계약서 (750만원)</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedContractType('CRUISE_STAFF');
                  setShowContractTypeModal(false);
                  setShowContractInviteModal(true);
                }}
                className="flex flex-col items-start gap-3 rounded-xl border-2 border-green-200 bg-green-50 p-4 text-left transition-all hover:border-green-400 hover:bg-green-100 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                    크루즈스탭
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">크루즈스탭 계약서</h3>
                  <p className="text-xs text-gray-600 mt-1">교육 계약서 (540만원)</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedContractType('PRIMARKETER');
                  setShowContractTypeModal(false);
                  setShowContractInviteModal(true);
                }}
                className="flex flex-col items-start gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 p-4 text-left transition-all hover:border-orange-400 hover:bg-orange-100 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                    프리마케터
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">프리마케터 계약서</h3>
                  <p className="text-xs text-gray-600 mt-1">교육 계약서 (100만원)</p>
                </div>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowContractTypeModal(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계약서 보내기 모달 */}
      {isBranchManager && (
        <ContractInviteModal
          isOpen={showContractInviteModal}
          onClose={() => {
            setShowContractInviteModal(false);
            setSelectedContractType('SALES_AGENT');
          }}
          currentProfileId={profile.id}
          contractType={selectedContractType}
          onSuccess={() => {
            setShowContractInviteModal(false);
            setSelectedContractType('SALES_AGENT');
          }}
        />
      )}

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">비밀번호 변경</h2>
              <p className="text-sm text-gray-600 mt-1">
                새로운 비밀번호를 입력해주세요.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  현재 비밀번호 (선택)
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="현재 비밀번호를 입력하세요 (선택사항)"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  새 비밀번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호를 입력하세요"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">최소 4자 이상 입력해주세요.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  새 비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호를 다시 입력하세요"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isChangingPassword}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 고객 등록 모달 */}
      {showCustomerRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white rounded-t-2xl">
              <h2 className="text-2xl font-bold">크루즈가이드 동행인 등록</h2>
              <p className="text-sm text-white/90 mt-1">
                등록된 동행인은 비밀번호 3800으로 크루즈 가이드 지니에 로그인할 수 있습니다.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={registerForm.isCompanion}
                    onChange={(e) => setRegisterForm({ ...registerForm, isCompanion: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">동행인으로 등록</span>
                </label>
              </div>

              {registerForm.isCompanion && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    메인 고객 전화번호 <span className="text-red-500">*</span>
                    {isLoadingProductCode && (
                      <span className="ml-2 text-xs text-gray-500">상품 코드 조회 중...</span>
                    )}
                  </label>
                  <input
                    type="tel"
                    value={registerForm.mainCustomerPhone}
                    onChange={(e) => handleMainCustomerPhoneChange(e.target.value)}
                    placeholder="010-1234-5678"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                    disabled={isLoadingProductCode}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 메인 고객 전화번호를 입력하면 구매한 상품 코드가 자동으로 입력됩니다.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  고객 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={registerForm.customerName}
                  onChange={(e) => setRegisterForm({ ...registerForm, customerName: e.target.value })}
                  placeholder="홍길동"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  고객 전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={registerForm.customerPhone}
                  onChange={(e) => setRegisterForm({ ...registerForm, customerPhone: e.target.value })}
                  placeholder="010-1234-5678"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  상품 코드 {registerForm.isCompanion ? '(자동 입력됨)' : '(선택사항)'}
                </label>
                <input
                  type="text"
                  value={registerForm.productCode}
                  onChange={(e) => setRegisterForm({ ...registerForm, productCode: e.target.value.toUpperCase() })}
                  placeholder="POP-NEW-001"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                  disabled={registerForm.isCompanion && isLoadingProductCode}
                />
                {registerForm.isCompanion && registerForm.productCode && (
                  <p className="mt-1 text-xs text-green-600">
                    ✅ 메인 고객의 상품 코드가 자동으로 입력되었습니다.
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-800">
                  <strong>💡 안내:</strong> 등록된 동행인은 이름과 전화번호, 비밀번호 <strong>3800</strong>으로 크루즈 가이드 지니에 로그인할 수 있습니다.
                  <br />
                  비밀번호는 동행인에게 구두로 전달해주세요.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowCustomerRegisterModal(false);
                  setRegisterForm({
                    customerName: '',
                    customerPhone: '',
                    productCode: '',
                    isCompanion: false,
                    mainCustomerPhone: '',
                  });
                }}
                disabled={isRegistering}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleRegisterCustomer}
                disabled={isRegistering}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-green-700 disabled:opacity-50"
              >
                {isRegistering ? '등록 중...' : '동행인 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 판매 확정 모달 */}
      <SalesConfirmationModal
        sale={selectedSaleForConfirmation}
        isOpen={showSalesConfirmationModal}
        onClose={() => {
          setShowSalesConfirmationModal(false);
          setSelectedSaleForConfirmation(null);
        }}
        onSuccess={() => {
          loadMySales();
        }}
      />

      {/* 교육계약서 전문 모달 */}
      {showEducationContractModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 px-4"
          onClick={() => setShowEducationContractModal(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                {educationContractType === 'BRANCH_MANAGER' ? '대리점장' : educationContractType === 'CRUISE_STAFF' ? '크루즈스탭' : educationContractType === 'PRIMARKETER' ? '프리마케터' : '판매원'} 교육 계약서 전문
              </h3>
              <button
                type="button"
                onClick={() => setShowEducationContractModal(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <FiX />
              </button>
            </div>
            <div className="h-[70vh] overflow-y-auto px-6 py-4 text-sm leading-relaxed text-slate-700 space-y-4">
              <p className="text-slate-700 leading-relaxed">
                교육 계약서 전문은 관리자 패널에서 확인하실 수 있습니다.
                <br />
                계약서 상세 정보는 계약서 상세 모달에서 확인하실 수 있습니다.
              </p>
              <p className="text-xs text-slate-500 mt-4">
                ※ 본 교육 계약서는 전자 서명으로 체결되며, 갑(크루즈닷)의 최종 승인을 통해 효력이 발생합니다.
              </p>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowEducationContractModal(false)}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
