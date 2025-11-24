'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  FiPlus,
  FiEdit2,
  FiRefreshCw,
  FiSave,
  FiX,
  FiSearch,
  FiUser,
  FiHash,
  FiTrash2,
  FiExternalLink,
  FiFile,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEye,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

const TYPE_OPTIONS = [
  { value: 'HQ', label: '본사' },
  { value: 'BRANCH_MANAGER', label: '대리점장' },
  { value: 'SALES_AGENT', label: '판매원' },
] as const;

const HQ_MANAGER_VALUE = 'HQ';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: '작성 중' },
  { value: 'AWAITING_APPROVAL', label: '승인 대기' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '일시 중지' },
  { value: 'TERMINATED', label: '종료' },
] as const;

const CONTRACT_STATUS_OPTIONS = [
  { value: 'DRAFT', label: '초안' },
  { value: 'REQUESTED', label: '요청' },
  { value: 'SENT', label: '발송' },
  { value: 'SIGNED', label: '서명' },
  { value: 'ARCHIVED', label: '보관' },
] as const;

type AffiliateProfile = {
  id: number;
  userId: number;
  affiliateCode: string;
  type: 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
  status: 'DRAFT' | 'AWAITING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  displayName?: string | null;
  branchLabel?: string | null;
  nickname?: string | null;
  profileTitle?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  kakaoLink?: string | null;
  instagramHandle?: string | null;
  youtubeChannel?: string | null;
  homepageUrl?: string | null;
  landingSlug?: string | null;
  landingAnnouncement?: string | null;
  welcomeMessage?: string | null;
  published: boolean;
  publishedAt?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankAccountHolder?: string | null;
  withholdingRate?: number | null;
  contractStatus: 'DRAFT' | 'REQUESTED' | 'SENT' | 'SIGNED' | 'ARCHIVED';
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
  counts: {
    managedAgents: number;
    assignedManagers: number;
    totalLinks: number;
    totalLeads: number;
    totalSales: number;
  };
  manager?: {
    id: number;
    affiliateCode?: string | null;
    displayName?: string | null;
    nickname?: string | null;
    branchLabel?: string | null;
  } | null;
  user: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    onboarded: boolean | null;
    mallNickname: string | null;
    mallUserId: string | null;
    password: string | null; // 비밀번호 추가
  } | null;
};

type BranchManagerOption = {
  id: number;
  displayName: string | null;
  nickname: string | null;
  branchLabel: string | null;
  affiliateCode: string;
};

type Filters = {
  search: string;
  type: 'ALL' | 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
  status: 'ALL' | 'DRAFT' | 'AWAITING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  published: 'ALL' | 'true' | 'false';
};

type ProfileFormState = {
  id?: number;
  userId: string;
  affiliateCode: string;
  type: 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
  status: 'DRAFT' | 'AWAITING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  managerProfileId: string; // 'HQ' | manager profile ID
  displayName: string;
  branchLabel: string;
  nickname: string;
  mallUserId: string;
  profileTitle: string;
  bio: string;
  profileImage: string;
  coverImage: string;
  contactPhone: string;
  contactEmail: string;
  kakaoLink: string;
  instagramHandle: string;
  youtubeChannel: string;
  homepageUrl: string;
  landingSlug: string;
  landingAnnouncement: string;
  welcomeMessage: string;
  bankName: string;
  bankAccount: string;
  bankAccountHolder: string;
  withholdingRate: string;
  contractStatus: 'DRAFT' | 'REQUESTED' | 'SENT' | 'SIGNED' | 'ARCHIVED';
  published: boolean;
  metadata: string;
  password: string; // 비밀번호 변경용
};

const EMPTY_FORM: ProfileFormState = {
  userId: '',
  affiliateCode: '',
  type: 'BRANCH_MANAGER',
  status: 'DRAFT',
  managerProfileId: HQ_MANAGER_VALUE,
  displayName: '',
  branchLabel: '',
  nickname: '',
  mallUserId: '',
  profileTitle: '',
  bio: '',
  profileImage: '',
  coverImage: '',
  contactPhone: '',
  contactEmail: '',
  kakaoLink: '',
  instagramHandle: '',
  youtubeChannel: '',
  homepageUrl: '',
  landingSlug: '',
  landingAnnouncement: '',
  welcomeMessage: '',
  bankName: '',
  bankAccount: '',
  bankAccountHolder: '',
  withholdingRate: '3.3',
  contractStatus: 'DRAFT',
  published: true,
  metadata: '',
  password: '',
};

const TYPE_LABELS: Record<AffiliateProfile['type'], string> = {
  HQ: '본사',
  BRANCH_MANAGER: '대리점장',
  SALES_AGENT: '판매원',
};

function getAffiliationLabel(profile: AffiliateProfile) {
  if (profile.type === 'SALES_AGENT') {
    if (profile.manager) {
      const labelParts = [profile.manager.nickname || profile.manager.displayName || `대리점장 #${profile.manager.id}`];
      if (profile.manager.branchLabel) labelParts.push(profile.manager.branchLabel);
      if (profile.manager.affiliateCode) labelParts.push(`코드 ${profile.manager.affiliateCode}`);
      return {
        badge: '대리점 소속',
        detail: labelParts.join(' · '),
        theme: 'purple',
      };
    }
    return {
      badge: '본사 직속',
      detail: '본사에서 직접 관리하는 판매원입니다.',
      theme: 'red',
    };
  }

  if (profile.type === 'BRANCH_MANAGER') {
    const labelParts = [profile.branchLabel || profile.displayName || '등록된 지점'];
    return {
      badge: '본사 직속',
      detail: labelParts.join(' · '),
      theme: 'red',
    };
  }

  return {
    badge: '본사 계정',
    detail: 'HQ 권한을 가진 계정입니다.',
    theme: 'red',
  };
}

const STATUS_LABELS: Record<AffiliateProfile['status'], string> = {
  DRAFT: '작성 중',
  AWAITING_APPROVAL: '승인 대기',
  ACTIVE: '활성',
  SUSPENDED: '일시 중지',
  TERMINATED: '종료',
};

function formatDate(value: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return value;
  }
}

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function profileToFormState(profile: AffiliateProfile): ProfileFormState {
  return {
    id: profile.id,
    userId: String(profile.userId),
    affiliateCode: profile.affiliateCode,
    type: profile.type,
    status: profile.status,
    managerProfileId:
      profile.type === 'SALES_AGENT' && profile.manager
        ? String(profile.manager.id)
        : HQ_MANAGER_VALUE,
    displayName: profile.displayName ?? '',
    branchLabel: profile.branchLabel ?? '',
    nickname: profile.nickname ?? '',
    mallUserId: profile.user?.mallUserId ?? '',
    profileTitle: profile.profileTitle ?? '',
    bio: profile.bio ?? '',
    profileImage: profile.profileImage ?? '',
    coverImage: profile.coverImage ?? '',
    contactPhone: profile.contactPhone ?? '',
    contactEmail: profile.contactEmail ?? '',
    kakaoLink: profile.kakaoLink ?? '',
    instagramHandle: profile.instagramHandle ?? '',
    youtubeChannel: profile.youtubeChannel ?? '',
    homepageUrl: profile.homepageUrl ?? '',
    landingSlug: profile.landingSlug ?? '',
    landingAnnouncement: profile.landingAnnouncement ?? '',
    welcomeMessage: profile.welcomeMessage ?? '',
    bankName: profile.bankName ?? '',
    bankAccount: profile.bankAccount ?? '',
    bankAccountHolder: profile.bankAccountHolder ?? '',
    withholdingRate: profile.withholdingRate != null ? String(profile.withholdingRate) : '',
    contractStatus: profile.contractStatus,
    published: profile.published,
    metadata: profile.metadata ? JSON.stringify(profile.metadata, null, 2) : '',
    password: '', // 비밀번호는 폼에서 별도 입력 (기존 비밀번호는 표시만)
  };
}

function buildPayload(formState: ProfileFormState, mode: 'create' | 'edit') {
  const payload: Record<string, unknown> = {
    type: formState.type,
    status: formState.status,
    displayName: formState.displayName.trim() || null,
    branchLabel: formState.branchLabel.trim() || null,
    nickname: formState.nickname.trim() || null,
    profileTitle: formState.profileTitle.trim() || null,
    bio: formState.bio.trim() || null,
    profileImage: formState.profileImage.trim() || null,
    coverImage: formState.coverImage.trim() || null,
    contactPhone: formState.contactPhone.trim() || null,
    contactEmail: formState.contactEmail.trim() || null,
    kakaoLink: formState.kakaoLink.trim() || null,
    instagramHandle: formState.instagramHandle.trim() || null,
    youtubeChannel: formState.youtubeChannel.trim() || null,
    homepageUrl: formState.homepageUrl.trim() || null,
    landingSlug: formState.landingSlug.trim() || null,
    landingAnnouncement: formState.landingAnnouncement.trim() || null,
    welcomeMessage: formState.welcomeMessage.trim() || null,
    bankName: formState.bankName.trim() || null,
    bankAccount: formState.bankAccount.trim() || null,
    bankAccountHolder: formState.bankAccountHolder.trim() || null,
    contractStatus: formState.contractStatus,
    published: formState.published,
    mallUserId: formState.mallUserId.trim() || null,
  };

  if (formState.withholdingRate) {
    const parsed = Number(formState.withholdingRate);
    if (!Number.isNaN(parsed)) {
      payload.withholdingRate = parsed;
    }
  }

  if (formState.metadata.trim()) {
    try {
      payload.metadata = JSON.parse(formState.metadata);
    } catch (error) {
      throw new Error('메타데이터 JSON 형식이 올바르지 않습니다.');
    }
  } else {
    payload.metadata = null;
  }

  if (formState.type === 'SALES_AGENT') {
    if (formState.managerProfileId && formState.managerProfileId !== HQ_MANAGER_VALUE) {
      const parsedManager = Number(formState.managerProfileId);
      if (!Number.isNaN(parsedManager) && parsedManager > 0) {
        payload.managerProfileId = parsedManager;
      }
    } else {
      payload.managerProfileId = null;
    }
  } else {
    payload.managerProfileId = null;
  }

  if (mode === 'create') {
    // userId가 있으면 숫자로 변환, 없으면 undefined (자동 생성)
    if (formState.userId.trim()) {
      const parsedUserId = Number(formState.userId);
      if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
        payload.userId = parsedUserId;
      }
    }
    // affiliateCode는 서버에서 자동 생성되므로 undefined로 보냄
    payload.affiliateCode = formState.affiliateCode.trim() || undefined;
  }

  // 비밀번호 변경 (편집 모드에서만, 값이 있을 때만)
  if (mode === 'edit' && formState.password.trim()) {
    payload.password = formState.password.trim();
  }

  return payload;
}

export default function AffiliateProfilesPage() {
  const [profiles, setProfiles] = useState<AffiliateProfile[]>([]);
  const [filters, setFilters] = useState<Filters>({ search: '', type: 'ALL', status: 'ALL', published: 'ALL' });
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<ProfileFormState>(EMPTY_FORM);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [branchManagers, setBranchManagers] = useState<BranchManagerOption[]>([]);
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showRelationsModal, setShowRelationsModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedProfileForDocuments, setSelectedProfileForDocuments] = useState<number | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [relationsData, setRelationsData] = useState<any>(null);
  const [fixingRelation, setFixingRelation] = useState(false);
  const [generatingSampleData, setGeneratingSampleData] = useState<number | null>(null);
  const [selectedAgentForSample, setSelectedAgentForSample] = useState<number | null>(null);
  const [showSampleDataModal, setShowSampleDataModal] = useState(false);
  const [showBranchLabelSelector, setShowBranchLabelSelector] = useState(false);
  const [branchLabelOptions, setBranchLabelOptions] = useState<Array<{ label: string; managerId: number; managerName: string; affiliateCode: string }>>([]);
  const branchLabelSelectorRef = useRef<HTMLDivElement>(null);

  const selectedProfile = useMemo(
    () => (selectedProfileId ? profiles.find((profile) => profile.id === selectedProfileId) ?? null : null),
    [profiles, selectedProfileId],
  );

  const filteredCountText = useMemo(() => {
    if (!profiles.length) return '0명';
    return `${profiles.length.toLocaleString()}명`;
  }, [profiles.length]);

  const managerOptions = useMemo(() => {
    const options = branchManagers
      .map((manager) => ({
        value: String(manager.id),
        label: [manager.nickname || manager.displayName || `ID #${manager.id}`, manager.branchLabel]
          .filter(Boolean)
          .join(' · '),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ko'));

    if (
      formState.managerProfileId &&
      formState.managerProfileId !== HQ_MANAGER_VALUE &&
      !options.some((option) => option.value === formState.managerProfileId)
    ) {
      const fallback = profiles.find((profile) => String(profile.id) === formState.managerProfileId);
      if (fallback) {
        options.push({
          value: String(fallback.id),
          label: [fallback.nickname || fallback.displayName || `ID #${fallback.id}`, fallback.branchLabel]
            .filter(Boolean)
            .join(' · '),
        });
      }
    }

    return options;
  }, [branchManagers, formState.managerProfileId, profiles]);

  const mallLink = useMemo(() => {
    const value = formState.mallUserId?.trim();
    if (!value) return null;
    return `/products/${value}`;
  }, [formState.mallUserId]);

  const landingUrl = useMemo(() => {
    if (!formState.affiliateCode || !formState.landingSlug) return null;
    return `/store/${formState.affiliateCode}/${formState.landingSlug}`;
  }, [formState.affiliateCode, formState.landingSlug]);

  const handleTypeChange = (nextType: ProfileFormState['type']) => {
    setFormState((prev) => ({
      ...prev,
      type: nextType,
      managerProfileId:
        nextType === 'SALES_AGENT'
          ? prev.managerProfileId && prev.managerProfileId !== '' ? prev.managerProfileId : HQ_MANAGER_VALUE
          : HQ_MANAGER_VALUE,
    }));
  };

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (filters.search.trim()) params.set('search', filters.search.trim());
        if (filters.type !== 'ALL') params.set('type', filters.type);
        if (filters.status !== 'ALL') params.set('status', filters.status);
        if (filters.published !== 'ALL') params.set('published', filters.published);

        const res = await fetch(`/api/admin/affiliate/profiles${params.toString() ? `?${params.toString()}` : ''}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || '어필리에이트 프로필을 불러오지 못했습니다.');
        }
        setProfiles(json.profiles ?? []);
      } catch (error: any) {
        console.error('[AffiliateProfiles] load error', error);
        showError(error.message || '프로필 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, [filters]);

  useEffect(() => {
    const loadManagers = async () => {
      try {
        setIsLoadingManagers(true);
        const res = await fetch('/api/admin/affiliate/profiles?type=BRANCH_MANAGER&status=ACTIVE');
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || '대리점장 목록을 불러올 수 없습니다.');
        }
        const options: BranchManagerOption[] = (json.profiles ?? []).map((manager: any) => ({
          id: manager.id,
          displayName: manager.displayName ?? null,
          nickname: manager.nickname ?? null,
          branchLabel: manager.branchLabel ?? null,
          affiliateCode: manager.affiliateCode,
        }));
        setBranchManagers(options);
        
        // 지점명/팀명 옵션 생성 (중복 제거)
        const branchLabelMap = new Map<string, { label: string; managerId: number; managerName: string; affiliateCode: string }>();
        (json.profiles ?? []).forEach((manager: any) => {
          if (manager.branchLabel) {
            const key = manager.branchLabel.trim();
            if (key && !branchLabelMap.has(key)) {
              branchLabelMap.set(key, {
                label: key,
                managerId: manager.id,
                managerName: manager.nickname || manager.displayName || `ID #${manager.id}`,
                affiliateCode: manager.affiliateCode,
              });
            }
          }
        });
        setBranchLabelOptions(Array.from(branchLabelMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'ko')));
      } catch (error: any) {
        console.error('[AffiliateProfiles] manager load error', error);
      } finally {
        setIsLoadingManagers(false);
      }
    };

    loadManagers();
  }, []);

  // 외부 클릭 시 지점명 선택 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchLabelSelectorRef.current && !branchLabelSelectorRef.current.contains(event.target as Node)) {
        setShowBranchLabelSelector(false);
      }
    };

    if (showBranchLabelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBranchLabelSelector]);

  const handleCheckRelations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/affiliate/profiles/fix-relations', {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '관계 확인에 실패했습니다.');
      }
      setRelationsData(json);
      setShowRelationsModal(true);
    } catch (error: any) {
      console.error('[AffiliateProfiles] check relations error', error);
      showError(error.message || '관계 확인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixRelation = async (agentId: number, managerId: number) => {
    try {
      setFixingRelation(true);
      const res = await fetch('/api/admin/affiliate/profiles/fix-relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agentId, managerId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '관계 수정에 실패했습니다.');
      }
      showSuccess('관계가 수정되었습니다.');
      // 관계 확인 다시 실행
      await handleCheckRelations();
      // 프로필 목록 새로고침
      const loadRes = await fetch(`/api/admin/affiliate/profiles`);
      const loadJson = await loadRes.json();
      if (loadRes.ok && loadJson.ok) {
        setProfiles(loadJson.profiles ?? []);
      }
    } catch (error: any) {
      console.error('[AffiliateProfiles] fix relation error', error);
      showError(error.message || '관계 수정 중 오류가 발생했습니다.');
    } finally {
      setFixingRelation(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormState({ ...EMPTY_FORM });
    setSelectedProfileId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (profile: AffiliateProfile) => {
    setModalMode('edit');
    setSelectedProfileId(profile.id);
    setFormState(profileToFormState(profile));
    setIsModalOpen(true);
  };

  const handleDelete = async (profile: AffiliateProfile) => {
    if (profile.type === 'HQ') {
      showError('본사 HQ 프로필은 삭제할 수 없습니다.');
      return;
    }

    const label = profile.nickname || profile.displayName || profile.user?.name || `판매원 #${profile.id}`;
    const targetLabel = profile.type === 'BRANCH_MANAGER' ? '대리점장' : '판매원';

    if (
      !window.confirm(
        `${label} (${targetLabel}) 프로필을 삭제하시겠어요?\n연결된 팀 배정과 판매 데이터에는 영향을 주지 않지만, 해당 파트너의 판매원몰과 랜딩 정보는 더 이상 노출되지 않습니다.`,
      )
    ) {
      return;
    }

    try {
      setDeletingId(profile.id);
      const res = await fetch(`/api/admin/affiliate/profiles/${profile.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '프로필 삭제에 실패했습니다.');
      }
      setProfiles((prev) => prev.filter((item) => item.id !== profile.id));
      if (profile.type === 'BRANCH_MANAGER') {
        setBranchManagers((prev) => prev.filter((manager) => manager.id !== profile.id));
      }
      if (selectedProfileId === profile.id) {
        setSelectedProfileId(null);
        setFormState(EMPTY_FORM);
        setIsModalOpen(false);
      }
      showSuccess(`${targetLabel} 프로필이 삭제되었습니다.`);
    } catch (error: any) {
      console.error('[AffiliateProfiles] delete error', error);
      showError(error.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSaving(false);
    setFormState(EMPTY_FORM);
    setSelectedProfileId(null);
  };

  // 샘플 데이터 생성 (단일 판매원)
  const handleGenerateSampleData = async (profileId: number) => {
    if (!confirm('이 판매원에게 샘플 데이터(리드, 판매, 고객)를 생성하시겠습니까?\n\n기본 10개의 샘플 데이터가 생성됩니다.')) {
      return;
    }

    setGeneratingSampleData(profileId);
    try {
      const res = await fetch('/api/admin/affiliate/sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          agentProfileId: profileId,
          count: 10,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '샘플 데이터 생성에 실패했습니다.');
      }

      showSuccess(`샘플 데이터가 생성되었습니다! (리드: ${json.data.leads}개, 판매: ${json.data.sales}개, 고객: ${json.data.customers}개)`);
    } catch (error: any) {
      console.error('[AffiliateProfiles] generate sample data error', error);
      showError(error.message || '샘플 데이터 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingSampleData(null);
    }
  };

  // 샘플 데이터 생성 실행 (선택된 판매원 또는 전체)
  const handleExecuteSampleDataGeneration = async (agentProfileId: number | null, generateAll: boolean = false) => {
    if (!agentProfileId && !generateAll) {
      showError('판매원을 선택하거나 전체 생성을 선택해주세요.');
      return;
    }

    if (generateAll) {
      const activeProfilesCount = profiles.filter(p => (p.type === 'SALES_AGENT' || p.type === 'BRANCH_MANAGER') && p.status === 'ACTIVE').length;
      
      if (activeProfilesCount === 0) {
        showError('활성 상태인 판매원 또는 대리점장이 없습니다.');
        return;
      }

      if (!confirm(`모든 활성 프로필(${activeProfilesCount}명)에게 샘플 데이터를 자동 생성하시겠습니까?\n\n각 프로필당 10개의 샘플 데이터가 생성됩니다.\n\n이 작업은 시간이 걸릴 수 있습니다.`)) {
        return;
      }

      setGeneratingSampleData(-1); // -1은 전체 생성 중임을 의미
      try {
        const res = await fetch('/api/admin/affiliate/sample-data/auto-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            count: 10,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || '샘플 데이터 자동 생성에 실패했습니다.');
        }

        const { summary, results, errors } = json;
        let message = `✅ 총 ${summary.total}명 중 ${summary.success}명에게 샘플 데이터 생성 완료!\n\n`;
        
        if (results && results.length > 0) {
          const totalLeads = results.reduce((sum: number, r: any) => sum + r.data.leads, 0);
          const totalSales = results.reduce((sum: number, r: any) => sum + r.data.sales, 0);
          const totalCustomers = results.reduce((sum: number, r: any) => sum + r.data.customers, 0);
          message += `생성된 데이터:\n- 리드: ${totalLeads}개\n- 판매: ${totalSales}개\n- 고객: ${totalCustomers}개`;
        }

        if (errors && errors.length > 0) {
          message += `\n\n⚠️ 실패: ${errors.length}명`;
        }

        showSuccess(message);
        setShowSampleDataModal(false);
        
        // 목록 새로고침
        setTimeout(() => {
          const loadProfiles = async () => {
            try {
              setIsLoading(true);
              const params = new URLSearchParams();
              if (filters.search.trim()) params.set('search', filters.search.trim());
              if (filters.type !== 'ALL') params.set('type', filters.type);
              if (filters.status !== 'ALL') params.set('status', filters.status);
              if (filters.published !== 'ALL') params.set('published', filters.published);

              const res = await fetch(`/api/admin/affiliate/profiles${params.toString() ? `?${params.toString()}` : ''}`);
              const json = await res.json();
              if (!res.ok || !json.ok) {
                throw new Error(json.message || '어필리에이트 프로필을 불러오지 못했습니다.');
              }
              setProfiles(json.profiles ?? []);
            } catch (error: any) {
              console.error('[AffiliateProfiles] load error', error);
              showError(error.message || '프로필 목록을 불러오는 중 오류가 발생했습니다.');
            } finally {
              setIsLoading(false);
            }
          };
          loadProfiles();
        }, 1000);
      } catch (error: any) {
        console.error('[AffiliateProfiles] auto generate sample data error', error);
        showError(error.message || '샘플 데이터 자동 생성 중 오류가 발생했습니다.');
      } finally {
        setGeneratingSampleData(null);
      }
    } else {
      // 특정 판매원에게 생성
      const selectedProfile = profiles.find(p => p.id === agentProfileId);
      if (!selectedProfile) {
        showError('선택한 판매원을 찾을 수 없습니다.');
        return;
      }

      const profileTypeLabel = selectedProfile.type === 'BRANCH_MANAGER' ? '대리점장' : '판매원';
      if (!confirm(`${selectedProfile.displayName || selectedProfile.nickname || `선택한 ${profileTypeLabel}`}에게 샘플 데이터(리드, 판매, 고객)를 생성하시겠습니까?\n\n기본 10개의 샘플 데이터가 생성됩니다.`)) {
        return;
      }

      setGeneratingSampleData(agentProfileId!);
      try {
        const res = await fetch('/api/admin/affiliate/sample-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            profileId: agentProfileId,
            count: 10,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          const errorMessage = json.error || json.message || '샘플 데이터 생성에 실패했습니다.';
          const errorDetails = json.details ? `\n\n상세 정보: ${JSON.stringify(json.details, null, 2)}` : '';
          throw new Error(errorMessage + errorDetails);
        }

        showSuccess(`샘플 데이터가 생성되었습니다! (리드: ${json.data.leads}개, 판매: ${json.data.sales}개, 고객: ${json.data.customers}개)`);
        setShowSampleDataModal(false);
        setSelectedAgentForSample(null);
      } catch (error: any) {
        console.error('[AffiliateProfiles] generate sample data error', error);
        showError(error.message || '샘플 데이터 생성 중 오류가 발생했습니다.');
      } finally {
        setGeneratingSampleData(null);
      }
    }
  };

  // 문서 확인 모달 열기
  const openDocumentsModal = async (profileId: number) => {
    setSelectedProfileForDocuments(profileId);
    setShowDocumentsModal(true);
    await loadDocuments(profileId);
  };

  // 문서 목록 로드
  const loadDocuments = async (profileId: number) => {
    setLoadingDocuments(true);
    try {
      const res = await fetch(`/api/admin/affiliate/profiles/${profileId}/documents`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '문서 목록을 불러오지 못했습니다');
      }
      setDocuments(json.documents || []);
    } catch (error: any) {
      console.error('[AffiliateProfiles] Load documents error:', error);
      showError(error.message || '문서 목록을 불러오는 중 오류가 발생했습니다');
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // 문서 승인/거부
  const handleDocumentAction = async (documentId: number, action: 'approve' | 'reject') => {
    if (!selectedProfileForDocuments) return;

    try {
      const res = await fetch(`/api/admin/affiliate/profiles/${selectedProfileForDocuments}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ documentId, action }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '문서 처리에 실패했습니다');
      }
      showSuccess(json.message || '문서가 처리되었습니다');
      await loadDocuments(selectedProfileForDocuments);
    } catch (error: any) {
      console.error('[AffiliateProfiles] Document action error:', error);
      showError(error.message || '문서 처리 중 오류가 발생했습니다');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // HQ 타입은 사용자 ID 필수
      if (modalMode === 'create' && formState.type === 'HQ') {
        if (!formState.userId.trim()) {
          showError('HQ 타입은 사용자 ID가 필요합니다.');
          setSaving(false);
          return;
        }
        if (Number.isNaN(Number(formState.userId))) {
          showError('사용자 ID는 숫자여야 합니다.');
          setSaving(false);
          return;
        }
      }
      // 대리점장/판매원은 사용자 ID가 있으면 검증, 없으면 자동 생성
      if (modalMode === 'create' && formState.type !== 'HQ' && formState.userId.trim()) {
        if (Number.isNaN(Number(formState.userId))) {
          showError('사용자 ID는 숫자여야 합니다.');
          setSaving(false);
          return;
        }
      }

      if (formState.landingSlug && formState.landingSlug !== sanitizeSlug(formState.landingSlug)) {
        setFormState((prev) => ({ ...prev, landingSlug: sanitizeSlug(prev.landingSlug) }));
        showError('랜딩 슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다. 자동으로 정리했으니 다시 확인해주세요.');
        setSaving(false);
        return;
      }

      const payload = buildPayload(formState, modalMode);

      if (modalMode === 'create') {
        const res = await fetch('/api/admin/affiliate/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || '프로필 생성에 실패했습니다.');
        }
        setProfiles((prev) => [json.profile, ...prev]);
        showSuccess('어필리에이트 프로필이 생성되었습니다.');
      } else if (selectedProfileId) {
        const res = await fetch(`/api/admin/affiliate/profiles/${selectedProfileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || '프로필 수정에 실패했습니다.');
        }
        setProfiles((prev) => prev.map((item) => (item.id === selectedProfileId ? json.profile : item)));
        showSuccess('프로필이 업데이트되었습니다.');
      }

      closeModal();
    } catch (error: any) {
      console.error('[AffiliateProfiles] save error', error);
      showError(error.message || '저장 중 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">어필리에이트 인력 관리</h1>
            <p className="text-sm text-gray-600 mt-1">
              대리점장과 판매원 프로필, 노출 상태, 랜딩 정보를 한 곳에서 관리합니다.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setFilters({ search: '', type: 'ALL', status: 'ALL', published: 'ALL' })}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              <FiRefreshCw className="text-base" />
              초기화
            </button>
            <button
              onClick={handleCheckRelations}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
            >
              <FiRefreshCw className="text-base" />
              관계 확인 및 수정
            </button>
            <button
              onClick={() => setShowSampleDataModal(true)}
              disabled={generatingSampleData !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw className={`text-base ${generatingSampleData !== null ? 'animate-spin' : ''}`} />
              {generatingSampleData !== null ? '생성 중...' : '샘플 데이터 생성'}
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              <FiPlus className="text-base" />
              새 프로필 생성
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <FiUser className="text-2xl text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">현재 조회 중</p>
              <p className="text-lg font-semibold text-gray-900">{filteredCountText}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <FiHash className="text-2xl text-indigo-600" />
            <div>
              <p className="text-xs text-gray-500">활성 프로필</p>
              <p className="text-lg font-semibold text-gray-900">
                {profiles.filter((profile) => profile.status === 'ACTIVE').length.toLocaleString()}명
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="relative flex items-center">
            <FiSearch className="absolute left-3 text-gray-400 text-lg" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="이름, 연락처, 코드 또는 닉네임 검색"
              className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as Filters['type'] }))}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">전체 유형</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as Filters['status'] }))}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">전체 상태</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.published}
            onChange={(e) => setFilters((prev) => ({ ...prev, published: e.target.value as Filters['published'] }))}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">노출 여부 전체</option>
            <option value="true">노출 중</option>
            <option value="false">게시 중지</option>
          </select>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">유형</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">닉네임 / 지점명</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">소속</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">사용자</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">상태</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">노출</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">팀 / 링크 / 리드</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">수정일</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                    어필리에이트 프로필을 불러오는 중입니다...
                  </td>
                </tr>
              )}
              {!isLoading && profiles.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                    조건에 해당하는 어필리에이트 프로필이 없습니다.
                  </td>
                </tr>
              )}
              {!isLoading &&
                profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-4 text-sm font-semibold text-gray-800">
                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        profile.type === 'SALES_AGENT'
                          ? 'bg-blue-50 text-blue-700'
                          : profile.type === 'BRANCH_MANAGER'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        {TYPE_LABELS[profile.type]}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{profile.affiliateCode}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      <div className="font-semibold text-gray-900">{profile.nickname || '-'}</div>
                      <div className="text-xs text-gray-500">{profile.branchLabel || profile.displayName || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      {(() => {
                        const affiliation = getAffiliationLabel(profile);
                        const themeClasses =
                          affiliation.theme === 'purple'
                            ? 'bg-purple-50 text-purple-700'
                            : affiliation.theme === 'red'
                            ? 'bg-red-50 text-red-600'
                            : affiliation.theme === 'blue'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-600';
                        return (
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${themeClasses}`}>
                              {affiliation.badge}
                            </span>
                            <span className="text-[11px] text-slate-500">{affiliation.detail}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {profile.user ? (
                        <div>
                          <div className="font-semibold text-gray-900">{profile.user.name || '-'}</div>
                          <div className="text-xs text-gray-500">
                            {profile.user.email || profile.user.phone || '-'}
                            {profile.user.phone && profile.user.password && (
                              <span className="ml-2 text-blue-600 font-semibold">
                                (비밀번호: {profile.user.password})
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">연결된 사용자 없음</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          profile.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : profile.status === 'SUSPENDED'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[profile.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {profile.published ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          노출 중
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                          게시 중지
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      <div>팀원: {profile.counts.managedAgents.toLocaleString()}명</div>
                      <div>링크: {profile.counts.totalLinks.toLocaleString()}개</div>
                      <div>리드: {profile.counts.totalLeads.toLocaleString()}건</div>
                      {profile.user?.mallUserId && (
                        <div className="mt-2 space-y-1 pt-2 border-t border-gray-200">
                          <div className="font-semibold text-gray-700 text-xs mb-1">개인몰 링크:</div>
                          <div>
                            <a href={`/${profile.user.mallUserId}/dashboard`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                              대시보드 <FiExternalLink className="text-xs" />
                            </a>
                          </div>
                          <div>
                            <a href={`/${profile.user.mallUserId}/shop`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                              판매몰 <FiExternalLink className="text-xs" />
                            </a>
                          </div>
                          <div>
                            <a href={`/${profile.user.mallUserId}/customers`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                              고객관리 <FiExternalLink className="text-xs" />
                            </a>
                          </div>
                          <div>
                            <a href={`/${profile.user.mallUserId}/profile`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                              프로필 <FiExternalLink className="text-xs" />
                            </a>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500">{formatDate(profile.updatedAt)}</td>
                    <td className="px-4 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => openEditModal(profile)}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <FiEdit2 className="text-base" />
                          관리
                        </button>
                        {profile.type === 'SALES_AGENT' && (
                          <button
                            onClick={() => handleGenerateSampleData(profile.id)}
                            disabled={generatingSampleData === profile.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiRefreshCw className={`text-base ${generatingSampleData === profile.id ? 'animate-spin' : ''}`} />
                            {generatingSampleData === profile.id ? '생성 중...' : '샘플 데이터'}
                          </button>
                        )}
                        {profile.type !== 'HQ' && (
                          <button
                            onClick={() => openDocumentsModal(profile.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            <FiFile className="text-base" />
                            문서
                          </button>
                        )}
                        {profile.type !== 'HQ' && (
                          <button
                            onClick={() => handleDelete(profile)}
                            disabled={deletingId === profile.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiTrash2 className="text-base" />
                            {deletingId === profile.id ? '삭제 중...' : '삭제'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">
                  {modalMode === 'create' ? '새 어필리에이트 프로필 생성' : '어필리에이트 프로필 편집'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  랜딩 정보와 연락처, 정산 계좌를 정확히 입력하면 판매몰과 팀 관리에 자동 반영됩니다.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-4">
              <div className="grid gap-6">
                <section className="grid gap-4 lg:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">어필리에이트 유형</span>
                    <select
                      value={formState.type}
                      onChange={(e) => handleTypeChange(e.target.value as ProfileFormState['type'])}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500">
                      본사/HQ는 조회용으로만 사용하며 대부분 대리점장/판매원 프로필을 관리합니다.
                    </span>
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">상태</span>
                    <select
                      value={formState.status}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, status: e.target.value as ProfileFormState['status'] }))
                      }
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">계약 상태</span>
                    <select
                      value={formState.contractStatus}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          contractStatus: e.target.value as ProfileFormState['contractStatus'],
                        }))
                      }
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {CONTRACT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">사용자 ID{formState.type === 'HQ' && modalMode === 'create' && <span className="text-red-500"> *</span>}</span>
                    <input
                      value={formState.userId}
                      onChange={(e) => setFormState((prev) => ({ ...prev, userId: e.target.value }))}
                      disabled={modalMode === 'edit' || formState.type === 'HQ'}
                      placeholder={formState.type === 'HQ' ? "예: 1024 (필수)" : "예: 1024 (선택, 비워두면 자동 생성)"}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    />
                    <span className="text-xs text-gray-500">
                      {formState.type === 'HQ' ? (
                        'HQ 타입은 기존 사용자 ID가 필요합니다.'
                      ) : modalMode === 'create' ? (
                        '비워두면 자동으로 사용자 계정이 생성됩니다 (아이디: boss1, user1, user2... 형식, 비밀번호: 1101). 기존 사용자와 연결하려면 ID를 입력하세요.'
                      ) : (
                        '기존 사용자 계정과 연결됩니다.'
                      )}
                    </span>
                  </label>

                  {modalMode === 'edit' ? (
                    <label className="flex flex-col gap-1 text-sm text-gray-700">
                      <span className="font-semibold">어필리에이트 코드</span>
                      <input
                        value={formState.affiliateCode}
                        onChange={(e) => setFormState((prev) => ({ ...prev, affiliateCode: e.target.value }))}
                        disabled
                        placeholder="입력하지 않으면 자동 생성"
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                      <span className="text-xs text-gray-500">저장된 고유 코드입니다. 필요 시 지원팀을 통해 변경하세요.</span>
                    </label>
                  ) : (
                    <div className="flex flex-col gap-1 text-sm text-gray-700">
                      <span className="font-semibold">어필리에이트 코드</span>
                      <div className="rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 bg-gray-50">
                        저장 시 자동 생성됩니다. (예: AFF-XXXXXX)
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                    <span className="font-semibold">판매몰 노출</span>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formState.published}
                        onChange={(e) => setFormState((prev) => ({ ...prev, published: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {formState.published ? '노출 중 (랜딩/판매몰 공개)' : '게시 중지 (내부 매칭용)'}
                    </label>
                    <span>게시 중지는 즉시 모든 랜딩과 판매몰에 반영됩니다.</span>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">표시 이름</span>
                    <input
                      value={formState.displayName}
                      onChange={(e) => setFormState((prev) => ({ ...prev, displayName: e.target.value }))}
                      placeholder="예: 홍길동 크루즈 전문가"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">지점명 / 팀명</span>
                      <button
                        type="button"
                        onClick={() => setShowBranchLabelSelector(!showBranchLabelSelector)}
                        className="text-xs px-2 py-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                      >
                        기존 지점 불러오기
                      </button>
                    </div>
                    <div className="relative" ref={branchLabelSelectorRef}>
                      <input
                        value={formState.branchLabel}
                        onChange={(e) => setFormState((prev) => ({ ...prev, branchLabel: e.target.value }))}
                        placeholder="예: 부산 서면 대리점"
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 w-full"
                      />
                      {showBranchLabelSelector && branchLabelOptions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          <div className="p-2">
                            <div className="text-xs text-gray-500 mb-2 px-2">기존 지점명/팀명 선택</div>
                            {branchLabelOptions.map((option, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={async () => {
                                  // 지점명 설정
                                  setFormState((prev) => ({ ...prev, branchLabel: option.label }));
                                  setShowBranchLabelSelector(false);
                                  
                                  // 해당 대리점장의 상세 정보 자동 불러오기
                                  try {
                                    const res = await fetch(`/api/admin/affiliate/profiles/${option.managerId}`);
                                    const json = await res.json();
                                    if (res.ok && json.ok && json.profile) {
                                      const profile = json.profile;
                                      // 대리점장 정보를 폼에 자동 채우기 (기존 값이 없을 때만)
                                      setFormState((prev) => ({
                                        ...prev,
                                        branchLabel: option.label,
                                        displayName: prev.displayName || profile.displayName || '',
                                        nickname: prev.nickname || profile.nickname || '',
                                        contactPhone: prev.contactPhone || profile.contactPhone || '',
                                        contactEmail: prev.contactEmail || profile.contactEmail || '',
                                        profileTitle: prev.profileTitle || profile.profileTitle || '',
                                        bio: prev.bio || profile.bio || '',
                                        profileImage: prev.profileImage || profile.profileImage || '',
                                        coverImage: prev.coverImage || profile.coverImage || '',
                                        kakaoLink: prev.kakaoLink || profile.kakaoLink || '',
                                        homepageUrl: prev.homepageUrl || profile.homepageUrl || '',
                                        bankName: prev.bankName || profile.bankName || '',
                                        bankAccount: prev.bankAccount || profile.bankAccount || '',
                                        bankAccountHolder: prev.bankAccountHolder || profile.bankAccountHolder || '',
                                      }));
                                      showSuccess(`지점명 "${option.label}"을(를) 불러왔습니다. 대리점장 정보가 자동으로 채워졌습니다.`);
                                    }
                                  } catch (error) {
                                    console.error('Failed to load manager details:', error);
                                    // 에러가 나도 지점명은 설정됨
                                  }
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <div className="font-medium text-gray-900">{option.label}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {option.managerName} ({option.affiliateCode})
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      기존 지점명을 선택하면 해당 대리점장의 상세 정보(이름, 연락처, 계좌 등)가 자동으로 불러와집니다. 본사에서도 수정 가능합니다.
                    </span>
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">닉네임</span>
                    <input
                      value={formState.nickname}
                      onChange={(e) => setFormState((prev) => ({ ...prev, nickname: e.target.value }))}
                      placeholder="예: 모니카 지점장"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">랜딩 제목</span>
                    <input
                      value={formState.profileTitle}
                      onChange={(e) => setFormState((prev) => ({ ...prev, profileTitle: e.target.value }))}
                      placeholder="예: 모니카 지점장의 프리미엄 크루즈 상담"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">랜딩 슬러그</span>
                    <input
                      value={formState.landingSlug}
                      onChange={(e) => setFormState((prev) => ({ ...prev, landingSlug: sanitizeSlug(e.target.value) }))}
                      placeholder="예: monica-cruise"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="text-xs text-gray-500">
                      {landingUrl ? (
                        <a
                          href={landingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          판매원 랜딩 페이지: {landingUrl}
                          <FiExternalLink className="text-xs" />
                        </a>
                      ) : (
                        <>판매원 랜딩 페이지가 아직 등록되지 않았습니다.</>
                      )}
                    </span>
                  </label>
                </section>

                {modalMode === 'edit' && selectedProfile && (
                  <section className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900 lg:grid-cols-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-600">파트너 계정</h3>
                      <ul className="mt-2 space-y-1 text-xs">
                        <li>
                          파트너 ID:{' '}
                          <span className="font-semibold text-blue-800">
                            {selectedProfile.user?.id ?? '미연결'}
                          </span>
                        </li>
                        <li>이메일: {selectedProfile.user?.email || '—'}</li>
                        <li>아이디: <span className="font-semibold text-blue-800">{selectedProfile.user?.phone || selectedProfile.user?.mallUserId || '—'}</span></li>
                        <li>
                          현재 비밀번호: <span className="font-semibold text-blue-600 font-mono">{selectedProfile.user?.password || '—'}</span>
                        </li>
                        <li>연락처: {selectedProfile.contactPhone || selectedProfile.user?.phone || '—'}</li>
                      </ul>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <label className="flex flex-col gap-1 text-xs text-gray-700">
                          <span className="font-semibold text-blue-700">비밀번호 변경 (판매원이 그만두면 변경)</span>
                          <input
                            type="text"
                            value={formState.password}
                            onChange={(e) => setFormState((prev) => ({ ...prev, password: e.target.value }))}
                            placeholder="새 비밀번호 입력 (변경 시에만)"
                            className="rounded-lg border border-blue-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-[10px] text-gray-500">비워두면 비밀번호 변경 안 함</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-600">판매원몰 & 랜딩</h3>
                      <ul className="mt-2 space-y-1 text-xs">
                        <li>
                          판매원몰 링크:{' '}
                          {mallLink ? (
                            <a
                              href={mallLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                            >
                              {mallLink}
                              <FiExternalLink className="text-xs" />
                            </a>
                          ) : (
                            '미연결'
                          )}
                        </li>
                        <li>랜딩 코드: {formState.landingSlug || '—'}</li>
                        <li>어필리에이트 코드: {formState.affiliateCode}</li>
                      </ul>
                    </div>
                  </section>
                )}

                <section className="grid gap-4 lg:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">판매원몰 링크 ID</span>
                    <input
                      value={formState.mallUserId}
                      onChange={(e) => setFormState((prev) => ({ ...prev, mallUserId: e.target.value }))}
                      placeholder="예: monica-shop"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="text-xs text-gray-500">
                      {mallLink ? (
                        <a
                          href={mallLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          현재 판매원몰 링크: {mallLink}
                          <FiExternalLink className="text-xs" />
                        </a>
                      ) : (
                        '판매원몰 링크가 아직 연결되지 않았습니다.'
                      )}
                    </span>
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                    판매원몰 링크는 관리자만 수정할 수 있습니다. 판매원에게 공유되는 공식 쇼핑몰 주소이므로 변경 시 기존 고객 안내도 함께 업데이트해 주세요.
                  </div>
                </section>

                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                  소개, 연락처, 이미지 등은 대리점장/판매원이 ‘나의 정보 → 어필리에이트 프로필’에서 직접 업데이트할 수 있습니다. 비워 두면 파트너가 입력한 내용이 자동으로 반영됩니다.
                </div>

                <section className="grid gap-4">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">소개 / 한 줄 메시지</span>
                    <textarea
                      value={formState.bio}
                      onChange={(e) => setFormState((prev) => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      placeholder="어필리에이트 소개 및 전문 분야를 입력하세요."
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm text-gray-700">
                      <span className="font-semibold">랜딩 공지</span>
                      <textarea
                        value={formState.landingAnnouncement}
                        onChange={(e) => setFormState((prev) => ({ ...prev, landingAnnouncement: e.target.value }))}
                        rows={3}
                        placeholder="주요 일정, 이벤트 등을 안내합니다."
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-gray-700">
                      <span className="font-semibold">환영 메시지</span>
                      <textarea
                        value={formState.welcomeMessage}
                        onChange={(e) => setFormState((prev) => ({ ...prev, welcomeMessage: e.target.value }))}
                        rows={3}
                        placeholder="상담 전환 메시지 등을 입력하세요."
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">프로필 이미지 URL</span>
                    <input
                      value={formState.profileImage}
                      onChange={(e) => setFormState((prev) => ({ ...prev, profileImage: e.target.value }))}
                      placeholder="https://..."
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">커버 이미지 URL</span>
                    <input
                      value={formState.coverImage}
                      onChange={(e) => setFormState((prev) => ({ ...prev, coverImage: e.target.value }))}
                      placeholder="https://..."
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">카카오톡 채널/오픈채팅 링크</span>
                    <input
                      value={formState.kakaoLink}
                      onChange={(e) => setFormState((prev) => ({ ...prev, kakaoLink: e.target.value }))}
                      placeholder="https://open.kakao.com/o/..."
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">연락처 (전화)</span>
                    <input
                      value={formState.contactPhone}
                      onChange={(e) => setFormState((prev) => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="010-0000-0000"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">연락처 (이메일)</span>
                    <input
                      value={formState.contactEmail}
                      onChange={(e) => setFormState((prev) => ({ ...prev, contactEmail: e.target.value }))}
                      placeholder="affiliate@example.com"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">홈페이지/블로그</span>
                    <input
                      value={formState.homepageUrl}
                      onChange={(e) => setFormState((prev) => ({ ...prev, homepageUrl: e.target.value }))}
                      placeholder="https://..."
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">인스타그램</span>
                    <input
                      value={formState.instagramHandle}
                      onChange={(e) => setFormState((prev) => ({ ...prev, instagramHandle: e.target.value }))}
                      placeholder="@username"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">유튜브 채널</span>
                    <input
                      value={formState.youtubeChannel}
                      onChange={(e) => setFormState((prev) => ({ ...prev, youtubeChannel: e.target.value }))}
                      placeholder="https://youtube.com/..."
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">정산 예금주/은행 정보</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={formState.bankName}
                        onChange={(e) => setFormState((prev) => ({ ...prev, bankName: e.target.value }))}
                        placeholder="은행명"
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <input
                        value={formState.bankAccountHolder}
                        onChange={(e) => setFormState((prev) => ({ ...prev, bankAccountHolder: e.target.value }))}
                        placeholder="예금주"
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <input
                      value={formState.bankAccount}
                      onChange={(e) => setFormState((prev) => ({ ...prev, bankAccount: e.target.value }))}
                      placeholder="계좌번호"
                      className="mt-2 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">원천징수율 (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={formState.withholdingRate}
                      onChange={(e) => setFormState((prev) => ({ ...prev, withholdingRate: e.target.value }))}
                      placeholder="예: 3.3"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    <span className="font-semibold">추가 메타데이터 (JSON)</span>
                    <textarea
                      value={formState.metadata}
                      onChange={(e) => setFormState((prev) => ({ ...prev, metadata: e.target.value }))}
                      rows={4}
                      placeholder='{ "tags": ["premium"] }'
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="text-xs text-gray-500">필요 시 JSON 형식으로 추가 설정을 저장할 수 있습니다.</span>
                  </label>
                </section>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                disabled={saving}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:bg-blue-300"
              >
                <FiSave className="text-base" />
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 관계 확인 및 수정 모달 */}
      {showRelationsModal && relationsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">관계 확인 및 수정</h2>
              <button
                onClick={() => setShowRelationsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-2xl" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">전체 프로필</p>
                  <p className="text-2xl font-bold text-blue-700">{relationsData.summary?.totalProfiles || 0}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">관계 수</p>
                  <p className="text-2xl font-bold text-green-700">{relationsData.summary?.totalRelations || 0}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">판매원</p>
                  <p className="text-2xl font-bold text-purple-700">{relationsData.summary?.salesAgents || 0}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">누락된 관계</p>
                  <p className="text-2xl font-bold text-orange-700">{relationsData.summary?.missingRelations || 0}</p>
                </div>
              </div>

              {relationsData.missingRelations && relationsData.missingRelations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">누락된 관계</h3>
                  <div className="space-y-2">
                    {relationsData.missingRelations.map((item: any, idx: number) => {
                      // managerId 찾기
                      const managerProfile = relationsData.allProfiles?.find(
                        (p: any) => p.id === item.expectedManagerId
                      );
                      return (
                        <div key={idx} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {item.agentName} ({item.agentCode})
                              </p>
                              <p className="text-sm text-gray-600 mt-1">{item.reason}</p>
                              {managerProfile && (
                                <p className="text-sm text-blue-600 mt-1">
                                  예상 대리점장: {managerProfile.name} (ID: {managerProfile.id})
                                </p>
                              )}
                            </div>
                            {item.expectedManagerId && (
                              <button
                                onClick={() => handleFixRelation(item.agentId, item.expectedManagerId)}
                                disabled={fixingRelation}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                              >
                                {fixingRelation ? '수정 중...' : '관계 생성'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {relationsData.managerStats && relationsData.managerStats.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">대리점장별 팀원 수</h3>
                  <div className="space-y-2">
                    {relationsData.managerStats.map((stat: any, idx: number) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {stat.managerName} ({stat.managerCode})
                            </p>
                            {stat.branchLabel && (
                              <p className="text-sm text-gray-600">{stat.branchLabel}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-700">{stat.teamCount}명</p>
                            <p className="text-xs text-gray-500">팀원</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!relationsData.missingRelations || relationsData.missingRelations.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-lg font-semibold text-green-700">✅ 모든 관계가 정상입니다!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 문서 확인 모달 */}
      {showDocumentsModal && selectedProfileForDocuments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">신분증 및 통장사본 확인</h2>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedProfileForDocuments(null);
                  setDocuments([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-2xl" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {loadingDocuments ? (
                <div className="py-12 text-center text-gray-500">
                  문서 목록을 불러오는 중입니다...
                </div>
              ) : documents.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  업로드된 문서가 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => {
                    const getStatusInfo = () => {
                      if (doc.isApproved) {
                        return {
                          label: '승인됨',
                          color: 'text-green-600',
                          bgColor: 'bg-green-50',
                          icon: <FiCheckCircle className="text-base" />,
                        };
                      }
                      switch (doc.status) {
                        case 'UPLOADED':
                          return {
                            label: '검토 대기',
                            color: 'text-yellow-600',
                            bgColor: 'bg-yellow-50',
                            icon: <FiClock className="text-base" />,
                          };
                        case 'REJECTED':
                          return {
                            label: '반려됨',
                            color: 'text-red-600',
                            bgColor: 'bg-red-50',
                            icon: <FiXCircle className="text-base" />,
                          };
                        default:
                          return {
                            label: '알 수 없음',
                            color: 'text-gray-600',
                            bgColor: 'bg-gray-50',
                            icon: <FiFile className="text-base" />,
                          };
                      }
                    };
                    const statusInfo = getStatusInfo();
                    return (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {doc.documentType === 'ID_CARD' ? '신분증' : '통장사본'}
                            </h3>
                            {doc.fileName && (
                              <p className="text-sm text-gray-600 mt-1">{doc.fileName}</p>
                            )}
                            {doc.fileSize && (
                              <p className="text-xs text-gray-500 mt-1">
                                파일 크기: {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                            {doc.uploadedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                업로드일: {new Date(doc.uploadedAt).toLocaleString('ko-KR')}
                              </p>
                            )}
                            {doc.approvedBy && (
                              <p className="text-xs text-green-600 mt-1">
                                승인자: {doc.approvedBy.name} ({doc.approvedBy.email})
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${statusInfo.color} ${statusInfo.bgColor}`}
                          >
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={doc.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <FiEye className="text-base" />
                            문서 보기
                          </a>
                          {!doc.isApproved && doc.status === 'UPLOADED' && (
                            <>
                              <button
                                onClick={() => handleDocumentAction(doc.id, 'approve')}
                                className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                              >
                                <FiCheckCircle className="text-base" />
                                승인
                              </button>
                              <button
                                onClick={() => handleDocumentAction(doc.id, 'reject')}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                              >
                                <FiXCircle className="text-base" />
                                거부
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 샘플 데이터 생성 모달 */}
      {showSampleDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-extrabold text-gray-900">샘플 데이터 생성</h2>
              <button
                onClick={() => {
                  setShowSampleDataModal(false);
                  setSelectedAgentForSample(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-2xl" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  샘플 데이터를 생성할 판매원 또는 대리점장을 선택하세요. 각 프로필당 10개의 리드, 판매, 고객 데이터가 생성됩니다.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      판매원 선택
                    </label>
                    <select
                      value={selectedAgentForSample || ''}
                      onChange={(e) => setSelectedAgentForSample(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">-- 판매원 또는 대리점장 선택 --</option>
                      {profiles
                        .filter(p => (p.type === 'SALES_AGENT' || p.type === 'BRANCH_MANAGER') && p.status === 'ACTIVE')
                        .map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.type === 'BRANCH_MANAGER' ? '[대리점장] ' : '[판매원] '}
                            {profile.displayName || profile.nickname || `ID: ${profile.id}`} 
                            {profile.user?.mallUserId && ` (${profile.user.mallUserId})`}
                            {profile.affiliateCode && ` - ${profile.affiliateCode}`}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">또는</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleExecuteSampleDataGeneration(null, true)}
                    disabled={generatingSampleData !== null}
                    className="w-full rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatingSampleData === -1 ? (
                      <span className="flex items-center justify-center gap-2">
                        <FiRefreshCw className="animate-spin" />
                        모든 프로필에게 생성 중...
                      </span>
                    ) : (
                      `모든 활성 프로필에게 생성 (${profiles.filter(p => (p.type === 'SALES_AGENT' || p.type === 'BRANCH_MANAGER') && p.status === 'ACTIVE').length}명)`
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowSampleDataModal(false);
                    setSelectedAgentForSample(null);
                  }}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  onClick={() => handleExecuteSampleDataGeneration(selectedAgentForSample, false)}
                  disabled={!selectedAgentForSample || generatingSampleData !== null}
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generatingSampleData === selectedAgentForSample ? (
                    <span className="flex items-center justify-center gap-2">
                      <FiRefreshCw className="animate-spin" />
                      생성 중...
                    </span>
                  ) : (
                    '생성하기'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}













