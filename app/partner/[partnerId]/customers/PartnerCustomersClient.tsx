'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  FiArrowLeft,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiUsers,
  FiX,
  FiFileText,
  FiMic,
  FiUpload,
  FiCheckCircle,
  FiClock,
  FiTrash2,
  FiBell,
  FiUser,
  FiMessageSquare,
  FiLink,
  FiSettings,
  FiHelpCircle,
  FiInfo,
  FiSend,
  FiArrowRight,
} from 'react-icons/fi';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/components/ui/Toast';
import SymbolPicker from '@/components/ui/SymbolPicker';
import CustomerStatusBadges from '@/components/CustomerStatusBadges';
import CustomerNoteModal from '@/components/admin/CustomerNoteModal';

type LeadStatusOption = {
  value: string;
  label: string;
  theme: string;
};

type PartnerInfo = {
  profileId: number;
  type: 'BRANCH_MANAGER' | 'SALES_AGENT' | 'HQ';
  displayName: string | null;
  branchLabel: string | null;
  mallUserId: string;
  shareLinks: {
    mall: string;
    tracked: string;
    landing: string | null;
  };
  manager: {
    label: string | null;
    affiliateCode: string | null;
    branchLabel: string | null;
    mallUserId: string | null;
  } | null;
  teamAgents: Array<{
    id: number;
    displayName: string | null;
    affiliateCode: string | null;
    mallUserId: string | null;
  }>;
};

type SaleSummary = {
  totalSalesCount: number;
  totalSalesAmount: number;
  totalNetRevenue: number;
  confirmedSalesCount: number;
  confirmedSalesAmount: number;
  lastSaleAt: string | null;
  lastSaleStatus: string | null;
};

type Interaction = {
  id: number;
  interactionType: string;
  occurredAt: string;
  note: string | null;
  profileId: number | null;
  createdBy: {
    id: number;
    name: string | null;
    phone: string | null;
  } | null;
};

type PartnerCustomer = {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  notes: string | null;
  lastContactedAt: string | null;
  nextActionAt: string | null;
  createdAt: string;
  updatedAt: string;
  passportRequestedAt: string | null;
  passportCompletedAt: string | null;
  source: string | null;
  metadata: any | null;
  groupId: number | null;
  manager: {
    id: number;
    displayName: string | null;
  } | null;
  agent: {
    id: number;
    displayName: string | null;
  } | null;
  ownership: 'AGENT' | 'MANAGER' | 'UNKNOWN';
  counterpart: {
    label: string | null;
    affiliateCode: string | null;
  } | null;
  saleSummary: SaleSummary;
  interactions: Interaction[];
  sales: Array<{
    id: number;
    saleAmount: number | null;
    netRevenue: number | null;
    saleDate: string | null;
    status: string;
  }>;
  // 고객 상태 정보 (딱지 표시용)
  testModeStartedAt?: string | null;
  customerStatus?: string | null;
  mallUserId?: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type PartnerCustomersClientProps = {
  partner: PartnerInfo;
  leadStatusOptions: LeadStatusOption[];
};

type CreateCustomerForm = {
  customerName: string;
  customerPhone: string;
  status: string;
  notes: string;
  nextActionAt: string;
  agentProfileId: string;
  createdAt?: string; // 유입날짜
};

type InteractionForm = {
  note: string;
  status: string;
  nextActionAt: string;
  occurredAt: string;
  files: File[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatChatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '오늘';
  if (diffDays === -1) return '어제';
  if (diffDays === 1) return '내일';
  
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

// 3일 체험 초대 링크 섹션 컴포넌트
function TrialInviteLinkSection() {
  const [trialLinkData, setTrialLinkData] = useState<{ url: string; code: string; shortUrl?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadTrialLink = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/partner/trial-invite-link', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok && data.link) {
        // API에서 반환된 숏링크 사용 (없으면 클라이언트에서 생성)
        const shortUrl = data.link.shortUrl || `${window.location.origin}/p/${data.link.code}`;
        setTrialLinkData({ url: data.link.url, code: data.link.code, shortUrl });
      } else {
        setTrialLinkData(null);
      }
    } catch (error) {
      console.error('[TrialInviteLink] Load error:', error);
      setTrialLinkData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTrialLink = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/partner/trial-invite-link', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok && data.link) {
        // API에서 반환된 숏링크 사용 (없으면 클라이언트에서 생성)
        const shortUrl = data.link.shortUrl || `${window.location.origin}/p/${data.link.code}`;
        setTrialLinkData({ url: data.link.url, code: data.link.code, shortUrl });
        showSuccess('3일 체험 초대 링크가 생성되었습니다!');
      } else {
        showError(data.message || '링크 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('[TrialInviteLink] Create error:', error);
      showError('링크 생성 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  }, []);

  useEffect(() => {
    loadTrialLink();
  }, [loadTrialLink]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-white/90 px-4 py-3">
        <div className="h-4 w-4 border-2 border-yellow-500 border-b-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!trialLinkData) {
    return (
      <button
        type="button"
        onClick={createTrialLink}
        disabled={creating}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-500 px-4 py-3 font-semibold text-white shadow hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creating ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
            <span>생성 중...</span>
          </>
        ) : (
          <>
            <FiPlus className="w-4 h-4" />
            <span>3일 체험 초대 링크 생성</span>
          </>
        )}
      </button>
    );
  }

  // 숏링크 URL 사용 (있으면 숏링크, 없으면 원본 URL)
  const displayUrl = trialLinkData.shortUrl || trialLinkData.url;

  return (
    <button
      type="button"
      onClick={() => copyToClipboard(displayUrl)}
      className="flex w-full items-center justify-between rounded-2xl bg-yellow-500 px-4 py-3 font-semibold text-white shadow hover:bg-yellow-600"
    >
      <span className="flex items-center gap-2">
        <span>🎁</span>
        <span>3일 체험 초대 링크</span>
      </span>
      <FiCopy />
    </button>
  );
}

function groupInteractionsByDate(interactions: Interaction[]) {
  const groups: Record<string, Interaction[]> = {};
  
  interactions.forEach((interaction) => {
    const date = new Date(interaction.occurredAt);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().split('T')[0];
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(interaction);
  });
  
  // 날짜별로 정렬 (최신순)
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  
  return sortedDates.map((dateKey) => ({
    date: dateKey,
    interactions: groups[dateKey].sort((a, b) => 
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    ),
  }));
}

function formatCurrency(value: number | null | undefined) {
  if (!value) return '0';
  return value.toLocaleString('ko-KR');
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showSuccess('복사되었습니다.');
  } catch (error) {
    console.error('copyToClipboard error', error);
    showError('복사에 실패했습니다. 다시 시도해주세요.');
  }
}

function StatusBadge({
  status,
  options,
}: {
  status: string;
  options: LeadStatusOption[];
}) {
  const option = options.find((item) => item.value === status);
  
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
  
  const label = option?.label || statusMap[status] || status;
  const theme = option?.theme || styleMap[status] || 'bg-slate-200 text-slate-700';
  
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${theme}`}
    >
      {label}
    </span>
  );
}

export default function PartnerCustomersClient({
  partner,
  leadStatusOptions,
}: PartnerCustomersClientProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const partnerId = params?.partnerId as string;
  
  // URL 파라미터 확인
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('');
  
  useEffect(() => {
    const action = searchParams.get('action');
    const agentId = searchParams.get('agentId');
    
    if (action === 'send-db') {
      router.push(`/partner/${partnerId}/customers/send-db`);
    }
    
    if (agentId) {
      setSelectedAgentFilter(agentId);
    }
  }, [searchParams, router, partnerId]);
  
  // 판매원별 DB 현황 상태
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
  
  // 판매원별 DB 현황 로드
  const loadAgentDbStats = useCallback(async () => {
    if (partner.type !== 'BRANCH_MANAGER') return;
    
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
      console.error('[PartnerCustomers] Failed to load agent DB stats:', error);
    } finally {
      setLoadingAgentDbStats(false);
    }
  }, [partner.type]);
  
  useEffect(() => {
    if (partner.type === 'BRANCH_MANAGER') {
      loadAgentDbStats();
    }
  }, [partner.type, loadAgentDbStats]);
  const [customers, setCustomers] = useState<PartnerCustomer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addForm, setAddForm] = useState<CreateCustomerForm>({
    customerName: '',
    customerPhone: '',
    status: '',
    notes: '',
    nextActionAt: '',
    agentProfileId: '',
    createdAt: new Date().toISOString().split('T')[0], // 기본값: 오늘 날짜
  });

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<PartnerCustomer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [interactionForm, setInteractionForm] = useState<InteractionForm>({
    note: '',
    status: '',
    nextActionAt: '',
    occurredAt: '',
    files: [],
  });
  const [interactionSaving, setInteractionSaving] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(false);
  const [requestingPassport, setRequestingPassport] = useState(false);
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [passportMethod, setPassportMethod] = useState<'aligo' | 'link'>('link');
  const [passportMessage, setPassportMessage] = useState('');
  const [passportTemplates, setPassportTemplates] = useState<Array<{
    id: number;
    title: string;
    body: string;
    isDefault: boolean;
  }>>([]);
  const [selectedPassportTemplateId, setSelectedPassportTemplateId] = useState<number | null>(null);
  const [loadingPassportTemplates, setLoadingPassportTemplates] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);
  const [isContractTerminated, setIsContractTerminated] = useState(false);
  const [confirmingSale, setConfirmingSale] = useState<number | null>(null);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'customers' | 'groups'>('customers');
  const [customerGroups, setCustomerGroups] = useState<Array<{
    id: number;
    name: string;
    description: string | null;
    productCode: string | null;
    color: string | null;
    leadCount: number;
  }>>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<number | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    productCode: '',
    color: '#3B82F6',
  });
  const [activeProducts, setActiveProducts] = useState<Array<{
    id: number;
    productCode: string;
    cruiseLine: string;
    shipName: string;
    packageName: string;
    nights: number;
    days: number;
    basePrice: number | null;
  }>>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [groupExcelFile, setGroupExcelFile] = useState<File | null>(null);
  const [uploadingGroupExcel, setUploadingGroupExcel] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  
  // 퍼널 설정 관련 상태
  const [showFunnelModal, setShowFunnelModal] = useState(false);
  const [funnelSettingsGroup, setFunnelSettingsGroup] = useState<{
    id: number;
    name: string;
    funnelTalkIds?: number[] | null;
    funnelSmsIds?: number[] | null;
    funnelEmailIds?: number[] | null;
    reEntryHandling?: string | null;
  } | null>(null);
  const [funnelTalks, setFunnelTalks] = useState<Array<{ groupName: string; messages: Array<{ id: number; title: string }> }>>([]);
  const [funnelSms, setFunnelSms] = useState<Array<{ groupName: string; messages: Array<{ id: number; title: string }> }>>([]);
  const [funnelEmails, setFunnelEmails] = useState<Array<{ groupName: string; messages: Array<{ id: number; title: string }> }>>([]);
  const [funnelForm, setFunnelForm] = useState({
    funnelTalkIds: [] as number[],
    funnelSmsIds: [] as number[],
    funnelEmailIds: [] as number[],
    reEntryHandling: 'time_change_info_change' as string,
  });
  
  // DB 보내기 관련 상태
  const [showDbSendModal, setShowDbSendModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [newCustomers, setNewCustomers] = useState<Array<{ name: string; phone: string; email: string; notes: string }>>([]);
  const [sendingDb, setSendingDb] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsMethod, setSmsMethod] = useState<'aligo' | 'link'>('aligo');
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedCustomerForNote, setSelectedCustomerForNote] = useState<{ id: number; name: string | null } | null>(null);
  const [smsRecipientMode, setSmsRecipientMode] = useState<'customer' | 'custom'>('customer'); // 고객 선택 또는 직접 번호 입력
  const [customPhoneNumber, setCustomPhoneNumber] = useState(''); // 직접 입력한 번호
  const [aligoConfig, setAligoConfig] = useState({
    apiKey: '',
    userId: '',
    senderPhone: '',
  });
  const [loadingAligoConfig, setLoadingAligoConfig] = useState(false);
  const [savingAligoConfig, setSavingAligoConfig] = useState(false);
  const [hasSyncedAligoConfig, setHasSyncedAligoConfig] = useState(false);
  const [aligoConfigDirty, setAligoConfigDirty] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [showAligoGuide, setShowAligoGuide] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelAgentProfileId, setExcelAgentProfileId] = useState<string>('');

  const statusSelectOptions = useMemo(
    () => [
      { value: '', label: '상태 선택' },
      ...leadStatusOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    ],
    [leadStatusOptions],
  );

  const getLocalAligoConfig = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = window.localStorage.getItem('aligo_config');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return {
        apiKey: parsed.apiKey || '',
        userId: parsed.userId || '',
        senderPhone: (parsed.senderPhone || '').replace(/[^0-9]/g, ''),
      };
    } catch (error) {
      console.error('Failed to parse local Aligo config:', error);
      return null;
    }
  }, []);

  const updateAligoConfigField = useCallback(
    (field: 'apiKey' | 'userId' | 'senderPhone', value: string) => {
      const sanitizedValue =
        field === 'senderPhone' ? value.replace(/[^0-9]/g, '') : value;
      setAligoConfig((prev) => ({ ...prev, [field]: sanitizedValue }));
      setAligoConfigDirty(true);
      setHasSyncedAligoConfig(false);
    },
    [],
  );

  const loadAligoConfig = useCallback(async () => {
    setLoadingAligoConfig(true);
    try {
      const response = await fetch('/api/partner/settings/sms', {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'SMS 설정을 불러올 수 없습니다.');
      }
      const config = data.config;
      if (config && config.provider === 'aligo') {
        const sanitized = {
          apiKey: config.apiKey || '',
          userId: config.userId || '',
          senderPhone: (config.senderPhone || '').replace(/[^0-9]/g, ''),
        };
        setAligoConfig(sanitized);
        setHasSyncedAligoConfig(Boolean(sanitized.apiKey && sanitized.userId && sanitized.senderPhone));
        setAligoConfigDirty(false);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('aligo_config', JSON.stringify(sanitized));
        }
      } else {
        const fallback = getLocalAligoConfig();
        if (fallback) {
          setAligoConfig(fallback);
        } else {
          setAligoConfig({ apiKey: '', userId: '', senderPhone: '' });
        }
        setHasSyncedAligoConfig(false);
        setAligoConfigDirty(false);
      }
    } catch (error) {
      console.error('Failed to load Aligo config:', error);
      const fallback = getLocalAligoConfig();
      if (fallback) {
        setAligoConfig(fallback);
      }
      showError(
        error instanceof Error
          ? error.message
          : '알리고 설정을 불러오지 못했습니다. 설정 페이지에서 확인해주세요.',
      );
    } finally {
      setLoadingAligoConfig(false);
    }
  }, [getLocalAligoConfig, showError]);

  // 계약 해지 상태 확인
  useEffect(() => {
    const checkContractStatus = async () => {
      try {
        const res = await fetch('/api/affiliate/my-contract', {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok && data.contract) {
          setIsContractTerminated(data.contract.status === 'terminated');
        }
      } catch (error) {
        console.error('Failed to check contract status:', error);
      }
    };
    checkContractStatus();
  }, []);

  const fetchCustomers = useCallback(
    async (pageValue: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', pageValue.toString());
        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        if (searchTerm) params.set('q', searchTerm);
        if (selectedAgentFilter) {
          if (selectedAgentFilter === 'unassigned') {
            // 미할당 고객만 필터링 (클라이언트 사이드)
          } else {
            params.set('agentId', selectedAgentFilter);
          }
        }

        const res = await fetch(`/api/partner/customers?${params}`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || '고객 목록을 불러오지 못했습니다.');
        }
        
        let customers = json.customers ?? [];
        
        // 미할당 고객 필터링 (클라이언트 사이드)
        if (selectedAgentFilter === 'unassigned') {
          customers = customers.filter((c: any) => c.ownership === 'MANAGER' && !c.agent?.id);
        }
        
        setCustomers(customers);
        if (json.pagination) {
          setPagination(json.pagination);
          setCurrentPage(json.pagination.page);
        }
      } catch (error) {
        console.error('fetchCustomers error', error);
        showError(
          error instanceof Error
            ? error.message
            : '고객 목록을 불러오지 못했습니다.',
        );
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, statusFilter, selectedAgentFilter],
  );

  const loadLeadDetail = useCallback(async (leadId: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/partner/customers/${leadId}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || '고객 정보를 불러오지 못했습니다.');
      }
      setSelectedLead(json.customer);
    } catch (error) {
      console.error('loadLeadDetail error', error);
      showError(
        error instanceof Error
          ? error.message
          : '고객 정보를 불러오지 못했습니다.',
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // 고객 그룹 로드
  const loadCustomerGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/partner/customer-groups', {
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setCustomerGroups(json.groups || []);
      }
    } catch (error) {
      console.error('loadCustomerGroups error', error);
    }
  }, []);

  // 퍼널 목록 로드 (예약메시지 groupName별로 그룹화)
  const loadFunnelLists = useCallback(async () => {
    try {
      const response = await fetch('/api/partner/scheduled-messages', { credentials: 'include' });
      const data = await response.json();

      if (data.ok && data.messages) {
        const kakaoMessages = data.messages.filter((m: any) => m.sendMethod === 'kakao');
        const smsMessages = data.messages.filter((m: any) => m.sendMethod === 'sms' || m.sendMethod === 'cruise-guide');
        const emailMessages = data.messages.filter((m: any) => m.sendMethod === 'email');

        const groupByGroupName = (messages: any[]) => {
          const grouped = messages.reduce((acc: any, msg: any) => {
            const groupName = msg.groupName || '기타';
            if (!acc[groupName]) {
              acc[groupName] = [];
            }
            acc[groupName].push({ id: msg.id, title: msg.title });
            return acc;
          }, {});

          return Object.keys(grouped).map(groupName => ({
            groupName,
            messages: grouped[groupName],
          }));
        };

        setFunnelTalks(groupByGroupName(kakaoMessages));
        setFunnelSms(groupByGroupName(smsMessages));
        setFunnelEmails(groupByGroupName(emailMessages));
      }
    } catch (error) {
      console.error('Failed to load funnel lists:', error);
      showError('퍼널 목록을 불러오는 중 오류가 발생했습니다.');
    }
  }, []);

  // 활성 상품 목록 로드
  const loadActiveProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/partner/products/active', {
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setActiveProducts(json.products || []);
      }
    } catch (error) {
      console.error('loadActiveProducts error', error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // 그룹 관리용 엑셀 샘플 다운로드
  const handleDownloadGroupExcelSample = async () => {
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

  // DB 보내기 핸들러
  const handleSendDb = async () => {
    if (!selectedAgentId) {
      showError('판매원을 선택해주세요.');
      return;
    }

    if (selectedCustomerIds.length === 0 && newCustomers.length === 0) {
      showError('고객을 선택하거나 추가해주세요.');
      return;
    }

    // 새 고객 유효성 검사
    for (const customer of newCustomers) {
      if (!customer.name || !customer.phone) {
        showError('새 고객의 이름과 연락처는 필수입니다.');
        return;
      }
    }

    setSendingDb(true);
    try {
      const res = await fetch('/api/partner/customers/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leadIds: selectedCustomerIds,
          agentId: selectedAgentId,
          customerData: newCustomers,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'DB 보내기에 실패했습니다.');
      }

      showSuccess(`DB 보내기 완료: ${json.results.assigned.length + json.results.created.length}건 처리됨`);
      setShowDbSendModal(false);
      setSelectedAgentId('');
      setSelectedCustomerIds([]);
      setNewCustomers([]);
      fetchCustomers(currentPage);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'DB 보내기에 실패했습니다.');
    } finally {
      setSendingDb(false);
    }
  };

  // DB 회수 핸들러
  const handleRecallDb = async (leadIds: number[]) => {
    if (leadIds.length === 0) {
      showError('회수할 고객을 선택해주세요.');
      return;
    }

    if (!confirm(`${leadIds.length}명의 고객을 회수하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch('/api/partner/customers/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leadIds }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'DB 회수에 실패했습니다.');
      }

      showSuccess(`DB 회수 완료: ${json.results.recalled.length}건 처리됨`);
      fetchCustomers(currentPage);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'DB 회수에 실패했습니다.');
    }
  };

  // 엑셀 파일 업로드
  const handleUploadGroupExcel = async () => {
    if (!groupExcelFile) {
      showError('엑셀 파일을 선택해주세요.');
      return;
    }

    if (!editingGroup) {
      showError('그룹을 먼저 생성해주세요.');
      return;
    }

    setUploadingGroupExcel(true);
    try {
      const formData = new FormData();
      formData.append('file', groupExcelFile);
      formData.append('groupId', editingGroup.toString());

      const res = await fetch('/api/partner/customer-groups/excel-upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || '엑셀 업로드에 실패했습니다.');
      }

      showSuccess(
        `엑셀 업로드 완료: 총 ${json.summary?.total || 0}건 중 ${json.summary?.added || 0}건 추가, ${json.summary?.skipped || 0}건 건너뜀`
      );
      setGroupExcelFile(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      loadCustomerGroups();
      fetchCustomers(currentPage);
      // 엑셀 업로드 후 모달 닫기
      setShowGroupModal(false);
      setEditingGroup(null);
      setGroupForm({ name: '', description: '', productCode: '', color: '#3B82F6' });
    } catch (error) {
      showError(error instanceof Error ? error.message : '엑셀 업로드에 실패했습니다.');
    } finally {
      setUploadingGroupExcel(false);
    }
  };

  useEffect(() => {
    fetchCustomers(currentPage);
    if (activeTab === 'groups') {
      loadCustomerGroups();
    }
  }, [fetchCustomers, currentPage, activeTab, loadCustomerGroups]);

  // 그룹 모달이 열릴 때 활성 상품 목록 로드
  useEffect(() => {
    if (showGroupModal) {
      loadActiveProducts();
    }
  }, [showGroupModal, loadActiveProducts]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setProductDropdownOpen(false);
      }
    };

    if (productDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [productDropdownOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    loadAligoConfig();
  }, [loadAligoConfig]);

  // 그룹 저장
  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      showError('그룹 이름을 입력해주세요.');
      return;
    }

    try {
      const url = editingGroup
        ? `/api/partner/customer-groups/${editingGroup}`
        : '/api/partner/customer-groups';
      const method = editingGroup ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(groupForm),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || '그룹 저장에 실패했습니다.');
      }

      const createdGroupId = editingGroup || json.group?.id;
      showSuccess(editingGroup ? '그룹이 수정되었습니다.' : '그룹이 생성되었습니다.');
      if (!editingGroup && createdGroupId) {
        // 새 그룹 생성 시 그룹 ID를 설정하여 엑셀 업로드 가능하도록 함
        setEditingGroup(createdGroupId);
      } else {
        setShowGroupModal(false);
        setEditingGroup(null);
        setGroupForm({ name: '', description: '', productCode: '', color: '#3B82F6' });
      }
      loadCustomerGroups();
    } catch (error) {
      showError(error instanceof Error ? error.message : '그룹 저장에 실패했습니다.');
    }
  };

  // 브라우저 알림 권한 확인
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      // 권한이 없으면 요청
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
          if (permission === 'granted') {
            showSuccess('알림 권한이 허용되었습니다. 다음 조치 알람을 받을 수 있습니다.');
          }
        });
      }
    }
  }, []);

  // 여권 템플릿 로드
  const loadPassportTemplates = useCallback(async () => {
    setLoadingPassportTemplates(true);
    try {
      const res = await fetch('/api/partner/passport-templates', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('템플릿을 불러올 수 없습니다.');
      }
      const data = await res.json();
      if (data.ok && Array.isArray(data.templates)) {
        setPassportTemplates(data.templates);
        if (data.templates.length > 0) {
          const defaultTemplate = data.templates.find((tpl) => tpl.isDefault);
          const firstTemplate = defaultTemplate ?? data.templates[0];
          setSelectedPassportTemplateId(firstTemplate.id);
          // 템플릿 내용을 메시지에 설정 (링크는 나중에 추가)
          setPassportMessage(firstTemplate.body.replace('{링크}', '[링크가 자동으로 추가됩니다]'));
        }
      }
    } catch (error) {
      console.error('[PassportModal] Load templates error:', error);
      showError('템플릿을 불러오는 중 문제가 발생했습니다.');
    } finally {
      setLoadingPassportTemplates(false);
    }
  }, []);

  // 여권 모달이 열릴 때 템플릿 로드 및 알리고 설정 로드
  useEffect(() => {
    if (showPassportModal) {
      if (passportTemplates.length === 0) {
        loadPassportTemplates();
      }
      // 알리고 설정이 아직 로드되지 않았으면 로드
      if (!hasSyncedAligoConfig && !loadingAligoConfig) {
        loadAligoConfig();
      }
    }
  }, [showPassportModal, passportTemplates.length, loadPassportTemplates, hasSyncedAligoConfig, loadingAligoConfig, loadAligoConfig]);

  // 템플릿 선택 시 메시지 업데이트
  useEffect(() => {
    if (selectedPassportTemplateId && passportTemplates.length > 0) {
      const template = passportTemplates.find((tpl) => tpl.id === selectedPassportTemplateId);
      if (template) {
        setPassportMessage(template.body.replace('{링크}', '[링크가 자동으로 추가됩니다]'));
      }
    }
  }, [selectedPassportTemplateId, passportTemplates]);

  // URL 파라미터로 모달 열기 (한 번만 실행)
  const [smsActionProcessed, setSmsActionProcessed] = useState(false);
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'sms' && !smsActionProcessed) {
      setSmsActionProcessed(true);
      // selectedLeadId가 있으면 바로 모달 열기
      if (selectedLeadId && !showSmsModal) {
        // 고객 정보가 로드되지 않았으면 먼저 로드
        if (!selectedLead) {
          loadLeadDetail(selectedLeadId).then(() => {
            setShowSmsModal(true);
          });
        } else {
          setShowSmsModal(true);
        }
      }
      // selectedLeadId가 없어도 모달 열기 (직접 번호 입력 모드 사용 가능)
      else if (!selectedLeadId && !showSmsModal) {
        setShowSmsModal(true);
        setSmsRecipientMode('custom'); // 직접 번호 입력 모드로 시작
      }
    }
    // action이 없으면 초기화
    if (!action && smsActionProcessed) {
      setSmsActionProcessed(false);
    }
  }, [searchParams, selectedLeadId, selectedLead, showSmsModal, loadLeadDetail, customers.length, smsActionProcessed]);

  // 다음 조치 알람 스케줄링 함수
  const scheduleNextActionAlarm = useCallback((nextActionAt: string, customerName: string | null, leadId: number) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const actionDate = new Date(nextActionAt);
    const now = new Date();
    
    // 과거 시간이면 알람 설정 안 함
    if (actionDate <= now) {
      return;
    }

    const timeUntilAction = actionDate.getTime() - now.getTime();
    
    // 알람 시간에 브라우저 알림 표시
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('다음 조치 알림', {
          body: `${customerName || '고객'}님의 다음 조치 시간입니다.`,
          icon: '/favicon.ico',
          tag: `next-action-${leadId}`,
          requireInteraction: true,
        });
      }
    }, timeUntilAction);

    // 백엔드에도 알람 정보 전송
    fetch(`/api/partner/customers/${leadId}/schedule-alarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        nextActionAt,
        customerName: customerName || '고객',
      }),
    }).catch((error) => {
      console.error('알람 스케줄링 실패:', error);
    });
  }, []);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const resetAddForm = () =>
    setAddForm({
      customerName: '',
      customerPhone: '',
      status: '',
      notes: '',
      nextActionAt: '',
      agentProfileId: '',
      createdAt: new Date().toISOString().split('T')[0], // 기본값: 오늘 날짜
    });

  const handleCreateCustomer = async () => {
    if (!addForm.customerName && !addForm.customerPhone) {
      showError('고객 이름 또는 연락처를 입력해주세요.');
      return;
    }
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        customerName: addForm.customerName,
        customerPhone: addForm.customerPhone,
        status: addForm.status || undefined,
        notes: addForm.notes || undefined,
      };
      if (addForm.createdAt) {
        // 유입날짜를 ISO 형식으로 변환
        const createdAtDate = new Date(addForm.createdAt);
        createdAtDate.setHours(0, 0, 0, 0);
        payload.createdAt = createdAtDate.toISOString();
      }
      if (addForm.nextActionAt) {
        // 다음 조치 예정일을 ISO 형식으로 변환 (날짜+시간)
        const nextActionDate = new Date(addForm.nextActionAt);
        payload.nextActionAt = nextActionDate.toISOString();
      }
      if (partner.type === 'BRANCH_MANAGER' && addForm.agentProfileId) {
        payload.agentProfileId = Number(addForm.agentProfileId);
      }

      const res = await fetch('/api/partner/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || '고객 추가에 실패했습니다.');
      }
      
      // 다음 조치 예정일이 있으면 알람 스케줄링
      if (addForm.nextActionAt && json.customer?.id) {
        scheduleNextActionAlarm(
          addForm.nextActionAt,
          addForm.customerName || null,
          json.customer.id
        );
      }
      
      showSuccess('고객이 추가되었습니다.');
      setIsAddModalOpen(false);
      resetAddForm();
      setCurrentPage(1);
      fetchCustomers(1);
    } catch (error) {
      console.error('handleCreateCustomer error', error);
      showError(
        error instanceof Error ? error.message : '고객 추가에 실패했습니다.',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateLead = async (updates: Record<string, unknown>) => {
    if (!selectedLeadId) return;
    setUpdatingLead(true);
    try {
      const res = await fetch(`/api/partner/customers/${selectedLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || '고객 정보를 수정하지 못했습니다.');
      }
      showSuccess('고객 정보가 업데이트되었습니다.');
      setSelectedLead(json.customer);
      fetchCustomers(currentPage);
    } catch (error) {
      console.error('handleUpdateLead error', error);
      showError(
        error instanceof Error
          ? error.message
          : '고객 정보를 수정하지 못했습니다.',
      );
    } finally {
      setUpdatingLead(false);
    }
  };

  const handleAddInteraction = async () => {
    if (!selectedLeadId) return;
    if (!interactionForm.note.trim()) {
      showError('상담 메모를 입력해주세요.');
      return;
    }
    setInteractionSaving(true);
    try {
      const payload: Record<string, unknown> = {
        note: interactionForm.note,
        interactionType: 'NOTE',
      };
      if (interactionForm.status) payload.status = interactionForm.status;
      if (interactionForm.nextActionAt) payload.nextActionAt = interactionForm.nextActionAt;
      if (interactionForm.occurredAt) payload.occurredAt = interactionForm.occurredAt;

      const res = await fetch(`/api/partner/customers/${selectedLeadId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || '상담 기록을 저장하지 못했습니다.');
      }
      showSuccess('상담 기록이 추가되었습니다.');
      setInteractionForm({ note: '', status: '', nextActionAt: '', occurredAt: '', files: [] });
      
      // 파일 업로드 (있는 경우)
      if (interactionForm.files.length > 0 && json.interaction?.id) {
        for (const file of interactionForm.files) {
          const formData = new FormData();
          formData.append('file', file);
          
          try {
            const uploadRes = await fetch(`/api/admin/affiliate/interactions/${json.interaction.id}/upload`, {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });
            const uploadJson = await uploadRes.json();
            if (!uploadRes.ok || !uploadJson.ok) {
              console.error('File upload failed:', uploadJson.message);
            }
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
          }
        }
      }
      
      await loadLeadDetail(selectedLeadId);
      fetchCustomers(currentPage);
      
      // 다음 조치 시간이 설정되었으면 알람 스케줄링
      if (interactionForm.nextActionAt && selectedLead && selectedLeadId) {
        scheduleNextActionAlarm(interactionForm.nextActionAt, selectedLead.customerName, selectedLeadId);
      }
    } catch (error) {
      console.error('handleAddInteraction error', error);
      showError(
        error instanceof Error
          ? error.message
          : '상담 기록을 저장하지 못했습니다.',
      );
    } finally {
      setInteractionSaving(false);
    }
  };

  const openDetail = (leadId: number) => {
    setSelectedLeadId(leadId);
    setSelectedLead(null);
    loadLeadDetail(leadId);
    // 고객 상세보기 열 때 그룹 목록도 함께 로드
    loadCustomerGroups();
    // 고객 상세보기 열 때는 문자보내기 모달을 열지 않음
    setShowSmsModal(false);
  };

  const closeDetail = () => {
    setSelectedLeadId(null);
    setSelectedLead(null);
    setInteractionForm({ note: '', status: '', nextActionAt: '', occurredAt: '', files: [] });
    setShowSmsModal(false);
  };

  const handleSaveAligoConfig = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const trimmedApiKey = aligoConfig.apiKey.trim();
      const trimmedUserId = aligoConfig.userId.trim();
      const sanitizedSender = aligoConfig.senderPhone.replace(/[^0-9]/g, '');

      if (!trimmedApiKey || !trimmedUserId || !sanitizedSender) {
        showError('알리고 API 정보를 모두 입력해주세요.');
        return false;
      }

      setSavingAligoConfig(true);
      try {
        const payload = {
          provider: 'aligo',
          apiKey: trimmedApiKey,
          userId: trimmedUserId,
          senderPhone: sanitizedSender,
          isActive: true,
        };
        const res = await fetch('/api/partner/settings/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || '알리고 설정 저장에 실패했습니다.');
        }

        setAligoConfig({
          apiKey: payload.apiKey,
          userId: payload.userId,
          senderPhone: payload.senderPhone,
        });
        setHasSyncedAligoConfig(true);
        setAligoConfigDirty(false);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'aligo_config',
            JSON.stringify({
              apiKey: payload.apiKey,
              userId: payload.userId,
              senderPhone: payload.senderPhone,
            }),
          );
        }
        if (!silent) {
          showSuccess('알리고 설정이 저장되었습니다. 다음부터 자동으로 연동됩니다.');
        }
        return true;
      } catch (error) {
        console.error('handleSaveAligoConfig error', error);
        showError(error instanceof Error ? error.message : '알리고 설정 저장 중 오류가 발생했습니다.');
        return false;
      } finally {
        setSavingAligoConfig(false);
      }
    },
    [aligoConfig.apiKey, aligoConfig.userId, aligoConfig.senderPhone],
  );

  const handleSendSms = async () => {
    // 수신자 번호 결정
    let recipientPhone = '';
    if (smsRecipientMode === 'customer') {
      if (!selectedLead || !selectedLeadId) {
        showError('고객을 선택해주세요.');
        return;
      }
      recipientPhone = selectedLead.customerPhone || '';
      if (!recipientPhone) {
        showError('고객의 전화번호가 없습니다.');
        return;
      }
    } else {
      // 직접 번호 입력 모드
      const cleanedPhone = customPhoneNumber.replace(/[^0-9]/g, '');
      if (!cleanedPhone || cleanedPhone.length < 10) {
        showError('올바른 전화번호를 입력해주세요.');
        return;
      }
      recipientPhone = cleanedPhone;
    }

    if (smsMethod === 'aligo') {
      // 알리고 API로 직접 발송
      if (!aligoConfig.apiKey || !aligoConfig.userId || !aligoConfig.senderPhone) {
        showError('알리고 API 설정을 모두 입력해주세요.');
        return;
      }

      if (!smsMessage.trim()) {
        showError('문자 내용을 입력해주세요.');
        return;
      }

      setSendingSms(true);
      try {
        const res = await fetch('/api/partner/customers/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        body: JSON.stringify({
          leadId: smsRecipientMode === 'customer' ? selectedLeadId : null,
          phone: recipientPhone,
          message: smsMessage,
          aligoApiKey: aligoConfig.apiKey,
          aligoUserId: aligoConfig.userId,
          aligoSenderPhone: aligoConfig.senderPhone,
        }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || '문자 발송에 실패했습니다.');
        }

        showSuccess('문자가 성공적으로 발송되었습니다!');
        setShowSmsModal(false);
        setSmsMessage('');
        setCustomPhoneNumber('');
        setSmsRecipientMode('customer');
      } catch (error) {
        console.error('handleSendSms error', error);
        showError(
          error instanceof Error ? error.message : '문자 발송 중 오류가 발생했습니다.',
        );
      } finally {
        setSendingSms(false);
      }
    } else {
      // 링크 생성 방식
      if (smsRecipientMode === 'customer' && selectedLeadId) {
                      // 본사로 여권 전송 링크 생성
                        const passportLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/passport-upload?leadId=${selectedLeadId}&partnerId=${partnerId}`;
        
        // 링크 복사만 수행
        try {
          if (typeof window !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(passportLink);
            showSuccess('여권 업로드 링크가 복사되었습니다.');
          } else {
            showError('링크 복사에 실패했습니다. 링크를 수동으로 복사해주세요.');
          }
          setShowSmsModal(false);
          setSmsMessage('');
          setCustomPhoneNumber('');
          setSmsRecipientMode('customer');
        } catch (error) {
          console.error('링크 복사 실패:', error);
          showError('링크 복사에 실패했습니다. 링크를 수동으로 복사해주세요.');
        }
      } else {
        // 직접 번호 입력 모드에서는 링크 생성 불가
        showError('링크 생성 방식은 고객 선택 모드에서만 사용할 수 있습니다.');
      }
    }
  };

  const handleRequestPassport = async () => {
    if (!selectedLeadId) return;
    if (!confirm('고객에게 여권 요청을 전송하시겠습니까?')) {
      return;
    }

    try {
      setRequestingPassport(true);
      const res = await fetch(`/api/admin/affiliate/leads/${selectedLeadId}/request-passport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: '여권 정보가 필요합니다.' }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = '여권 요청에 실패했습니다.';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = `서버 오류 (${res.status})`;
        }
        throw new Error(errorMessage);
      }

      const json = await res.json().catch(() => ({ ok: false }));
      if (!json.ok) {
        throw new Error(json.message || '여권 요청에 실패했습니다.');
      }

      showSuccess('여권 요청이 전송되었습니다. 본사 확인 후 여권 완료 처리가 됩니다.');
      await loadLeadDetail(selectedLeadId);
      fetchCustomers(currentPage);
    } catch (error) {
      console.error('handleRequestPassport error', error);
      showError(
        error instanceof Error ? error.message : '여권 요청 중 오류가 발생했습니다.',
      );
    } finally {
      setRequestingPassport(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLeadId) return;
    if (!confirm('정말로 이 고객을 삭제하시겠습니까? 삭제된 고객은 복구할 수 없으며, 판매원 고객관리에서도 자동으로 삭제됩니다.')) {
      return;
    }

    try {
      setDeletingLead(true);
      const res = await fetch(`/api/partner/customers/${selectedLeadId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '고객 삭제에 실패했습니다.');
      }

      showSuccess('고객이 삭제되었습니다.');
      closeDetail();
      fetchCustomers(currentPage);
    } catch (error) {
      console.error('handleDeleteLead error', error);
      showError(
        error instanceof Error ? error.message : '고객 삭제 중 오류가 발생했습니다.',
      );
    } finally {
      setDeletingLead(false);
    }
  };

  const handleConfirmSale = async (saleId: number) => {
    if (!selectedLeadId) return;
    if (!confirm('매출을 확정하시겠습니까? 확정된 매출은 수당 책정이 가능합니다.')) {
      return;
    }

    try {
      setConfirmingSale(saleId);
      const res = await fetch(`/api/partner/customers/${selectedLeadId}/sales/${saleId}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '매출 확정에 실패했습니다.');
      }

      showSuccess('매출이 확정되었습니다. 수당 책정이 가능합니다.');
      await loadLeadDetail(selectedLeadId);
      fetchCustomers(currentPage);
    } catch (error) {
      console.error('handleConfirmSale error', error);
      showError(
        error instanceof Error ? error.message : '매출 확정 중 오류가 발생했습니다.',
      );
    } finally {
      setConfirmingSale(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setInteractionForm((prev) => ({
      ...prev,
      files: [...prev.files, ...files],
    }));
  };

  const removeFile = (index: number) => {
    setInteractionForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  // 여권 만료 임박 체크 (6개월 이내)
  const checkPassportExpiry = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(now.getMonth() + 6);
    
    if (expiry <= sixMonthsLater) {
      return '임박';
    }
    return null;
  };

  const handleDownloadExcelSample = () => {
    const link = document.createElement('a');
    link.href = '/api/partner/customers/excel/sample';
    link.download = '고객_목록_샘플.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadExcel = async () => {
    if (!excelFile) {
      showError('엑셀 파일을 선택해주세요.');
      return;
    }

    // 파일 크기 확인 (10MB 제한)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (excelFile.size > maxSize) {
      showError(`파일 크기가 너무 큽니다. (최대 10MB, 현재: ${(excelFile.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }

    // 파일 형식 확인
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileName = excelFile.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      showError('엑셀 파일만 업로드 가능합니다. (.xlsx, .xls)');
      return;
    }

    setUploadingExcel(true);
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      if (excelAgentProfileId) {
        formData.append('agentProfileId', excelAgentProfileId);
      }

      console.log('[PartnerCustomersClient] Uploading Excel file:', {
        fileName: excelFile.name,
        fileSize: excelFile.size,
        fileType: excelFile.type,
        agentProfileId: excelAgentProfileId || 'none',
      });

      const res = await fetch('/api/partner/customers/excel/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      console.log('[PartnerCustomersClient] Upload response:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
      });

      // 응답이 JSON인지 확인
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[PartnerCustomersClient] Non-JSON response:', text);
        throw new Error('서버 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.');
      }

      const json = await res.json();
      console.log('[PartnerCustomersClient] Upload result:', json);

      if (!res.ok || !json?.ok) {
        const errorMessage = json?.message || `엑셀 업로드에 실패했습니다. (${res.status})`;
        throw new Error(errorMessage);
      }

      const { results } = json;
      const message = `처리 완료: 성공 ${results.success}건, 실패 ${results.failed}건${
        results.errors.length > 0 ? `\n\n실패 내역:\n${results.errors.slice(0, 10).join('\n')}${results.errors.length > 10 ? `\n... 외 ${results.errors.length - 10}건` : ''}` : ''
      }`;

      if (results.success > 0) {
        showSuccess(message);
        setShowExcelModal(false);
        setExcelFile(null);
        setExcelAgentProfileId('');
        setCurrentPage(1);
        fetchCustomers(1);
      } else {
        showError(message);
      }
    } catch (error) {
      console.error('[PartnerCustomersClient] handleUploadExcel error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 잠시 후 다시 시도해주세요.');
      } else {
        showError(
          error instanceof Error ? error.message : '엑셀 업로드 중 오류가 발생했습니다.'
        );
      }
    } finally {
      setUploadingExcel(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-10 md:px-6">
        <header className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
          <Link
            href={`/partner/${partnerId}/dashboard`}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm"
          >
            <FiArrowLeft /> 대시보드로 돌아가기
          </Link>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/80">Partner CRM</p>
                <h1 className="mt-2 text-3xl font-black leading-snug md:text-4xl">나의 고객 관리</h1>
              </div>
              <p className="max-w-2xl text-sm text-white/80 md:text-base">
                상담 기록과 다음 조치 일정을 관리하고, 고객이 어떤 파트너 링크를 통해 유입되었는지 추적하세요.
              </p>
              <div className="flex flex-wrap gap-3 text-xs md:text-sm">
                <StatusBadge
                  status={partner.type === 'BRANCH_MANAGER' ? 'MANAGER' : 'AGENT'}
                  options={[
                    {
                      value: 'MANAGER',
                      label: '대리점장',
                      theme: 'bg-amber-200/90 text-amber-900',
                    },
                    {
                      value: 'AGENT',
                      label: '판매원',
                      theme: 'bg-emerald-200/90 text-emerald-900',
                    },
                  ]}
                />
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90">
                  파트너 ID {partner.mallUserId}
                </span>
                {partner.branchLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90">
                    {partner.branchLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="rounded-3xl bg-white/15 p-6 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-widest text-white/70">고객 초대 링크</p>
              <div className="mt-4 space-y-3 text-sm">
                {/* 3일 체험 초대 링크 */}
                <TrialInviteLinkSection />
                {/* 파트너몰 링크 중복 제거: tracked, mall, landing이 모두 같으면 하나만 표시 */}
                {(() => {
                  const tracked = partner.shareLinks.tracked;
                  const mall = partner.shareLinks.mall;
                  const landing = partner.shareLinks.landing;
                  
                  // 모든 링크가 같은 경우
                  if (tracked === mall && mall === landing && landing) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const fullUrl = tracked.startsWith('http') 
                            ? tracked 
                            : `${window.location.origin}${tracked}`;
                          copyToClipboard(fullUrl);
                        }}
                        className="flex w-full items-center justify-between rounded-2xl bg-white/95 px-4 py-3 font-semibold text-blue-700 shadow hover:bg-white"
                      >
                        <span>파트너몰 링크</span>
                        <FiCopy />
                      </button>
                    );
                  }
                  
                  // tracked와 mall이 같고 landing이 다른 경우
                  if (tracked === mall) {
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const fullUrl = tracked.startsWith('http') 
                              ? tracked 
                              : `${window.location.origin}${tracked}`;
                            copyToClipboard(fullUrl);
                          }}
                          className="flex w-full items-center justify-between rounded-2xl bg-white/95 px-4 py-3 font-semibold text-blue-700 shadow hover:bg-white"
                        >
                          <span>파트너몰 링크</span>
                          <FiCopy />
                        </button>
                        {landing && landing !== tracked && (
                          <button
                            type="button"
                            onClick={() => {
                              const fullUrl = landing.startsWith('http') 
                                ? landing 
                                : `${window.location.origin}${landing}`;
                              copyToClipboard(fullUrl);
                            }}
                            className="flex w-full items-center justify-between rounded-2xl bg-white/80 px-4 py-3 font-semibold text-blue-700 shadow hover:bg-white"
                          >
                            <span>랜딩 페이지</span>
                            <FiCopy />
                          </button>
                        )}
                      </>
                    );
                  }
                  
                  // tracked와 landing이 같고 mall이 다른 경우
                  if (tracked === landing && landing) {
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const fullUrl = tracked.startsWith('http') 
                              ? tracked 
                              : `${window.location.origin}${tracked}`;
                            copyToClipboard(fullUrl);
                          }}
                          className="flex w-full items-center justify-between rounded-2xl bg-white/95 px-4 py-3 font-semibold text-blue-700 shadow hover:bg-white"
                        >
                          <span>파트너몰 링크</span>
                          <FiCopy />
                        </button>
                        {mall !== tracked && (
                          <button
                            type="button"
                            onClick={() => {
                              const fullUrl = mall.startsWith('http') 
                                ? mall 
                                : `${window.location.origin}${mall}`;
                              copyToClipboard(fullUrl);
                            }}
                            className="flex w-full items-center justify-between rounded-2xl bg-white/90 px-4 py-3 font-semibold text-blue-700 shadow hover:bg-white"
                          >
                            <span>파트너몰 기본 링크</span>
                            <FiCopy />
                          </button>
                        )}
                      </>
                    );
                  }
                  
                  // mall과 landing이 같고 tracked가 다른 경우
                  if (mall === landing && landing) {
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const fullUrl = tracked.startsWith('http') 
                              ? tracked 
                              : `${window.location.origin}${tracked}`;
                            copyToClipboard(fullUrl);
                          }}
                          className="flex w-full items-center justify-between rounded-2xl bg-white/95 px-4 py-3 font-semibold text-blue-700 shadow hover:bg-white"
                        >
                          <span>파트너몰 추적 링크</span>
                          <FiCopy />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const fullUrl = mall.startsWith('http') 
                              ? mall 
                              : `${window.location.origin}${mall}`;
                            copyToClipboard(fullUrl);
                          }}
                          className="flex w-full items-center justify-between rounded-2xl bg-white/90 px-4 py-3 font-semibold text-blue-700 shadow hover:bg-white"
                        >
                          <span>파트너몰 링크</span>
                          <FiCopy />
                        </button>
                      </>
                    );
                  }
                  
                  // 모두 다른 경우
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const fullUrl = tracked.startsWith('http') 
                            ? tracked 
                            : `${window.location.origin}${tracked}`;
                          copyToClipboard(fullUrl);
                        }}
                        className="flex w-full items-center justify-between rounded-2xl bg-white/95 px-4 py-3 font-semibold text-blue-700 shadow hover:bg-white"
                      >
                        <span>파트너몰 추적 링크</span>
                        <FiCopy />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const fullUrl = mall.startsWith('http') 
                            ? mall 
                            : `${window.location.origin}${mall}`;
                          copyToClipboard(fullUrl);
                        }}
                        className="flex w-full items-center justify-between rounded-2xl bg-white/90 px-4 py-3 font-semibold text-blue-700 shadow hover:bg-white"
                      >
                        <span>파트너몰 기본 링크</span>
                        <FiCopy />
                      </button>
                      {landing && (
                        <button
                          type="button"
                          onClick={() => {
                            const fullUrl = landing.startsWith('http') 
                              ? landing 
                              : `${window.location.origin}${landing}`;
                            copyToClipboard(fullUrl);
                          }}
                          className="flex w-full items-center justify-between rounded-2xl bg-white/80 px-4 py-3 font-semibold text-blue-700 shadow hover:bg-white"
                        >
                          <span>랜딩 페이지</span>
                          <FiCopy />
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-3xl bg-white/95 p-6 shadow-lg">
          {/* 탭 메뉴 */}
          <div className="mb-6 flex gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'customers'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              고객 관리
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'groups'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              그룹 관리
            </button>
          </div>

          {activeTab === 'customers' ? (
            <>
              {/* 판매원별 DB 관리 현황 (대리점장만) */}
              {partner.type === 'BRANCH_MANAGER' && (
                <div className="mb-6 rounded-2xl bg-white p-4 shadow-lg md:rounded-3xl md:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 md:text-xl flex items-center gap-2">
                      <FiUsers className="text-purple-600" />
                      판매원별 DB 관리 현황
                    </h2>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/partner/${partnerId}/customers`}
                        className="text-xs text-purple-600 hover:text-purple-700 md:text-sm font-semibold"
                      >
                        전체보기 <FiArrowRight className="inline ml-1" />
                      </Link>
                      <Link
                        href={`/partner/${partnerId}/customers/send-db`}
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
                            href={`/partner/${partnerId}/customers?agentId=${agent.agentId}`}
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
                </div>
              )}
              
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <form
              onSubmit={handleSearchSubmit}
              className="flex w-full max-w-lg items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
```
            <FiSearch className="text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="고객 이름 또는 연락처 검색"
              className="flex-1 border-none bg-transparent text-sm outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              검색
            </button>
          </form>
          <div className="flex items-center gap-3 text-sm">
            {partner.type === 'BRANCH_MANAGER' && partner.teamAgents.length > 0 && (
              <>
                <label className="text-slate-500">판매원</label>
                <select
                  value={selectedAgentFilter}
                  onChange={(event) => {
                    setSelectedAgentFilter(event.target.value);
                    const agentId = event.target.value;
                    if (agentId) {
                      router.push(`/partner/${partnerId}/customers?agentId=${agentId}`);
                    } else {
                      router.push(`/partner/${partnerId}/customers`);
                    }
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">전체 판매원</option>
                  <option value="unassigned">미할당 고객</option>
                  {partner.teamAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.displayName ?? '판매원'}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label className="text-slate-500">상태</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ALL">전체</option>
              {leadStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(true);
                  resetAddForm();
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
              >
                <FiPlus /> 새 고객 추가
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExcelModal(true);
                  setExcelFile(null);
                  setExcelAgentProfileId('');
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow hover:bg-blue-50"
              >
                <FiUpload /> 엑셀 업로드
              </button>
              {partner.type === 'BRANCH_MANAGER' && (
                <Link
                  href={`/partner/${partnerId}/customers/send-db`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700"
                >
                  <FiUsers /> DB 보내기
                </Link>
              )}
            </div>
        </div>

        {/* ?action=sms 파라미터가 있을 때 안내 메시지 */}
        {searchParams.get('action') === 'sms' && !selectedLeadId && (
          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 mb-6">
            <div className="flex items-start gap-3">
              <FiMessageSquare className="text-2xl text-emerald-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-900 text-base mb-2">📱 문자 보내기 모드</p>
                {customers.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-emerald-800">
                      등록된 고객이 없습니다. 먼저 고객을 추가한 후 문자를 보낼 수 있습니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(true);
                        resetAddForm();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition-colors"
                    >
                      <FiPlus /> 새 고객 추가 후 문자 보내기
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-800">
                    아래 고객 목록에서 "문자 보내기" 버튼을 클릭하거나, 고객을 선택한 후 상세 정보에서 "문자 보내기" 버튼을 클릭하세요.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 전화상담 신청 고객 섹션 */}
        {!loading && customers.length > 0 && (() => {
          const inquiryCustomers = customers.filter(c => 
            c.source?.startsWith('mall-') || c.source === 'product-inquiry'
          );
          const regularCustomers = customers.filter(c => 
            !c.source?.startsWith('mall-') && c.source !== 'product-inquiry'
          );

          return (
            <>
              {inquiryCustomers.length > 0 && (
                <div className="mb-8">
                  <h3 className="mb-4 text-xl font-bold text-slate-900 flex items-center gap-2">
                    <FiPhone className="text-blue-600" />
                    전화상담 신청 고객 ({inquiryCustomers.length}명)
                  </h3>
                  {inquiryCustomers.length >= 10 ? (
                    // 10명 이상일 때 테이블 형태로 표시
                    <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-blue-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                                고객
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                                신청 상품
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                                유입날짜
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                                상태
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                                작업
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {inquiryCustomers.map((customer) => {
                              const productCode = customer.metadata?.productCode || customer.metadata?.product_code;
                              const productName = customer.metadata?.productName || customer.metadata?.product_name;
                              const partnerId = customer.metadata?.mallUserId || customer.metadata?.affiliateMallUserId;
                              
                              return (
                                <tr key={customer.id} className="hover:bg-blue-50/50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm font-semibold text-slate-900">
                                          {customer.customerName ?? '이름 미입력'}
                                        </div>
                                        <CustomerStatusBadges
                                          testModeStartedAt={customer.testModeStartedAt}
                                          customerStatus={customer.customerStatus}
                                          mallUserId={customer.mallUserId}
                                        />
                                      </div>
                                      <div className="text-xs text-slate-600">
                                        {customer.customerPhone ?? '연락처 미입력'}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {productCode ? (
                                      <div>
                                        <div className="text-sm font-semibold text-slate-900">
                                          {productName || productCode}
                                        </div>
                                        <Link
                                          href={partnerId 
                                            ? `/products/${productCode}?partner=${encodeURIComponent(partnerId)}`
                                            : `/products/${productCode}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                          상품 보기 →
                                        </Link>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400">상품 정보 없음</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                    {formatDate(customer.createdAt)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge status={customer.status} options={leadStatusOptions} />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // 고객 ID 찾기 (customer.id는 AffiliateLead ID이므로 실제 User ID를 찾아야 함)
                                          const userId = (customer as any).userId || customer.id;
                                          setSelectedCustomerForNote({ id: userId, name: customer.customerName });
                                          setNoteModalOpen(true);
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors"
                                        title="고객 기록 작성"
                                      >
                                        <FiFileText size={14} />
                                        기록
                                      </button>
                                      {searchParams.get('action') === 'sms' && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await openDetail(customer.id);
                                            if (!selectedLead && customer.id) {
                                              await loadLeadDetail(customer.id);
                                            }
                                            setShowSmsModal(true);
                                          }}
                                          className="text-emerald-600 hover:text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded text-xs"
                                        >
                                          문자 보내기
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => openDetail(customer.id)}
                                        className="text-blue-600 hover:text-blue-700 font-semibold"
                                      >
                                        상세 보기 →
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    // 10명 미만일 때 카드 형태로 표시
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {inquiryCustomers.map((customer) => {
                        const productCode = customer.metadata?.productCode || customer.metadata?.product_code;
                        const productName = customer.metadata?.productName || customer.metadata?.product_name;
                        const partnerId = customer.metadata?.mallUserId || customer.metadata?.affiliateMallUserId;
                        
                        return (
                          <div key={customer.id} className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-5 hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-slate-900">
                                    {customer.customerName ?? '이름 미입력'}
                                  </h4>
                                  <CustomerStatusBadges
                                    testModeStartedAt={customer.testModeStartedAt}
                                    customerStatus={customer.customerStatus}
                                    mallUserId={customer.mallUserId}
                                  />
                                </div>
                                <p className="text-sm text-slate-600 mb-2">
                                  {customer.customerPhone ?? '연락처 미입력'}
                                </p>
                                {productCode && (
                                  <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                                    <p className="text-xs font-semibold text-slate-500 mb-1">신청 상품</p>
                                    <p className="text-sm font-semibold text-slate-900 mb-2">
                                      {productName || productCode}
                                    </p>
                                    <Link
                                      href={partnerId 
                                        ? `/products/${productCode}?partner=${encodeURIComponent(partnerId)}`
                                        : `/products/${productCode}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                      상품 보기 →
                                    </Link>
                                  </div>
                                )}
                              </div>
                              <StatusBadge status={customer.status} options={leadStatusOptions} />
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-200">
                              <span className="text-xs text-slate-500">
                                {formatDate(customer.createdAt)}
                              </span>
                              <div className="flex items-center gap-2">
                                {searchParams.get('action') === 'sms' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await openDetail(customer.id);
                                      if (!selectedLead && customer.id) {
                                        await loadLeadDetail(customer.id);
                                      }
                                      setShowSmsModal(true);
                                    }}
                                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded"
                                  >
                                    문자 보내기
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openDetail(customer.id)}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                >
                                  상세 보기 →
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 일반 고객 목록 */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          고객
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          유입날짜
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          상태
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          상담 일정
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          판매 현황
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          소유
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                            데이터를 불러오는 중입니다...
                          </td>
                        </tr>
                      ) : regularCustomers.length === 0 && inquiryCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                            등록된 고객이 없습니다. &ldquo;새 고객 추가&rdquo; 버튼으로 고객을 등록해 주세요.
                          </td>
                        </tr>
                      ) : regularCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                            일반 고객이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        regularCustomers.map((customer) => {
                    // 구매 완료 자동 표시: 나의 구매몰에서 구매한 경우
                    const hasPurchase = customer.sales.some((sale) => sale.status === 'CONFIRMED' || sale.status === 'PENDING');
                    const displayStatus = hasPurchase && customer.status !== 'PURCHASED' ? 'PURCHASED' : customer.status;
                    
                    return (
                      <tr key={customer.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-900">
                              {customer.customerName ?? '이름 미입력'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {customer.customerPhone ?? '연락처 미입력'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(customer.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <StatusBadge status={displayStatus} options={leadStatusOptions} />
                          {hasPurchase && customer.status !== 'PURCHASED' && (
                            <span className="ml-2 text-xs text-emerald-600 font-semibold">(구매완료)</span>
                          )}
                        </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex flex-col gap-1">
                          <span>최근 상담: {formatDateTime(customer.lastContactedAt)}</span>
                          <span className="text-xs text-slate-500">
                            다음 조치: {formatDate(customer.nextActionAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex flex-col gap-1">
                          <span>총 {customer.saleSummary.totalSalesCount}건</span>
                          <span className="text-xs text-slate-500">
                            매출 {formatCurrency(customer.saleSummary.totalSalesAmount)}원
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex flex-col gap-1">
                          <span>
                            {customer.ownership === 'AGENT'
                              ? '내 고객'
                              : customer.ownership === 'MANAGER'
                              ? '대리점 고객'
                              : '협업 고객'}
                          </span>
                          {customer.agent && customer.ownership === 'MANAGER' && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                담당: {customer.agent.displayName ?? '판매원'}
                              </span>
                              {partner.type === 'BRANCH_MANAGER' && (
                                <button
                                  type="button"
                                  onClick={() => handleRecallDb([customer.id])}
                                  className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
                                  title="DB 회수"
                                >
                                  회수
                                </button>
                              )}
                            </div>
                          )}
                          {customer.counterpart?.label && !customer.agent && (
                            <span className="text-xs text-slate-500">
                              담당: {customer.counterpart.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex items-center gap-2 justify-end">
                          {searchParams.get('action') === 'sms' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await openDetail(customer.id);
                                if (!selectedLead && customer.id) {
                                  await loadLeadDetail(customer.id);
                                }
                                setShowSmsModal(true);
                              }}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-100"
                            >
                              문자 보내기
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openDetail(customer.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 font-semibold text-blue-600 hover:bg-blue-100"
                          >
                            상세 보기
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
            </>
          );
        })()}

        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            총 {pagination.total.toLocaleString()}명 · {pagination.page} /{' '}
            {pagination.totalPages} 페이지
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-600 disabled:opacity-30"
            >
              <FiChevronLeft /> 이전
            </button>
            <button
              type="button"
              disabled={currentPage >= pagination.totalPages || loading}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-600 disabled:opacity-30"
            >
              다음 <FiChevronRight />
            </button>
          </div>
        </div>
            </>
          ) : (
            // 그룹 관리 탭
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">고객 그룹 관리</h3>
                {/* 판매원/대리점장 모두 그룹 추가 가능 */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingGroup(null);
                    setGroupForm({ name: '', description: '', productCode: '', color: '#3B82F6' });
                    setShowGroupModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                >
                  <FiPlus /> 그룹 추가
                </button>
              </div>

              {customerGroups.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
                  <p className="text-slate-500">등록된 그룹이 없습니다. 그룹을 추가하여 고객을 관리하세요.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {customerGroups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-xl border-2 border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: group.color || '#3B82F6' }}
                          />
                          <h4 className="font-bold text-slate-900">{group.name}</h4>
                        </div>
                        {/* 판매원/대리점장 모두 그룹 편집/삭제 가능 */}
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroup(group.id);
                              const metadata = (group as any).metadata || {};
                              setGroupForm({
                                name: group.name,
                                description: group.description || '',
                                productCode: metadata.productCode || group.productCode || '',
                                color: group.color || '#3B82F6',
                              });
                              setShowGroupModal(true);
                            }}
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                          >
                            <FiSettings className="text-sm" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`"${group.name}" 그룹을 삭제하시겠습니까? 그룹에 속한 고객은 그룹만 해제되고 고객은 삭제되지 않습니다.`)) return;
                              try {
                                const res = await fetch(`/api/partner/customer-groups/${group.id}`, {
                                  method: 'DELETE',
                                  credentials: 'include',
                                });
                                const json = await res.json();
                                if (!res.ok || !json?.ok) {
                                  throw new Error(json?.message || '그룹 삭제에 실패했습니다.');
                                }
                                showSuccess('그룹이 삭제되었습니다. 그룹에 속한 고객은 그룹만 해제되었습니다.');
                                loadCustomerGroups();
                              } catch (error) {
                                showError(error instanceof Error ? error.message : '그룹 삭제에 실패했습니다.');
                              }
                            }}
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </div>
                      {group.description && (
                        <p className="text-xs text-slate-600 mb-2">{group.description}</p>
                      )}
                      {group.productCode && (
                        <p className="text-xs text-slate-500 mb-2">상품: {group.productCode}</p>
                      )}
                      <p className="text-sm font-semibold text-slate-700 mb-3">
                        고객 수: {group.leadCount}명
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFunnelSettingsGroup(group);
                          loadFunnelLists();
                          setFunnelForm({
                            funnelTalkIds: Array.isArray((group as any).funnelTalkIds) ? (group as any).funnelTalkIds : [],
                            funnelSmsIds: Array.isArray((group as any).funnelSmsIds) ? (group as any).funnelSmsIds : [],
                            funnelEmailIds: Array.isArray((group as any).funnelEmailIds) ? (group as any).funnelEmailIds : [],
                            reEntryHandling: (group as any).reEntryHandling || 'time_change_info_change',
                          });
                          setShowFunnelModal(true);
                        }}
                        className="w-full px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-semibold"
                      >
                        퍼널 추가
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </section>

      <section className="rounded-3xl bg-white/95 p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">파트너 관리 요약</h2>
        <p className="mt-2 text-sm text-slate-500">
          고객 관리 도구에서 상담 메모와 판매 현황을 확인하고, 파트너몰 링크를 공유해 고객을 추적하세요.
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <FiUsers className="text-xl" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">내 파트너 정보</p>
                <p className="text-xs text-slate-500">파트너몰 링크와 담당자를 확인하세요.</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="grid grid-cols-3 gap-2">
                <dt className="font-semibold text-slate-500">파트너몰</dt>
                <dd className="col-span-2 break-all text-blue-600">
                  {/* 판매원인 경우 대리점장의 파트너몰 링크 표시, 대리점장인 경우 본인의 파트너몰 링크 표시 */}
                  {partner.type === 'SALES_AGENT' && partner.manager?.mallUserId
                    ? `/${partner.manager.mallUserId}/shop`
                    : partner.shareLinks.mall}
                </dd>
              </div>
              {partner.manager ? (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="font-semibold text-slate-500">담당 대리점장</dt>
                  <dd className="col-span-2">{partner.manager.label ?? '정보 없음'}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          {partner.type === 'BRANCH_MANAGER' && partner.teamAgents.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                  <FiUsers className="text-xl" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">내 판매원 목록</p>
                  <p className="text-xs text-slate-500">판매원들의 판매몰 링크를 확인하세요.</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {partner.teamAgents.map((agent) => (
                  <div key={agent.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {agent.displayName ?? '판매원'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {agent.affiliateCode ?? '코드 없음'}
                      </span>
                    </div>
                    {agent.mallUserId ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/products/${agent.mallUserId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline break-all flex-1"
                        >
                          /products/{agent.mallUserId}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            const fullUrl = typeof window !== 'undefined' 
                              ? `${window.location.origin}/products/${agent.mallUserId}`
                              : `/products/${agent.mallUserId}`;
                            copyToClipboard(fullUrl);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <FiCopy className="text-xs" />
                          복사
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">판매몰 링크 미발급</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">고객 관리 팁</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="rounded-xl bg-slate-100 px-4 py-3">
                상담 기록에 메모를 남기면 다음 조치 일정을 자동으로 관리할 수 있습니다.
              </li>
              <li className="rounded-xl bg-slate-100 px-4 py-3">
                파트너몰 링크를 공유하면 어떤 파트너가 판매를 이끌었는지 추적됩니다.
              </li>
              <li className="rounded-xl bg-slate-100 px-4 py-3">
                확정된 판매는 정산 대시보드와 연동되어 수당 계산에 반영됩니다.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    {isAddModalOpen ? (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 backdrop-blur px-4">
        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">새 고객 추가</h3>
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                resetAddForm();
              }}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            >
              <FiX />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500">이름</label>
              <input
                value={addForm.customerName}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, customerName: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="고객 이름"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">연락처</label>
              <input
                value={addForm.customerPhone}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, customerPhone: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="010-0000-0000"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-500">상태</label>
                <select
                  value={addForm.status}
                  onChange={(event) =>
                    setAddForm((prev) => ({ ...prev, status: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {statusSelectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">유입날짜</label>
                <input
                  type="date"
                  value={addForm.createdAt || ''}
                  onChange={(event) =>
                    setAddForm((prev) => ({ ...prev, createdAt: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                다음 조치 예정일
                {notificationPermission === 'granted' && (
                  <FiBell className="text-blue-500" title="알람이 설정됩니다" />
                )}
                {notificationPermission !== 'granted' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if ('Notification' in window) {
                        const permission = await Notification.requestPermission();
                        setNotificationPermission(permission);
                        if (permission === 'granted') {
                          showSuccess('알림 권한이 허용되었습니다.');
                        } else {
                          showError('알림 권한이 필요합니다.');
                        }
                      }
                    }}
                    className="text-blue-500 hover:text-blue-700"
                    title="알림 권한 요청"
                  >
                    <FiBell />
                  </button>
                )}
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="date"
                  value={addForm.nextActionAt ? addForm.nextActionAt.split('T')[0] : ''}
                  onChange={(event) => {
                    const dateValue = event.target.value;
                    const timeValue = addForm.nextActionAt 
                      ? new Date(addForm.nextActionAt).toTimeString().slice(0, 5)
                      : '09:00';
                    setAddForm((prev) => ({
                      ...prev,
                      nextActionAt: dateValue ? `${dateValue}T${timeValue}` : '',
                    }));
                  }}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="time"
                  value={addForm.nextActionAt 
                    ? new Date(addForm.nextActionAt).toTimeString().slice(0, 5)
                    : ''}
                  onChange={(event) => {
                    const timeValue = event.target.value;
                    const dateValue = addForm.nextActionAt 
                      ? addForm.nextActionAt.split('T')[0]
                      : new Date().toISOString().split('T')[0];
                    setAddForm((prev) => ({
                      ...prev,
                      nextActionAt: dateValue && timeValue ? `${dateValue}T${timeValue}` : prev.nextActionAt,
                    }));
                  }}
                  className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                다음 조치 예정일을 설정하면 알람이 자동으로 설정됩니다.
              </p>
            </div>
            {partner.type === 'BRANCH_MANAGER' ? (
              <div>
                <label className="text-xs font-semibold text-slate-500">담당 판매원 배정 (선택)</label>
                <select
                  value={addForm.agentProfileId}
                  onChange={(event) =>
                    setAddForm((prev) => ({ ...prev, agentProfileId: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">대리점장이 직접 관리</option>
                  {partner.teamAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.displayName ?? '판매원'} ({agent.affiliateCode ?? '코드 없음'})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="text-xs font-semibold text-slate-500">메모</label>
              <textarea
                value={addForm.notes}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="상담 메모를 입력하세요."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                resetAddForm();
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              취소
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={handleCreateCustomer}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:bg-blue-300"
            >
              {creating ? '저장 중...' : '고객 추가'}
            </button>
          </div>
        </div>
      </div>
    ) : null}

    {/* 엑셀 업로드 모달 */}
    {showExcelModal ? (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 backdrop-blur px-4">
        <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">엑셀 파일로 고객 일괄 등록</h3>
            <button
              type="button"
              onClick={() => {
                setShowExcelModal(false);
                setExcelFile(null);
                setExcelAgentProfileId('');
              }}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            >
              <FiX />
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">📋 엑셀 파일 형식</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>첫 번째 행은 헤더(컬럼명)입니다</li>
                <li>필수 컬럼: <strong>이름</strong>, <strong>연락처</strong></li>
                <li>컬럼명은 "이름", "연락처" 또는 "name", "phone" 등으로 작성 가능합니다</li>
                <li>샘플 파일을 다운로드하여 형식을 확인하세요</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDownloadExcelSample}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FiFileText /> 샘플 다운로드
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">엑셀 파일 선택</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              {excelFile && (
                <p className="mt-2 text-xs text-slate-600">선택된 파일: {excelFile.name}</p>
              )}
            </div>

            {partner.type === 'BRANCH_MANAGER' && (
              <div>
                <label className="text-xs font-semibold text-slate-500">담당 판매원 배정 (선택)</label>
                <select
                  value={excelAgentProfileId}
                  onChange={(e) => setExcelAgentProfileId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">대리점장이 직접 관리</option>
                  {partner.teamAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.displayName ?? '판매원'} ({agent.affiliateCode ?? '코드 없음'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowExcelModal(false);
                setExcelFile(null);
                setExcelAgentProfileId('');
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!excelFile || uploadingExcel}
              onClick={handleUploadExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:bg-blue-300"
            >
              {uploadingExcel ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <FiUpload /> 업로드
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    ) : null}

    {selectedLeadId ? (
      <div className="fixed inset-0 z-[998] flex justify-end bg-slate-900/30 backdrop-blur">
        <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
          {/* 고정 헤더 */}
          <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-10">
            <div>
              <button
                type="button"
                onClick={closeDetail}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                <FiArrowLeft /> 목록으로
              </button>
              <h3 className="mt-2 text-xl font-bold text-slate-900">
                {selectedLead?.customerName ?? '이름 미입력'}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {selectedLead ? (
                <StatusBadge status={selectedLead.status} options={leadStatusOptions} />
              ) : null}
              {/* 판매원은 고객 삭제 기능 제거: 대리점장만 삭제 가능 */}
              {selectedLead && 
                partner.type === 'BRANCH_MANAGER' && 
                selectedLead.ownership === 'MANAGER' && 
                !isContractTerminated && (
                <button
                  type="button"
                  onClick={handleDeleteLead}
                  disabled={deletingLead}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <FiTrash2 />
                  {deletingLead ? '삭제 중...' : '고객 삭제'}
                </button>
              )}
            </div>
          </div>

          {/* 스크롤 가능한 본문 */}
          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
            {detailLoading || !selectedLead ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                데이터를 불러오는 중입니다...
              </div>
            ) : (
              <div className="space-y-6 pb-6">
                {/* 전화상담 신청 상품 정보 */}
                {selectedLead.source?.startsWith('mall-') || selectedLead.source === 'product-inquiry' ? (
                  (() => {
                    const productCode = selectedLead.metadata?.productCode || selectedLead.metadata?.product_code;
                    const productName = selectedLead.metadata?.productName || selectedLead.metadata?.product_name;
                    const partnerId = selectedLead.metadata?.mallUserId || selectedLead.metadata?.affiliateMallUserId;
                    
                    if (productCode) {
                      return (
                        <div className="rounded-3xl border-2 border-blue-200 bg-blue-50/70 p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <FiPhone className="text-blue-600" />
                            <h4 className="font-bold text-slate-900">전화상담 신청 상품</h4>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1">상품명</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {productName || productCode}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1">상품 코드</p>
                              <p className="text-sm text-slate-700 font-mono">
                                {productCode}
                              </p>
                            </div>
                            <div className="pt-2">
                              <Link
                                href={partnerId 
                                  ? `/products/${productCode}?partner=${encodeURIComponent(partnerId)}`
                                  : `/products/${productCode}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                              >
                                상품 상세 보기 →
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()
                ) : null}
                
                {/* 기본 정보 및 설정 섹션 */}
                <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 mb-6 shadow-sm">
                  <h4 className="text-base font-bold text-slate-900 mb-5 pb-3 border-b border-slate-200">기본 정보</h4>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">연락처</label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-2 rounded-lg flex-1">{selectedLead.customerPhone ?? '연락처 미입력'}</span>
                          {selectedLead.customerPhone ? (
                            <a
                              href={`tel:${selectedLead.customerPhone.replace(/[^0-9]/g, '')}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              <FiPhone /> 전화걸기
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">다음 조치</label>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                          <FiCalendar className="text-slate-500" />
                          <span className="text-sm font-medium text-slate-900">{formatDate(selectedLead.nextActionAt)}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">메모</label>
                        <textarea
                          defaultValue={selectedLead.notes ?? ''}
                          onBlur={(event) =>
                            handleUpdateLead({ notes: event.target.value })
                          }
                          rows={4}
                          className="w-full rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          placeholder="고객 메모를 입력하세요."
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">상태 변경</label>
                        <select
                          value={selectedLead.status}
                          disabled={updatingLead}
                          onChange={(event) =>
                            handleUpdateLead({ status: event.target.value })
                          }
                          className="w-full rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
                        >
                          {leadStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {partner.type === 'BRANCH_MANAGER' ? (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-2">담당 판매원</label>
                          <select
                            value={selectedLead.agent?.id ?? ''}
                            disabled={updatingLead}
                            onChange={(event) =>
                              handleUpdateLead({
                                agentProfileId: event.target.value || null,
                              })
                            }
                            className="w-full rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
                          >
                            <option value="">대리점장이 직접 관리</option>
                            {partner.teamAgents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.displayName ?? '판매원'} (
                                {agent.affiliateCode ?? '코드 없음'})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-2">담당 대리점장</label>
                          <div className="bg-slate-50 px-3 py-2.5 rounded-lg">
                            <p className="text-sm font-medium text-slate-900">
                              {selectedLead.manager?.displayName ?? '정보 없음'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 그룹 관리 섹션 */}
                  <div className="mt-6 pt-6 border-t-2 border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-slate-700">고객 그룹</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedLead.groupId || ''}
                        onChange={async (e) => {
                          const newGroupId = e.target.value === '' ? null : parseInt(e.target.value);
                          try {
                            const res = await fetch(`/api/partner/customers/${selectedLeadId}/move-group`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ groupId: newGroupId }),
                            });
                            const json = await res.json();
                            if (!res.ok || !json?.ok) {
                              throw new Error(json?.message || '그룹 이동에 실패했습니다.');
                            }
                            showSuccess('그룹이 변경되었습니다.');
                            await loadLeadDetail(selectedLeadId);
                            loadCustomerGroups();
                          } catch (error) {
                            showError(error instanceof Error ? error.message : '그룹 이동에 실패했습니다.');
                          }
                        }}
                        className="flex-1 rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="">그룹 없음</option>
                        {customerGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name} ({group.leadCount}명)
                          </option>
                        ))}
                      </select>
                      {/* 판매원/대리점장 모두 그룹 생성 가능 */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('groups');
                          setEditingGroup(null);
                          setGroupForm({ name: '', description: '', productCode: '', color: '#3B82F6' });
                          setShowGroupModal(true);
                        }}
                        className="rounded-xl border-2 border-blue-500 bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <FiPlus /> 새 그룹
                      </button>
                    </div>
                  </div>
                  
                  {/* 여권 관리 섹션 */}
                  <div className="mt-6 pt-6 border-t-2 border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-xs font-bold text-slate-700">여권 상태</label>
                      {selectedLead.passportCompletedAt ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            <FiCheckCircle /> 여권 완료
                          </span>
                          {selectedLead.passportRequestedAt && (
                            <button
                              type="button"
                              onClick={() => setShowPassportModal(true)}
                              disabled={requestingPassport}
                              className="inline-flex items-center gap-1 rounded-xl border-2 border-blue-500 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              <FiFileText /> 여권 재요청
                            </button>
                          )}
                        </div>
                      ) : selectedLead.passportRequestedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1.5 text-xs font-bold text-yellow-700 border border-yellow-200">
                          <FiClock /> 요청됨 (본사 확인 대기중)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPassportModal(true)}
                          disabled={requestingPassport}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                        >
                          <FiFileText />
                          {requestingPassport ? '전송 중...' : '여권 보내기'}
                        </button>
                      )}
                    </div>
                    
                    {/* 문자 보내기 버튼 */}
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedLead && selectedLeadId) {
                            await loadLeadDetail(selectedLeadId);
                          }
                          setShowSmsModal(true);
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 transition-colors"
                      >
                        <FiMessageSquare />
                        문자 보내기
                      </button>
                    </div>
                  </div>
                </div>

                {/* 상담 기록 섹션 */}
                <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 mb-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
                    <h4 className="text-base font-bold text-slate-900">상담 기록</h4>
                    <button
                      type="button"
                      onClick={() => loadLeadDetail(selectedLeadId)}
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <FiRefreshCw /> 새로고침
                    </button>
                  </div>
                  <div className="space-y-6">
                    {/* 상담 기록 입력 폼 - 스크롤 가능하도록 개선 */}
                    <div className="space-y-4 min-w-0 flex flex-col bg-slate-50 rounded-xl p-5 border-2 border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">상담 내용</label>
                        <textarea
                          value={interactionForm.note}
                          onChange={(event) =>
                            setInteractionForm((prev) => ({ ...prev, note: event.target.value }))
                          }
                          rows={4}
                          placeholder="상담 내용을 입력하세요."
                          className="w-full rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-2">상담 일시</label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={interactionForm.occurredAt ? interactionForm.occurredAt.split('T')[0] : ''}
                              onChange={(event) => {
                                const dateValue = event.target.value;
                                const timeValue = interactionForm.occurredAt 
                                  ? new Date(interactionForm.occurredAt).toTimeString().slice(0, 5)
                                  : new Date().toTimeString().slice(0, 5);
                                setInteractionForm((prev) => ({
                                  ...prev,
                                  occurredAt: dateValue ? `${dateValue}T${timeValue}` : '',
                                }));
                              }}
                              className="flex-1 rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                            <input
                              type="time"
                              value={interactionForm.occurredAt 
                                ? new Date(interactionForm.occurredAt).toTimeString().slice(0, 5)
                                : ''}
                              onChange={(event) => {
                                const timeValue = event.target.value;
                                const dateValue = interactionForm.occurredAt 
                                  ? interactionForm.occurredAt.split('T')[0]
                                  : new Date().toISOString().split('T')[0];
                                setInteractionForm((prev) => ({
                                  ...prev,
                                  occurredAt: dateValue && timeValue ? `${dateValue}T${timeValue}` : prev.occurredAt,
                                }));
                              }}
                              className="w-32 rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                            다음 조치
                            {notificationPermission === 'granted' && (
                              <FiBell className="text-blue-500" title="알람이 설정됩니다" />
                            )}
                            {notificationPermission !== 'granted' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if ('Notification' in window) {
                                    const permission = await Notification.requestPermission();
                                    setNotificationPermission(permission);
                                    if (permission === 'granted') {
                                      showSuccess('알림 권한이 허용되었습니다.');
                                    } else {
                                      showError('알림 권한이 필요합니다.');
                                    }
                                  }
                                }}
                                className="text-blue-500 hover:text-blue-700"
                                title="알림 권한 요청"
                              >
                                <FiBell />
                              </button>
                            )}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={interactionForm.nextActionAt ? interactionForm.nextActionAt.split('T')[0] : ''}
                              onChange={(event) => {
                                const dateValue = event.target.value;
                                const timeValue = interactionForm.nextActionAt 
                                  ? new Date(interactionForm.nextActionAt).toTimeString().slice(0, 5)
                                  : '09:00';
                                setInteractionForm((prev) => ({
                                  ...prev,
                                  nextActionAt: dateValue ? `${dateValue}T${timeValue}` : '',
                                }));
                              }}
                              className="flex-1 rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                            <input
                              type="time"
                              value={interactionForm.nextActionAt 
                                ? new Date(interactionForm.nextActionAt).toTimeString().slice(0, 5)
                                : ''}
                              onChange={(event) => {
                                const timeValue = event.target.value;
                                const dateValue = interactionForm.nextActionAt 
                                  ? interactionForm.nextActionAt.split('T')[0]
                                  : new Date().toISOString().split('T')[0];
                                setInteractionForm((prev) => ({
                                  ...prev,
                                  nextActionAt: dateValue && timeValue ? `${dateValue}T${timeValue}` : prev.nextActionAt,
                                }));
                              }}
                              className="w-32 rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">상담 후 상태</label>
                        <select
                          value={interactionForm.status}
                          onChange={(event) =>
                            setInteractionForm((prev) => ({
                              ...prev,
                              status: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          {statusSelectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">기록/녹음 파일 업로드</label>
                        <input
                          type="file"
                          multiple
                          accept="audio/*,video/*,image/*"
                          onChange={handleFileChange}
                          className="w-full rounded-xl border-2 border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                        {interactionForm.files.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {interactionForm.files.map((file, index) => (
                              <div key={index} className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-xs border border-slate-200">
                                <span className="flex items-center gap-2">
                                  <FiMic className="text-blue-500" />
                                  <span className="font-medium">{file.name}</span>
                                  <span className="text-slate-500">({(file.size / 1024).toFixed(1)}KB)</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="text-red-600 hover:text-red-800 font-bold"
                                >
                                  <FiX />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddInteraction}
                        disabled={interactionSaving}
                        className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                      >
                        {interactionSaving ? '저장 중...' : '상담 기록 추가'}
                      </button>
                    </div>
                    {/* Empty state helper */}
                    {selectedLead.interactions.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                        <div className="font-semibold text-slate-800">등록된 상담 기록이 없습니다</div>
                        <p className="mt-1 text-xs text-slate-500">
                          위의 입력 폼에서 상담 기록을 저장하면 아래에서 타임라인 형식으로 확인할 수 있습니다.
                        </p>
                      </div>
                    )}

                    {/* 채팅 형식 상담 기록 */}
                    <div className="space-y-4">
                      {selectedLead.interactions.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                          상담 기록이 추가되면 이 영역에서 진행 상황을 확인할 수 있습니다.
                        </div>
                      ) : (
                        (() => {
                          const groupedInteractions = groupInteractionsByDate(selectedLead.interactions);
                          return groupedInteractions.map((group) => (
                            <div key={group.date} className="space-y-3">
                              <div className="flex items-center justify-center my-4">
                                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm">
                                  <FiCalendar className="text-xs text-slate-400" />
                                  <span className="text-xs font-semibold text-slate-600">
                                    {formatChatDate(group.date)}
                                  </span>
                                </div>
                              </div>

                              {group.interactions.map((interaction) => {
                                const isMyRecord =
                                  selectedLead &&
                                  ((selectedLead.ownership === 'AGENT' && interaction.profileId === selectedLead.agent?.id) ||
                                    (selectedLead.ownership === 'MANAGER' && interaction.profileId === selectedLead.manager?.id));

                                return (
                                  <div key={interaction.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                      <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                        <FiUser className="text-slate-400" />
                                        <span>{interaction.createdBy?.name || '알 수 없음'}</span>
                                        <span
                                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                                            selectedLead.ownership === 'AGENT' && interaction.profileId === selectedLead.agent?.id
                                              ? 'bg-blue-100 text-blue-700'
                                              : selectedLead.ownership === 'MANAGER' && interaction.profileId === selectedLead.manager?.id
                                              ? 'bg-purple-100 text-purple-700'
                                              : 'bg-gray-100 text-gray-600'
                                          }`}
                                        >
                                          {selectedLead.ownership === 'AGENT' && interaction.profileId === selectedLead.agent?.id
                                            ? '판매원'
                                            : selectedLead.ownership === 'MANAGER' && interaction.profileId === selectedLead.manager?.id
                                            ? '대리점장'
                                            : '기타'}
                                        </span>
                                      </div>
                                      <span className="text-[10px]">{formatTime(interaction.occurredAt)}</span>
                                    </div>

                                    <div
                                      className={`rounded-xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed ${
                                        isMyRecord
                                          ? selectedLead.ownership === 'AGENT'
                                            ? 'bg-blue-50 border border-blue-200 text-blue-900'
                                            : 'bg-purple-50 border border-purple-200 text-purple-900'
                                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <div className="text-xs font-semibold mb-2 opacity-70">{interaction.interactionType}</div>
                                      <p>{interaction.note ?? '메모 없음'}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ));
                        })()
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    ) : null}

    {/* 문자 보내기 모달 */}
    {showSmsModal && (
      <div 
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSmsModal(false);
            setSmsMessage('');
            setCustomPhoneNumber('');
            setSmsRecipientMode('customer');
          }
        }}
      >
        <div 
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <h3 className="text-xl font-bold text-gray-900">문자 보내기</h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSmsModal(false);
                setSmsMessage('');
                setCustomPhoneNumber('');
                setSmsRecipientMode('customer');
              }}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          {/* 내용 */}
          <div className="px-6 py-6 space-y-6">
            {/* 수신자 선택 모드 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                수신자 선택
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSmsRecipientMode('customer');
                    setCustomPhoneNumber('');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    smsRecipientMode === 'customer'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FiUser className="text-lg" />
                    <span className="font-semibold">고객 선택</span>
                  </div>
                  <p className="text-xs text-gray-600">고객 목록에서 선택</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSmsRecipientMode('custom');
                    if (selectedLeadId) {
                      // 고객 선택 모드에서 직접 번호 모드로 전환 시 고객 번호를 기본값으로 설정
                      if (selectedLead?.customerPhone) {
                        setCustomPhoneNumber(selectedLead.customerPhone.replace(/[^0-9]/g, ''));
                      }
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    smsRecipientMode === 'custom'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FiPhone className="text-lg" />
                    <span className="font-semibold">직접 번호 입력</span>
                  </div>
                  <p className="text-xs text-gray-600">번호를 직접 입력</p>
                </button>
              </div>
            </div>

            {/* 고객 정보 또는 직접 번호 입력 */}
            {smsRecipientMode === 'customer' ? (
              selectedLead ? (
                <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">📋 보낼 고객 정보</p>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p><span className="font-semibold">고객명:</span> {selectedLead.customerName || '이름 없음'}</p>
                    <p><span className="font-semibold">전화번호:</span> {selectedLead.customerPhone || '전화번호 없음'}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-yellow-50 p-4 border border-yellow-200">
                  <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ 고객을 선택해주세요</p>
                  <p className="text-xs text-yellow-800">고객 목록에서 고객을 선택한 후 문자를 보내주세요.</p>
                </div>
              )
            ) : (
              <div className="rounded-xl bg-purple-50 p-4 border border-purple-200">
                <label className="block text-sm font-semibold text-purple-900 mb-2">
                  📱 전화번호 입력 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={customPhoneNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9]/g, '');
                    setCustomPhoneNumber(cleaned);
                  }}
                  placeholder="01012345678 (하이픈 없이 숫자만 입력)"
                  className="w-full rounded-lg border border-purple-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
                <p className="mt-1 text-xs text-purple-700">하이픈 없이 숫자만 입력해주세요 (예: 01012345678)</p>
              </div>
            )}

            {/* 발송 방식 선택 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                발송 방식 선택
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSmsMethod('aligo')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    smsMethod === 'aligo'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FiSettings className="text-lg" />
                    <span className="font-semibold">알리고 API</span>
                  </div>
                  <p className="text-xs text-gray-600">API 키 입력 후 자동 발송</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSmsMethod('link')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    smsMethod === 'link'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FiLink className="text-lg" />
                    <span className="font-semibold">링크 생성</span>
                  </div>
                  <p className="text-xs text-gray-600">링크 복사 후 직접 발송</p>
                </button>
              </div>
            </div>

            {/* 알리고 API 설정 */}
            {smsMethod === 'aligo' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-gray-900">⚙️ 알리고 API 설정</h4>
                  <button
                    type="button"
                    onClick={() => setShowAligoGuide(!showAligoGuide)}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <FiHelpCircle />
                    {showAligoGuide ? '가이드 숨기기' : '연결 가이드 보기'}
                  </button>
                </div>

                {/* 알리고 연결 가이드 */}
                {showAligoGuide && (
                  <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <FiInfo className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-3 text-sm text-blue-900">
                        <p className="font-bold text-base">📱 알리고 문자 서비스 연결 가이드</p>
                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold mb-1">1️⃣ 알리고 회원가입</p>
                            <p className="text-xs text-blue-800">• 알리고 홈페이지 (https://www.aligo.in) 접속</p>
                            <p className="text-xs text-blue-800">• 회원가입 후 로그인</p>
                          </div>
                          <div>
                            <p className="font-semibold mb-1">2️⃣ 발신번호 등록</p>
                            <p className="text-xs text-blue-800">• 알리고 관리자 페이지 → 발신번호 관리</p>
                            <p className="text-xs text-blue-800">• 본인 명의 전화번호 등록 (인증 필요)</p>
                            <p className="text-xs text-blue-800">• 등록 완료 후 발신번호 확인</p>
                          </div>
                          <div>
                            <p className="font-semibold mb-1">3️⃣ API 키 발급</p>
                            <p className="text-xs text-blue-800">• 알리고 관리자 페이지 → API 관리</p>
                            <p className="text-xs text-blue-800">• "API 키 발급" 클릭</p>
                            <p className="text-xs text-blue-800">• 발급된 API 키 복사 (아래 입력란에 붙여넣기)</p>
                          </div>
                          <div>
                            <p className="font-semibold mb-1">4️⃣ 정보 입력</p>
                            <p className="text-xs text-blue-800">• 아래 입력란에 알리고에서 받은 정보 입력</p>
                            <p className="text-xs text-blue-800">• "설정 저장하기" 클릭 (다음에도 사용 가능)</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                          <p className="font-semibold text-xs mb-1">💡 알리고에서 받아야 할 정보:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs text-blue-800">
                            <li>API 키 (알리고 관리자 페이지 → API 관리)</li>
                            <li>사용자 ID (알리고 로그인 아이디)</li>
                            <li>발신번호 (알리고에서 등록한 전화번호, 하이픈 없이 숫자만)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      1️⃣ API 키 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={aligoConfig.apiKey}
                      onChange={(e) => setAligoConfig({ ...aligoConfig, apiKey: e.target.value })}
                      placeholder="알리고에서 받은 API 키를 입력하세요"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <p className="mt-1 text-xs text-gray-500">알리고 관리자 페이지 → API 관리에서 확인</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      2️⃣ 사용자 ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={aligoConfig.userId}
                      onChange={(e) => setAligoConfig({ ...aligoConfig, userId: e.target.value })}
                      placeholder="알리고 로그인 아이디를 입력하세요"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <p className="mt-1 text-xs text-gray-500">알리고에 로그인할 때 사용하는 아이디</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      3️⃣ 발신번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={aligoConfig.senderPhone}
                      onChange={(e) => setAligoConfig({ ...aligoConfig, senderPhone: e.target.value.replace(/[^0-9]/g, '') })}
                      placeholder="01012345678 (하이픈 없이 숫자만 입력)"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <p className="mt-1 text-xs text-gray-500">알리고에서 등록한 발신번호 (하이픈 없이 숫자만)</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveAligoConfig()}
                  className="w-full rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  💾 설정 저장하기 (다음에도 사용)
                </button>
              </div>
            )}

            {/* 링크 생성 방식 안내 */}
            {smsMethod === 'link' && (
              <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <FiInfo className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2 text-sm text-emerald-900">
                    <p className="font-bold">🔗 링크 생성 방식</p>
                    <p className="text-emerald-800">
                      여권 업로드 링크가 자동으로 생성됩니다. 아래 문자 내용에 링크가 포함되어 문자 앱으로 열립니다.
                    </p>
                    <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-200">
                      <p className="font-semibold text-xs mb-1">📝 사용 방법:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-800">
                        <li>아래 문자 내용을 확인하세요 (링크가 자동 포함됩니다)</li>
                        <li>"문자 보내기" 버튼을 클릭하면 문자 앱이 열립니다</li>
                        <li>문자 앱에서 고객에게 전송하세요</li>
                        <li>고객이 링크를 클릭하면 본사로 여권 정보가 전송됩니다</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 문자 내용 입력 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  문자 내용 {smsMethod === 'link' && <span className="text-xs text-gray-500">(링크가 자동으로 포함됩니다)</span>}
                </label>
                <div className="relative">
                  <SymbolPicker
                    onSymbolSelect={(symbol) => {
                      const textarea = document.querySelector('textarea[data-sms-message]') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = smsMessage;
                        const newText = text.substring(0, start) + symbol + text.substring(end);
                        setSmsMessage(newText);
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + symbol.length, start + symbol.length);
                        }, 0);
                      } else {
                        setSmsMessage(smsMessage + symbol);
                      }
                    }}
                  />
                </div>
              </div>
              <textarea
                data-sms-message
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder={smsMethod === 'link' 
                  ? `안녕하세요 ${selectedLead?.customerName || '고객'}님. 여권 정보를 업로드해주시기 바랍니다. 아래 링크를 클릭해주세요.\n\n[링크가 자동으로 포함됩니다]`
                  : '고객에게 보낼 문자 내용을 입력하세요.'}
                rows={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                {smsMethod === 'link' 
                  ? '링크는 자동으로 문자 내용 끝에 추가됩니다.'
                  : '문자 내용을 입력한 후 "문자 보내기" 버튼을 클릭하세요.'}
              </p>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSmsModal(false);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={sendingSms}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSendSms}
              disabled={
                sendingSms ||
                (smsMethod === 'aligo' && (!aligoConfig.apiKey || !aligoConfig.userId || !aligoConfig.senderPhone)) ||
                (smsRecipientMode === 'customer' && (!selectedLead?.customerPhone || !selectedLeadId)) ||
                (smsRecipientMode === 'custom' && (!customPhoneNumber || customPhoneNumber.replace(/[^0-9]/g, '').length < 10)) ||
                !smsMessage.trim()
              }
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {sendingSms ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <FiMessageSquare />
                  {smsMethod === 'link' ? '링크 복사' : '문자 보내기'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 여권 보내기 모달 */}
    {showPassportModal && selectedLeadId && (
      <div 
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowPassportModal(false);
          }
        }}
      >
        <div 
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <h3 className="text-xl font-bold text-gray-900">여권 보내기</h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPassportModal(false);
              }}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          {/* 내용 */}
          <div className="px-6 py-6 space-y-6">
            {/* 고객 정보 */}
            {selectedLead ? (
              <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-1">고객 정보</p>
                <p className="text-sm text-blue-800">{selectedLead.customerName || '이름 없음'}</p>
                <p className="text-sm text-blue-800">{selectedLead.customerPhone || '전화번호 없음'}</p>
              </div>
            ) : (
              <div className="rounded-xl bg-yellow-50 p-4 border border-yellow-200">
                <p className="text-sm font-semibold text-yellow-900 mb-2">⏳ 고객 정보 로딩 중...</p>
              </div>
            )}

            {/* 발송 방법 선택 */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">발송 방법</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPassportMethod('link')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    passportMethod === 'link'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FiLink className="text-xl" />
                    <span className="font-semibold">링크 복사</span>
                  </div>
                  <p className="text-xs text-gray-600">여권 업로드 링크를 복사하여 문자로 보내기</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPassportMethod('aligo')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    passportMethod === 'aligo'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FiMessageSquare className="text-xl" />
                    <span className="font-semibold">알리고 API</span>
                  </div>
                  <p className="text-xs text-gray-600">알리고 API로 직접 발송</p>
                </button>
              </div>
            </div>

            {/* 알리고 API 설정 */}
            {passportMethod === 'aligo' && (
              <div className="space-y-4 rounded-xl bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-900">⚙️ 알리고 API 설정</h4>
                  {hasSyncedAligoConfig && (
                    <span className="text-xs text-green-600 font-semibold">✓ 저장됨</span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    알리고 API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={aligoConfig.apiKey}
                    onChange={(e) => updateAligoConfigField('apiKey', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="알리고 API Key 입력"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    알리고 User ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={aligoConfig.userId}
                    onChange={(e) => updateAligoConfigField('userId', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="알리고 User ID 입력"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    발신번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={aligoConfig.senderPhone}
                    onChange={(e) => updateAligoConfigField('senderPhone', e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="01012345678 (하이픈 없이 숫자만)"
                  />
                </div>
                {aligoConfigDirty && (
                  <button
                    type="button"
                    onClick={() => handleSaveAligoConfig()}
                    disabled={savingAligoConfig}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingAligoConfig ? '저장 중...' : '💾 설정 저장하기 (다음에도 사용)'}
                  </button>
                )}
                {hasSyncedAligoConfig && !aligoConfigDirty && (
                  <div className="text-xs text-gray-600 bg-green-50 border border-green-200 rounded-lg p-2">
                    ✓ 저장된 설정이 자동으로 사용됩니다. 수정하려면 값을 변경하세요.
                  </div>
                )}
              </div>
            )}

            {/* 템플릿 선택 */}
            {passportTemplates.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">템플릿 선택</label>
                <select
                  value={selectedPassportTemplateId || ''}
                  onChange={(e) => setSelectedPassportTemplateId(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  disabled={loadingPassportTemplates}
                >
                  {passportTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title} {template.isDefault ? '(기본)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 메시지 입력 */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">메시지 내용</label>
              {loadingPassportTemplates ? (
                <div className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500">
                  템플릿 로딩 중...
                </div>
              ) : (
                <textarea
                  value={passportMessage}
                  onChange={(e) => setPassportMessage(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  placeholder="여권 요청 메시지를 입력하세요."
                />
              )}
            </div>

            {/* 여권 링크 표시 (링크 복사 방식일 때) */}
            {passportMethod === 'link' && selectedLeadId && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">🛂 여권 등록 링크</p>
                <div className="mb-3 rounded-lg bg-white border border-blue-300 p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">링크 URL</p>
                  <p className="text-xs text-gray-900 break-all font-mono">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/public/passport-upload?leadId=${selectedLeadId}&partnerId=${partnerId}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const passportLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/passport-upload?leadId=${selectedLeadId}&partnerId=${partnerId}`;
                      try {
                        if (typeof window !== 'undefined' && navigator.clipboard) {
                          await navigator.clipboard.writeText(passportLink);
                          showSuccess('여권 업로드 링크가 복사되었습니다.');
                        }
                      } catch (error) {
                        console.error('링크 복사 실패:', error);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    <span>📋</span>
                    <span>링크 복사</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const passportLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/passport-upload?leadId=${selectedLeadId}&partnerId=${partnerId}`;
                      window.open(passportLink, '_blank', 'width=1200,height=800');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <span>👁️</span>
                    <span>미리보기</span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-blue-700">
                  💡 미리보기 버튼을 클릭하면 고객이 보는 화면을 확인할 수 있습니다.
                </p>
              </div>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPassportModal(false);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={requestingPassport}
            >
              취소
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!selectedLead || !selectedLeadId) return;

                if (passportMethod === 'aligo') {
                  // 알리고 API로 직접 발송
                  if (!aligoConfig.apiKey || !aligoConfig.userId || !aligoConfig.senderPhone) {
                    showError('알리고 API 설정을 모두 입력해주세요.');
                    return;
                  }

                  if (!passportMessage.trim()) {
                    showError('메시지 내용을 입력해주세요.');
                    return;
                  }

                  setRequestingPassport(true);
                  try {
                    // 설정이 변경되었으면 자동으로 저장
                    if (aligoConfigDirty) {
                      const saved = await handleSaveAligoConfig({ silent: true });
                      if (!saved) {
                        setRequestingPassport(false);
                        return;
                      }
                    }

                    // 여권 업로드 링크 생성
                    const passportLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/passport-upload?leadId=${selectedLeadId}&partnerId=${partnerId}`;
                    
                    // 템플릿 변수 채우기
                    let messageWithLink = passportMessage
                      .replace('[링크가 자동으로 추가됩니다]', passportLink)
                      .replace('{링크}', passportLink)
                      .replace('{고객명}', selectedLead?.customerName || '고객')
                      .replace('{상품명}', '크루즈 상품') // TODO: 실제 상품명 가져오기
                      .replace('{출발일}', new Date().toLocaleDateString('ko-KR')); // TODO: 실제 출발일 가져오기
                    
                    if (!messageWithLink || messageWithLink.trim() === '') {
                      messageWithLink = `안녕하세요 ${selectedLead?.customerName || '고객'}님. 여권 정보를 업로드해주시기 바랍니다. 아래 링크를 클릭해주세요.\n\n${passportLink}`;
                    }

                    const res = await fetch('/api/partner/customers/send-sms', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        leadId: selectedLeadId,
                        phone: selectedLead?.customerPhone || '',
                        message: messageWithLink,
                      }),
                    });

                    const json = await res.json();
                    if (!res.ok || !json?.ok) {
                      throw new Error(json?.message || '여권 요청 발송에 실패했습니다.');
                    }

                    showSuccess('여권 요청이 발송되었습니다.');
                    setShowPassportModal(false);
                    await loadLeadDetail(selectedLeadId);
                    fetchCustomers(currentPage);
                  } catch (error) {
                    console.error('여권 요청 발송 오류:', error);
                    showError(
                      error instanceof Error ? error.message : '여권 요청 발송 중 오류가 발생했습니다.',
                    );
                  } finally {
                    setRequestingPassport(false);
                  }
                } else {
                  // 링크 복사 방식
                  if (!selectedLead?.customerPhone) {
                    showError('고객 전화번호가 없습니다.');
                    return;
                  }

                  try {
                    const passportLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/passport-upload?leadId=${selectedLeadId}&partnerId=${partnerId}`;

                    // 링크 복사
                    if (typeof window !== 'undefined' && navigator.clipboard) {
                      await navigator.clipboard.writeText(passportLink);
                      showSuccess('여권 업로드 링크가 복사되었습니다.');
                    } else {
                      showError('링크 복사에 실패했습니다. 링크를 수동으로 복사해주세요.');
                    }
                    // 모달은 닫지 않고 링크 표시 유지 (미리보기 가능하도록)
                  } catch (error) {
                    console.error('링크 복사 실패:', error);
                    showError('링크 복사에 실패했습니다. 링크를 수동으로 복사해주세요.');
                  }
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              disabled={requestingPassport}
            >
              {requestingPassport ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <FiSend />
                  {passportMethod === 'aligo' ? '알리고로 발송' : '링크 복사'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 그룹 생성/수정 모달 */}
    {showGroupModal && (
      <div 
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowGroupModal(false);
          }
        }}
      >
        <div 
          className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {editingGroup ? '그룹 수정' : '그룹 추가'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowGroupModal(false);
                setEditingGroup(null);
                setGroupForm({ name: '', description: '', productCode: '', color: '#3B82F6' });
              }}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                그룹 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                placeholder="예: 일본 크루즈 관심 고객"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">설명</label>
              <textarea
                value={groupForm.description}
                onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                placeholder="그룹에 대한 설명을 입력하세요."
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">관련 상품 코드</label>
              <div className="relative" ref={productDropdownRef}>
                <input
                  type="text"
                  value={productSearchTerm || (groupForm.productCode ? activeProducts.find(p => p.productCode === groupForm.productCode)?.packageName || groupForm.productCode : '없음')}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setProductDropdownOpen(true);
                  }}
                  onFocus={() => setProductDropdownOpen(true)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  placeholder="상품을 검색하거나 선택하세요"
                />
                {productDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    <div
                      className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setGroupForm(prev => ({ ...prev, productCode: '' }));
                        setProductSearchTerm('');
                        setProductDropdownOpen(false);
                      }}
                    >
                      없음
                    </div>
                    {loadingProducts ? (
                      <div className="px-3 py-2 text-sm text-gray-500">로딩 중...</div>
                    ) : (
                      activeProducts
                        .filter(p => 
                          !productSearchTerm || 
                          p.productCode.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          p.packageName?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          p.cruiseLine?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          p.shipName?.toLowerCase().includes(productSearchTerm.toLowerCase())
                        )
                        .map(product => (
                          <div
                            key={product.id}
                            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer border-t border-gray-100"
                            onClick={() => {
                              setGroupForm(prev => ({ ...prev, productCode: product.productCode }));
                              setProductSearchTerm('');
                              setProductDropdownOpen(false);
                            }}
                          >
                            <div className="font-semibold">{product.productCode}</div>
                            <div className="text-xs text-gray-500">
                              {product.cruiseLine} {product.shipName} - {product.packageName}
                              {product.nights && product.days && ` (${product.nights}박 ${product.days}일)`}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">그룹 색상</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={groupForm.color}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={groupForm.color}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, color: e.target.value }))}
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-mono"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            {/* 엑셀 샘플 다운로드 및 등록 */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleDownloadGroupExcelSample}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FiFileText /> 엑셀 샘플 받기
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">엑셀 등록하기</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setGroupExcelFile(file);
                      }
                    }}
                    className="flex-1 text-sm"
                  />
                  {groupExcelFile && (
                    <span className="text-xs text-gray-600">{groupExcelFile.name}</span>
                  )}
                </div>
                {groupExcelFile && editingGroup && (
                  <button
                    type="button"
                    onClick={handleUploadGroupExcel}
                    disabled={uploadingGroupExcel}
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingGroupExcel ? '업로드 중...' : '엑셀 등록하기'}
                  </button>
                )}
                {groupExcelFile && !editingGroup && (
                  <p className="text-xs text-gray-500">그룹을 먼저 생성한 후 엑셀을 등록할 수 있습니다.</p>
                )}
                {groupExcelFile && editingGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setGroupExcelFile(null);
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    className="w-full mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    파일 선택 취소
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowGroupModal(false);
                setEditingGroup(null);
                setGroupForm({ name: '', description: '', productCode: '', color: '#3B82F6' });
              }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveGroup}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              {editingGroup ? '수정' : '생성'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* DB 보내기 모달 */}
    {showDbSendModal && partner.type === 'BRANCH_MANAGER' && (
      <div 
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDbSendModal(false);
          }
        }}
      >
        <div 
          className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">DB 보내기</h3>
            <button
              type="button"
              onClick={() => {
                setShowDbSendModal(false);
                setSelectedAgentId('');
                setSelectedCustomerIds([]);
                setNewCustomers([]);
              }}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 1. 판매원 선택 */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                판매원 선택 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">판매원을 선택하세요</option>
                {partner.teamAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.displayName ?? '판매원'} ({agent.affiliateCode ?? '코드 없음'})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. 고객 선택 */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">고객 선택</label>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-2">
                {customers
                  .filter(c => c.ownership === 'MANAGER' && !c.agent?.id)
                  .map((customer) => (
                    <label key={customer.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.includes(customer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomerIds([...selectedCustomerIds, customer.id]);
                          } else {
                            setSelectedCustomerIds(selectedCustomerIds.filter(id => id !== customer.id));
                          }
                        }}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{customer.customerName ?? '이름 없음'}</div>
                        <div className="text-xs text-gray-500">{customer.customerPhone ?? '연락처 없음'}</div>
                      </div>
                    </label>
                  ))}
                {customers.filter(c => c.ownership === 'MANAGER' && !c.agent?.id).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">선택 가능한 고객이 없습니다.</p>
                )}
              </div>
            </div>

            {/* 3. 새 고객 추가 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">새 고객 추가</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewCustomers([...newCustomers, { name: '', phone: '', email: '', notes: '' }]);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  + 추가
                </button>
              </div>
              <div className="space-y-3">
                {newCustomers.map((customer, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">고객 {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCustomers(newCustomers.filter((_, i) => i !== index));
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="이름 *"
                        value={customer.name}
                        onChange={(e) => {
                          const updated = [...newCustomers];
                          updated[index].name = e.target.value;
                          setNewCustomers(updated);
                        }}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="연락처 *"
                        value={customer.phone}
                        onChange={(e) => {
                          const updated = [...newCustomers];
                          updated[index].phone = e.target.value;
                          setNewCustomers(updated);
                        }}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        placeholder="이메일"
                        value={customer.email}
                        onChange={(e) => {
                          const updated = [...newCustomers];
                          updated[index].email = e.target.value;
                          setNewCustomers(updated);
                        }}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="비고"
                        value={customer.notes}
                        onChange={(e) => {
                          const updated = [...newCustomers];
                          updated[index].notes = e.target.value;
                          setNewCustomers(updated);
                        }}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowDbSendModal(false);
                setSelectedAgentId('');
                setSelectedCustomerIds([]);
                setNewCustomers([]);
              }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSendDb}
              disabled={sendingDb}
              className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingDb ? '보내는 중...' : '보내기'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 퍼널 설정 모달 */}
    {showFunnelModal && funnelSettingsGroup && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {funnelSettingsGroup.name} - 퍼널 설정
            </h2>
            <button
              onClick={() => {
                setShowFunnelModal(false);
                setFunnelSettingsGroup(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 퍼널톡 연결 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                퍼널톡 (카카오톡)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                연결할 예약메시지 그룹을 선택하세요 (Ctrl/Cmd + 클릭으로 여러 개 선택 가능)
              </p>
              {funnelTalks.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">등록된 카카오톡 예약메시지가 없습니다.</p>
              ) : (
                <div>
                  <p className="text-xs text-purple-600 mb-1">
                    {funnelTalks.filter(group => group.messages.some(msg => funnelForm.funnelTalkIds.includes(msg.id))).length}개 그룹 선택됨
                  </p>
                  <select
                    multiple
                    size={Math.min(funnelTalks.length, 10)}
                    value={funnelTalks
                      .filter(group => group.messages.some(msg => funnelForm.funnelTalkIds.includes(msg.id)))
                      .map(group => group.groupName)}
                    onChange={(e) => {
                      const selectedGroupNames = Array.from(e.target.selectedOptions, option => option.value);
                      const allMessageIds: number[] = [];
                      
                      funnelTalks.forEach(group => {
                        if (selectedGroupNames.includes(group.groupName)) {
                          allMessageIds.push(...group.messages.map(m => m.id));
                        }
                      });
                      
                      setFunnelForm({
                        ...funnelForm,
                        funnelTalkIds: allMessageIds,
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {funnelTalks.map((group) => (
                      <option key={group.groupName} value={group.groupName}>
                        {group.groupName} ({group.messages.length}개 메시지)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 퍼널문자 연결 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                퍼널문자 (SMS)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                연결할 예약메시지 그룹을 선택하세요 (Ctrl/Cmd + 클릭으로 여러 개 선택 가능)
              </p>
              {funnelSms.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">등록된 SMS 예약메시지가 없습니다.</p>
              ) : (
                <div>
                  <p className="text-xs text-purple-600 mb-1">
                    {funnelSms.filter(group => group.messages.some(msg => funnelForm.funnelSmsIds.includes(msg.id))).length}개 그룹 선택됨
                  </p>
                  <select
                    multiple
                    size={Math.min(funnelSms.length, 10)}
                    value={funnelSms
                      .filter(group => group.messages.some(msg => funnelForm.funnelSmsIds.includes(msg.id)))
                      .map(group => group.groupName)}
                    onChange={(e) => {
                      const selectedGroupNames = Array.from(e.target.selectedOptions, option => option.value);
                      const allMessageIds: number[] = [];
                      
                      funnelSms.forEach(group => {
                        if (selectedGroupNames.includes(group.groupName)) {
                          allMessageIds.push(...group.messages.map(m => m.id));
                        }
                      });
                      
                      setFunnelForm({
                        ...funnelForm,
                        funnelSmsIds: allMessageIds,
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {funnelSms.map((group) => (
                      <option key={group.groupName} value={group.groupName}>
                        {group.groupName} ({group.messages.length}개 메시지)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 퍼널메일 연결 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                퍼널메일 (Email)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                연결할 예약메시지 그룹을 선택하세요 (Ctrl/Cmd + 클릭으로 여러 개 선택 가능)
              </p>
              {funnelEmails.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">등록된 이메일 예약메시지가 없습니다.</p>
              ) : (
                <div>
                  <p className="text-xs text-purple-600 mb-1">
                    {funnelEmails.filter(group => group.messages.some(msg => funnelForm.funnelEmailIds.includes(msg.id))).length}개 그룹 선택됨
                  </p>
                  <select
                    multiple
                    size={Math.min(funnelEmails.length, 10)}
                    value={funnelEmails
                      .filter(group => group.messages.some(msg => funnelForm.funnelEmailIds.includes(msg.id)))
                      .map(group => group.groupName)}
                    onChange={(e) => {
                      const selectedGroupNames = Array.from(e.target.selectedOptions, option => option.value);
                      const allMessageIds: number[] = [];
                      
                      funnelEmails.forEach(group => {
                        if (selectedGroupNames.includes(group.groupName)) {
                          allMessageIds.push(...group.messages.map(m => m.id));
                        }
                      });
                      
                      setFunnelForm({
                        ...funnelForm,
                        funnelEmailIds: allMessageIds,
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {funnelEmails.map((group) => (
                      <option key={group.groupName} value={group.groupName}>
                        {group.groupName} ({group.messages.length}개 메시지)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 재유입 처리 설정 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                재유입 처리 설정
              </label>
              <p className="text-xs text-gray-500 mb-3">
                고객이 해당그룹에 다시 들어올경우(해당그룹에 이미 존재할경우)
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reEntryHandling"
                    value="no_time_change_info_change"
                    checked={funnelForm.reEntryHandling === 'no_time_change_info_change'}
                    onChange={(e) => setFunnelForm({ ...funnelForm, reEntryHandling: e.target.value })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">유입시간변경 X, 고객정보변경 O</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reEntryHandling"
                    value="no_time_change_no_info_change"
                    checked={funnelForm.reEntryHandling === 'no_time_change_no_info_change'}
                    onChange={(e) => setFunnelForm({ ...funnelForm, reEntryHandling: e.target.value })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">유입시간변경 X, 고객정보변경 X</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reEntryHandling"
                    value="time_change_info_change"
                    checked={funnelForm.reEntryHandling === 'time_change_info_change'}
                    onChange={(e) => setFunnelForm({ ...funnelForm, reEntryHandling: e.target.value })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">
                    유입시간변경 O, 고객정보변경 O (*0일차 퍼널 부터 다시 시작)
                  </span>
                </label>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowFunnelModal(false);
                  setFunnelSettingsGroup(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/partner/customer-groups/${funnelSettingsGroup.id}/funnel-settings`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        funnelTalkIds: funnelForm.funnelTalkIds,
                        funnelSmsIds: funnelForm.funnelSmsIds,
                        funnelEmailIds: funnelForm.funnelEmailIds,
                        reEntryHandling: funnelForm.reEntryHandling,
                      }),
                    });

                    if (!response.ok) {
                      const errorText = await response.text();
                      console.error('API Error:', errorText);
                      showError(`퍼널 설정 저장에 실패했습니다. (${response.status})`);
                      return;
                    }

                    const data = await response.json();
                    if (data.ok) {
                      showSuccess('퍼널 설정이 저장되었습니다.');
                      setShowFunnelModal(false);
                      setFunnelSettingsGroup(null);
                      loadCustomerGroups();
                    } else {
                      showError(data.error || '퍼널 설정 저장에 실패했습니다.');
                    }
                  } catch (error) {
                    console.error('Failed to save funnel settings:', error);
                    showError('퍼널 설정 저장 중 네트워크 오류가 발생했습니다.');
                  }
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* 고객 기록 모달 */}
    {selectedCustomerForNote && (
      <CustomerNoteModal
        customerId={selectedCustomerForNote.id}
        customerName={selectedCustomerForNote.name}
        isOpen={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          setSelectedCustomerForNote(null);
        }}
        onNoteAdded={() => {
          // 고객 목록 새로고침
          fetchCustomers(currentPage);
        }}
      />
    )}
  </div>
  );
}
